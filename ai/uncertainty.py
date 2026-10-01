"""
uncertainty.py — Probabilistic core (PRD F-01, Stages 7/8/9): calibrated distributions.

Reads:  outputs/interim/forecast_history_clean.csv (long: city,model,datetime,vars)
        outputs/interim/actual_history_clean.csv   (wide: actual_*)
        outputs/interim/forecast_current_clean.csv (long, per-model current cycle)
        outputs/hybrid_forecast.csv, outputs/model_weights_lead.csv
Writes: outputs/uncertainty.csv          (p10/p50/p90 per variable, spread, agreement)
        outputs/exceedance.csv           (P(X >= t) per ai/thresholds.py + max_class)
        outputs/uncertainty_diagnostics.csv (fitted k, sigma_min, N, holdout coverage)

Method (spec: docs/specs/2026-10-01-f01-probabilistic-core-design.md):
  spread s  = sqrt(sum_i w_i (m_i - mu)^2)         # lead-aware weights
  sigma     = k * s + sigma_min                    # pooled |err| ~ s regression
  temperature: Normal(mu, sigma)
  wind:        Lognormal, median pinned at mu: mu_ln = ln(mu), sig_ln = sqrt(ln(1 + (sigma/mu)^2))
  rainfall:    two-part mixture — dry point mass at 0 (Laplace-smoothed per blend bin),
               Gamma(mean mu_pos = mu/p_wet, cv = sigma/mu_pos) on the wet part.
               Mixture quantiles are exact: q = 0 for t <= p_dry, else Gamma ppf((t - p_dry)/p_wet).
  exceedance:  1 - CDF(threshold); rainfall P(X >= t>0) = p_wet * GammaSF(t)
  agreement:   Stage 9.11 partition on spread percentile x max tail probability

Run:    .venv/bin/python ai/uncertainty.py            # generate artifacts
Verify: .venv/bin/python ai/uncertainty.py --verify   # math checks + holdout coverage gate
"""

import sys
from pathlib import Path

base_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(base_dir))

import numpy as np
import pandas as pd
from scipy import stats

from ai.thresholds import THRESHOLDS

ENGINE_VERSION = "unc-2026-10-01-v1"

QUANTILES = (0.1, 0.5, 0.9)
VARIABLES = ("temperature", "rainfall", "wind_speed")
MODELS = ["ecmwf", "gfs", "icon", "gem"]

# Thresholds per variable, from the shared operational table (single source of truth)
VAR_THRESHOLDS = {
    "rainfall": [THRESHOLDS["Heavy Rain"]["moderate"], THRESHOLDS["Heavy Rain"]["high"]],
    "temperature": [THRESHOLDS["High Temperature"]["moderate"], THRESHOLDS["High Temperature"]["high"]],
    "wind_speed": [THRESHOLDS["High Wind"]["moderate"], THRESHOLDS["High Wind"]["high"]],
}

# Rain blend-magnitude bins (mm/h) for the dry/wet split, per spec 3.3
RAIN_BINS = [0.0, 0.1, 1.0, 4.0, 8.0, np.inf]
DRY_MM = 0.1

# Stage 9.11 class boundaries (spread percentile 0-100, max tail probability)
AGREE_TIGHT, AGREE_LOOSE, TAIL_RISK_P = 40.0, 60.0, 0.5

HOLDOUT_DAYS = 10
COVERAGE_LO, COVERAGE_HI = 0.70, 0.90

OUT = base_dir / "outputs"
HIST_FORECAST = OUT / "interim" / "forecast_history_clean.csv"
HIST_ACTUAL = OUT / "interim" / "actual_history_clean.csv"
CURRENT_FORECAST = OUT / "interim" / "forecast_current_clean.csv"
HYBRID = OUT / "hybrid_forecast.csv"
WEIGHTS = OUT / "model_weights_lead.csv"

AMAP = {"actual_temperature": "temperature", "actual_rainfall": "rainfall", "actual_wind": "wind_speed"}


# ---------------------------------------------------------------- spread ----

def weighted_std(values, weights) -> float:
    """sqrt(sum w_i (m_i - mu)^2) with normalized weights; 0.0 when <2 models."""
    w = np.asarray(weights, dtype=float)
    m = np.asarray(values, dtype=float)
    good = np.isfinite(m) & np.isfinite(w)
    w, m = w[good], m[good]
    if w.sum() <= 0 or len(m) < 2:
        return 0.0
    w = w / w.sum()
    mu = float((w * m).sum())
    return float(np.sqrt((w * (m - mu) ** 2).sum()))


# ---------------------------------------------------------- calibration ----

def build_pairs(history: pd.DataFrame, actual: pd.DataFrame, weights: pd.DataFrame) -> pd.DataFrame:
    """One row per (city, datetime, variable): blend, spread, actual, abs_err.

    The historical blend replicates the live blend definition: weight-space
    mean of available models (equal weights when the weight table lacks the key).
    """
    widx = weights.set_index(["variable", "model"])["weight"].to_dict()

    long = history.melt(id_vars=["city", "datetime", "model"],
                        value_vars=list(VARIABLES), var_name="variable", value_name="value")
    long = long.dropna(subset=["value"])
    long["weight"] = [float(widx.get((v, m), 0.25)) for v, m in zip(long["variable"], long["model"])]

    def wavg(d):
        return np.average(d["value"], weights=d["weight"]) if d["weight"].sum() > 0 else d["value"].mean()

    g = long.groupby(["city", "datetime", "variable"])
    blend = g.apply(wavg, include_groups=False).rename("blend")
    spread = g.apply(lambda d: weighted_std(d["value"], d["weight"]), include_groups=False).rename("spread")

    a_long = actual.melt(id_vars=["city", "datetime"], value_vars=list(AMAP),
                         var_name="actual_col", value_name="actual")
    a_long["variable"] = a_long["actual_col"].map(AMAP)

    pairs = blend.to_frame().join(spread).reset_index().merge(
        a_long[["city", "datetime", "variable", "actual"]],
        on=["city", "datetime", "variable"], how="inner")
    pairs["abs_err"] = (pairs["actual"] - pairs["blend"]).abs()
    return pairs.dropna(subset=["abs_err", "spread"])


def fit_sigma(pairs: pd.DataFrame, variable: str):
    """sigma = k * spread + sigma_min, pooled least squares on one variable.

    sigma_min is floored at the median absolute error so perfect model
    agreement still owns a real band. Returns (k, sigma_min, n_fit, holdout_coverage).
    """
    d = pairs[pairs["variable"] == variable]
    if len(d) < 500:
        raise ValueError(f"{variable}: only {len(d)} calibration pairs, refusing to fit")

    cutoff = d["datetime"].max() - pd.Timedelta(days=HOLDOUT_DAYS)
    fit, hold = d[d["datetime"] < cutoff], d[d["datetime"] >= cutoff]

    s, e = fit["spread"].to_numpy(float), fit["abs_err"].to_numpy(float)
    s_mean = s.mean()
    if s_mean <= 1e-9:
        k, sigma_min = 0.0, float(e.mean())
    else:
        k = float(((s - s_mean) * (e - e.mean())).sum() / ((s - s_mean) ** 2).sum())
        k = max(k, 0.0)  # negative slope is noise; spread cannot shrink error
        sigma_min = float(max(e.mean() - k * s_mean, np.median(e)))

    band = k * hold["spread"].to_numpy(float) + sigma_min
    errs = np.abs(hold["actual"].to_numpy(float) - hold["blend"].to_numpy(float))
    coverage = float((errs <= band).mean())
    return k, sigma_min, len(fit), coverage


# ---------------------------------------------------------- distributions ----

def sigma_of(fits: dict, variable: str, spread: float) -> float:
    k, smin = fits[variable]
    return max(k * spread + smin, 1e-3)


def wind_params(mu: float, sigma: float):
    """Lognormal with median pinned at mu and variance matched to sigma^2."""
    mu = max(mu, 1e-3)
    sig_ln = float(np.sqrt(np.log1p((max(sigma, 1e-3) / mu) ** 2)))
    return np.log(mu), sig_ln


def rain_parts(mu: float, sigma: float, p_dry: float):
    """Two-part rainfall: returns (p_dry, p_wet, gamma_shape, gamma_scale).

    The wet Gamma has mean mu_pos = mu / p_wet (unconditional-mean identity)
    and cv = sigma / mu_pos.
    """
    p_dry = float(min(max(p_dry, 0.0), 1.0))
    p_wet = 1.0 - p_dry
    if p_wet <= 1e-9 or mu <= 1e-6:
        return p_dry, 0.0, None, None
    mu_pos = max(mu / p_wet, 1e-6)
    cv = max(sigma, 1e-3) / mu_pos
    if cv < 0.05:
        return p_dry, p_wet, None, None  # near-deterministic wet part
    shape = 1.0 / cv**2
    scale = sigma**2 / mu_pos
    return p_dry, p_wet, shape, scale


def quantiles_for(variable: str, mu: float, sigma: float, p_dry: float | None = None) -> dict:
    """Exact P10/P50/P90 under the spec 3.3 distribution for each variable."""
    if variable == "rainfall":
        p_dry_, p_wet, shape, scale = rain_parts(mu, sigma, p_dry if p_dry is not None else 1.0)
        out = {}
        for q in QUANTILES:
            if p_wet <= 1e-9 or q <= p_dry_:
                out[q] = 0.0
            elif shape is None:
                out[q] = mu / p_wet
            else:
                out[q] = float(stats.gamma.ppf((q - p_dry_) / p_wet, a=shape, scale=scale))
        return out
    if variable == "temperature":
        return {q: float(stats.norm.ppf(q, loc=mu, scale=max(sigma, 1e-3))) for q in QUANTILES}
    mu_ln, sig_ln = wind_params(mu, sigma)
    return {q: float(np.exp(mu_ln + sig_ln * stats.norm.ppf(q))) for q in QUANTILES}


def exceedance_for(variable: str, mu: float, sigma: float,
                   p_dry: float | None, thresholds) -> dict:
    """P(X >= t) = 1 - CDF(t) under the spec 3.3 distribution."""
    out = {}
    for t in thresholds:
        if variable == "rainfall":
            p_dry_, p_wet, shape, scale = rain_parts(mu, sigma, p_dry if p_dry is not None else 1.0)
            if t <= 0 or p_wet <= 1e-9:
                out[t] = 0.0
            elif shape is None:
                out[t] = p_wet if mu / p_wet >= t else 0.0
            else:
                out[t] = float(p_wet * stats.gamma.sf(t, a=shape, scale=scale))
        elif variable == "temperature":
            out[t] = float(stats.norm.sf(t, loc=mu, scale=max(sigma, 1e-3)))
        else:
            mu_ln, sig_ln = wind_params(mu, sigma)
            out[t] = float(stats.lognorm.sf(t, s=sig_ln, scale=np.exp(mu_ln)))
    return out


def max_class(mu: float, sigma: float, p_dry: float | None, variable: str) -> str:
    """'none' | 'moderate' | 'high' — highest class whose exceedance >= 0.5."""
    t_moderate, t_high = VAR_THRESHOLDS[variable]
    if exceedance_for(variable, mu, sigma, p_dry, [t_high])[t_high] >= TAIL_RISK_P:
        return "high"
    if exceedance_for(variable, mu, sigma, p_dry, [t_moderate])[t_moderate] >= TAIL_RISK_P:
        return "moderate"
    return "none"


def agreement_class(spread_pct: float, max_tail: float) -> str:
    """Stage 9.11 partition: agreement is about the models; the tail only
    separates what high spread means. Non-overlapping and total."""
    if spread_pct < AGREE_TIGHT:
        return "STRONG_AGREEMENT"
    if spread_pct < AGREE_LOOSE:
        return "MIXED_SPLIT"
    return "HIGH_TAIL_RISK_TIMING_UNCERTAIN" if max_tail >= TAIL_RISK_P else "HIGH_DISAGREEMENT_LOW_SIGNAL"


# ------------------------------------------------------------- generate ----

def generate() -> dict:
    hybrid = pd.read_csv(HYBRID, parse_dates=["datetime"])
    current = pd.read_csv(CURRENT_FORECAST, parse_dates=["datetime"])
    weights = pd.read_csv(WEIGHTS)
    actual = pd.read_csv(HIST_ACTUAL, parse_dates=["datetime"])
    history = pd.read_csv(HIST_FORECAST, parse_dates=["datetime"])

    # --- calibration on history ------------------------------------------
    pairs = build_pairs(history, actual, weights)
    diagnostics, fits = [], {}
    for var in VARIABLES:
        k, smin, n, cov = fit_sigma(pairs, var)
        fits[var] = (k, smin)
        diagnostics.append({
            "variable": var, "k": round(k, 6), "sigma_min": round(smin, 6), "n_fit": n,
            "holdout_coverage": round(cov, 4),
            "window_start": str(pairs["datetime"].min()), "window_end": str(pairs["datetime"].max()),
            "engine_version": ENGINE_VERSION,
        })

    # --- per-model matrix for the current cycle ---------------------------
    wide = current.pivot_table(index=["city", "datetime"], columns="model", values=list(VARIABLES))
    wide.columns = [f"{v}__{m}" for v, m in wide.columns]
    wide = wide.reset_index()
    df = hybrid.merge(wide, on=["city", "datetime"], how="left", validate="one_to_one")
    if df[list(wide.columns)].isna().any().any():
        missing = int(df[list(wide.columns)].isna().any(axis=1).sum())
        raise ValueError(f"{missing} hybrid rows missing per-model values in forecast_current_clean.csv")

    # Degradation (PRD F-01.A): per-model spread over the models that actually
    # arrived; weighted_std handles the reduced stack directly.
    present_models = [m for m in MODELS if f"{VARIABLES[0]}__{m}" in df.columns]

    widx = weights.set_index(["variable", "model"])["weight"].to_dict()
    hist_dry = actual["actual_rainfall"] < DRY_MM
    hist_bins = pd.cut(actual["actual_rainfall"], RAIN_BINS, right=False)
    bin_dry = hist_dry.groupby(hist_bins, observed=True).sum()
    bin_n = hist_bins.value_counts()

    def dry_prob_for(blend_mmh: float) -> float:
        """Laplace-smoothed P(dry | blend bin) = (dry + 1) / (N + 2), spec 3.3."""
        for lo, hi in zip(RAIN_BINS[:-1], RAIN_BINS[1:]):
            if lo <= blend_mmh < hi:
                n = int(bin_n.get(pd.Interval(lo, hi, closed="left"), 0))
                d = float(bin_dry.get(pd.Interval(lo, hi, closed="left"), 0.0))
                return (d + 1.0) / (n + 2.0)
        return 1.0

    # --- pass 1: spreads (needed for the percentile pool) -----------------
    spread_cols = {}
    for var in VARIABLES:
        model_vals = np.column_stack([df[f"{var}__{m}"].to_numpy(float) for m in present_models])
        w_vec = np.array([float(widx.get((var, m), 0.25)) for m in present_models])
        spread_cols[var] = np.array([weighted_std(row, w_vec) for row in model_vals])

    # within-cycle percentile pool per variable (all cities x leads)
    spread_pct = {var: pd.Series(spread_cols[var]).rank(pct=True).to_numpy() for var in VARIABLES}

    # --- pass 2: distributions, exceedance, agreement ----------------------
    unc_rows, exc_rows = [], []
    for i, row in enumerate(df.itertuples(index=False)):
        urow = {"city": row.city, "datetime": row.datetime, "lead_days": row.lead_days}
        erow = {"city": row.city, "datetime": row.datetime, "lead_days": row.lead_days}
        max_tails = {}

        for var in VARIABLES:
            mu = float(getattr(row, var))  # corrected value anchors P50
            sigma = sigma_of(fits, var, spread_cols[var][i])
            p_dry = dry_prob_for(mu) if var == "rainfall" else None
            qs = quantiles_for(var, mu, sigma, p_dry)
            # The published band must always bracket the published best
            # estimate: for the skewed rain mixture the raw mixture P90 can sit
            # below the mean when dry probability is high. Clamp is a no-op for
            # median-pinned temperature/wind.
            urow[f"p10_{var}"] = min(qs[0.1], mu)
            urow[f"p90_{var}"] = max(qs[0.9], mu)
            urow[f"p50_{var}"] = mu
            urow[f"spread_{var}"] = round(spread_cols[var][i], 4)

            exc = exceedance_for(var, mu, sigma, p_dry, VAR_THRESHOLDS[var])
            for t, p in exc.items():
                erow[f"p_ge_{var}_{t:g}"] = round(p, 4)
            t_mod, t_high = VAR_THRESHOLDS[var]
            erow[f"max_class_{var}"] = ("high" if exc[t_high] >= TAIL_RISK_P
                                        else "moderate" if exc[t_mod] >= TAIL_RISK_P else "none")
            max_tails[var] = max(exc.values())

        # Composite spread percentile: mean of the three per-variable ranks.
        # (Max-of-3 uniform ranks lands >= 60th pct ~78% of the time by
        # construction, which would force most rows into the loose classes
        # regardless of actual model behavior.)
        pct100 = 100.0 * float(np.mean([spread_pct[var][i] for var in VARIABLES]))
        urow["agreement_class"] = agreement_class(pct100, max(max_tails.values()))
        urow["agreement_score"] = round(100.0 * (1.0 - pct100 / 100.0), 1)
        unc_rows.append(urow)
        exc_rows.append(erow)

    unc, exc = pd.DataFrame(unc_rows), pd.DataFrame(exc_rows)

    assert len(unc) == len(hybrid), f"uncertainty rows {len(unc)} != hybrid rows {len(hybrid)}"
    assert not unc.isna().any().any(), "NaN in uncertainty.csv"
    assert not exc.isna().any().any(), "NaN in exceedance.csv"
    for var in VARIABLES:
        assert (unc[f"p10_{var}"] <= unc[f"p50_{var}"] + 1e-9).all() and \
               (unc[f"p50_{var}"] <= unc[f"p90_{var}"] + 1e-9).all(), f"band not monotonic for {var}"

    unc.to_csv(OUT / "uncertainty.csv", index=False)
    exc.to_csv(OUT / "exceedance.csv", index=False)
    pd.DataFrame(diagnostics).to_csv(OUT / "uncertainty_diagnostics.csv", index=False)

    print(f"OK: {len(unc)} uncertainty rows, {len(exc)} exceedance rows, engine {ENGINE_VERSION}")
    for d in diagnostics:
        print(f"    {d['variable']}: k={d['k']}, sigma_min={d['sigma_min']}, "
              f"n={d['n_fit']}, holdout coverage={d['holdout_coverage']}")
    return {"uncertainty": len(unc), "exceedance": len(exc), "diagnostics": diagnostics}


# --------------------------------------------------------------- verify ----

def verify() -> bool:
    ok = True

    # 1. monotonicity + CDF/quantile round-trips
    for mu, sig in [(25.0, 2.0), (0.0, 1.0), (100.0, 15.0)]:
        q = quantiles_for("temperature", mu, sig)
        if not q[0.1] <= q[0.5] <= q[0.9] or abs(stats.norm.cdf(q[0.5], loc=mu, scale=sig) - 0.5) > 1e-9:
            print(f"FAIL: temperature quantiles at mu={mu}"); ok = False
    q = quantiles_for("wind_speed", 10.0, 4.0)
    if not (q[0.1] <= q[0.5] <= q[0.9] and min(q.values()) > 0):
        print("FAIL: wind quantiles not monotonic/positive"); ok = False
    mu_ln, sig_ln = wind_params(10.0, 4.0)
    if abs(np.exp(mu_ln) - 10.0) > 1e-9 or sig_ln <= 0:
        print("FAIL: wind median not pinned at mu"); ok = False

    # 2. exact rain mixture quantiles: dry point mass, wet split, monotonicity
    q = quantiles_for("rainfall", mu=2.0, sigma=2.0, p_dry=0.7)
    if not (q[0.1] == 0.0 and q[0.5] == 0.0 and q[0.9] > 0):  # dry mass 0.7 dominates the median
        print(f"FAIL: rain mixture quantiles (p_dry=0.7) {q}"); ok = False
    q_wet = quantiles_for("rainfall", mu=2.0, sigma=2.0, p_dry=0.05)
    if not (0.0 <= q_wet[0.1] <= q_wet[0.5] and q_wet[0.5] > 0):  # mostly-wet: median must be positive
        print(f"FAIL: rain mixture quantiles (p_dry=0.05) {q_wet}"); ok = False
    q_high_dry = quantiles_for("rainfall", mu=0.05, sigma=0.2, p_dry=0.95)
    if any(v != 0.0 for v in q_high_dry.values()):
        print(f"FAIL: rain quantiles must be 0 when p_dry exceeds targets {q_high_dry}"); ok = False

    # 3. exceedance sanity: P(X>=t) decreasing in t, bounded in [0,1]
    exc = exceedance_for("rainfall", 2.0, 2.0, 0.7, [0.5, 2.0, 8.0])
    vals = list(exc.values())
    if not all(0.0 <= v <= 1.0 for v in vals) or not all(a >= b for a, b in zip(vals, vals[1:])):
        print(f"FAIL: rain exceedance not decreasing/bounded {exc}"); ok = False
    w_exc = exceedance_for("wind_speed", 10.0, 4.0, None, [5.0, 25.0])
    if not w_exc[5.0] > w_exc[25.0] >= 0.0:
        print(f"FAIL: wind exceedance {w_exc}"); ok = False

    # 4. agreement partition is total and mutually exclusive
    classes = set()
    for sp in (0.0, 39.9, 40.0, 59.9, 60.0, 100.0):
        for tp in (0.0, 0.49, 0.5, 1.0):
            classes.add(agreement_class(sp, tp))
    if classes != {"STRONG_AGREEMENT", "MIXED_SPLIT", "HIGH_TAIL_RISK_TIMING_UNCERTAIN",
                   "HIGH_DISAGREEMENT_LOW_SIGNAL"}:
        print(f"FAIL: agreement partition produced {classes}"); ok = False

    # 5. holdout coverage gate on real data
    actual = pd.read_csv(HIST_ACTUAL, parse_dates=["datetime"])
    history = pd.read_csv(HIST_FORECAST, parse_dates=["datetime"])
    weights = pd.read_csv(WEIGHTS)
    pairs = build_pairs(history, actual, weights)
    for var in VARIABLES:
        _, _, _, cov = fit_sigma(pairs, var)
        if COVERAGE_LO <= cov <= COVERAGE_HI:
            print(f"OK: {var} holdout P10-P90 coverage = {cov:.3f}")
        else:
            print(f"FAIL: {var} holdout coverage = {cov:.3f} (required {COVERAGE_LO}-{COVERAGE_HI})")
            ok = False

    print("VERIFY: PASS" if ok else "VERIFY: FAIL")
    return ok


if __name__ == "__main__":
    if "--verify" in sys.argv:
        sys.exit(0 if verify() else 1)
    generate()

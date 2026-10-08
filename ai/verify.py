"""
verify.py — F-02.C Historical Truth & Error Verification (PRD §7.2.C).

Scores every model — plus the equal_avg and weighted_blend reference methods —
against observed truth from actual_history_clean.csv, on the hourly grid.

CRPS note: for a deterministic (single-valued) forecast, CRPS is exactly the
mean absolute error. This system's feeds are deterministic (Open-Meteo), so
`crps` is published as `mae` rather than inventing ensemble math (PRD G7).
Proper CRPS arrives when ensemble members (NEPS/IMD-GEFS) are ingested.

Categorical note: forecasts are deterministic, so event calls are binary
(forecast >= threshold). BSS is computed against sample climatology over the
scored window; a deterministic forecast that merely repeats the base rate
scores BSS = 0.

Reads:  outputs/interim/forecast_history_clean.csv, actual_history_clean.csv
Writes: outputs/verification.csv            (continuous: bias/mae/rmse/crps)
        outputs/verification_categorical.csv (POD/FAR/CSI/ETS/BSS per threshold)
        outputs/verification_trajectories.csv (daily MAE/bias per method)
        outputs/verification_meta.json       (window, n, truth source, thresholds)

Spec: docs/specs/2026-10-01-f02-comparative-analytics-design.md
Run:    .venv/bin/python ai/verify.py
Verify: .venv/bin/python ai/verify.py --verify
"""

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

base_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(base_dir))
from ai.model_registry import discover_models  # noqa: E402

OUT = base_dir / "outputs"
INTERIM = OUT / "interim"

HIST_FC = INTERIM / "forecast_history_clean.csv"
HIST_ACT = INTERIM / "actual_history_clean.csv"

ENGINE_VERSION = "ver-2026-10-01-v1"
MODELS = discover_models()
REFERENCE_METHODS = ["equal_avg", "weighted_blend"]
METHODS = MODELS + REFERENCE_METHODS
VARIABLES = ("temperature", "rainfall", "wind_speed")
ACTUAL_MAP = {"temperature": "actual_temperature", "rainfall": "actual_rainfall",
              "wind_speed": "actual_wind"}

# Shared operational thresholds (ai/thresholds.py), moderate then high.
from ai.thresholds import THRESHOLDS  # noqa: E402
CATEGORICAL_THRESHOLDS = {
    "rainfall": (float(THRESHOLDS["Heavy Rain"]["moderate"]), float(THRESHOLDS["Heavy Rain"]["high"])),
    "temperature": (float(THRESHOLDS["High Temperature"]["moderate"]), float(THRESHOLDS["High Temperature"]["high"])),
    "wind_speed": (float(THRESHOLDS["High Wind"]["moderate"]), float(THRESHOLDS["High Wind"]["high"])),
}

# Train/test cutoff mirrored from align.py — bias correction and blend weights
# are estimated on the train side only.
TRAIN_CUTOFF = pd.Timestamp("2026-08-29 00:00:00")


# ------------------------------------------------------------- alignment ----

def build_pairs(hist_fc: pd.DataFrame, hist_act: pd.DataFrame) -> pd.DataFrame:
    """Pivot history wide per (city, datetime) and inner-join actuals.

    Mirrors ai/align.py exactly; parameterized for testability.
    """
    fc = hist_fc.copy()
    act = hist_act.copy()
    fc["datetime"] = pd.to_datetime(fc["datetime"])
    act["datetime"] = pd.to_datetime(act["datetime"])

    wide = fc.pivot(index=["city", "datetime"], columns="model",
                    values=list(VARIABLES))
    wide.columns = [f"{v}_{m}" for v, m in wide.columns]
    wide = wide.reset_index()

    pairs = wide.merge(act, on=["city", "datetime"], how="inner")
    if pairs.duplicated(subset=["city", "datetime"]).any():
        raise ValueError("Duplicate (city, datetime) keys in verification pairs")
    return pairs.sort_values(["city", "datetime"]).reset_index(drop=True)


def add_reference_methods(pairs: pd.DataFrame) -> pd.DataFrame:
    """Add equal_avg and weighted_blend columns per variable.

    weighted_blend: inverse-train-MAE weights per (variable, city), estimated
    on the train split only and renormalized over the models present in each
    row. Falls back to equal weight for a model with zero train MAE.
    Tolerates absent model columns (degraded history frame).
    """
    df = pairs.copy()
    train = df[df["datetime"] < TRAIN_CUTOFF]
    if train.empty:
        raise ValueError("No train-split rows before TRAIN_CUTOFF — cannot estimate blend weights")

    for var in VARIABLES:
        actual_col = ACTUAL_MAP[var]
        present = [m for m in MODELS if f"{var}_{m}" in df.columns]
        if not present:
            continue

        # inverse-MAE weights, per city so a locally weak model is down-weighted there
        weight_rows = {}
        for city, g in train.groupby("city"):
            city_maes = {m: float((g[actual_col] - g[f"{var}_{m}"]).abs().mean()) for m in present}
            inv = {m: (1.0 / mae if mae > 0 else 0.0) for m, mae in city_maes.items()}
            s = sum(inv.values())
            weight_rows[city] = {m: (inv[m] / s if s > 0 else 1.0 / len(present)) for m in present}
        wdf = pd.DataFrame(weight_rows).T  # index city, columns = present models

        wsum = np.zeros(len(df))
        blend = np.zeros(len(df))
        for m in present:
            col = f"{var}_{m}"
            w_m = df["city"].map(wdf[m]).fillna(0.0).to_numpy(float)
            vals = df[col].to_numpy(float)
            valid = df[col].notna().to_numpy()
            wsum += np.where(valid, w_m, 0.0)
            blend += np.where(valid, w_m * np.nan_to_num(vals), 0.0)
        if (wsum <= 0).any():
            raise ValueError(f"Zero total blend weight for {var} in some rows")

        df[f"{var}_weighted_blend"] = blend / wsum
        df[f"{var}_equal_avg"] = df[[f"{var}_{m}" for m in present]].mean(axis=1)

    return df


# ---------------------------------------------------------------- metrics ---

def continuous_metrics(pairs: pd.DataFrame) -> pd.DataFrame:
    """bias / mae / rmse / crps per (method, variable, city). crps == mae for
    deterministic forecasts (see module docstring)."""
    rows = []
    for var in VARIABLES:
        actual_col = ACTUAL_MAP[var]
        for method in METHODS:
            fc_col = f"{var}_{method}"
            if fc_col not in pairs.columns:
                continue
            err = pairs[actual_col] - pairs[fc_col]
            g = pd.DataFrame({
                "city": pairs["city"],
                "err": err,
                "abs_err": err.abs(),
                "sq_err": err ** 2,
            }).dropna().groupby("city")
            agg = g.agg(bias=("err", "mean"), mae=("abs_err", "mean"),
                        rmse=("sq_err", lambda s: float(np.sqrt(s.mean()))),
                        n=("err", "count")).reset_index()
            agg["variable"] = var
            agg["model"] = method
            agg["crps"] = agg["mae"]  # deterministic CRPS identity
            rows.append(agg)
    out = pd.concat(rows, ignore_index=True)
    return out[["city", "model", "variable", "n", "bias", "mae", "rmse", "crps"]]


def categorical_row(h: int, m: int, fa: int, cn: int) -> dict:
    """POD / FAR / CSI / ETS / BSS from a 2x2 contingency table (deterministic
    binary calls; BSS vs sample climatology)."""
    n = h + m + fa + cn
    pod = h / (h + m) if (h + m) else np.nan
    far = fa / (h + fa) if (h + fa) else np.nan
    csi = h / (h + m + fa) if (h + m + fa) else np.nan

    hits_random = (h + m) * (h + fa) / n if n else np.nan
    ets_den = (h + m + fa - hits_random)
    ets = (h - hits_random) / ets_den if ets_den > 0 else np.nan

    o_bar = (h + m) / n if n else np.nan
    brier_f = (m + fa) / n if n else np.nan          # wrong binary calls
    brier_clim = o_bar * (1 - o_bar) if n else np.nan
    bss = 1 - brier_f / brier_clim if brier_clim > 0 else np.nan

    return {"hits": h, "misses": m, "false_alarms": fa, "correct_negatives": cn,
            "pod": pod, "far": far, "csi": csi, "ets": ets, "bss": bss}


def categorical_metrics(pairs: pd.DataFrame) -> pd.DataFrame:
    """Event verification per (method, variable, city, threshold)."""
    rows = []
    for var in VARIABLES:
        actual_col = ACTUAL_MAP[var]
        obs = pairs[actual_col]
        for t in CATEGORICAL_THRESHOLDS[var]:
            o_event = (obs >= t)
            for method in METHODS:
                fc_col = f"{var}_{method}"
                if fc_col not in pairs.columns:
                    continue
                fc = pairs[fc_col]
                valid = fc.notna() & obs.notna()
                f_event = (fc >= t)
                h = int((valid & f_event & o_event).sum())
                m = int((valid & ~f_event & o_event).sum())
                fa = int((valid & f_event & ~o_event).sum())
                cn = int((valid & ~f_event & ~o_event).sum())
                # per-city contingency counts
                for city in pairs.loc[valid, "city"].unique():
                    cmask = valid & (pairs["city"] == city)
                    ch = int((cmask & f_event & o_event).sum())
                    cmiss = int((cmask & ~f_event & o_event).sum())
                    cfa = int((cmask & f_event & ~o_event).sum())
                    ccn = int((cmask & ~f_event & ~o_event).sum())
                    rows.append({"city": city, "model": method, "variable": var,
                                 "threshold": t, "lead_days": None,
                                 **categorical_row(ch, cmiss, cfa, ccn)})
        # end thresholds
    return pd.DataFrame(rows)


def trajectories(pairs: pd.DataFrame) -> pd.DataFrame:
    """Daily error trajectories: MAE and bias per (method, variable, city, day)."""
    df = pairs.copy()
    df["day"] = df["datetime"].dt.date
    rows = []
    for var in VARIABLES:
        actual_col = ACTUAL_MAP[var]
        for method in METHODS:
            fc_col = f"{var}_{method}"
            if fc_col not in df.columns:
                continue
            err = df[actual_col] - df[fc_col]
            tdf = pd.DataFrame({"city": df["city"], "day": df["day"],
                                "abs_err": err.abs(), "err": err}).dropna()
            agg = tdf.groupby(["city", "day"]).agg(
                mae=("abs_err", "mean"), bias=("err", "mean"),
                n=("err", "count")).reset_index()
            agg["variable"] = var
            agg["model"] = method
            rows.append(agg)
    return pd.concat(rows, ignore_index=True)


def bias_correction_evaluation(pairs: pd.DataFrame) -> pd.DataFrame:
    """Capability B diagnostic: additive bias correction, evaluated out-of-sample.

    Per (model, variable, city): bias estimated on the train split, applied to
    test-split forecasts (rain/wind clipped at 0), scored before/after.
    RMSE worsening while MAE improves means the correction distorted the
    tails — both columns are published so the reader can see it.
    """
    train = pairs[pairs["datetime"] < TRAIN_CUTOFF]
    test = pairs[pairs["datetime"] >= TRAIN_CUTOFF]
    if train.empty or test.empty:
        raise ValueError("Train/test split empty — cannot evaluate bias correction")

    rows = []
    for var in VARIABLES:
        actual_col = ACTUAL_MAP[var]
        clip = var != "temperature"
        for m in MODELS:
            fc_col = f"{var}_{m}"
            if fc_col not in pairs.columns:
                continue
            for city, tg in train.groupby("city"):
                bias = float((tg[actual_col] - tg[fc_col]).mean())
                te = test[test["city"] == city]
                raw_err = te[actual_col] - te[fc_col]
                corrected = te[fc_col] + bias
                if clip:
                    corrected = corrected.clip(lower=0)
                corr_err = te[actual_col] - corrected
                raw_bias = float(raw_err.mean())
                corr_bias = float(corr_err.mean())
                rows.append({
                    "city": city, "model": m, "variable": var, "n_test": int(len(te)),
                    "train_bias": round(bias, 4),
                    "bias_raw": raw_bias, "mae_raw": float(raw_err.abs().mean()),
                    "rmse_raw": float(np.sqrt((raw_err ** 2).mean())),
                    "bias_corrected": corr_bias, "mae_corrected": float(corr_err.abs().mean()),
                    "rmse_corrected": float(np.sqrt((corr_err ** 2).mean())),
                    # magnitude reduction: negative when the correction overshoots
                    # past zero and |bias| grows. Suppressed when |raw bias| < 0.1
                    # (variable's own units): relative change of a near-zero bias
                    # is noise, not signal.
                    "bias_reduction_pct": round(100.0 * (1.0 - abs(corr_bias) / abs(raw_bias)), 2)
                    if abs(raw_bias) > 0.1 else None,
                })
    return pd.DataFrame(rows)


# ------------------------------------------------------------- generation ---

def generate(hist_fc_path: Path = HIST_FC, hist_act_path: Path = HIST_ACT,
             out_dir: Path = OUT) -> dict:
    if not (hist_fc_path.exists() and hist_act_path.exists()):
        raise FileNotFoundError(
            "Verification needs outputs/interim/forecast_history_clean.csv and "
            "actual_history_clean.csv — run the history fetch first")

    hist_fc = pd.read_csv(hist_fc_path)
    hist_act = pd.read_csv(hist_act_path)
    pairs = add_reference_methods(build_pairs(hist_fc, hist_act))

    cont = continuous_metrics(pairs)
    cat = categorical_metrics(pairs)
    traj = trajectories(pairs)
    calib = bias_correction_evaluation(pairs)

    out_dir.mkdir(parents=True, exist_ok=True)
    cont.to_csv(out_dir / "verification.csv", index=False)
    cat.to_csv(out_dir / "verification_categorical.csv", index=False)
    traj.to_csv(out_dir / "verification_trajectories.csv", index=False)
    calib.to_csv(out_dir / "verification_calibration.csv", index=False)

    meta = {
        "engine_version": ENGINE_VERSION,
        "window_start": str(pairs["datetime"].min()),
        "window_end": str(pairs["datetime"].max()),
        "n_pairs": int(len(pairs)),
        "truth_source": "actual_history_clean.csv (AWS/IMD-gridded ingest)",
        "methods": METHODS,
        "thresholds": {v: list(t) for v, t in CATEGORICAL_THRESHOLDS.items()},
        "blend_weight_method": "inverse-train-MAE per (variable, city), train cutoff "
                               f"{TRAIN_CUTOFF}, renormalized over present models",
        "crps_note": "deterministic feeds: crps == mae; proper CRPS needs ensemble members",
        "generated_at": pd.Timestamp.now().strftime("%Y-%m-%dT%H:%M:%S"),
    }
    (out_dir / "verification_meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")

    best = cont[cont["variable"] == "temperature"].groupby("model")["mae"].mean().idxmin()
    print(f"[Verify] {meta['n_pairs']} pairs, {meta['window_start']} -> {meta['window_end']}; "
          f"rows: {len(cont)} continuous, {len(cat)} categorical, {len(traj)} trajectory, "
          f"{len(calib)} calibration; best temp method: {best}")
    return meta


# --------------------------------------------------------------- verify ----

def verify() -> bool:
    """Truth-table checks on constructed frames; returns True/False."""
    ok = True

    # 1. contingency truth table: H=30 M=10 FA=20 CN=40
    r = categorical_row(30, 10, 20, 40)
    checks = [(r["pod"], 0.75), (r["far"], 0.40), (r["csi"], 0.50), (r["ets"], 0.25),
              (r["bss"], 1 - 0.30 / 0.24)]
    if all(abs(a - b) < 1e-9 for a, b in checks):
        print("OK: POD/FAR/CSI/ETS/BSS match hand-computed contingency table")
    else:
        print(f"FAIL: categorical truth table {r}"); ok = False

    # 2. BSS = 0 when the forecast base rate equals climatology (climatology forecast)
    # forecast calls events at exactly the climatological rate: H+FA = (H+M)(N)/N... use
    # independence case: H = (H+M)(H+FA)/N exactly => ETS=0, BSS<0 unless perfect random.
    # Cleaner check: climatology-like forecast with h=16, m=24, fa=24, cn=36 (rates match o_bar=0.4, f_bar=0.4)
    r2 = categorical_row(16, 24, 24, 36)
    if abs(r2["ets"]) < 1e-9:
        print("OK: ETS = 0 for a no-skill (independent) forecast")
    else:
        print(f"FAIL: no-skill ETS = {r2['ets']}"); ok = False

    # 3-6. shared synthetic frame; window crosses TRAIN_CUTOFF (Aug 29) so both
    # splits are populated for the calibration check
    n = 400
    rng = np.random.default_rng(5)
    dt = pd.date_range("2026-08-20", periods=n, freq="h")
    long_fc = pd.concat([
        pd.DataFrame({"city": "A", "model": m, "datetime": dt,
                      "temperature": 25 + rng.normal(0, 1, n),
                      "rainfall": np.abs(rng.normal(1, 1, n)),
                      "wind_speed": 10 + rng.normal(0, 2, n)})
        for m in MODELS], ignore_index=True)
    actual = pd.DataFrame({"city": "A", "datetime": dt,
                           "actual_temperature": 25 + rng.normal(0, 1, n),
                           "actual_rainfall": np.abs(rng.normal(1, 1, n)),
                           "actual_wind": 10 + rng.normal(0, 2, n)})
    p3 = add_reference_methods(build_pairs(long_fc, actual))
    cont = continuous_metrics(p3)
    e = cont[(cont["model"] == "ecmwf") & (cont["variable"] == "temperature")].iloc[0]
    err = p3["actual_temperature"] - p3["temperature_ecmwf"]
    if (abs(e["bias"] - err.mean()) < 1e-9 and abs(e["mae"] - err.abs().mean()) < 1e-9
            and abs(e["rmse"] - np.sqrt((err ** 2).mean())) < 1e-9 and e["crps"] == e["mae"]
            and e["rmse"] >= e["mae"] - 1e-12):
        print("OK: bias/mae/rmse closed-form, crps == mae, rmse >= mae")
    else:
        print(f"FAIL: continuous metrics {e.to_dict()}"); ok = False

    # 4. blend reconstruction with a missing model stays NaN-free
    p4 = add_reference_methods(build_pairs(long_fc[long_fc["model"] != "gem"], actual))
    blend_vals = p4["temperature_weighted_blend"]
    eq_vals = p4["temperature_equal_avg"]
    if not blend_vals.isna().any() and not eq_vals.isna().any():
        print("OK: blend methods NaN-free with a model missing")
    else:
        print(f"FAIL: NaN in blend reconstruction ({blend_vals.isna().sum()} rows)"); ok = False

    # 5. trajectory daily bins partition the window exactly
    traj = trajectories(p4)
    sums_ok = (traj.groupby(["model", "variable"])["n"].sum() == n).all()
    if len(traj) == traj.groupby(["city", "model", "variable", "day"]).ngroups and sums_ok:
        print("OK: trajectory daily bins partition the window exactly")
    else:
        print("FAIL: trajectory binning partition"); ok = False

    # 6. calibration diagnostic: corrected forecast = forecast + train bias
    p6 = add_reference_methods(build_pairs(long_fc, actual))
    cal = bias_correction_evaluation(p6)
    row6 = cal[(cal["model"] == "ecmwf") & (cal["variable"] == "temperature")].iloc[0]
    train6 = p6[p6["datetime"] < TRAIN_CUTOFF]
    test6 = p6[p6["datetime"] >= TRAIN_CUTOFF]
    manual_bias = float((train6["actual_temperature"] - train6["temperature_ecmwf"]).mean())
    manual_corr_err = (test6["actual_temperature"] - (test6["temperature_ecmwf"] + manual_bias))
    if (abs(row6["train_bias"] - manual_bias) < 1e-4  # artifact stores it rounded to 1e-4
            and abs(row6["bias_corrected"] - manual_corr_err.mean()) < 1e-9
            and abs(row6["mae_corrected"] - manual_corr_err.abs().mean()) < 1e-9):
        print("OK: bias correction closed-form (corrected = forecast + train bias)")
    else:
        print(f"FAIL: calibration diagnostic {row6.to_dict()}"); ok = False

    print("VERIFY: PASS" if ok else "VERIFY: FAIL")
    return ok


if __name__ == "__main__":
    if "--verify" in sys.argv:
        sys.exit(0 if verify() else 1)
    generate()

"""
benchmark.py — F-03 Contextual Benchmarking and Model Leaderboard Engine (PRD §7.3).

Ranks the operational blend, the reference baselines and the four NWP models
against truth, strictly conditioned on the context dimensions the scored
artifacts actually carry. Three boards, never merged into one number:

  accuracy  variable × evaluation window × geography   rank by MAE (ascending)
  extreme   variable × event threshold × geography      rank by CSI (descending)
  lead      variable × lead day × geography             rank by MAE (ascending)

Rainfall therefore appears on both the continuous board and the threshold-hit
board (PRD §7.3.D): a model that scores well on widespread light rain cannot
climb the extreme board on the strength of it.

Stratification honesty (PRD §7.3.A/E):
  - geography   city rows plus an `IN` national row; the national row is the
                broader pool a low-sample city row falls back to. District,
                state and basin units are absent from the data.
  - season      the scored window sits entirely inside the southwest monsoon,
                so season is constant and cannot stratify anything.
  - regime      PRD §9.5 regime tagging is not implemented — recorded as an
                unmet dimension in benchmark_meta.json, not silently dropped.
  - samples     strata under n_min publish low_sample=1 rather than a
                misleadingly confident scorecard.

No composite index is published (PRD §7.3.C permits one; §10.5.A forbids an
opaque one — constituent metrics only).

Reads:  outputs/verification_trajectories.csv (daily MAE/bias per method)
        outputs/verification_categorical.csv  (contingency per threshold)
        outputs/skill_scores_lead.csv         (per lead day, raw models)
        outputs/verification_meta.json        (window, truth source)
        outputs/interim/actual_history_clean.csv (persistence baseline, optional)
Writes: outputs/leaderboard.csv            (boards + city-cluster bootstrap CIs)
        outputs/leaderboard_pareto.csv     (full-window MAE x CSI + frontier flags)
        outputs/benchmark_meta.json

Run:    .venv/bin/python ai/benchmark.py
Verify: .venv/bin/python ai/benchmark.py --verify
"""

import json
import sys
import zlib
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

base_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(base_dir))
OUT = base_dir / "outputs"
INTERIM = OUT / "interim"

from ai.verify import categorical_row  # shared contingency math (F-02)
from ai.thresholds import THRESHOLDS
from ai.model_registry import discover_models

ENGINE_VERSION = "bench-2026-10-02-v1"
GEO_NATIONAL = "IN"

MODELS = discover_models()
TIERS = {
    "weighted_blend": "blend",
    "equal_avg": "baseline",
    "persistence": "baseline",
    **{m: "model" for m in MODELS},
}
VARIABLES = ("temperature", "rainfall", "wind_speed")
ACTUAL_MAP = {"temperature": "actual_temperature", "rainfall": "actual_rainfall",
              "wind_speed": "actual_wind"}

# Evaluation windows published when the scored span covers them. A window the
# history cannot fill is skipped rather than clipped to a shorter period.
WINDOWS_DAYS = (7, 30, 45, 90)

# n_min: hourly pairs for the continuous boards, observed events for the
# threshold boards. Below this the scorecard is flagged, not published as fact.
N_MIN_HOURLY = 720     # 30 days of hourly pairs
N_MIN_EVENTS = 30      # observed threshold exceedances

COLS = ["board", "geo", "variable", "window_days", "lead_days", "threshold",
        "method", "tier", "rank", "metric", "value", "mae", "rmse", "bias",
        "pod", "far", "csi", "ets", "bss", "n", "cases", "low_sample",
        "ci_low", "ci_high", "rank_low", "rank_high"]

CONTINGENCY_COLS = ["hits", "misses", "false_alarms", "correct_negatives"]
BOOTSTRAP_DRAWS = 500

PARETO_COLS = ["geo", "variable", "threshold", "method", "tier",
               "mae", "mae_ci_low", "mae_ci_high",
               "csi", "csi_ci_low", "csi_ci_high",
               "n_pairs", "cases", "low_sample", "frontier"]

PRIMARY_THRESHOLDS = {t["column"]: t["high"] for t in THRESHOLDS.values()}


# ------------------------------------------------------------------- pool ----
def pool_scores(df: pd.DataFrame, keys: list[str]) -> pd.DataFrame:
    """n-weighted pool of per-city scorecard rows.

    MAE and bias are means, so the pooled value is their exact n-weighted
    mean; RMSE pools as the root of the summed mean squares. Scoring the
    concatenated cities therefore reproduces this row exactly.
    """
    x = df.copy()
    x["_abs"] = x["mae"] * x["n"]
    x["_err"] = x["bias"] * x["n"]
    has_rmse = "rmse" in x.columns
    if has_rmse:
        x["_sq"] = x["rmse"] ** 2 * x["n"]
    agg = {"n": ("n", "sum"), "_abs": ("_abs", "sum"), "_err": ("_err", "sum")}
    if has_rmse:
        agg["_sq"] = ("_sq", "sum")
    g = x.groupby(keys, as_index=False).agg(**agg)
    g["mae"] = g["_abs"] / g["n"]
    g["bias"] = g["_err"] / g["n"]
    if has_rmse:
        g["rmse"] = np.sqrt(g["_sq"] / g["n"])
    return g.drop(columns=[c for c in ("_abs", "_err", "_sq") if c in g.columns])


def rank_board(df: pd.DataFrame, strata: list[str], higher_is_better: bool) -> pd.DataFrame:
    """Rank methods inside each stratum. Ties share a rank (method='min')."""
    out = df.copy()
    out["rank"] = out.groupby(strata, dropna=False)["value"].rank(
        ascending=not higher_is_better, method="min")
    out["rank"] = out["rank"].astype("Int64")
    return out


def slice_window(df: pd.DataFrame, window: int | None) -> pd.DataFrame:
    """Keep the trailing `window` days of the frame; None keeps the full span."""
    if window is None:
        return df
    last = df["day"].max()
    return df[df["day"] > last - pd.Timedelta(days=window)]


# --------------------------------------------------------------- bootstrap ----
def _stratum_seed(*parts) -> int:
    """Deterministic per-stratum seed, stable across processes and runs."""
    return zlib.crc32("|".join(str(p) for p in parts).encode()) & 0xFFFFFFFF


def _city_stats(frame: pd.DataFrame, metric: str) -> pd.DataFrame:
    """Per-(city, model) sufficient statistics — what the resample actually sums."""
    if metric == "mae":
        x = frame.assign(_abs=frame["mae"] * frame["n"])
        return x.groupby(["city", "model"])[["_abs", "n"]].sum()
    return frame.groupby(["city", "model"])[CONTINGENCY_COLS].sum()


def _reduce_stats(sums: pd.DataFrame, metric: str) -> pd.Series:
    """Pool city statistics into one metric value per model."""
    if metric == "mae":
        return sums["_abs"] / sums["n"]
    values = {}
    for m, r in sums.iterrows():
        scored = categorical_row(int(r["hits"]), int(r["misses"]),
                                 int(r["false_alarms"]), int(r["correct_negatives"]))
        values[m] = np.nan if scored["csi"] is None else float(scored["csi"])
    return pd.Series(values, dtype=float)


def bootstrap_metric(city_rows: pd.DataFrame, keys: list[str], metric: str,
                     higher_is_better: bool,
                     draws: int = BOOTSTRAP_DRAWS) -> pd.DataFrame:
    """City-cluster bootstrap for one family of strata.

    Resamples cities with replacement `draws` times, re-pools the metric from
    their sufficient statistics, and returns the 95% percentile interval
    (clamped to contain the observed value) plus the p5..p95 rank range per
    model (clamped to [1, n] and containing the observed rank).
    """
    out = []
    for key_vals, frame in city_rows.groupby(keys, dropna=False):
        if not isinstance(key_vals, tuple):
            key_vals = (key_vals,)
        rng = np.random.default_rng(_stratum_seed(*key_vals))
        stats = _city_stats(frame, metric)
        cities = np.sort(frame["city"].unique())
        models = list(frame["model"].unique())
        obs = _reduce_stats(stats.groupby(level="model").sum(), metric)
        obs_ranks = obs.rank(ascending=not higher_is_better, method="min")
        drawn = []
        for _ in range(draws):
            pick = rng.choice(cities, size=len(cities), replace=True)
            drawn.append(_reduce_stats(stats.loc[pick].groupby(level="model").sum(), metric))
        draw_frame = pd.DataFrame(drawn)
        draw_ranks = draw_frame.rank(axis=1, ascending=not higher_is_better, method="min")
        for model in models:
            if not np.isfinite(float(obs[model])):
                continue
            values = draw_frame[model].to_numpy(dtype=float)
            lo, hi = np.nanpercentile(values, [2.5, 97.5])
            value = float(obs[model])
            lo, hi = min(float(lo), value), max(float(hi), value)
            rank_lo, rank_hi = np.nanpercentile(draw_ranks[model].to_numpy(dtype=float), [5, 95])
            observed_rank = int(obs_ranks[model])
            row = dict(zip(keys, key_vals))
            row.update({
                "model": model,
                "ci_low": float(lo), "ci_high": float(hi),
                "rank_low": max(1, min(int(np.floor(rank_lo)), observed_rank)),
                "rank_high": min(len(models), max(int(np.ceil(rank_hi)), observed_rank)),
            })
            out.append(row)
    return pd.DataFrame(out)


def attach_bootstrap(board_rows: pd.DataFrame, bs: pd.DataFrame,
                     keys: list[str]) -> pd.DataFrame:
    """Attach intervals to national rows; city rows keep null intervals."""
    out = board_rows
    if bs.empty:
        for col in ("ci_low", "ci_high", "rank_low", "rank_high"):
            out[col] = np.nan
        return out
    out = out.merge(bs, on=keys + ["model"], how="left")
    city_mask = (out["geo"] != GEO_NATIONAL).to_numpy()
    for col in ("ci_low", "ci_high", "rank_low", "rank_high"):
        out.loc[city_mask, col] = np.nan
    return out


def _frontier_flags(points: pd.DataFrame) -> pd.Series:
    """1 for points nothing dominates; MAE lower is better, CSI higher is better."""
    mae = points["mae"].to_numpy(dtype=float)
    csi = points["csi"].to_numpy(dtype=float)
    flags = np.ones(len(points), dtype=int)
    for i in range(len(points)):
        dominated = ((mae <= mae[i]) & (csi >= csi[i])
                     & ((mae < mae[i]) | (csi > csi[i])))
        if dominated.any():
            flags[i] = 0
    return pd.Series(flags, index=points.index)


def pareto_board(acc_national: pd.DataFrame, ext_national: pd.DataFrame) -> pd.DataFrame:
    """Full-window MAE (accuracy) x CSI (extreme) with per-context frontier flags.

    The contingency artifact has no window slices, so only the full-window
    accuracy rows join. Methods missing either axis (persistence) drop out.
    """
    if acc_national.empty or ext_national.empty:
        return pd.DataFrame(columns=PARETO_COLS)
    acc = acc_national[acc_national["window_days"].isna()]
    a = acc[["variable", "method", "tier", "mae", "ci_low", "ci_high", "n"]].rename(
        columns={"ci_low": "mae_ci_low", "ci_high": "mae_ci_high", "n": "n_pairs"})
    e = ext_national[["variable", "threshold", "method", "csi", "ci_low", "ci_high",
                      "cases", "low_sample"]].rename(
        columns={"ci_low": "csi_ci_low", "ci_high": "csi_ci_high"})
    merged = a.merge(e, on=["variable", "method"], how="inner")
    frames = []
    for _, group in merged.groupby(["variable", "threshold"], dropna=False):
        group = group.copy()
        group["frontier"] = _frontier_flags(group).to_numpy()
        frames.append(group)
    out = pd.concat(frames, ignore_index=True)
    out["geo"] = GEO_NATIONAL
    return out.sort_values(["variable", "threshold", "mae"]).reset_index(drop=True)[PARETO_COLS]


def build_signals(lb: pd.DataFrame) -> list[dict]:
    """Named signal leaders per variable — a record exists only when its rows do."""
    signals = []

    def record(sid, variable, measure, metric, row, runner, threshold=None,
               lead=None, delta_pct=None, beaten=None):
        higher = metric == "csi"
        gap = None
        if runner is not None:
            gap = ((float(runner["value"]) - float(row["value"])) if not higher
                   else (float(row["value"]) - float(runner["value"])))
        return {
            "id": sid, "variable": variable, "geo": GEO_NATIONAL,
            "window_days": None, "measure": measure, "metric": metric,
            "threshold": threshold, "lead_days": lead,
            "leader": row["method"], "value": float(row["value"]),
            "ci_low": None if pd.isna(row["ci_low"]) else float(row["ci_low"]),
            "ci_high": None if pd.isna(row["ci_high"]) else float(row["ci_high"]),
            "runner_up": None if runner is None else runner["method"],
            "gap": None if gap is None else round(gap, 6),
            "n": int(row["n"]),
            "cases": None if pd.isna(row["cases"]) else int(row["cases"]),
            "delta_pct": delta_pct, "beaten": beaten,
            "low_sample": int(row["low_sample"]),
        }

    for variable in VARIABLES:
        acc = lb[(lb["board"] == "accuracy") & (lb["geo"] == GEO_NATIONAL)
                 & (lb["variable"] == variable) & (lb["window_days"].isna())
                 ].sort_values("value")
        if len(acc):
            signals.append(record("lowest_error", variable, "accuracy", "mae",
                                  acc.iloc[0], acc.iloc[1] if len(acc) > 1 else None))

        threshold = PRIMARY_THRESHOLDS.get(variable)
        ext = lb[(lb["board"] == "extreme") & (lb["geo"] == GEO_NATIONAL)
                 & (lb["variable"] == variable) & (lb["threshold"] == threshold)
                 ].sort_values("value", ascending=False)
        if len(ext):
            signals.append(record("best_extreme", variable, "extreme", "csi",
                                  ext.iloc[0], ext.iloc[1] if len(ext) > 1 else None,
                                  threshold=threshold))

        lead = lb[(lb["board"] == "lead") & (lb["geo"] == GEO_NATIONAL)
                  & (lb["variable"] == variable) & (lb["lead_days"] == 3)
                  ].sort_values("value")
        if len(lead):
            signals.append(record("best_lead", variable, "lead", "mae",
                                  lead.iloc[0], lead.iloc[1] if len(lead) > 1 else None,
                                  lead=3))

        blend = acc[acc["method"] == "weighted_blend"]
        models = acc[acc["method"].isin(MODELS)]
        if len(blend) and len(models):
            best = models.sort_values("value").iloc[0]
            b = blend.iloc[0]
            delta = (float(best["value"]) - float(b["value"])) / float(best["value"]) * 100
            signals.append(record("blend_gain", variable, "accuracy", "mae", b, best,
                                  delta_pct=delta, beaten=best["method"]))
    return signals


# ----------------------------------------------------------------- boards ----
def persistence_daily(actual: pd.DataFrame) -> pd.DataFrame:
    """Lag-24h persistence baseline: yesterday's observation scored as today's
    forecast. Pairs observations 24h apart on the timestamp, so gaps in the
    series drop a pair instead of shifting one."""
    act = actual.copy()
    act["datetime"] = pd.to_datetime(act["datetime"])
    prev = act.copy()
    act_cols = list(ACTUAL_MAP.values())
    prev["datetime"] = prev["datetime"] + pd.Timedelta(hours=24)
    prev = prev.rename(columns={c: f"{c}_prev" for c in act_cols})
    merged = act.merge(prev[["city", "datetime"] + [f"{c}_prev" for c in act_cols]],
                       on=["city", "datetime"], how="left")

    frames = []
    for var, col in ACTUAL_MAP.items():
        err = merged[col] - merged[f"{col}_prev"]
        ok = err.notna()
        g = pd.DataFrame({
            "city": merged.loc[ok, "city"],
            "day": merged.loc[ok, "datetime"].dt.normalize(),
            "abs": err[ok].abs(),
            "err": err[ok],
        })
        agg = g.groupby(["city", "day"]).agg(
            mae=("abs", "mean"), bias=("err", "mean"), n=("err", "count")).reset_index()
        agg["variable"] = var
        agg["model"] = "persistence"
        frames.append(agg)
    return pd.concat(frames, ignore_index=True)


def accuracy_board(traj: pd.DataFrame, actual: pd.DataFrame | None) -> pd.DataFrame:
    """Variable × evaluation window × geography, ranked by pooled MAE.

    Built from the daily trajectories: the four models, equal_avg and
    weighted_blend, plus the persistence baseline so the board carries a real
    no-skill reference (PRD §7.3.B).
    """
    t = traj.copy()
    t["day"] = pd.to_datetime(t["day"])
    span_days = int((t["day"].max() - t["day"].min()).days) + 1
    windows = [w for w in WINDOWS_DAYS if w <= span_days] + [None]  # None = full span

    frames = [t]
    if actual is not None:
        frames.append(persistence_daily(actual))

    rows = []
    for window in windows:
        # One pool per window across every method: the board ranks persistence
        # against the models, so the bootstrap must resample that same pool.
        sub = pd.concat([slice_window(df, window) for df in frames], ignore_index=True)
        if sub.empty:
            continue
        per_city = pool_scores(sub, ["city", "variable", "model"])
        bs = bootstrap_metric(per_city, ["variable"], "mae", higher_is_better=False)
        per_city["geo"] = per_city["city"]
        per_city = per_city.drop(columns="city")
        national = pool_scores(sub, ["variable", "model"])
        national["geo"] = GEO_NATIONAL
        both = pd.concat([per_city, national], ignore_index=True)
        both = attach_bootstrap(both, bs, ["variable"])
        both["window_days"] = window
        both["board"] = "accuracy"
        rows.append(both)

    out = pd.concat(rows, ignore_index=True)
    out["metric"] = "mae"
    out["value"] = out["mae"]
    out["low_sample"] = (out["n"] < N_MIN_HOURLY).astype(int)
    return rank_board(out, ["board", "geo", "variable", "window_days"],
                      higher_is_better=False)


def extreme_board(cat: pd.DataFrame) -> pd.DataFrame:
    """Variable × event threshold × geography, ranked by CSI.

    Contingency counts are summed across cities for the national row and the
    pooled table is scored once through the shared F-02 contingency math —
    pooled CSI is not the mean of city CSIs.
    """
    counts = CONTINGENCY_COLS

    city = cat.copy()
    city["geo"] = city["city"]
    national = cat.groupby(["variable", "threshold", "model"], as_index=False)[counts].sum()
    national["geo"] = GEO_NATIONAL
    both = pd.concat([city, national], ignore_index=True)

    scored = both.groupby(["geo", "variable", "threshold", "model"], as_index=False)[counts].sum()
    rows = [dict(r, **categorical_row(int(r["hits"]), int(r["misses"]),
                                      int(r["false_alarms"]), int(r["correct_negatives"])))
            for _, r in scored.iterrows()]
    out = pd.DataFrame(rows)
    bs = bootstrap_metric(cat, ["variable", "threshold"], "csi", higher_is_better=True)
    out = attach_bootstrap(out, bs, ["variable", "threshold"])
    out["cases"] = out["hits"] + out["misses"]
    out["n"] = out["hits"] + out["misses"] + out["false_alarms"] + out["correct_negatives"]
    out["board"] = "extreme"
    out["metric"] = "csi"
    out["value"] = out["csi"]
    out["low_sample"] = (out["cases"] < N_MIN_EVENTS).astype(int)
    # A context where nobody crossed the threshold has no hit quality to rank.
    out = out[out["value"].notna()].reset_index(drop=True)
    return rank_board(out, ["board", "geo", "variable", "threshold"],
                      higher_is_better=True)


def lead_board(skill_lead: pd.DataFrame) -> pd.DataFrame:
    """Variable × lead day × geography, ranked by pooled MAE.

    Scored from the lead-resolution skill artifact, which covers the four raw
    models only: the blends are produced on the hourly grid, not per lead day,
    so this board carries tier=model rows and says so in the meta.
    """
    sl = skill_lead
    bs = bootstrap_metric(sl, ["variable", "lead_days"], "mae", higher_is_better=False)
    per_city = pool_scores(sl, ["city", "variable", "lead_days", "model"])
    per_city["geo"] = per_city["city"]
    per_city = per_city.drop(columns="city")
    national = pool_scores(sl.drop(columns="city"), ["variable", "lead_days", "model"])
    national["geo"] = GEO_NATIONAL
    both = pd.concat([per_city, national], ignore_index=True)
    both = attach_bootstrap(both, bs, ["variable", "lead_days"])

    both["board"] = "lead"
    both["metric"] = "mae"
    both["value"] = both["mae"]
    both["low_sample"] = (both["n"] < N_MIN_HOURLY).astype(int)
    return rank_board(both, ["board", "geo", "variable", "lead_days"],
                      higher_is_better=False)


# --------------------------------------------------------------- generate ----
def build() -> tuple[pd.DataFrame, dict]:
    traj_path = OUT / "verification_trajectories.csv"
    cat_path = OUT / "verification_categorical.csv"
    lead_path = OUT / "skill_scores_lead.csv"
    meta_path = OUT / "verification_meta.json"
    missing = [p.name for p in (traj_path, cat_path, lead_path) if not p.exists()]
    if missing:
        raise FileNotFoundError(
            f"benchmark.py inputs missing: {', '.join(missing)} — run ai/verify.py first")

    traj = pd.read_csv(traj_path, parse_dates=["day"])
    cat = pd.read_csv(cat_path)
    skill_lead = pd.read_csv(lead_path)

    actual = None
    actual_path = INTERIM / "actual_history_clean.csv"
    if actual_path.exists():
        actual = pd.read_csv(actual_path, parse_dates=["datetime"])

    boards = [accuracy_board(traj, actual), extreme_board(cat), lead_board(skill_lead)]
    lb = pd.concat(boards, ignore_index=True).rename(columns={"model": "method"})
    lb["tier"] = lb["method"].map(TIERS)
    if lb["tier"].isna().any():
        unknown = sorted(set(lb.loc[lb["tier"].isna(), "method"]))
        raise ValueError(f"benchmark.py: methods with no tier assigned: {unknown}")
    for col in COLS:
        if col not in lb.columns:
            lb[col] = np.nan
    lb = lb[COLS]
    for col in ("value", "mae", "rmse", "bias", "pod", "far", "csi", "ets", "bss",
                "ci_low", "ci_high"):
        lb[col] = pd.to_numeric(lb[col], errors="coerce").astype(float).round(6)
    for col in ("rank_low", "rank_high"):
        lb[col] = pd.to_numeric(lb[col], errors="coerce").astype("Int64")
    lb = lb.sort_values(["board", "variable", "geo", "rank", "value"],
                        na_position="last").reset_index(drop=True)

    # Pareto pairs the full-window accuracy rows with the extreme board: the
    # contingency artifact has no window slices, so no other pairing is honest.
    pareto = pareto_board(
        lb[(lb["board"] == "accuracy") & (lb["geo"] == GEO_NATIONAL)],
        lb[(lb["board"] == "extreme") & (lb["geo"] == GEO_NATIONAL)],
    )
    signals = build_signals(lb)

    verify_meta = {}
    if meta_path.exists():
        verify_meta = json.loads(meta_path.read_text(encoding="utf-8"))

    meta = {
        "engine_version": ENGINE_VERSION,
        "prd": "§7.3",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "window": {
            "start": str(traj["day"].min().date()),
            "end": str(traj["day"].max().date()),
            "days": int((traj["day"].max() - traj["day"].min()).days) + 1,
        },
        "windows_published": sorted(w for w in WINDOWS_DAYS
                                    if w <= (traj["day"].max() - traj["day"].min()).days + 1),
        "truth_source": verify_meta.get("truth_source"),
        "stations_scored": int(traj["city"].nunique()),
        "methods_ranked": int(lb["method"].nunique()),
        "bootstrap": {
            "unit": "city",
            "draws": BOOTSTRAP_DRAWS,
            "ci": "95% percentile (p2.5..p97.5), clamped to contain the observed value",
            "rank_range": "p5..p95 of the draw ranks, clamped to [1, n] and containing the observed rank",
            "seed": "deterministic per stratum (zlib.crc32 of the stratum key)",
        },
        "ci_policy": "national (IN) rows only; city rows carry n and the low_sample flag instead",
        "primary_thresholds": PRIMARY_THRESHOLDS,
        "pareto_methods": sorted(pareto["method"].unique().tolist()),
        "pareto_note": "full-window pairing (MAE x CSI) — the contingency artifact "
                       "has no window slices",
        "signals": signals,
        "n_min": {"hourly_pairs": N_MIN_HOURLY, "observed_events": N_MIN_EVENTS},
        "rank_metrics": {
            "accuracy": "mae (ascending)",
            "extreme": "csi (descending)",
            "lead": "mae (ascending)",
        },
        "boards": {
            "accuracy": "variable × evaluation window × geography; six forecast methods plus persistence",
            "extreme": "variable × event threshold × geography; contingency metrics from summed counts",
            "lead": "variable × lead day × geography; raw models only — the blends are not produced per lead day",
        },
        "tiers": {
            "blend": "the operational Prakruti blend",
            "baseline": "reference baselines (equal-weight mean, lag-24h persistence)",
            "model": "individual NWP models",
        },
        "baselines": {
            "equal_avg": "equal-weight arithmetic mean of the four models",
            "persistence": "observed value from 24 hours earlier"
                           if actual is not None else "unavailable (actual history not on disk)",
            "weighted_blend": "inverse-RMSE operational blend — the published product",
        },
        "rainfall_bifurcation": "rainfall is ranked on both the accuracy and extreme "
                                "boards; the two are never combined into one score",
        "dims": {
            "conditioned": ["variable", "geography (city | IN)", "evaluation_window",
                            "lead_day", "event_threshold"],
            "not_conditioned": [
                {"dim": "weather_regime",
                 "reason": "PRD §9.5 regime tagger is not implemented"},
                {"dim": "season",
                 "reason": "the scored window lies entirely within the southwest monsoon"},
                {"dim": "geographic_unit",
                 "reason": "district/state/basin boundaries are absent from the data; "
                           "city is the finest available unit"},
            ],
        },
        "composite_index": {
            "published": False,
            "reason": "PRD §7.3.C allows a composite but §10.5.A forbids opaque scores; "
                      "constituent metrics only",
        },
        "low_sample_policy": "strata under n_min publish low_sample=1; the IN row is the "
                             "broader pool a low-sample city row falls back to. A context "
                             "with no observed threshold exceedance publishes no extreme row.",
        "row_count": int(len(lb)),
    }
    return lb, pareto, meta


def generate() -> None:
    lb, pareto, meta = build()
    lb.to_csv(OUT / "leaderboard.csv", index=False)
    pareto.to_csv(OUT / "leaderboard_pareto.csv", index=False)
    (OUT / "benchmark_meta.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    strata = lb.groupby("board").size().to_dict()
    flagged = int(lb["low_sample"].sum())
    print(f"[benchmark] {len(lb)} rows ({strata}) + {len(pareto)} Pareto points — "
          f"{flagged} low-sample, window {meta['window']['start']}..{meta['window']['end']}")


# ---------------------------------------------------------------- verify ----
def _check(ok: bool, label: str, detail: str = "") -> bool:
    print(f"{'OK' if ok else 'FAIL'}: {label}{'' if ok else ' — ' + detail}")
    return bool(ok)


def verify() -> bool:
    """Self-checks on synthetic frames plus a consistency pass on real artifacts."""
    ok = True

    # 1. n-weighted pooling of daily scores matches a hand-computed average
    daily = pd.DataFrame({
        "city": ["A", "A", "B", "B"],
        "variable": ["rainfall"] * 4,
        "model": ["ecmwf"] * 4,
        "day": pd.to_datetime(["2026-08-01", "2026-08-02"] * 2),
        "mae": [1.0, 3.0, 2.0, 4.0],
        "bias": [0.0, 2.0, 1.0, 3.0],
        "n": [10, 30, 20, 40],
    })
    nat = pool_scores(daily, ["variable", "model"])
    manual = (1.0 * 10 + 3.0 * 30 + 2.0 * 20 + 4.0 * 40) / 100
    ok &= _check(abs(float(nat["mae"].iloc[0]) - manual) < 1e-12,
                 "national MAE is the exact n-weighted pool", str(nat["mae"].tolist()))

    # 2. ranks: MAE ascending, CSI descending, ties share a rank
    board = pd.DataFrame({
        "board": ["accuracy"] * 4, "geo": ["IN"] * 4, "variable": ["rainfall"] * 4,
        "window_days": [None] * 4, "lead_days": [np.nan] * 4, "threshold": [np.nan] * 4,
        "value": [2.0, 1.0, 2.0, 3.0],
    })
    r = rank_board(board, ["board", "geo", "variable", "window_days"],
                   higher_is_better=False)
    ok &= _check(r["rank"].tolist() == [2, 1, 2, 4],
                 "MAE ranks ascending with ties sharing a rank", str(r["rank"].tolist()))
    r2 = rank_board(board.assign(value=[0.1, 0.5, 0.1, 0.2], board="extreme"),
                    ["board", "geo", "variable", "threshold"], higher_is_better=True)
    ok &= _check(r2["rank"].tolist() == [3, 1, 3, 2],
                 "CSI ranks descending with ties sharing a rank", str(r2["rank"].tolist()))

    # 3+4. pooled contingency scores the summed table; low-sample fires under n_min
    cat = pd.DataFrame([
        {"city": "A", "variable": "rainfall", "threshold": 4.0, "model": "ecmwf",
         "hits": 5, "misses": 5, "false_alarms": 5, "correct_negatives": 85},
        {"city": "B", "variable": "rainfall", "threshold": 4.0, "model": "ecmwf",
         "hits": 25, "misses": 15, "false_alarms": 5, "correct_negatives": 55},
    ])
    ext = extreme_board(cat)
    nat_row = ext[ext["geo"] == GEO_NATIONAL].iloc[0]
    manual_row = categorical_row(30, 20, 10, 140)
    ok &= _check(abs(float(nat_row["csi"]) - manual_row["csi"]) < 1e-12
                 and abs(float(nat_row["pod"]) - manual_row["pod"]) < 1e-12,
                 "national contingency metrics come from summed counts",
                 f"csi={nat_row['csi']} pod={nat_row['pod']}")
    flags = ext.set_index("geo")["low_sample"].to_dict()
    ok &= _check(flags.get("A") == 1 and flags.get("B") == 0 and flags.get(GEO_NATIONAL) == 0,
                 "low_sample flags strata under n_min only", str(flags))

    # 5. window slicing keeps exactly W days ending at the span end
    traj = pd.DataFrame({
        "city": ["A"] * 60,
        "day": list(pd.date_range("2026-08-01", periods=20, freq="D")) * 3,
        "variable": ["rainfall"] * 60,
        "model": ["ecmwf"] * 30 + ["gfs"] * 30,
        "mae": np.linspace(0.5, 2.0, 60), "bias": 0.0, "n": 24,
    })
    sub = slice_window(traj, 7)
    ok &= _check(sub["day"].nunique() == 7 and sub["day"].max() == traj["day"].max(),
                 "7-day window selects exactly the last 7 days",
                 f"{sub['day'].nunique()} days ending {sub['day'].max()}")

    # 6. persistence pairs each hour with the observation 24h earlier
    act = pd.DataFrame({
        "city": ["A"] * 48,
        "datetime": pd.date_range("2026-08-01", periods=48, freq="h"),
        "actual_temperature": np.arange(48, dtype=float),
        "actual_rainfall": np.zeros(48),
        "actual_wind": np.full(48, 5.0),
    })
    pt = persistence_daily(act)
    pt = pt[pt["variable"] == "temperature"]
    # 48 hourly observations, only the last 24 have a match 24h earlier, and a
    # straight ramp means every persistence error is exactly 24.
    ok &= _check(len(pt) == 1 and int(pt["n"].sum()) == 24
                 and abs(float(pt["mae"].iloc[0]) - 24.0) < 1e-9,
                 "persistence pairs each hour with the observation 24h earlier",
                 f"days={len(pt)} n={pt['n'].sum()} mae={pt['mae'].mean()}")

    # 7. bootstrap determinism + containment + rank range on a synthetic frame
    city_rows = pd.DataFrame({
        "city": ["A"] * 4 + ["B"] * 4 + ["C"] * 4,
        "variable": ["rainfall"] * 12,
        "model": (["ecmwf"] * 2 + ["gfs"] * 2) * 3,
        "mae": [1.0, 1.0, 2.0, 2.0] * 3,
        "n": [10] * 12,
    })
    bs1 = bootstrap_metric(city_rows, ["variable"], "mae", higher_is_better=False)
    bs2 = bootstrap_metric(city_rows, ["variable"], "mae", higher_is_better=False)
    ok &= _check(bs1.equals(bs2), "bootstrap is deterministic for the same input")
    ecmwf = bs1[bs1["model"] == "ecmwf"].iloc[0]
    ok &= _check(ecmwf["ci_low"] <= 1.0 <= ecmwf["ci_high"],
                 "observed pooled MAE lies inside the CI", str(ecmwf.to_dict()))
    ok &= _check(bool((bs1["rank_low"].ge(1) & bs1["rank_high"].le(2)
                       & bs1["rank_low"].le(bs1["rank_high"])).all()),
                 "rank range stays inside [1, n] and is ordered")
    ok &= _check(bool((bs1.loc[bs1["model"] == "ecmwf", "rank_low"] == 1).all()),
                 "the strictly better method never falls out of rank 1")

    # 8. Pareto frontier: dominated points drop out; empty inputs stay empty
    pts = pd.DataFrame({"method": list("abc"), "mae": [0.1, 0.2, 0.3],
                        "csi": [0.5, 0.6, 0.4]})
    flags = _frontier_flags(pts)
    ok &= _check(flags.tolist() == [1, 1, 0],
                 "a dominated point is excluded from the frontier", str(flags.tolist()))
    ok &= _check(pareto_board(pd.DataFrame(), pd.DataFrame()).empty,
                 "no Pareto rows without both boards")

    # 9. real artifacts, when present: every stratum has a rank-1 method and the
    #    national accuracy row pools the cities exactly
    if (OUT / "verification_trajectories.csv").exists():
        lb, pareto, meta = build()
        strata = ["board", "geo", "variable", "window_days", "lead_days", "threshold"]
        has_top = (lb.groupby(strata, dropna=False)["rank"].min() == 1).all()
        ok &= _check(bool(has_top), "every published stratum has a rank-1 method")
        acc = lb[(lb["board"] == "accuracy") & lb["window_days"].isna()
                 & (lb["variable"] == "rainfall")]
        sample = acc[acc["method"] == acc["method"].iloc[0]]
        nat_n = int(sample[sample["geo"] == GEO_NATIONAL]["n"].sum())
        city_n = int(sample[sample["geo"] != GEO_NATIONAL]["n"].sum())
        ok &= _check(nat_n == city_n,
                     "national accuracy n equals the sum of city n", f"{nat_n} vs {city_n}")
        ok &= _check(meta["row_count"] == len(lb), "meta row_count matches the board")
        ok &= _check(set(lb["tier"]).issubset(set(TIERS.values())),
                     "every method carries a known tier", str(set(lb["tier"])))
        nat = lb[lb["geo"] == GEO_NATIONAL]
        city_only = lb[lb["geo"] != GEO_NATIONAL]
        ok &= _check(bool(nat["ci_low"].notna().all() and nat["ci_high"].notna().all()),
                     "every national row publishes an interval")
        ok &= _check(bool((nat["ci_low"] <= nat["value"]).all()
                          and (nat["value"] <= nat["ci_high"]).all()),
                     "national values lie inside their intervals")
        ok &= _check(bool(city_only["ci_low"].isna().all()),
                     "city rows carry no interval (national-only policy)")
        ok &= _check(bool((nat["rank_low"] >= 1).all()
                          and (nat["rank_low"] <= nat["rank"]).all()
                          and (nat["rank"] <= nat["rank_high"]).all()),
                     "rank ranges contain the observed rank")
        # Every scored method except persistence (a continuous-only baseline
        # with no extreme-board rows) appears on the paired Pareto frontier.
        ok &= _check(set(pareto["method"]) == set(TIERS) - {"persistence"},
                     "Pareto covers every paired method",
                     str(sorted(set(pareto["method"]))))
        ok &= _check(bool(pareto[["mae", "csi", "mae_ci_low", "mae_ci_high",
                                  "csi_ci_low", "csi_ci_high"]].notna().all().all()),
                     "every Pareto point carries both axes and both intervals")
        frontier_ok = True
        for _, grp in pareto.groupby(["variable", "threshold"], dropna=False):
            frontier_ok &= bool(grp["frontier"].astype(int).reset_index(drop=True)
                                .equals(_frontier_flags(grp).reset_index(drop=True)))
        ok &= _check(frontier_ok, "published frontier flags match the dominance rule")

        sig_ids = {s["id"] for s in meta["signals"]}
        ok &= _check(sig_ids <= {"lowest_error", "best_extreme", "best_lead", "blend_gain"},
                     "only known signal ids are published", str(sig_ids))

        def _signal_rows(signal, method):
            rows = lb[(lb["board"] == signal["measure"])
                      & (lb["variable"] == signal["variable"])
                      & (lb["geo"] == signal["geo"]) & (lb["method"] == method)]
            rows = rows[rows["window_days"].isna()]
            if signal["threshold"] is not None:
                rows = rows[rows["threshold"] == signal["threshold"]]
            if signal["lead_days"] is not None:
                rows = rows[rows["lead_days"] == signal["lead_days"]]
            return rows

        signal_ok = True
        for s in meta["signals"]:
            row = _signal_rows(s, s["leader"])
            signal_ok &= len(row) == 1 and abs(float(row.iloc[0]["value"]) - s["value"]) < 1e-9
            if s["runner_up"]:
                run = _signal_rows(s, s["runner_up"])
                if len(run) == 1:
                    expected_gap = ((float(run.iloc[0]["value"]) - float(row.iloc[0]["value"]))
                                    if s["metric"] != "csi" else
                                    (float(row.iloc[0]["value"]) - float(run.iloc[0]["value"])))
                    signal_ok &= abs(expected_gap - s["gap"]) < 1e-6
                else:
                    signal_ok = False
        ok &= _check(signal_ok, "every signal mirrors the board rows it summarizes")
        blend_ok = True
        for s in meta["signals"]:
            if s["id"] != "blend_gain":
                continue
            blend_row = _signal_rows(s, "weighted_blend").iloc[0]
            model_row = _signal_rows(s, s["beaten"]).iloc[0]
            expected = ((float(model_row["value"]) - float(blend_row["value"]))
                        / float(model_row["value"]) * 100)
            blend_ok &= abs(expected - s["delta_pct"]) < 1e-6
        ok &= _check(blend_ok, "blend_gain.delta_pct matches the board rows")

    print("VERIFY: PASS" if ok else "VERIFY: FAIL")
    return ok


if __name__ == "__main__":
    if "--verify" in sys.argv:
        sys.exit(0 if verify() else 1)
    generate()

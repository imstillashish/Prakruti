"""
cycle_delta.py — F-01.C Inter-Cycle Delta (PRD §7.1.C).

Answers "what changed since the last cycle": P50/P10/P90 mean shifts per
variable, biggest per-city P50 movers, confidence label transitions, and
model availability changes (newly missing / recovered).

Reads:  outputs/uncertainty.csv, outputs/confidence_scores.csv (fresh cycle)
        outputs/cycle_state.json (current + previous, via snapshot)
Writes: outputs/interim/prev_uncertainty.csv, prev_confidence_scores.csv,
        prev_cycle_state.json (snapshots of cycle N-1)
        outputs/cycle_delta.json

Pipeline order (cache_manager.regenerate_forecast):
  snapshot_prev -> alerts/advisories/uncertainty/confidence -> detect -> compute_delta
so snapshots hold N-1 while outputs/*.csv get overwritten with N.

Spec: docs/specs/2026-10-01-f01-cycle-readiness-delta-override-design.md
Run:    .venv/bin/python ai/cycle_delta.py
Verify: .venv/bin/python ai/cycle_delta.py --verify
"""

import json
import shutil
import sys
from pathlib import Path

import pandas as pd

base_dir = Path(__file__).resolve().parent.parent
OUT = base_dir / "outputs"
INTERIM = OUT / "interim"

UNC = OUT / "uncertainty.csv"
CONF = OUT / "confidence_scores.csv"
CYCLE_STATE_JSON = OUT / "cycle_state.json"
DELTA_JSON = OUT / "cycle_delta.json"

VARIABLES = ("temperature", "rainfall", "wind_speed")
QUANTILES = ("p10", "p50", "p90")

# Rank-ordered for upgrade/downgrade direction
LABEL_RANK = {"Very Low": 0, "Low": 1, "Medium": 2, "High": 3, "Very High": 4}


def _read_json(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def snapshot_prev(out_dir: Path = INTERIM) -> None:
    """Copy last cycle's artifacts to interim/prev_* before downstream scripts
    overwrite outputs/*.csv. Called at the START of run_downstream_updates."""
    out_dir.mkdir(parents=True, exist_ok=True)
    for src in (UNC, CONF, CYCLE_STATE_JSON):
        if src.exists():
            shutil.copy2(src, out_dir / f"prev_{src.name}")
            print(f"[CycleDelta] snapshot: {src.name} -> prev_{src.name}")


def _mode_label(s: pd.Series):
    m = s.mode(dropna=True)
    return m.iloc[0] if len(m) else None


def _agg_lead(df: pd.DataFrame, cols: tuple) -> pd.DataFrame:
    """Aggregate a cycle frame to (city, lead) means.

    Consecutive fetch cycles carry different hourly datetime grids (the grid
    starts at each fetch time), so the honest cycle-over-cycle comparison is
    per forecast horizon: lead-1 this run vs lead-1 last run.
    """
    lead_col = "lead_day" if "lead_day" in df.columns else "lead_days"
    g = df.groupby(["city", lead_col])[list(cols)].mean().reset_index()
    return g.rename(columns={lead_col: "lead"})


def compute_delta(unc: Path = UNC, prev_unc: Path = INTERIM / "prev_uncertainty.csv",
                  conf: Path = CONF, prev_conf: Path = INTERIM / "prev_confidence_scores.csv",
                  state_path: Path = CYCLE_STATE_JSON,
                  prev_state_path: Path = INTERIM / "prev_cycle_state.json",
                  out: Path = DELTA_JSON) -> dict:
    """Compare fresh cycle-N artifacts against the cycle-(N-1) snapshots."""
    state = _read_json(state_path)
    prev_state = _read_json(prev_state_path)

    delta = {
        "cycle_id": state.get("cycle_id"),
        "previous_cycle_id": prev_state.get("cycle_id"),
        "available": False,
        "note": "first cycle — no previous snapshot",
        "quantile_shift": {v: {q: None for q in QUANTILES} for v in VARIABLES},
        "biggest_p50_mover": {v: None for v in VARIABLES},
        "confidence_shifts": {},
        "models_recovered": [],
        "models_newly_missing": [],
    }

    if not (prev_unc.exists() and unc.exists()):
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(delta, indent=2), encoding="utf-8")
        return delta
    delta.pop("note")
    delta["available"] = True

    # --- quantile shifts + biggest P50 mover -------------------------------
    new_unc = pd.read_csv(unc)
    old_unc = pd.read_csv(prev_unc)
    qcols = [f"{q}_{v}" for v in VARIABLES for q in QUANTILES]
    joined = _agg_lead(old_unc, qcols).merge(
        _agg_lead(new_unc, qcols), on=["city", "lead"], how="inner", suffixes=("_prev", ""))
    if not joined.empty:
        for v in VARIABLES:
            for q in QUANTILES:
                col = f"{q}_{v}"
                d = joined[col] - joined[f"{col}_prev"]
                delta["quantile_shift"][v][q] = round(float(d.mean()), 4)
            d50 = joined[f"p50_{v}"] - joined[f"p50_{v}_prev"]
            i = d50.abs().idxmax()
            delta["biggest_p50_mover"][v] = {
                "city": str(joined.loc[i, "city"]),
                "delta": round(float(d50.loc[i]), 4),
            }
    else:
        delta["note"] = "no overlapping (city, lead) keys between cycles"

    # --- confidence label transitions (mode label per city x lead) ----------
    if prev_conf.exists() and conf.exists():
        prev_c, new_c = pd.read_csv(prev_conf), pd.read_csv(conf)
        pl = "lead_day" if "lead_day" in prev_c.columns else "lead_days"
        nl = "lead_day" if "lead_day" in new_c.columns else "lead_days"
        prev_l = prev_c.groupby(["city", pl])["confidence_label"].apply(_mode_label).rename("prev")
        new_l = new_c.groupby(["city", nl])["confidence_label"].apply(_mode_label).rename("new")
        jc = prev_l.to_frame().join(new_l, how="inner").dropna()
        transitions = {}
        for p, n in zip(jc["prev"], jc["new"]):
            if p != n:
                key = f"{p}->{n}"
                transitions[key] = transitions.get(key, 0) + 1
        upgraded = sum(c for k, c in transitions.items()
                       if LABEL_RANK.get(k.split("->")[1], -1) > LABEL_RANK.get(k.split("->")[0], -1))
        downgraded = sum(c for k, c in transitions.items()
                         if LABEL_RANK.get(k.split("->")[1], -1) < LABEL_RANK.get(k.split("->")[0], -1))
        delta["confidence_shifts"] = {"upgraded": upgraded, "downgraded": downgraded,
                                      "transitions": transitions}

    # --- model availability changes ------------------------------------------
    prev_missing = set(prev_state.get("missing_models", []))
    new_missing = set(state.get("missing_models", []))
    delta["models_newly_missing"] = sorted(new_missing - prev_missing)
    delta["models_recovered"] = sorted(prev_missing - new_missing)

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(delta, indent=2), encoding="utf-8")
    print(f"[CycleDelta] cycle {delta['cycle_id']} vs {delta['previous_cycle_id']}: "
          f"available={delta['available']}"
          + ("" if not delta["confidence_shifts"] else
             f", +{delta['confidence_shifts']['upgraded']}/-{delta['confidence_shifts']['downgraded']} confidence"))
    return delta


# ---------------------------------------------------------------------------
# Self-verification (returns True/False; exits 1 on FAIL)
# ---------------------------------------------------------------------------
def verify() -> bool:
    import tempfile
    import numpy as np

    ok = True

    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        rng = np.random.default_rng(11)
        n = 60

        # --- known quantile shifts ----------------------------------------
        prev = pd.DataFrame({
            "city": [f"c{i}" for i in range(n)],
            "datetime": ["2026-10-01 00:00:00"] * n,
            "lead_days": [1] * n,
            **{f"{q}_{v}": rng.normal(0, 5, n) for v in VARIABLES for q in QUANTILES},
        })
        shift = {"temperature": 0.5, "rainfall": -1.25, "wind_speed": 0.4}
        new = prev.copy()
        for v, s in shift.items():
            new[f"p50_{v}"] = prev[f"p50_{v}"] + s

        pu, nu = tmp / "pu.csv", tmp / "nu.csv"
        prev.to_csv(pu, index=False)
        new.to_csv(nu, index=False)
        d = compute_delta(unc=nu, prev_unc=pu, conf=tmp / "nope.csv",
                          prev_conf=tmp / "nope2.csv", state_path=tmp / "none.json",
                          prev_state_path=tmp / "none2.json", out=tmp / "delta.json")
        exact = all(abs(d["quantile_shift"][v]["p50"] - shift[v]) < 1e-9 for v in VARIABLES)
        if d["available"] and exact:
            print("OK: quantile shifts match constructed deltas exactly")
        else:
            print(f"FAIL: quantile_shift={d['quantile_shift']}"); ok = False

        # biggest mover: city c3 gets the extreme temperature shift
        new.loc[3, "p50_temperature"] = prev.loc[3, "p50_temperature"] + 9.0
        new.to_csv(nu, index=False)
        d = compute_delta(unc=nu, prev_unc=pu, conf=tmp / "nope.csv",
                          prev_conf=tmp / "nope2.csv", state_path=tmp / "none.json",
                          prev_state_path=tmp / "none2.json", out=tmp / "delta.json")
        mover = d["biggest_p50_mover"]["temperature"]
        if mover["city"] == "c3" and abs(mover["delta"] - 9.0) < 1e-9:
            print("OK: biggest P50 mover identified correctly")
        else:
            print(f"FAIL: mover={mover}"); ok = False

        # --- confidence transitions ----------------------------------------
        labels = ["Low"] * 3 + ["High"] * 2 + ["Medium"] * 1 + ["Medium"] * 2
        prev_c = pd.DataFrame({
            "city": [f"c{i}" for i in range(8)],
            "datetime": ["2026-10-01 00:00:00"] * 8,
            "lead_day": [1] * 8,
            "confidence_label": labels,
        })
        new_labels = ["High"] * 3 + ["Low"] * 2 + ["Medium"] + ["Very High", "Very Low"]
        new_c = prev_c.copy()
        new_c["confidence_label"] = new_labels
        pc, nc = tmp / "pc.csv", tmp / "nc.csv"
        prev_c.to_csv(pc, index=False)
        new_c.to_csv(nc, index=False)
        d = compute_delta(unc=nu, prev_unc=pu, conf=nc, prev_conf=pc,
                          state_path=tmp / "none.json", prev_state_path=tmp / "none2.json",
                          out=tmp / "delta.json")
        cs = d["confidence_shifts"]
        if cs.get("upgraded") == 4 and cs.get("downgraded") == 3 \
                and cs.get("transitions", {}).get("Low->High") == 3 \
                and cs.get("transitions", {}).get("High->Low") == 2:
            print("OK: confidence transitions counted correctly (up 4, down 3)")
        else:
            print(f"FAIL: confidence_shifts={cs}"); ok = False

        # --- first cycle: no prev snapshot ---------------------------------
        d = compute_delta(unc=nu, prev_unc=tmp / "missing.csv", conf=nc,
                          prev_conf=tmp / "missing2.csv", state_path=tmp / "none.json",
                          prev_state_path=tmp / "none2.json", out=tmp / "delta.json")
        if not d["available"] and "first cycle" in d.get("note", ""):
            print("OK: missing prev snapshot -> available false, no crash")
        else:
            print(f"FAIL: first-cycle delta={d}"); ok = False

    print("VERIFY: PASS" if ok else "VERIFY: FAIL")
    return ok


if __name__ == "__main__":
    if "--verify" in sys.argv:
        sys.exit(0 if verify() else 1)
    compute_delta()

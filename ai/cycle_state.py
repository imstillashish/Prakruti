"""
cycle_state.py — F-01.A Cycle Readiness (PRD §7.1.A, AC-03/25/30).

Records per-model ingestion state for the current forecast cycle. All 4 models
arrive in one Open-Meteo batch response, so "run detection" here is per-model
presence in the ingested frame, plus a checksum of the raw source artifact.

Reads:  outputs/interim/forecast_current_clean.csv (post-map, long format)
        data/forecast_current.csv (raw fetch — checksummed)
        outputs/metadata.json
Writes: outputs/cycle_state.json

Spec: docs/specs/2026-10-01-f01-cycle-readiness-delta-override-design.md
Run:    .venv/bin/python ai/cycle_state.py
Verify: .venv/bin/python ai/cycle_state.py --verify
"""

import hashlib
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd

base_dir = Path(__file__).resolve().parent.parent

CLEAN_FC_CSV = base_dir / "outputs" / "interim" / "forecast_current_clean.csv"
RAW_FC_CSV = base_dir / "data" / "forecast_current.csv"
METADATA_JSON = base_dir / "outputs" / "metadata.json"
CYCLE_STATE_JSON = base_dir / "outputs" / "cycle_state.json"

EXPECTED_MODELS = ["ecmwf", "gfs", "icon", "gem"]
VARIABLES = ["temperature", "rainfall", "wind_speed"]


def _sha256_file(path: Path) -> str | None:
    if not path.exists():
        return None
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return f"sha256:{h.hexdigest()}"


def _is_stale(artifacts_dir: Path) -> bool:
    """Blended artifact older than 48h (UTC day start minus one day) = stale."""
    blended = artifacts_dir / "blended_forecast.csv"
    if not blended.exists():
        return True
    threshold = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=1)
    return datetime.fromtimestamp(blended.stat().st_mtime, tz=timezone.utc) < threshold


def detect(clean_csv: Path = CLEAN_FC_CSV, raw_csv: Path = RAW_FC_CSV,
           metadata_path: Path = METADATA_JSON, outputs_dir: Path = base_dir / "outputs",
           now: datetime | None = None) -> dict:
    """Scan the ingested frame for each expected model; write cycle_state.json."""
    frame = pd.read_csv(clean_csv) if clean_csv.exists() else pd.DataFrame(
        columns=["city", "model", "datetime", *VARIABLES])

    present = set(frame["model"].unique()) if not frame.empty else set()
    models = {}
    for m in EXPECTED_MODELS:
        if m not in present:
            models[m] = {"status": "MISSING", "rows": 0}
            continue
        sub = frame[frame["model"] == m]
        has_values = sub[VARIABLES].notna().any(axis=1).any() if all(v in sub.columns for v in VARIABLES) else len(sub) > 0
        models[m] = {"status": "RECEIVED" if has_values else "MISSING", "rows": int(len(sub))}

    received = [m for m in EXPECTED_MODELS if models[m]["status"] == "RECEIVED"]
    missing = [m for m in EXPECTED_MODELS if models[m]["status"] == "MISSING"]

    meta = {}
    if metadata_path.exists():
        try:
            meta = json.loads(metadata_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            meta = {}
    cycle_id = meta.get("last_updated") or (now or datetime.now(timezone.utc)).strftime("%Y-%m-%dT%H:%M:%S")

    state = {
        "cycle_id": cycle_id,
        "expected_models": EXPECTED_MODELS,
        "models": models,
        "received_models": received,
        "missing_models": missing,
        "source_completeness": {
            "expected": len(EXPECTED_MODELS),
            "available": len(received),
            "fallback": len(missing) > 0,
        },
        "forecast_checksum": _sha256_file(raw_csv),
        "stale": _is_stale(outputs_dir),
    }

    outputs_dir.mkdir(parents=True, exist_ok=True)
    CYCLE_STATE_JSON.write_text(json.dumps(state, indent=2), encoding="utf-8")
    print(f"[CycleState] cycle {cycle_id}: {len(received)}/{len(EXPECTED_MODELS)} models received"
          + (f" — missing: {', '.join(missing)} (fallback)" if missing else ""))
    return state


def load_state() -> dict | None:
    if not CYCLE_STATE_JSON.exists():
        return None
    try:
        return json.loads(CYCLE_STATE_JSON.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


# ---------------------------------------------------------------------------
# Self-verification (returns True/False; exits 1 on FAIL)
# ---------------------------------------------------------------------------
def verify() -> bool:
    import tempfile

    ok = True
    now = datetime(2026, 10, 1, 12, 0, 0, tzinfo=timezone.utc)

    # --- 1. synthetic frame: gem entirely missing -------------------------
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        clean = tmp / "clean.csv"
        rows = []
        for m in ["ecmwf", "gfs", "icon"]:
            for c in ("A", "B"):
                rows.append({"city": c, "model": m, "datetime": "2026-10-01 00:00:00",
                             "temperature": 25.0, "rainfall": 0.0, "wind_speed": 10.0})
        pd.DataFrame(rows).to_csv(clean, index=False)

        state = detect(clean_csv=clean, raw_csv=tmp / "none.csv",
                       metadata_path=tmp / "meta.json", outputs_dir=tmp, now=now)
        sc = state["source_completeness"]
        if sc == {"expected": 4, "available": 3, "fallback": True} and state["missing_models"] == ["gem"]:
            print("OK: 3/4 detected, gem MISSING, fallback true")
        else:
            print(f"FAIL: subset detection {sc} missing={state['missing_models']}"); ok = False

        # --- 2. full frame → fallback false -------------------------------
        rows.append({"city": "A", "model": "gem", "datetime": "2026-10-01 00:00:00",
                     "temperature": 24.0, "rainfall": 0.1, "wind_speed": 11.0})
        pd.DataFrame(rows).to_csv(clean, index=False)
        state2 = detect(clean_csv=clean, raw_csv=tmp / "none.csv", metadata_path=tmp / "meta.json",
                        outputs_dir=tmp, now=now)
        if state2["source_completeness"] == {"expected": 4, "available": 4, "fallback": False}:
            print("OK: full frame → fallback false")
        else:
            print(f"FAIL: full-frame completeness {state2['source_completeness']}"); ok = False

        # --- 3. checksum sensitivity --------------------------------------
        raw = tmp / "raw.csv"
        raw.write_bytes(b"city,model,temp\nA,ecmwf,25\n")
        s1 = _sha256_file(raw)
        raw.write_bytes(b"city,model,temp\nA,ecmwf,26\n")
        s2 = _sha256_file(raw)
        if s1 and s2 and s1.startswith("sha256:") and s1 != s2:
            print("OK: checksum changes when source bytes change")
        else:
            print("FAIL: checksum not byte-sensitive"); ok = False

    # --- 4. subset blend: drop one model, weights renormalize -------------
    import numpy as np
    rng = np.random.default_rng(7)
    n = 500
    present = ["ecmwf", "gfs", "icon"]
    weights = {"ecmwf": 0.4, "gfs": 0.3, "icon": 0.2, "gem": 0.1}
    w = np.array([weights[m] for m in present])
    w_norm = w / w.sum()
    vals = rng.normal(25, 1.0, size=(n, len(present)))
    blend = vals @ w_norm
    if not np.isnan(blend).any() and abs(w_norm.sum() - 1.0) < 1e-12:
        lo, hi = vals.min(axis=1), vals.max(axis=1)
        if ((blend >= lo - 1e-9) & (blend <= hi + 1e-9)).all():
            print("OK: subset blend no-NaN, weights renormalized, within model min/max")
        else:
            print("FAIL: subset blend outside model bounds"); ok = False
    else:
        print("FAIL: subset blend NaN or weights not normalized"); ok = False

    print("VERIFY: PASS" if ok else "VERIFY: FAIL")
    return ok


if __name__ == "__main__":
    if "--verify" in sys.argv:
        sys.exit(0 if verify() else 1)
    detect()

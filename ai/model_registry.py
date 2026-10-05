"""Model registry: the single source of truth for which forecast models exist.

The data layer (api/forecast.py, api/fetch_history.py) stores rows under full
Open-Meteo model ids ("ecmwf_ifs025"); the ai/ pipeline and the frontend work
with short ids ("ecmwf"). That rename used to be duplicated as inline dicts in
three ai/ modules; it lives here now, with pass-through for unknown ids so a
BYOM model flows through the chain untouched.
"""
import sys
from pathlib import Path

import pandas as pd

base_dir = Path(__file__).resolve().parent.parent
if str(base_dir) not in sys.path:
    sys.path.insert(0, str(base_dir))

HISTORY_CSV = base_dir / "data" / "forecast_history.csv"

BUILT_IN_MODELS = ["ecmwf", "gfs", "icon", "gem", "aifs", "ukmo"]

RENAME_MAP = {
    "ecmwf_ifs025": "ecmwf",
    "gfs_seamless": "gfs",
    "icon_seamless": "icon",
    "gem_seamless": "gem",
    "ecmwf_aifs025": "aifs",
    "ukmo_seamless": "ukmo",
}


def normalize_model(full_id: str) -> str:
    """Map a full Open-Meteo id to its short id; unknown ids pass through."""
    return RENAME_MAP.get(full_id, full_id)


def discover_models() -> list[str]:
    """Models present in forecast_history.csv: built-ins first, then BYOM.

    Built-ins are listed even when history has no rows for them yet, so the
    pipeline and frontend registry stay stable while backfills run.
    """
    found: list[str] = list(BUILT_IN_MODELS)
    if HISTORY_CSV.exists():
        models = pd.read_csv(HISTORY_CSV, usecols=["model"])["model"].dropna().unique()
        for m in models:
            short = normalize_model(m)
            if short not in found:
                found.append(short)
    return found

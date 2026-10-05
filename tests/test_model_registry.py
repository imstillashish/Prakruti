"""Model registry: built-ins, full->short rename, discovery of BYOM ids."""
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ai.model_registry import (  # noqa: E402
    BUILT_IN_MODELS,
    RENAME_MAP,
    discover_models,
    normalize_model,
)


def test_builtins_present():
    for m in ("ecmwf", "gfs", "icon", "gem", "aifs", "ukmo"):
        assert m in BUILT_IN_MODELS


def test_rename_map_covers_new_ids():
    assert RENAME_MAP["ecmwf_aifs025"] == "aifs"
    assert RENAME_MAP["ukmo_seamless"] == "ukmo"
    # the pre-existing four keep their mapping
    assert RENAME_MAP["ecmwf_ifs025"] == "ecmwf"
    assert RENAME_MAP["gfs_seamless"] == "gfs"
    assert RENAME_MAP["icon_seamless"] == "icon"
    assert RENAME_MAP["gem_seamless"] == "gem"


def test_normalize_identity_on_unknown():
    assert normalize_model("mymodel") == "mymodel"
    assert normalize_model("ecmwf_ifs025") == "ecmwf"
    assert normalize_model("ecmwf_aifs025") == "aifs"


def test_discover_includes_builtin_and_byom(tmp_path, monkeypatch):
    hist = tmp_path / "forecast_history.csv"
    hist.write_text(
        "city,model,datetime,temperature,rainfall,wind_speed\n"
        "Kanpur,ecmwf_ifs025,2026-10-01T00:00:00,30,0,5\n"
        "Kanpur,my_model_v1,2026-10-01T00:00:00,29,0,4\n"
    )
    monkeypatch.setattr(
        "ai.model_registry.HISTORY_CSV", hist
    )
    found = discover_models()
    assert found[:4] == ["ecmwf", "gfs", "icon", "gem"]
    assert "aifs" in found and "ukmo" in found
    assert "my_model_v1" in found
    # no duplicates, builtin order preserved first
    assert len(found) == len(set(found))

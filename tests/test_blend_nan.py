"""NaN-tolerant blending: a model missing a row must not NaN the blend."""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ai.blending import renormalize_blend  # noqa: E402


def test_missing_model_renormalizes_to_present_models():
    df = pd.DataFrame({
        "w_a": [0.5, 0.5],
        "w_b": [0.5, 0.5],
        "v_a": [10.0, np.nan],
        "v_b": [20.0, 20.0],
    })
    out = renormalize_blend(df, models=["a", "b"], value_cols={"a": "v_a", "b": "v_b"})
    # row 1: a missing -> blend is b's value; row 0: unchanged average
    assert out["blend"].tolist() == [15.0, 20.0]
    # renormalized weights for row 1
    assert out["w_a"].tolist() == [0.5, 0.0]
    assert out["w_b"].tolist() == [0.5, 1.0]


def test_all_nan_row_stays_nan():
    df = pd.DataFrame({
        "w_a": [1.0], "w_b": [0.0],
        "v_a": [np.nan], "v_b": [np.nan],
    })
    out = renormalize_blend(df, models=["a", "b"], value_cols={"a": "v_a", "b": "v_b"})
    assert np.isnan(out["blend"].iloc[0])

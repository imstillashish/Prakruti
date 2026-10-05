"""Blend math shared by ai/blend.py and ai/blend_lead.py."""
import pandas as pd


def renormalize_blend(df: pd.DataFrame, models: list[str], value_cols: dict[str, str]) -> pd.DataFrame:
    """Weighted blend with per-row renormalization over the models that reported.

    A model missing a forecast (NaN) for a row hands its weight to the models
    that did report, so one sparse model cannot NaN the blend — the property
    that lets a BYOM model with partial coverage join safely. A row where no
    model reported stays NaN. A missing weight is treated as weight 0.
    """
    w = pd.DataFrame({m: df[f"w_{m}"].fillna(0.0) for m in models})
    v = pd.DataFrame({m: df[value_cols[m]] for m in models})
    w_eff = w.where(v.notna(), 0.0)
    denom = w_eff.sum(axis=1)
    safe = denom.where(denom != 0)

    out = df.copy()
    for m in models:
        out[f"w_{m}"] = w_eff[m] / safe
    out["blend"] = (w_eff * v.fillna(0.0)).sum(axis=1) / safe
    return out

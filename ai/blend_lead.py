import pandas as pd
import numpy as np
from pathlib import Path

# Top-level dictionary mapping variables to actual column names
ACTUAL_MAP = {
    "temperature": "actual_temperature",
    "rainfall": "actual_rainfall",
    "wind_speed": "actual_wind",
}

from ai.model_registry import discover_models
from ai.blending import renormalize_blend

# Every model present in history: built-ins plus any BYOM model that POSTed.
MODELS = discover_models()
VARIABLES = ["temperature", "rainfall", "wind_speed"]

# Resolve project directories
base_dir = Path(__file__).resolve().parent.parent
pairs_file = base_dir / "outputs" / "interim" / "pairs_lead.csv"
weights_file = base_dir / "outputs" / "model_weights_lead.csv"
output_file = base_dir / "outputs" / "interim" / "pairs_lead_blend.csv"

# 1. Load pairs_lead.csv and model_weights_lead.csv
df_pairs = pd.read_csv(pairs_file, low_memory=False)
df_weights = pd.read_csv(weights_file)

# Keep original row order and column structure for verification
df_orig_order = df_pairs[["city", "datetime", "lead_days"]].copy()
original_cols = df_pairs.columns.tolist()

# Ensure numeric forecast and actual columns are explicitly cast to float64
numeric_cols = [f"{v}_{m}" for v in VARIABLES for m in MODELS] + list(ACTUAL_MAP.values())
for col in numeric_cols:
    df_pairs[col] = pd.to_numeric(df_pairs[col])

# 2. Pivot weights and calculate weighted blends for each variable
df_blend = df_pairs.copy()

for var in VARIABLES:
    # Pivot weights to (city, lead_days) level for the current variable
    w_pivot = df_weights[df_weights["variable"] == var].pivot(
        index=["city", "lead_days"],
        columns="model",
        values="weight"
    ).reset_index()
    
    w_cols = [f"w_{m}" for m in MODELS]
    w_pivot.columns = ["city", "lead_days"] + w_cols
    
    # Left join weights onto pairs dataframe by (city, lead_days)
    merged = pd.merge(df_blend, w_pivot, on=["city", "lead_days"], how="left")
    
    # Normalize merged weights so they sum to exactly 1.0 per row (prevents float rounding drift)
    w_sum = merged[w_cols].sum(axis=1)
    for m in MODELS:
        merged[f"w_{m}"] = merged[f"w_{m}"] / w_sum

    # Blend with per-row renormalization: a model missing this row hands its
    # weight to the models that reported, instead of NaN-ing the blend.
    blended = renormalize_blend(
        merged,
        models=MODELS,
        value_cols={m: f"{var}_{m}" for m in MODELS},
    )
    blend_series = blended["blend"]
    df_blend[f"blend_{var}"] = blend_series

# Keep original columns order and append the 3 blend columns at the end
final_cols = original_cols + [f"blend_{v}" for v in VARIABLES]
df_blend = df_blend[final_cols]

# -----------------------------------------------------------------------------
# ASSERTIONS (Strict Quality Control - raise clear error if violated)
# -----------------------------------------------------------------------------
# Assertion 1: one row per lead pair, columns = pairs_lead + 3 blend columns,
# no NaN. (The old (197640, 22) pin was one specific 4-model window; it moves
# with MODELS.)
if df_blend.shape != (len(df_orig_order), len(final_cols)):
    raise ValueError(
        f"Output shape mismatch: expected ({len(df_orig_order)}, {len(final_cols)}), got {df_blend.shape}"
    )
if df_blend.isna().any().any():
    raise ValueError("NaN values detected in pairs_lead_blend.csv")

# Assertion 2: For every row and variable, blend lies between the min and max
# of all model forecasts
for var in VARIABLES:
    fc_cols = [f"{var}_{m}" for m in MODELS]
    min_fc = df_blend[fc_cols].min(axis=1)
    max_fc = df_blend[fc_cols].max(axis=1)
    blend_val = df_blend[f"blend_{var}"]
    
    out_of_bounds = (blend_val < min_fc - 1e-9) | (blend_val > max_fc + 1e-9)
    if out_of_bounds.any():
        num_violations = out_of_bounds.sum()
        raise ValueError(
            f"Blend values for {var} fall outside [min_forecast, max_forecast] bounds in {num_violations} rows."
        )

# Assertion 3: split integrity — both splits exist and partition the rows.
# (The old 136080/61560 pins were one specific window's split; the moving
# window shifts it, and that shift is not a defect.)
train_count = (df_blend["split"] == "train").sum()
test_count = (df_blend["split"] == "test").sum()
if train_count == 0 or test_count == 0 or train_count + test_count != len(df_blend):
    raise ValueError(
        f"Split integrity failure: train={train_count}, test={test_count}, total={len(df_blend)}"
    )

# Assertion 4: Output row order identical to pairs_lead.csv
if not (df_blend["city"].values == df_orig_order["city"].values).all() or \
   not (df_blend["datetime"].values == df_orig_order["datetime"].values).all() or \
   not (df_blend["lead_days"].values == df_orig_order["lead_days"].values).all():
    raise ValueError("Output row order does not match pairs_lead.csv exactly.")

print("=" * 70)
print("[SUCCESS] All Quality Assertions Passed!")
print("=" * 70)

# -----------------------------------------------------------------------------
# EVALUATION REPORT (Print only; do not write files)
# -----------------------------------------------------------------------------
# Define evaluation methods
all_methods = MODELS + ["equal_avg", "weighted_blend"]

for var in VARIABLES:
    actual_col = ACTUAL_MAP[var]
    print("\n" + "=" * 70)
    print(f"EVALUATION FOR VARIABLE: {var.upper()}")
    print("=" * 70)

    # Pre-calculate candidate forecasts
    method_fc = {m: df_blend[f"{var}_{m}"] for m in MODELS}
    method_fc["equal_avg"] = df_blend[[f"{var}_{m}" for m in MODELS]].mean(axis=1)
    method_fc["weighted_blend"] = df_blend[f"blend_{var}"]

    # A. RMSE and MAE Tables (rows = methods, columns = (split, lead_days))
    col_tuples = [
        (s, l) for s in ["train", "test"] for l in [1, 2, 3]
    ]
    col_names = [f"{s}_lead{l}" for s, l in col_tuples]

    rmse_dict = {m: {} for m in all_methods}
    mae_dict = {m: {} for m in all_methods}

    for s, l in col_tuples:
        col_name = f"{s}_lead{l}"
        mask = (df_blend["split"] == s) & (df_blend["lead_days"] == l)
        actual = df_blend.loc[mask, actual_col]

        for m in all_methods:
            fc = method_fc[m].loc[mask]
            err = actual - fc
            mae_val = np.mean(np.abs(err))
            rmse_val = np.sqrt(np.mean(err ** 2))
            rmse_dict[m][col_name] = round(rmse_val, 4)
            mae_dict[m][col_name] = round(mae_val, 4)

    df_rmse_table = pd.DataFrame(rmse_dict).T[col_names]
    df_mae_table = pd.DataFrame(mae_dict).T[col_names]

    print("\n--- RMSE TABLE (rows=methods, columns=split & lead_days) ---")
    print(df_rmse_table)

    print("\n--- MAE TABLE (rows=methods, columns=split & lead_days) ---")
    print(df_mae_table)

    # B. TEST Rows Deltas per Lead Day
    print("\n--- TEST SET DELTA & BEST SINGLE MODEL SUMMARY ---")
    for l in [1, 2, 3]:
        col_name = f"test_lead{l}"
        wb_rmse = df_rmse_table.loc["weighted_blend", col_name]
        eq_rmse = df_rmse_table.loc["equal_avg", col_name]
        ecmwf_rmse = df_rmse_table.loc["ecmwf", col_name]

        # Single model with lowest test RMSE
        single_rmses = df_rmse_table.loc[MODELS, col_name]
        best_single_name = single_rmses.idxmin()
        best_single_val = single_rmses.min()

        delta_eq = wb_rmse - eq_rmse
        pct_eq = (delta_eq / eq_rmse) * 100.0

        delta_ec = wb_rmse - ecmwf_rmse
        pct_ec = (delta_ec / ecmwf_rmse) * 100.0

        print(f"\n[Lead Days {l}]")
        print(f"  - weighted_blend RMSE minus equal_avg RMSE: {delta_eq:+.4f} ({pct_eq:+.2f}%)")
        print(f"  - weighted_blend RMSE minus ecmwf RMSE:     {delta_ec:+.4f} ({pct_ec:+.2f}%)")
        print(f"  - Single model with lowest test RMSE:      '{best_single_name}' (RMSE = {best_single_val:.4f})")

    # C. City-Level Comparison vs ECMWF on TEST Rows
    print("\n--- CITY-LEVEL TEST RMSE COMPARISON (weighted_blend vs ECMWF) ---")
    for l in [1, 2, 3]:
        mask_test_l = (df_blend["split"] == "test") & (df_blend["lead_days"] == l)
        df_sub = df_blend[mask_test_l]

        city_metrics = []
        for city_name, g in df_sub.groupby("city"):
            act = g[actual_col]
            err_wb = act - g[f"blend_{var}"]
            err_ec = act - g[f"{var}_ecmwf"]

            rmse_wb = np.sqrt(np.mean(err_wb ** 2))
            rmse_ec = np.sqrt(np.mean(err_ec ** 2))
            diff = rmse_wb - rmse_ec

            city_metrics.append({
                "city": city_name,
                "rmse_blend": round(rmse_wb, 4),
                "rmse_ecmwf": round(rmse_ec, 4),
                "diff": round(diff, 4)
            })

        df_city = pd.DataFrame(city_metrics)
        better_count = (df_city["diff"] < 0).sum()

        print(f"\n[Lead Days {l} - Test Set]")
        print(f"  - Number of cities where weighted_blend RMSE < ECMWF RMSE: {better_count} / 45")

        # Top 3 best (largest negative diff)
        top3_best = df_city.sort_values("diff").head(3)
        print("  - Top 3 Cities where blend is BEST relative to ECMWF:")
        for _, r in top3_best.iterrows():
            print(f"      * {r['city']}: blend={r['rmse_blend']:.4f}, ecmwf={r['rmse_ecmwf']:.4f} (diff={r['diff']:+.4f})")

        # Top 3 worst (largest positive diff)
        top3_worst = df_city.sort_values("diff", ascending=False).head(3)
        print("  - Top 3 Cities where blend is WORST relative to ECMWF:")
        for _, r in top3_worst.iterrows():
            print(f"      * {r['city']}: blend={r['rmse_blend']:.4f}, ecmwf={r['rmse_ecmwf']:.4f} (diff={r['diff']:+.4f})")

# -----------------------------------------------------------------------------
# SAVE OUTPUT FILE
# -----------------------------------------------------------------------------
df_blend.to_csv(output_file, index=False)
print(f"\nSuccessfully written blended pairs dataset to {output_file}")

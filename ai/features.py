import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from ai.model_registry import discover_models  # noqa: E402

# The RF feature space, derived from the model registry so a model added to the
# blend is also seen by the correction model. train.py and predict.py import
# FEATURE_COLS from here, so training and inference can never disagree on order.
FEATURE_MODELS = discover_models()
FEATURE_VARS = ('temperature', 'rainfall', 'wind_speed')
FEATURE_COLS = (
    ['latitude', 'longitude', 'lead_days', 'hour']
    + [f'{v}_{m}' for v in FEATURE_VARS for m in FEATURE_MODELS]
    + ['blend_temperature', 'blend_rainfall', 'blend_wind_speed']
    + ['spread_temperature', 'spread_rainfall', 'spread_wind_speed']
)

ACTUAL_COLS = ['actual_temperature', 'actual_rainfall', 'actual_wind']

TARGET_COLS = ['resid_temperature', 'resid_rainfall', 'resid_wind_speed']


def main():
    # 1. Load pairs_lead_blend.csv and parse datetime. Load data/cities.csv.
    pairs_path = 'outputs/interim/pairs_lead_blend.csv'
    cities_path = 'data/cities.csv'

    df = pd.read_csv(pairs_path)
    df['datetime'] = pd.to_datetime(df['datetime'])

    cities_df = pd.read_csv(cities_path)

    # Check required columns in cities.csv
    required_city_cols = {'city', 'latitude', 'longitude'}
    if not required_city_cols.issubset(cities_df.columns):
        missing = required_city_cols - set(cities_df.columns)
        raise ValueError(f"cities.csv is missing required columns: {missing}")

    # Check city sets match exactly (45 cities)
    pairs_cities = set(df['city'].unique())
    cities_file_cities = set(cities_df['city'].unique())
    if pairs_cities != cities_file_cities or len(cities_file_cities) != 45:
        raise ValueError(
            f"City sets differ or count is not 45. Pairs cities: {len(pairs_cities)}, Cities file: {len(cities_file_cities)}"
        )

    # 2. Left-merge latitude and longitude onto the pairs by city
    df = df.merge(cities_df[['city', 'latitude', 'longitude']], on='city', how='left')

    # 3. Add hour = datetime.hour
    df['hour'] = df['datetime'].dt.hour

    # 4. Add model spread (max - min) across every model in the blend
    for var in FEATURE_VARS:
        cols = [f'{var}_{m}' for m in FEATURE_MODELS]
        df[f'spread_{var}'] = df[cols].max(axis=1) - df[cols].min(axis=1)

    # 5. Add targets (actual - blend)
    df['resid_temperature'] = df['actual_temperature'] - df['blend_temperature']
    df['resid_rainfall'] = df['actual_rainfall'] - df['blend_rainfall']
    df['resid_wind_speed'] = df['actual_wind'] - df['blend_wind_speed']

    # 6 & 7. Set exact output column ordering
    output_cols = ['city', 'datetime', 'split'] + FEATURE_COLS + ACTUAL_COLS + TARGET_COLS
    df = df[output_cols]

    # --- Assertions ---
    # One row per (city, datetime, lead) pair, exactly the declared columns.
    expected_cols = 3 + len(FEATURE_COLS) + len(ACTUAL_COLS) + len(TARGET_COLS)
    if df.shape != (197640, expected_cols):
        raise ValueError(f"Expected shape (197640, {expected_cols}), got {df.shape}")
    if df.isna().any().any():
        raise ValueError("DataFrame contains NaN values")

    # No name in FEATURE_COLS starts with 'actual' or 'resid'
    for col in FEATURE_COLS:
        if col.startswith('actual') or col.startswith('resid'):
            raise ValueError(f"Feature column '{col}' starts with 'actual' or 'resid'")

    # Split integrity: both splits exist and partition the rows. (The old
    # 136080/61560 pins tracked one window's split; the window moves.)
    train_count = (df['split'] == 'train').sum()
    test_count = (df['split'] == 'test').sum()
    if train_count == 0 or test_count == 0 or train_count + test_count != len(df):
        raise ValueError(f"Invalid split counts: train={train_count}, test={test_count}, total={len(df)}")

    # (city, datetime, lead_days) is unique; every spread >= 0
    if df.duplicated(subset=['city', 'datetime', 'lead_days']).any():
        raise ValueError("(city, datetime, lead_days) contains duplicate combinations")

    spread_cols = ['spread_temperature', 'spread_rainfall', 'spread_wind_speed']
    if (df[spread_cols] < 0).any().any():
        raise ValueError("Found negative spread values")

    # --- Cross-check RMSE on TEST split per lead_days ---
    expected_rmse = {
        'resid_temperature': {1: 1.0199, 2: 1.0998, 3: 1.1573},
        'resid_rainfall': {1: 0.7243, 2: 0.7576, 3: 0.7682},
        'resid_wind_speed': {1: 2.6666, 2: 2.8625, 3: 3.0029},
    }

    test_df = df[df['split'] == 'test']
    print("--- Cross-check RMSE on TEST split per lead_days ---")
    for target_col, expected in expected_rmse.items():
        for lead in [1, 2, 3]:
            sub = test_df[test_df['lead_days'] == lead]
            rmse = np.sqrt(np.mean(sub[target_col] ** 2))
            exp_val = expected[lead]
            diff = abs(rmse - exp_val)
            status = "MATCH" if diff <= 0.001 else "MISMATCH"
            print(f" {target_col} lead{lead}: computed={rmse:.4f}, expected={exp_val:.4f} -> {status}")

    # --- Print shape, 31 column names, target statistics ---
    print("\n--- Output Summary ---")
    print(f"Shape: {df.shape}")
    print(f"\n{len(df.columns)} Column Names:")
    for i, col in enumerate(df.columns, 1):
        print(f"  {i:2d}. {col}")

    print("\n--- Target Residual Statistics (Mean & Std) ---")
    train_df = df[df['split'] == 'train']
    for target in TARGET_COLS:
        tr_mean, tr_std = train_df[target].mean(), train_df[target].std()
        te_mean, te_std = test_df[target].mean(), test_df[target].std()
        print(f"{target}:")
        print(f"  Train -> mean: {tr_mean:.4f}, std: {tr_std:.4f}")
        print(f"  Test  -> mean: {te_mean:.4f}, std: {te_std:.4f}")

    # --- Save output ---
    df['datetime'] = df['datetime'].dt.strftime('%Y-%m-%d %H:%M:%S')
    output_path = 'outputs/interim/ml_table.csv'
    df.to_csv(output_path, index=False)
    print(f"\nWrote outputs/interim/ml_table.csv successfully.")


if __name__ == '__main__':
    main()

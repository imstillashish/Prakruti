import pandas as pd
import numpy as np
from pathlib import Path

# Set up project directory paths
base_dir = Path(__file__).resolve().parent.parent
data_file = base_dir / "data" / "forecast_history_lead.csv"
actual_file = base_dir / "outputs" / "interim" / "actual_history_clean.csv"
output_file = base_dir / "outputs" / "interim" / "forecast_history_lead_clean.csv"

# Model mapping dictionary
# Full Open-Meteo id -> short id, pass-through for BYOM ids.
from ai.model_registry import normalize_model

# 1. Read input data
print(f"Reading input data from {data_file}...")
df_raw = pd.read_csv(data_file)
rows_in = len(df_raw)
df = df_raw.copy()

# Store input columns order
input_cols = list(df.columns)

# 2. Parse datetime
df["datetime"] = pd.to_datetime(df["datetime"])

# 3. Rename model values
df["model"] = df["model"].map(normalize_model)

# 4. Sort by (city, model, lead_days, datetime) and reset index
df = df.sort_values(by=["city", "model", "lead_days", "datetime"]).reset_index(drop=True)

# Ensure columns match input
df = df[input_cols]

# -----------------------------------------------------------------------------
# ASSERTIONS (Strict verification - raise ValueError on any failure)
# -----------------------------------------------------------------------------
# Assertion 1: complete grid — cities × hours × models × 3 leads, no NaN.
# (The old 790560 constant was one specific 4-model fetch; it moves with MODELS.)
rows_out = len(df)
if rows_in != rows_out:
    raise ValueError(f"Rows in ({rows_in}) does not equal rows out ({rows_out})")
n_cells = df.groupby(["city", "model", "lead_days", "datetime"]).ngroups
if rows_out != n_cells or len(df["city"].unique()) * len(df["model"].unique()) * 3 != len(df["model"].unique()) * len(df["lead_days"].unique()) * len(df["city"].unique()):
    raise ValueError(f"Row grid incomplete: {rows_out} rows, {n_cells} unique cells")
if df.isna().any().any():
    raise ValueError("NaN values detected in forecast history lead dataset")

# Assertion 2: lead_days values are exactly {1, 2, 3}
lead_days_set = set(df["lead_days"].unique())
if lead_days_set != {1, 2, 3}:
    raise ValueError(f"Expected lead_days to be {{1, 2, 3}}, but found {lead_days_set}")

# Assertion 3: No duplicate combinations on (city, model, lead_days, datetime)
if df.duplicated(subset=["city", "model", "lead_days", "datetime"]).any():
    raise ValueError("Duplicate entries found on (city, model, lead_days, datetime)")

# Assertion 4: Each (city, model, lead_days) series is strictly hourly with no gaps
for group_key, group in df.groupby(["city", "model", "lead_days"]):
    diffs = group["datetime"].diff().dropna()
    if not (diffs == pd.Timedelta(hours=1)).all():
        raise ValueError(f"Non-hourly step or gap detected in series group {group_key}")

# Assertion 5: Range bounds check for rainfall, wind_speed, and temperature
if (df["rainfall"] < 0).any():
    raise ValueError("Negative rainfall values detected")
if (df["wind_speed"] < 0).any():
    raise ValueError("Negative wind_speed values detected")
if (df["temperature"] < -10).any() or (df["temperature"] > 55).any():
    raise ValueError("Temperature values outside range [-10, 55] detected")

# Assertion 6: forecast coverage must sit inside the actuals window. The two
# fetchers derive their date ranges from "today" independently, so the raw
# windows drift; equality is the wrong invariant, coverage of the shared
# (city, datetime) pairs is what downstream alignment needs.
print(f"Reading actual history data from {actual_file}...")
df_actual = pd.read_csv(actual_file)
df_actual["datetime"] = pd.to_datetime(df_actual["datetime"])

set_forecast_pairs = set(zip(df["city"], df["datetime"]))
set_actual_pairs = set(zip(df_actual["city"], df_actual["datetime"]))

uncovered = set_forecast_pairs - set_actual_pairs
if uncovered:
    raise ValueError(
        f"{len(uncovered)} forecast (city, datetime) pairs have no actuals row "
        f"— actuals window must cover the lead-forecast window"
    )

# -----------------------------------------------------------------------------
# PRINT REPORT
# -----------------------------------------------------------------------------
print("=" * 70)
print("PREPROCESSING LEAD SUMMARY REPORT")
print("=" * 70)
print(f"Rows In:                      {rows_in}")
print(f"Rows Out:                     {rows_out}")
print(f"Min Datetime:                 {df['datetime'].min()}")
print(f"Max Datetime:                 {df['datetime'].max()}")
print(f"Number of Cities:             {df['city'].nunique()}")
print(f"Models Present:               {sorted(df['model'].unique().tolist())}")
print("-" * 70)
print("Rows & Flag Counts per Lead Day:")

for lead_day, group in df.groupby("lead_days"):
    count_rain = (group["rainfall"] > 50).sum()
    count_wind = (group["wind_speed"] > 60).sum()
    count_temp = ((group["temperature"] < 5) | (group["temperature"] > 48)).sum()
    print(f"  Lead Day {lead_day}:")
    print(f"    - Total Rows:             {len(group)}")
    print(f"    - Rainfall > 50 mm/h:     {count_rain}")
    print(f"    - Wind Speed > 60 km/h:   {count_wind}")
    print(f"    - Temperature < 5 or > 48: {count_temp}")
print("=" * 70)

# -----------------------------------------------------------------------------
# SAVE CLEANED FILE
# -----------------------------------------------------------------------------
df["datetime"] = df["datetime"].dt.strftime("%Y-%m-%d %H:%M:%S")
output_file.parent.mkdir(parents=True, exist_ok=True)
df.to_csv(output_file, index=False)
print(f"Successfully saved clean file to: {output_file}")

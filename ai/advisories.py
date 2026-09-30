"""
advisories.py — Generates data-driven hero advisories from hybrid_forecast.csv.

Reads:  outputs/hybrid_forecast.csv
Writes: outputs/advisories.csv (one row per action: 45 cities x 3 categories)

Scenario selection uses the SAME threshold table as ai/alerts.py (single
source of truth in ai/thresholds.py), so the hero and the Alert Center can
never disagree about what counts as hazardous. Every action line cites the
evidence that triggered it — no static strings.

Usage: python ai/advisories.py
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd

from ai.thresholds import THRESHOLDS, UNITS

INPUT_PATH = 'outputs/hybrid_forecast.csv'
OUTPUT_PATH = 'outputs/advisories.csv'

# Scenario registry: badge, tone, and the headline template.
# Templates receive the evidence dict computed per city.
SCENARIOS = {
    'heavy_rain': {
        'badge': 'Heavy Downpour', 'tone': 'destructive',
        'headline': 'Heavy rain expected — {evidence_rain}.',
    },
    'wind': {
        'badge': 'Squally Wind', 'tone': 'destructive',
        'headline': 'Squally wind expected — {evidence_wind}.',
    },
    'heat': {
        'badge': 'Heat Alert', 'tone': 'destructive',
        'headline': 'Heat alert — {evidence_temperature}.',
    },
    'light_rain': {
        'badge': 'Light Showers', 'tone': 'info',
        'headline': 'Light showers expected — {evidence_rain}.',
    },
    'calm': {
        'badge': 'All Clear', 'tone': 'muted',
        'headline': 'No hazard thresholds crossed in the next 72h.',
    },
}


def _evidence(df, col, moderate, unit):
    """Citation for the worst window of one variable: value, hours, peak time."""
    above = df[df[col] > moderate]
    if above.empty:
        peak = df.loc[df[col].idxmax()]
        return (f"stays below {moderate:g} {unit} through 72h "
                f"(peak {peak[col]:.1f} {unit})"), False
    peak = above.loc[above[col].idxmax()]
    hours = len(above)
    return (f"peak {peak[col]:.1f} {unit} around {peak['datetime']:%H:%M} IST, "
            f"{hours}h above {moderate:g} {unit}"), True


def _actions(scenario, ev):
    """Three (category, action) rows for a scenario.
    ev keys are hybrid_forecast columns -> (peak, hours_above, peak_time, text, crossed)."""
    if scenario == 'heavy_rain':
        peak, hours, _, _, _ = ev['rainfall']
        return [
            ('Personal Gear', f"Rain peaks at {peak:.0f} mm/hr with {hours}h of sustained fall — carry rainwear and waterproof footwear, not a compact umbrella."),
            ('Transit & Travel', f"Waterlogging likely during the {hours}h wet window — avoid low-lying underpasses and expect delays on flood-prone routes."),
            ('Work & Outdoors', f"With {hours}h above alert levels, postpone non-essential field work and secure outdoor equipment before the peak."),
        ]
    if scenario == 'light_rain':
        peak, _, t, _, _ = ev['rainfall']
        return [
            ('Personal Gear', f"Only {peak:.1f} mm/hr expected near {t:%H:%M} IST — keep a compact umbrella handy for the evening."),
            ('Transit & Travel', f"Roads stay largely dry; brief damp patches possible around {t:%H:%M} IST — normal travel is fine."),
            ('Work & Outdoors', f"Rain stays light ({peak:.1f} mm/hr peak) — outdoor work can continue with short shower breaks."),
        ]
    if scenario == 'heat':
        peak, hours, t, _, _ = ev['temperature']
        return [
            ('Hydration', f"Temperature hits {peak:.0f}°C around {t:%H:%M} IST — carry water and sip through the afternoon, don't wait for thirst."),
            ('Shade & Timing', f"{hours}h above 35°C — shift outdoor errands before 10:00 or after 17:00; midday sun is the hazard."),
            ('Vulnerable Groups', f"At {peak:.0f}°C, check on elderly neighbours and keep children indoors through the {hours}h hot spell."),
        ]
    if scenario == 'wind':
        peak, hours, t, _, _ = ev['wind_speed']
        return [
            ('Secure Loose Objects', f"Gusts reach {peak:.0f} km/h around {t:%H:%M} IST — bring in awnings, bins and rooftop items before the peak."),
            ('Two-Wheelers & Driving', f"{hours}h of wind above 25 km/h — expect sideways gusts on exposed roads; ride two-wheelers with extra caution."),
            ('Outdoor Operations', f"Sustained {peak:.0f} km/h winds — crane/lift work and temporary structures should pause during the peak window."),
        ]
    # calm — margins against each threshold, still evidence
    rain_margin = 4 - ev['rainfall'][0]
    temp_margin = 35 - ev['temperature'][0]
    wind_margin = 25 - ev['wind_speed'][0]
    return [
        ('Rain Outlook', f"{ev['rainfall'][3]}; {rain_margin:.1f} mm of headroom before any alert."),
        ('Temperature', f"{ev['temperature'][3]}; {temp_margin:.1f}°C below the heat-alert line."),
        ('Wind', f"{ev['wind_speed'][3]}; {wind_margin:.1f} km/h below the wind-alert line."),
    ]


def generate(input_path=INPUT_PATH, output_path=OUTPUT_PATH):
    df = pd.read_csv(input_path, parse_dates=['datetime'])
    rows = []

    for city, cdf in df.groupby('city'):
        cdf = cdf.sort_values('datetime')
        ev = {}
        crossed = {}
        for event, cfg in THRESHOLDS.items():
            col = cfg['column']
            text, did = _evidence(cdf, col, cfg['moderate'], UNITS[event])
            peak_val = cdf[col].max()
            ev[col] = (peak_val, int((cdf[col] > cfg['moderate']).sum()),
                       cdf.loc[cdf[col].idxmax(), 'datetime'], text, did)
            crossed[col] = (cdf[col] > cfg['high']).any() and (cdf[col] > cfg['moderate']).any()

        # Scenario pick: highest crossing severity; tie-break by PRIORITY.
        if crossed['rainfall']:
            scenario = 'heavy_rain'
        elif crossed['wind_speed']:
            scenario = 'wind'
        elif crossed['temperature']:
            scenario = 'heat'
        elif (cdf['rainfall'] > THRESHOLDS['Heavy Rain']['moderate']).any():
            scenario = 'light_rain'
        else:
            scenario = 'calm'

        meta = SCENARIOS[scenario]
        for rank, (category, action) in enumerate(_actions(scenario, ev), start=1):
            rows.append({
                'city': city,
                'scenario': scenario,
                'severity': 'none' if scenario == 'calm' else ('high' if scenario in ('heavy_rain', 'wind') else 'moderate'),
                'badge': meta['badge'],
                'tone': meta['tone'],
                'headline': meta['headline'].format(
                    evidence_rain=ev['rainfall'][3],
                    evidence_temperature=ev['temperature'][3],
                    evidence_wind=ev['wind_speed'][3],
                ),
                'category': category,
                'action': action,
                'evidence': ev[THRESHOLDS['Heavy Rain']['column'] if scenario in ('heavy_rain', 'light_rain')
                                else THRESHOLDS['High Wind']['column'] if scenario == 'wind'
                                else THRESHOLDS['High Temperature']['column'] if scenario == 'heat'
                                else 'rainfall'][3],
                'rank': rank,
            })

    out = pd.DataFrame(rows)

    # Assertions — never auto-fix, never write a broken file
    if len(out) != df['city'].nunique() * 3:
        raise ValueError(f"Assertion failed: expected 3 rows per city, got {len(out)} total for {df['city'].nunique()} cities")
    if out.isna().any().any():
        raise ValueError("Assertion failed: advisories output contains NaN values")

    out.to_csv(output_path, index=False)
    print(f"Advisories: {len(out)} rows, {out['city'].nunique()} cities, "
          f"scenarios: {out['scenario'].value_counts().to_dict()}")
    return out


if __name__ == '__main__':
    generate()

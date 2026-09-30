"""Shared hazard thresholds — single source of truth for alerts + advisories."""

# Prototype thresholds calibrated for operational hackathon demonstration.
# 'column' refers to a column in outputs/hybrid_forecast.csv.
THRESHOLDS = {
    'Heavy Rain':       {'column': 'rainfall',    'moderate': 4,  'high': 8},
    'High Temperature': {'column': 'temperature', 'moderate': 35, 'high': 37},
    'High Wind':        {'column': 'wind_speed',  'moderate': 25, 'high': 32},
}

# Which variable each threshold watches, with display units for evidence lines.
UNITS = {
    'Heavy Rain':       'mm',
    'High Temperature': '°C',
    'High Wind':        'km/h',
}

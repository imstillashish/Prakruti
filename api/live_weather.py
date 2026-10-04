"""
Live observations for the dashboard, from Open-Meteo.

Open-Meteo is the one external feed this app talks to because it is genuinely
free: key-less, no signup, CC-BY-4.0, and it answers with the current hour's
measured values for any lat/lon we already have in data/cities.csv. Anything
metered (OpenWeatherMap, Tomorrow.io, WeatherAPI) would mean a key in a
deployment that is not supposed to carry one.

One upstream call per city per TTL serves every browser, so a page full of
15-second pollers still costs one request every LIVE_TTL_SECONDS per city. On
an upstream failure the last good payload is served with stale=true — a
dashboard showing a ten-minute-old observation beats a dashboard showing a
spinner.

`recent` is that same reading's own history: the last LIVE_HISTORY_HOURS at the
15-minute step the feed publishes (`minutely_15`), oldest first. The intraday
strip draws it, and extends it with `current` at the live edge, so the line
reaches now without a point nobody measured.

ponytail: the cache is a dict behind a lock. The deployment is a single Render
process, so a shared store would be more machinery than the problem has.
"""

import csv
import os
import threading
import time
from datetime import datetime, timedelta, timezone

import requests

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CITIES_CSV = os.path.join(BASE_DIR, "data", "cities.csv")

UPSTREAM = "https://api.open-meteo.com/v1/forecast"
TTL_SECONDS = int(os.environ.get("LIVE_TTL_SECONDS", "300"))
REQUEST_TIMEOUT = float(os.environ.get("LIVE_REQUEST_TIMEOUT", "6"))

IST = timezone(timedelta(hours=5, minutes=30))
# The intraday strip: how far back the observed series runs, and the step the
# upstream feed actually publishes it at. 12 hours of 15-minute samples is 49
# points — enough to read the day's shape without turning the band into a chart.
HISTORY_HOURS = int(os.environ.get("LIVE_HISTORY_HOURS", "12"))
STEPS_PER_HOUR = 4

# WMO 4677 present-weather codes, collapsed to the handful of states an
# everyday-weather reader needs. (label, icon slug)
_WMO = {
    0: ("Clear sky", "clear"),
    1: ("Mainly clear", "clear"),
    2: ("Partly cloudy", "cloudy"),
    3: ("Overcast", "cloudy"),
    45: ("Fog", "fog"),
    48: ("Freezing fog", "fog"),
    51: ("Light drizzle", "rain"),
    53: ("Drizzle", "rain"),
    55: ("Heavy drizzle", "rain"),
    56: ("Freezing drizzle", "rain"),
    57: ("Heavy freezing drizzle", "rain"),
    61: ("Light rain", "rain"),
    63: ("Rain", "rain"),
    65: ("Heavy rain", "rain"),
    66: ("Freezing rain", "rain"),
    67: ("Heavy freezing rain", "rain"),
    71: ("Light snow", "snow"),
    73: ("Snow", "snow"),
    75: ("Heavy snow", "snow"),
    77: ("Snow grains", "snow"),
    80: ("Light showers", "rain"),
    81: ("Showers", "rain"),
    82: ("Violent showers", "rain"),
    85: ("Snow showers", "snow"),
    86: ("Heavy snow showers", "snow"),
    95: ("Thunderstorm", "storm"),
    96: ("Thunderstorm with hail", "storm"),
    99: ("Severe thunderstorm with hail", "storm"),
}

_lock = threading.Lock()
_cache = {}  # city_lower -> {"at": epoch, "payload": dict}
_coords = None


def _load_coords():
    """city (lower) -> (latitude, longitude), read once from data/cities.csv."""
    global _coords
    if _coords is not None:
        return _coords
    table = {}
    try:
        with open(CITIES_CSV, mode="r", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                city = (row.get("city") or "").strip().lower()
                if not city:
                    continue
                try:
                    table[city] = (float(row["latitude"]), float(row["longitude"]))
                except (KeyError, TypeError, ValueError):
                    continue
    except OSError:
        table = {}
    _coords = table
    return _coords


def _condition(code):
    return _WMO.get(code, ("Unknown", "unknown"))


def _clock(iso_local):
    """'2026-10-04T10:00' -> '10:00' (the API is already asked for IST)."""
    if not iso_local or "T" not in iso_local:
        return None
    return iso_local.split("T", 1)[1][:5]


def _stamp(dt):
    """'2026-10-04T19:00' — the local-time format the upstream window takes."""
    return dt.strftime("%Y-%m-%dT%H:%M")


def _normalise(city, lat, lon, body, now_ist):
    current = body.get("current") or {}
    series = body.get("minutely_15") or {}
    cutoff = _stamp(now_ist)
    times = series.get("time") or []
    temps = series.get("temperature_2m") or []
    rain = series.get("precipitation") or []
    wind = series.get("wind_speed_10m") or []

    # Oldest first; the window's end_hour rounds up to the next quarter, so the
    # points still to come are dropped. Both stamps share a format, so they
    # compare as plain strings.
    recent = []
    for i, t in enumerate(times):
        if t > cutoff:
            continue
        recent.append(
            {
                "time": _clock(t),
                "temperature": _round(temps[i] if i < len(temps) else None, 1),
                "precipitation": _round(rain[i] if i < len(rain) else None, 1),
                "wind_speed": _round(wind[i] if i < len(wind) else None, 1),
            }
        )
    recent = recent[-(HISTORY_HOURS * STEPS_PER_HOUR + 1) :]

    label, icon = _condition(current.get("weather_code"))
    observed_at = current.get("time")
    return {
        "city": city,
        "latitude": lat,
        "longitude": lon,
        "source": "Open-Meteo (CC BY 4.0)",
        "observed_at": observed_at,
        "observed_at_ist": _clock(observed_at),
        "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "stale": False,
        "current": {
            "temperature": _round(current.get("temperature_2m"), 1),
            "feels_like": _round(current.get("apparent_temperature"), 1),
            "humidity": _round(current.get("relative_humidity_2m"), 0),
            "precipitation": _round(current.get("precipitation"), 1),
            "wind_speed": _round(current.get("wind_speed_10m"), 1),
            "condition": label,
            "icon": icon,
            "is_day": bool(current.get("is_day", 1)),
        },
        "recent": recent,
    }


def _round(value, digits):
    if value is None:
        return None
    try:
        return round(float(value), digits)
    except (TypeError, ValueError):
        return None


def fetch_live_conditions(city):
    """
    Current measured conditions for `city`, or None when the city is unknown.

    Returns the cached payload with stale=true rather than None when upstream
    is unreachable but a previous reading exists.
    """
    coords = _load_coords().get((city or "").strip().lower())
    if not coords:
        return None
    lat, lon = coords
    key = (city or "").strip().lower()

    now = time.time()
    with _lock:
        hit = _cache.get(key)
    if hit and now - hit["at"] < TTL_SECONDS:
        return hit["payload"]

    now_ist = datetime.now(IST)
    # `minutely_15` ignores past_hours/forecast_hours and defaults to three
    # days; only an explicit window narrows it. Asking for exactly the strip's
    # window keeps the answer at ~3 KB instead of ~15 KB.
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": (
            "temperature_2m,relative_humidity_2m,apparent_temperature,"
            "precipitation,wind_speed_10m,weather_code,is_day"
        ),
        "minutely_15": "temperature_2m,precipitation,wind_speed_10m",
        "timezone": "Asia/Kolkata",
        "start_hour": _stamp(now_ist - timedelta(hours=HISTORY_HOURS)),
        "end_hour": _stamp(now_ist),
    }

    try:
        resp = requests.get(UPSTREAM, params=params, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        payload = _normalise(city, lat, lon, resp.json(), now_ist)
    except Exception as exc:  # network, HTTP, decode — all the same to the caller
        print(f"[LiveWeather] {city} upstream failed: {exc}")
        if hit:
            stale = dict(hit["payload"])
            stale["stale"] = True
            return stale
        return None

    with _lock:
        _cache[key] = {"at": now, "payload": payload}
    return payload

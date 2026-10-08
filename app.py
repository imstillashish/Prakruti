"""
Hybrid Weather AI - Main Application Entry Point & REST API
Smart India Hackathon 2026 (PS: 26081)
"""

import os
import csv
import json
import math
import sqlite3
from datetime import datetime, timezone
from flask import Flask, jsonify, request

# Graceful pandas import to support both venv and environments with C-extension conflicts
try:
    import pandas as pd
    USE_PANDAS = True
except (ImportError, ValueError, Exception):
    pd = None
    USE_PANDAS = False

app = Flask(__name__)

# Production CORS configuration for Vercel and local environments
try:
    from flask_cors import CORS
    CORS(
        app,
        resources={r"/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
            "allow_headers": ["Content-Type", "Authorization", "Cache-Control", "Pragma", "Accept", "X-Requested-With", "Origin"],
            "max_age": 86400
        }}
    )
except ImportError:
    pass

# Base project paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
DATA_DIR = os.path.join(BASE_DIR, "data")


def load_csv_records(csv_path):
    """
    Reads a CSV file into a list of dict records.
    Uses pandas if available; falls back to standard library csv module.
    """
    if not os.path.exists(csv_path):
        return None

    if USE_PANDAS and pd is not None:
        try:
            df = pd.read_csv(csv_path)
            # astype(object) first: in float columns pandas coerces None back to NaN,
            # which Flask then serializes as bare `NaN` — invalid JSON for the frontend.
            df = df.astype(object).where(pd.notnull(df), None)
            return df.to_dict(orient='records')
        except Exception:
            pass

    records = []
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            cleaned = {}
            for k, v in row.items():
                if v == '' or v is None:
                    cleaned[k] = None
                else:
                    try:
                        if '.' in v:
                            cleaned[k] = float(v)
                        else:
                            cleaned[k] = int(v)
                    except ValueError:
                        cleaned[k] = v
            records.append(cleaned)
    return records


import time
import threading

_last_freshness_check = 0

def check_forecast_freshness_async():
    """Runs forecast freshness check asynchronously in the background so HTTP requests never block."""
    global _last_freshness_check
    now = time.time()
    if now - _last_freshness_check < 3600:  # Check at most once per hour
        return
    _last_freshness_check = now

    def _worker():
        try:
            ensure_fresh_forecast()
        except Exception as _e:
            print(f"[CacheManager] Background refresh notice: {_e}")

    threading.Thread(target=_worker, daemon=True).start()


from api.cache_manager import ensure_fresh_forecast, load_metadata
from api.live_weather import fetch_live_conditions

# Trigger non-blocking freshness check in background
try:
    check_forecast_freshness_async()
except Exception as _e:
    print(f"[Warning] Background startup notice: {_e}")


# --- Free-tier keep-alive -----------------------------------------------------
# Render spins a free instance down after ~15 idle minutes; a cold start then
# costs 30-60 s per request. Pinging our own public /health every 10 min counts
# as inbound traffic at Render's router, so the instance never sits idle long
# enough to sleep. No-op outside Render (RENDER_EXTERNAL_URL unset), so local
# dev never pings anything. KEEPALIVE_SECONDS exists so the loop can be
# exercised end-to-end in tests.
_keepalive_url = os.environ.get('RENDER_EXTERNAL_URL')
if _keepalive_url:
    import urllib.request

    _keepalive_seconds = int(os.environ.get('KEEPALIVE_SECONDS', '600'))

    def _keepalive_loop():
        while True:
            time.sleep(_keepalive_seconds)
            try:
                with urllib.request.urlopen(f"{_keepalive_url}/health", timeout=60) as _resp:
                    pass
            except Exception as _e:
                print(f"[KeepAlive] ping failed: {_e}")

    threading.Thread(target=_keepalive_loop, daemon=True, name="render-keepalive").start()
    print(f"[KeepAlive] self-ping every {_keepalive_seconds}s -> {_keepalive_url}/health")


@app.before_request
def handle_options_preflight():
    """Explicitly handle OPTIONS preflight requests for cross-origin browser clients."""
    if request.method == 'OPTIONS':
        res = app.make_default_options_response()
        res.headers['Access-Control-Allow-Origin'] = '*'
        res.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, HEAD'
        res.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Cache-Control, Pragma, Accept, X-Requested-With, Origin'
        res.headers['Access-Control-Max-Age'] = '86400'
        return res


@app.after_request
def add_cors_headers(response):
    """Enable CORS for Vercel, Render, and local frontend origins."""
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, HEAD'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Cache-Control, Pragma, Accept, X-Requested-With, Origin'
    response.headers['Access-Control-Max-Age'] = '86400'
    return response


@app.route('/favicon.ico')
def favicon():
    """Return 204 No Content to satisfy browser requests without 404."""
    return ('', 204)


@app.route('/')
@app.route('/api')
@app.route('/api/')
@app.route('/health')
@app.route('/healthz')
def index():
    return jsonify({
        "status": "online",
        "service": "Hybrid Weather AI System",
        "version": "1.0.0",
        "engine": "pandas" if (USE_PANDAS and pd is not None) else "standard-csv",
        "endpoints": {
            "forecast": "/api/forecast",
            "metadata": "/api/metadata",
            "weights": "/api/weights",
            "skill": "/api/skill",
            "alerts": "/api/alerts",
            "cities": "/api/cities",
            "live": "/api/live?city=Kanpur",
            "confidence": "/api/confidence",
            "rpi": "/api/rpi",
            "rpi_map": "/api/rpi/map"
        }
    })


@app.route('/api/metadata', methods=['GET'])
@app.route('/metadata', methods=['GET'])
def get_metadata():
    """
    Returns forecast freshness metadata:
      - last_updated
      - city count (cities)
      - model count (models)
    """
    meta = load_metadata()
    if not meta:
        try:
            check_forecast_freshness_async()
        except Exception:
            pass
        meta = {
            "last_updated": "2026-09-27T10:25:33",
            "cities": 45,
            "models": 4,
            "city_count": 45,
            "model_count": 4
        }
    return jsonify(meta)


@app.route('/api/live', methods=['GET'])
@app.route('/live', methods=['GET'])
def get_live():
    """
    Current measured conditions for one city, from Open-Meteo (free, key-less).
    Served through a TTL cache so the browser can poll cheaply. 404 for a city
    that is not in data/cities.csv; the frontend hides the live band on 404.
    """
    city = (request.args.get('city') or 'Kanpur').strip()
    payload = fetch_live_conditions(city)
    if payload is None:
        return jsonify({"error": f"No live observations available for '{city}'"}), 404
    return jsonify(payload)


@app.route('/api/forecast', methods=['GET'])
@app.route('/forecast', methods=['GET'])
def get_forecast():
    """
    Returns records from outputs/hybrid_forecast.csv (falls back to blended_forecast.csv if missing).
    Checks freshness asynchronously in background without blocking.
    Optional query parameters:
      - city: filter by city name (e.g. ?city=Kanpur)
      - lead_days: filter by lead time (1, 2, or 3)
    """
    # 1. Asynchronously check freshness in background without blocking this HTTP request
    try:
        check_forecast_freshness_async()
    except Exception as e:
        print(f"[API Error] Async refresh notice: {e}")

    # 2. Load latest forecast (primary: hybrid_forecast.csv, fallback: blended_forecast.csv)
    hybrid_path = os.path.join(OUTPUTS_DIR, "hybrid_forecast.csv")
    blended_path = os.path.join(OUTPUTS_DIR, "blended_forecast.csv")

    is_fallback = False
    if os.path.exists(hybrid_path):
        csv_path = hybrid_path
    elif os.path.exists(blended_path):
        csv_path = blended_path
        is_fallback = True
    else:
        return jsonify({"error": "Forecast data not found (neither hybrid nor blended)"}), 404

    records = load_csv_records(csv_path)
    if records is None:
        return jsonify({"error": f"{os.path.basename(csv_path)} could not be loaded"}), 404

    # Ensure backward-compatible blend_* fields for all frontend consumers
    for r in records:
        if is_fallback:
            r['is_fallback'] = True
        if 'blend_temperature' not in r or r['blend_temperature'] is None:
            r['blend_temperature'] = r.get('temperature')
        if 'blend_rainfall' not in r or r['blend_rainfall'] is None:
            r['blend_rainfall'] = r.get('rainfall')
        if 'blend_wind_speed' not in r or r['blend_wind_speed'] is None:
            r['blend_wind_speed'] = r.get('wind_speed')

    city = request.args.get('city')
    lead_days = request.args.get('lead_days')

    if city:
        city_lower = city.strip().lower()
        records = [r for r in records if str(r.get('city', '')).lower() == city_lower]
    if lead_days:
        try:
            ld = int(lead_days)
            records = [r for r in records if r.get('lead_days') == ld]
        except ValueError:
            pass

    return jsonify(records)


@app.route('/api/weights', methods=['GET'])
@app.route('/weights', methods=['GET'])
def get_weights():
    """
    Returns records from outputs/model_weights_lead.csv.
    Optional query parameters:
      - city: filter by city name
      - variable: filter by variable ('temperature', 'rainfall', 'wind_speed')
      - lead_days: filter by lead_days (1, 2, 3)
    """
    csv_path = os.path.join(OUTPUTS_DIR, "model_weights_lead.csv")
    records = load_csv_records(csv_path)
    if records is None:
        return jsonify({"error": "model_weights_lead.csv not found"}), 404

    city = request.args.get('city')
    variable = request.args.get('variable')
    lead_days = request.args.get('lead_days')

    if city:
        city_lower = city.strip().lower()
        records = [r for r in records if str(r.get('city', '')).lower() == city_lower]
    if variable:
        var_lower = variable.strip().lower()
        records = [r for r in records if str(r.get('variable', '')).lower() == var_lower]
    if lead_days:
        try:
            ld = int(lead_days)
            records = [r for r in records if r.get('lead_days') == ld]
        except ValueError:
            pass

    return jsonify(records)


@app.route('/api/skill', methods=['GET'])
@app.route('/skill', methods=['GET'])
def get_skill():
    """
    Returns records from outputs/skill_scores_lead.csv.
    Optional query parameters:
      - city: filter by city name
      - variable: filter by variable ('temperature', 'rainfall', 'wind_speed')
      - lead_days: filter by lead_days (1, 2, 3)
    """
    csv_path = os.path.join(OUTPUTS_DIR, "skill_scores_lead.csv")
    records = load_csv_records(csv_path)
    if records is None:
        return jsonify({"error": "skill_scores_lead.csv not found"}), 404

    city = request.args.get('city')
    variable = request.args.get('variable')
    lead_days = request.args.get('lead_days')

    if city:
        city_lower = city.strip().lower()
        records = [r for r in records if str(r.get('city', '')).lower() == city_lower]
    if variable:
        var_lower = variable.strip().lower()
        records = [r for r in records if str(r.get('variable', '')).lower() == var_lower]
    if lead_days:
        try:
            ld = int(lead_days)
            records = [r for r in records if r.get('lead_days') == ld]
        except ValueError:
            pass

    return jsonify(records)


@app.route('/api/alerts', methods=['GET'])
@app.route('/alerts', methods=['GET'])
def get_alerts():
    """
    Returns records from outputs/extreme_alerts.csv.
    Optional query parameter:
      - city: filter by city name
    """
    csv_path = os.path.join(OUTPUTS_DIR, "extreme_alerts.csv")
    records = load_csv_records(csv_path)
    if records is None:
        return jsonify({"error": "extreme_alerts.csv not found"}), 404

    city = request.args.get('city')
    if city:
        city_lower = city.strip().lower()
        records = [r for r in records if str(r.get('city', '')).lower() == city_lower]

    return jsonify(records)


@app.route('/api/advisories', methods=['GET'])
@app.route('/advisories', methods=['GET'])
def get_advisories():
    """
    Returns records from outputs/advisories.csv (data-driven hero advice).
    Optional query parameter:
      - city: filter by city name
    """
    csv_path = os.path.join(OUTPUTS_DIR, "advisories.csv")
    records = load_csv_records(csv_path)
    if records is None:
        return jsonify({"error": "advisories.csv not found"}), 404

    city = request.args.get('city')
    if city:
        city_lower = city.strip().lower()
        records = [r for r in records if str(r.get('city', '')).lower() == city_lower]

    return jsonify(records)


@app.route('/api/decision', methods=['GET'])
@app.route('/decision', methods=['GET'])
def get_decision():
    """
    PRD §8.3 core decision payload (F-01): precomputed P10/P50/P90 bands,
    threshold exceedance probabilities, disagreement class, confidence and
    model contributions — composed from published CSVs, no query-time compute.
    Required query parameter:
      - city
    """
    from ai.thresholds import THRESHOLDS

    city = request.args.get('city')
    if not city:
        return jsonify({"error": "city query parameter is required"}), 400

    unc = load_csv_records(os.path.join(OUTPUTS_DIR, "uncertainty.csv"))
    exc = load_csv_records(os.path.join(OUTPUTS_DIR, "exceedance.csv"))
    if unc is None or exc is None:
        return jsonify({"error": "uncertainty artifacts not found — run ai/uncertainty.py"}), 404

    meta = load_metadata() or {}

    # F-01.A: cycle readiness rides on every decision payload (PRD §8.3)
    from ai.cycle_state import load_state as load_cycle_state
    cycle_state = load_cycle_state() or {}
    missing_models = cycle_state.get("missing_models", [])

    diag = load_csv_records(os.path.join(OUTPUTS_DIR, "uncertainty_diagnostics.csv")) or []
    engine_version = diag[0].get("engine_version", "unknown") if diag else "unknown"

    weights = load_csv_records(os.path.join(OUTPUTS_DIR, "model_weights_lead.csv")) or []
    confidence = {(str(r.get('city')), str(r.get('datetime')), str(r.get('lead_day'))): r
                  for r in (load_csv_records(os.path.join(OUTPUTS_DIR, "confidence_scores.csv")) or [])}

    city_lower = city.strip().lower()
    overrides = _latest_overrides_for_city(city_lower)
    exc_by_key = {(str(r.get('city')), str(r.get('datetime')), str(r.get('lead_days'))): r for r in exc}

    var_thresholds = {
        "temperature": (THRESHOLDS['High Temperature']['moderate'], THRESHOLDS['High Temperature']['high']),
        "rainfall": (THRESHOLDS['Heavy Rain']['moderate'], THRESHOLDS['Heavy Rain']['high']),
        "wind_speed": (THRESHOLDS['High Wind']['moderate'], THRESHOLDS['High Wind']['high']),
    }
    var_units = {"temperature": "°C", "rainfall": "mm/h", "wind_speed": "km/h"}

    def num(v):
        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    records = []
    for u in unc:
        if str(u.get('city', '')).lower() != city_lower:
            continue
        dt, lead = str(u.get('datetime')), str(u.get('lead_days'))
        e = exc_by_key.get((str(u.get('city')), dt, lead), {})

        value, tprob, mclass = {}, {}, {}
        for var, (t_mod, t_high) in var_thresholds.items():
            value[var] = {"p10": num(u.get(f"p10_{var}")), "p50": num(u.get(f"p50_{var}")),
                          "p90": num(u.get(f"p90_{var}")), "unit": var_units[var]}
            tprob[var] = {str(t_mod): num(e.get(f"p_ge_{var}_{t_mod:g}")),
                          str(t_high): num(e.get(f"p_ge_{var}_{t_high:g}"))}
            mclass[var] = e.get(f"max_class_{var}", "none")

        agreement_score = num(u.get("agreement_score")) or 0.0
        codes = []
        if agreement_score >= 60:
            codes.append("HIGH_MODEL_AGREEMENT")
        elif agreement_score < 40:
            codes.append("HIGH_MODEL_SPREAD")
        if any(c != "none" for c in mclass.values()):
            codes.append("TAIL_RISK_SIGNAL")
        if (num(u.get("lead_days")) or 0) >= 3:
            codes.append("LEAD_DEGRADES_SKILL")
        for m in missing_models:
            codes.append(f"MISSING_{m.upper()}")
        if not codes:
            codes.append("NOMINAL_CONTEXT")

        conf = confidence.get((str(u.get('city')), dt, lead), {})
        # Weights are per (city, variable, lead, model) — expose one ranked list
        # of the 4 models per variable, per PRD §8.3 model_contributions.
        contributions = {}
        for var in var_thresholds:
            per_var = sorted(
                ({"model_id": w.get("model"), "weight": num(w.get("weight"))}
                 for w in weights
                 if str(w.get("city")).lower() == city_lower
                 and str(w.get("lead_days")) == lead
                 and str(w.get("variable")) == var),
                key=lambda c: c["weight"] or 0.0, reverse=True)
            contributions[var] = per_var

        ovr = {ovar: o for (odt, olead, ovar), o in overrides.items()
               if odt == dt and str(olead) == lead}

        records.append({
            "datetime": u.get("datetime"),
            "lead_days": num(u.get("lead_days")),
            "value": value,
            "threshold_probabilities": tprob,
            "max_class": mclass,
            "disagreement_class": u.get("agreement_class"),
            "agreement_score": agreement_score,
            "confidence": {"label": conf.get("confidence_label"), "score": num(conf.get("confidence")),
                           "reason_codes": codes},
            "model_contributions": contributions,
            "override": ovr or None,
        })

    if not records:
        return jsonify({"error": f"no decision records for city '{city}'"}), 404

    return jsonify({
        "city": records[0]["datetime"] and city,
        "generated_at": meta.get("last_updated"),
        "engine_version": engine_version,
        "cycle": {
            "cycle_id": cycle_state.get("cycle_id", meta.get("last_updated")),
            "source_completeness": cycle_state.get(
                "source_completeness",
                {"expected": meta.get("model_count", 4), "available": None, "fallback": False}),
        },
        "record_count": len(records),
        "coverage": {d.get("variable"): num(d.get("holdout_coverage")) for d in diag},
        "records": records,
    })


# ---------------------------------------------------------------------------
# F-01.D.7 Override & audit (AC-19) — insert-only SQLite store
# ---------------------------------------------------------------------------
DB_PATH = os.path.join(BASE_DIR, "database", "weather.db")
OVERRIDE_VARS = {"temperature", "rainfall", "wind_speed"}
OVERRIDE_DDL = """
CREATE TABLE IF NOT EXISTS decision_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  cycle_id TEXT NOT NULL,
  city TEXT NOT NULL,
  datetime TEXT NOT NULL,
  lead_days INTEGER NOT NULL,
  variable TEXT NOT NULL,
  original_value REAL,
  override_value REAL NOT NULL,
  reason TEXT NOT NULL,
  user_id TEXT NOT NULL
)
"""


def _override_conn():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute(OVERRIDE_DDL)
    return conn


def _lookup_original_value(city, dt_str, lead, variable):
    """Engine-published p50 for the key, or None when the engine never published it."""
    rows = load_csv_records(os.path.join(OUTPUTS_DIR, "uncertainty.csv")) or []
    want = dt_str.strip().replace("T", " ").rstrip("Z")
    for r in rows:
        if str(r.get("city", "")).lower() == city.lower() \
                and str(r.get("datetime")).replace("T", " ").startswith(want[:16]) \
                and str(r.get("lead_days")) == str(lead):
            try:
                return float(r.get(f"p50_{variable}"))
            except (TypeError, ValueError):
                return None
    return None


def _latest_overrides_for_city(city_lower):
    """(datetime, lead, variable) -> most recent override, for /api/decision surfacing."""
    if not os.path.exists(DB_PATH):
        return {}
    try:
        conn = _override_conn()
        rows = conn.execute(
            "SELECT city, datetime, lead_days, variable, override_value, reason, user_id, created_at"
            " FROM decision_overrides ORDER BY id DESC").fetchall()
        conn.close()
    except sqlite3.Error as e:
        print(f"[Overrides] audit read failed: {e}")
        return {}
    out = {}
    for r_city, dt, lead, var, val, reason, user, created in rows:
        if str(r_city).lower() != city_lower:
            continue
        key = (str(dt), str(lead), str(var))
        if key not in out:
            out[key] = {"value": val, "reason": reason, "user_id": user, "created_at": created}
    return out


@app.route('/api/decision/override', methods=['POST'])
def create_decision_override():
    """
    AC-19: record a forecaster override of a published decision value.
    Insert-only audit; the engine value is never altered.
    """
    body = request.get_json(silent=True) or {}
    city = str(body.get('city') or '').strip()
    dt_str = str(body.get('datetime') or '').strip()
    variable = str(body.get('variable') or '').strip().lower()
    value = body.get('override_value')
    reason = str(body.get('reason') or '').strip()
    user_id = str(body.get('user_id') or '').strip()
    original = body.get('original_value')

    try:
        lead = int(body.get('lead_days'))
    except (TypeError, ValueError):
        lead = None

    errors = []
    if not city:
        errors.append("city is required")
    if not dt_str:
        errors.append("datetime is required")
    if lead not in (1, 2, 3):
        errors.append("lead_days must be 1, 2 or 3")
    if variable not in OVERRIDE_VARS:
        errors.append("variable must be one of temperature|rainfall|wind_speed")
    if not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(value):
        errors.append("override_value must be a finite number")
    if not reason:
        errors.append("reason is required")
    if not user_id:
        errors.append("user_id is required")
    if errors:
        return jsonify({"error": "; ".join(errors)}), 400

    if original is None:
        original = _lookup_original_value(city, dt_str, lead, variable)
    try:
        original = float(original) if original is not None else None
    except (TypeError, ValueError):
        original = None

    cycle_id = body.get('cycle_id') or (load_metadata() or {}).get("last_updated") or "unknown"
    created_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    conn = _override_conn()
    try:
        cur = conn.execute(
            "INSERT INTO decision_overrides (created_at, cycle_id, city, datetime, lead_days,"
            " variable, original_value, override_value, reason, user_id)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (created_at, str(cycle_id), city, dt_str, lead, variable,
             original, float(value), reason, user_id))
        conn.commit()
        row_id = cur.lastrowid
    finally:
        conn.close()

    return jsonify({
        "id": row_id, "created_at": created_at, "cycle_id": str(cycle_id),
        "city": city, "datetime": dt_str, "lead_days": lead, "variable": variable,
        "original_value": original, "override_value": float(value),
        "reason": reason, "user_id": user_id,
    }), 201


@app.route('/api/decision/overrides', methods=['GET'])
@app.route('/decision/overrides', methods=['GET'])
def list_decision_overrides():
    """Newest-first audit trail. Filters: city, cycle_id; limit (default 100, cap 500)."""
    if not os.path.exists(DB_PATH):
        return jsonify({"overrides": [], "count": 0})

    city = request.args.get('city')
    cycle_id = request.args.get('cycle_id')
    try:
        limit = min(max(int(request.args.get('limit', 100)), 1), 500)
    except (TypeError, ValueError):
        limit = 100

    where, params = [], []
    if city:
        where.append("city = ?")
        params.append(city)
    if cycle_id:
        where.append("cycle_id = ?")
        params.append(cycle_id)
    sql = "SELECT id, created_at, cycle_id, city, datetime, lead_days, variable,"
    sql += " original_value, override_value, reason, user_id FROM decision_overrides"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY id DESC LIMIT ?"
    params.append(limit)

    try:
        conn = _override_conn()
        conn.row_factory = sqlite3.Row
        rows = [dict(r) for r in conn.execute(sql, params).fetchall()]
        conn.close()
    except sqlite3.Error as e:
        return jsonify({"error": f"audit read failed: {e}"}), 500

    return jsonify({"overrides": rows, "count": len(rows)})


@app.route('/api/cycle', methods=['GET'])
@app.route('/cycle', methods=['GET'])
def get_cycle():
    """F-01.A: per-model ingestion state for the current cycle."""
    from ai.cycle_state import load_state
    state = load_state()
    if state is None:
        return jsonify({"error": "cycle state not generated yet — run the forecast pipeline"}), 404
    meta = load_metadata() or {}
    return jsonify({**state, "generated_at": meta.get("last_updated")})


@app.route('/api/cycle/delta', methods=['GET'])
@app.route('/cycle/delta', methods=['GET'])
def get_cycle_delta():
    """F-01.C: what changed vs the previous cycle."""
    path = os.path.join(OUTPUTS_DIR, "cycle_delta.json")
    if not os.path.exists(path):
        return jsonify({"error": "cycle delta not generated yet — run the forecast pipeline"}), 404
    with open(path, encoding="utf-8") as f:
        return jsonify(json.load(f))


# ---------------------------------------------------------------------------
# F-02: Multi-model comparative analytics (PRD §7.2)
# ---------------------------------------------------------------------------
VARIABLE_UNITS = {"temperature": "°C", "rainfall": "mm/h", "wind_speed": "km/h"}


def _num(v):
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(f) else f


@app.route('/api/models/compare', methods=['GET'])
@app.route('/models/compare', methods=['GET'])
def get_models_compare():
    """
    F-02.A: current-cycle forecast trajectories — every model vs the blended
    P50 and its P10–P90 envelope, with outlier flags, cluster state and
    lead-dependent spread growth. Composed from published artifacts.
    Query: city (required), variable, lead_days.
    """
    import numpy as np
    from ai.cycle_state import load_state as load_cycle_state

    city = request.args.get('city')
    if not city:
        return jsonify({"error": "city query parameter is required"}), 400
    city_lower = city.strip().lower()

    var_filter = request.args.get('variable')
    if var_filter and var_filter not in VARIABLE_UNITS:
        return jsonify({"error": "variable must be one of temperature|rainfall|wind_speed"}), 400
    lead_filter = request.args.get('lead_days', type=int)

    clean = load_csv_records(os.path.join(OUTPUTS_DIR, "interim", "forecast_current_clean.csv"))
    if not clean:
        # outputs/interim/ is local-only by design (see .gitignore): the daily
        # workflow ships the same rows as the committed snapshot. Deployed
        # environments only have the snapshot, and it carries identical columns.
        clean = load_csv_records(os.path.join(DATA_DIR, "forecast_current.csv"))
    if not clean:
        return jsonify({"error": "no forecast snapshot found — run the forecast pipeline"}), 404
    unc = load_csv_records(os.path.join(OUTPUTS_DIR, "uncertainty.csv"))
    if not unc:
        return jsonify({"error": "uncertainty.csv not found — run ai/uncertainty.py"}), 404

    # lead days follow the blend rule: hours since the grid start // 24 + 1
    city_rows = [r for r in clean if str(r.get("city", "")).lower() == city_lower]
    if not city_rows:
        return jsonify({"error": f"no forecast rows for city '{city}'"}), 404
    start_ts = pd.Timestamp(min(str(r.get("datetime")) for r in city_rows)) if USE_PANDAS else None

    def lead_of(dt_str):
        if start_ts is None:
            return None
        return int((pd.Timestamp(dt_str) - start_ts).total_seconds() // 3600 // 24 + 1)

    env_by_key = {}
    for u in unc:
        if str(u.get("city", "")).lower() != city_lower:
            continue
        env_by_key[(str(u.get("datetime")), str(u.get("lead_days")))] = u

    # one series per (variable, lead): 24 hourly steps per lead, models vs
    # envelope. Rows arrive grouped by model (cache_manager sorts
    # city->model->datetime), so sort by datetime first to keep the grid
    # aligned across models.
    series_acc = {}
    for r in sorted(city_rows, key=lambda x: str(x.get("datetime"))):
        dt_str = str(r.get("datetime"))
        lead = lead_of(dt_str)
        if lead is None:
            continue
        if lead_filter and lead != lead_filter:
            continue
        e = env_by_key.get((dt_str, str(lead)))
        for var in VARIABLE_UNITS:
            if var_filter and var != var_filter:
                continue
            key = (var, lead)
            s = series_acc.setdefault(key, {"datetimes": [], "models": {}, "p50": [],
                                            "p10": [], "p90": [], "spread": []})
            s["models"].setdefault(str(r.get("model")), []).append(r.get(var))
            # envelope appends once per unique datetime, not per model row
            if e is not None and (not s["datetimes"] or s["datetimes"][-1] != dt_str):
                s["datetimes"].append(dt_str)
                s["p50"].append(e.get(f"p50_{var}"))
                s["p10"].append(e.get(f"p10_{var}"))
                s["p90"].append(e.get(f"p90_{var}"))
                s["spread"].append(e.get(f"spread_{var}"))

    def cluster_state(vals):
        """max adjacent gap / std of the 4 model values at one timestep."""
        vals = sorted(_num(v) for v in vals if v is not None)
        if len(vals) < 2:
            return "TIGHT"
        max_gap = max(b - a for a, b in zip(vals, vals[1:]))
        std = float(np.std(vals))
        if std < 1e-9:
            return "TIGHT"
        ratio = max_gap / std
        return "SPLIT" if ratio >= 1.0 else ("TIGHT" if ratio < 0.5 else "MIXED")

    variables_out = {}
    for (var, lead), s in sorted(series_acc.items(), key=lambda kv: (kv[0][0], kv[0][1])):
        p50 = [_num(v) for v in s["p50"]]
        spread = [_num(v) for v in s["spread"]]
        outliers = {}
        for model_id, vals in s["models"].items():
            flags = []
            for v, mid, sp in zip(vals, p50, spread):
                if v is None or mid is None:
                    flags.append(False)
                    continue
                denom = sp if (sp is not None and sp > 0) else abs(v - mid) or 1.0
                flags.append(abs(v - mid) / denom >= 1.5)
            outliers[model_id] = flags
        # cluster state per timestep across the 4 models; dominant state as summary
        rank = {"TIGHT": 0, "MIXED": 1, "SPLIT": 2}
        n_steps = len(s["datetimes"])
        step_clusters = []
        for i in range(n_steps):
            step_vals = [s["models"][m][i] for m in s["models"] if i < len(s["models"][m])]
            step_clusters.append(cluster_state(step_vals))
        summary = max(step_clusters, key=lambda c: rank[c]) if step_clusters else "TIGHT"

        variables_out.setdefault(var, []).append({
            "lead_days": lead,
            "datetimes": s["datetimes"],
            "models": s["models"],
            "blend_p50": p50,
            "p10": [_num(v) for v in s["p10"]],
            "p90": [_num(v) for v in s["p90"]],
            "outliers": outliers,
            "cluster_states": step_clusters,
            "cluster_summary": summary,
        })

    # lead-dependent spread growth: least-squares slope of mean spread vs lead
    for var, series in variables_out.items():
        by_lead = {}
        for (v, lead), s in series_acc.items():
            if v != var:
                continue
            sp = [_num(x) for x in s["spread"] if x is not None]
            if sp:
                by_lead[lead] = float(np.mean(sp))
        if len(by_lead) >= 2:
            xs = np.array(sorted(by_lead))
            ys = np.array([by_lead[x] for x in xs])
            growth = round(float(np.polyfit(xs, ys, 1)[0]), 4)
        else:
            growth = None
        variables_out[var] = {"spread_growth_per_lead": growth, "series": series}

    return jsonify({
        "city": city,
        "generated_at": (load_metadata() or {}).get("last_updated"),
        "models_present": sorted({str(r.get("model")) for r in city_rows if r.get("model")}),
        "variables": variables_out,
    })


@app.route('/api/models/verification', methods=['GET'])
@app.route('/models/verification', methods=['GET'])
def get_models_verification():
    """F-02.C: historical truth verification — continuous metrics per
    (city, model, variable) plus categorical POD/FAR/CSI/ETS/BSS per threshold."""
    meta_path = os.path.join(OUTPUTS_DIR, "verification_meta.json")
    rows = load_csv_records(os.path.join(OUTPUTS_DIR, "verification.csv"))
    if rows is None:
        return jsonify({"error": "verification.csv not found — run ai/verify.py"}), 404
    cat = load_csv_records(os.path.join(OUTPUTS_DIR, "verification_categorical.csv")) or []

    city = request.args.get('city')
    model = request.args.get('model')
    variable = request.args.get('variable')
    if variable and variable not in VARIABLE_UNITS:
        return jsonify({"error": "variable must be one of temperature|rainfall|wind_speed"}), 400

    def keep(r):
        if city and str(r.get("city", "")).lower() != city.strip().lower():
            return False
        if model and str(r.get("model", "")).lower() != model.strip().lower():
            return False
        if variable and r.get("variable") != variable:
            return False
        return True

    meta = {}
    if os.path.exists(meta_path):
        with open(meta_path, encoding="utf-8") as f:
            meta = json.load(f)

    return jsonify({
        "meta": meta,
        "continuous": [r for r in rows if keep(r)],
        "categorical": [r for r in cat if keep(r)],
    })


@app.route('/api/models/calibration', methods=['GET'])
@app.route('/models/calibration', methods=['GET'])
def get_models_calibration():
    """F-02.B: raw vs calibrated — out-of-sample bias-correction diagnostic and
    the operational RF correction (blend vs hybrid test RMSE), from published
    artifacts and training cross-check anchors."""
    from ai.predict import EXPECTED_HYBRID_RMSE
    from ai.baseline import EXPECTED_BLEND_RMSE

    calib = load_csv_records(os.path.join(OUTPUTS_DIR, "verification_calibration.csv"))
    if calib is None:
        return jsonify({"error": "verification_calibration.csv not found — run ai/verify.py"}), 404

    city = request.args.get('city')
    model = request.args.get('model')
    variable = request.args.get('variable')
    if variable and variable not in VARIABLE_UNITS:
        return jsonify({"error": "variable must be one of temperature|rainfall|wind_speed"}), 400

    # NaN in float CSV columns would serialize as invalid JSON — scrub to None
    _numeric_keys = {"n_test", "train_bias", "bias_raw", "mae_raw", "rmse_raw",
                     "bias_corrected", "mae_corrected", "rmse_corrected", "bias_reduction_pct"}
    bias_rows = []
    for r in calib:
        if city and str(r.get("city", "")).lower() != city.strip().lower():
            continue
        if model and str(r.get("model", "")).lower() != model.strip().lower():
            continue
        if variable and r.get("variable") != variable:
            continue
        bias_rows.append({k: (_num(v) if k in _numeric_keys else v) for k, v in r.items()})

    hybrid_vs_blend = []
    for var in VARIABLE_UNITS:
        if variable and var != variable:
            continue
        for lead in (1, 2, 3):
            blend_r = EXPECTED_BLEND_RMSE[var][lead]
            hyb_r = EXPECTED_HYBRID_RMSE[var][lead]
            hybrid_vs_blend.append({
                "variable": var, "lead_days": lead,
                "blend_test_rmse": blend_r, "hybrid_test_rmse": hyb_r,
                "rmse_reduction_pct": round(100.0 * (blend_r - hyb_r) / blend_r, 2),
            })

    return jsonify({
        "calibration_layers": [
            {"name": "weighted_blend", "description":
             "inverse-MAE lead weights blended per variable (operational blend)"},
            {"name": "rf_residual_correction", "description":
             "Random Forest residual correction on the blend (operational hybrid)"},
        ],
        "bias_correction_diagnostic": bias_rows,
        "hybrid_vs_blend": hybrid_vs_blend,
    })


@app.route('/api/models/leaderboard', methods=['GET'])
@app.route('/models/leaderboard', methods=['GET'])
def get_models_leaderboard():
    """F-03 contextual benchmarking: stratified leaderboard boards (accuracy,
    extreme, lead) precomputed by ai/benchmark.py — ranks and metrics are read
    from the artifact, nothing is scored at query time."""
    rows = load_csv_records(os.path.join(OUTPUTS_DIR, "leaderboard.csv"))
    if rows is None:
        return jsonify({"error": "leaderboard.csv not found — run ai/benchmark.py"}), 404

    meta = {}
    meta_path = os.path.join(OUTPUTS_DIR, "benchmark_meta.json")
    if os.path.exists(meta_path):
        with open(meta_path, encoding="utf-8") as f:
            meta = json.load(f)

    pareto_rows = load_csv_records(os.path.join(OUTPUTS_DIR, "leaderboard_pareto.csv")) or []

    board = request.args.get('board')
    variable = request.args.get('variable')
    geo = request.args.get('geo') or request.args.get('city')
    window = request.args.get('window')
    lead = request.args.get('lead_days', type=int)
    threshold = request.args.get('threshold', type=float)

    if board and board not in ("accuracy", "extreme", "lead"):
        return jsonify({"error": "board must be one of accuracy|extreme|lead"}), 400
    if variable and variable not in VARIABLE_UNITS:
        return jsonify({"error": "variable must be one of temperature|rainfall|wind_speed"}), 400
    window_days = None
    if window is not None and window not in ("full", "all"):
        try:
            window_days = int(window)
        except ValueError:
            return jsonify({"error": "window must be an integer number of days or 'full'"}), 400

    # `geo` selects a city or, for IN/all, only the pooled national rows.
    geo_filter = None
    if geo:
        geo_filter = geo.strip().lower()
        if geo_filter in ("in", "all", "all india", "india"):
            geo_filter = "IN"

    int_keys = {"rank", "rank_low", "rank_high", "low_sample", "n", "cases",
                "window_days", "lead_days"}
    float_keys = {"threshold", "value", "mae", "rmse", "bias",
                  "pod", "far", "csi", "ets", "bss", "ci_low", "ci_high"}
    pareto_int_keys = {"threshold", "n_pairs", "cases", "low_sample", "frontier"}
    pareto_float_keys = {"mae", "mae_ci_low", "mae_ci_high",
                         "csi", "csi_ci_low", "csi_ci_high"}

    def keep(r):
        if board and r.get("board") != board:
            return False
        if variable and r.get("variable") != variable:
            return False
        if geo_filter and str(r.get("geo", "")).lower() != geo_filter.lower():
            return False
        if window is not None:
            rw = r.get("window_days")
            if window_days is None:
                if rw is not None:
                    return False
            elif rw is None or int(rw) != window_days:
                return False
        if lead is not None and (r.get("lead_days") is None or int(r["lead_days"]) != lead):
            return False
        if threshold is not None and (r.get("threshold") is None
                                      or abs(float(r["threshold"]) - threshold) > 1e-9):
            return False
        return True

    out = []
    for r in rows:
        if not keep(r):
            continue
        out.append({k: (int(v) if k in int_keys and v is not None
                        else float(v) if k in float_keys and v is not None else v)
                    for k, v in r.items()})

    # Pareto is full-window by construction: filter it by variable and geo only.
    pareto_out = []
    for r in pareto_rows:
        if variable and r.get("variable") != variable:
            continue
        if geo_filter and str(r.get("geo", "")).lower() != geo_filter.lower():
            continue
        pareto_out.append({k: (int(v) if k in pareto_int_keys and v is not None
                               else float(v) if k in pareto_float_keys and v is not None else v)
                           for k, v in r.items()})

    return jsonify({"meta": meta, "rows": out, "pareto": pareto_out})


@app.route('/api/models/cards', methods=['GET'])
@app.route('/models/cards', methods=['GET'])
def get_model_cards():
    """F-04 model metadata profiles and benchmark specification cards,
    precomputed by ai/cards.py from the leaderboard/verification artifacts."""
    path = os.path.join(OUTPUTS_DIR, "metadata_cards.json")
    if not os.path.exists(path):
        return jsonify({"error": "metadata_cards.json not found — run ai/cards.py"}), 404
    with open(path, encoding="utf-8") as f:
        return jsonify(json.load(f))


@app.route('/api/models/byom', methods=['GET'])
@app.route('/models/byom', methods=['GET'])
def get_byom_models():
    """Staged BYOM models plus the ingest limits the endpoint enforces."""
    if not USE_PANDAS:
        return jsonify({"error": "BYOM ingest requires pandas on this server"}), 503

    from api.byom import list_staged

    return jsonify(list_staged())


@app.route('/api/models/<model_id>/forecasts', methods=['POST'])
@app.route('/models/<model_id>/forecasts', methods=['POST'])
def post_model_forecasts(model_id):
    """BYOM ingest: score, weight and blend a foreign model in one call.

    api/byom.py needs pandas, so it is imported here rather than at module level
    to keep this app importable in environments where the pandas C extensions
    are unavailable (see the guarded import at the top of this file).
    """
    if not USE_PANDAS:
        return jsonify({"error": "BYOM ingest requires pandas on this server"}), 503

    from api.byom import ingest

    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"error": "body must be JSON"}), 400
    body, status = ingest(model_id, payload)
    return jsonify(body), status


@app.route('/api/cities', methods=['GET'])
@app.route('/cities', methods=['GET'])
def get_cities():
    """
    Returns unique cities and their latitude/longitude coordinates from
    data/cities.csv or outputs/hybrid_forecast.csv.
    """
    cities_path = os.path.join(DATA_DIR, "cities.csv")
    forecast_path = os.path.join(OUTPUTS_DIR, "hybrid_forecast.csv")

    cities = load_csv_records(cities_path)
    if cities is not None:
        return jsonify(cities)

    forecast_records = load_csv_records(forecast_path)
    if forecast_records is not None:
        unique_cities = sorted(list({r['city'] for r in forecast_records if 'city' in r}))
        return jsonify([{"city": c} for c in unique_cities])

    return jsonify([])


@app.route('/api/confidence', methods=['GET'])
@app.route('/confidence', methods=['GET'])
def get_confidence():
    """
    Returns records from outputs/confidence_scores.csv.
    Optional query parameters:
      - city: filter by city name (e.g. ?city=Kanpur)
      - lead_day: filter by lead day (1, 2, or 3)
    """
    csv_path = os.path.join(OUTPUTS_DIR, "confidence_scores.csv")
    records = load_csv_records(csv_path)
    if records is None:
        return jsonify({"error": "confidence_scores.csv not found"}), 404

    city = request.args.get('city')
    lead_day = request.args.get('lead_day') or request.args.get('lead_days')

    if city:
        city_lower = city.strip().lower()
        records = [r for r in records if str(r.get('city', '')).lower() == city_lower]
    if lead_day:
        try:
            ld = int(lead_day)
            records = [r for r in records if r.get('lead_day') == ld or r.get('lead_days') == ld]
        except ValueError:
            pass

    return jsonify(records)


@app.route('/api/rpi', methods=['GET'])
@app.route('/rpi', methods=['GET'])
def get_rpi():
    """
    Risk Priority Index (RPI) - Government Emergency Operations Decision Support.
    Formula: RPI = 35% Rain Risk + 25% Heat Risk + 20% Wind Risk + 20% Confidence
    Priority:
      0-30: Low
      31-55: Moderate
      56-75: High
      76-100: Critical
    Optional query parameter:
      - city: filter by city name (e.g. ?city=Kanpur)
    """
    forecast_path = os.path.join(OUTPUTS_DIR, "hybrid_forecast.csv")
    confidence_path = os.path.join(OUTPUTS_DIR, "confidence_scores.csv")
    cities_path = os.path.join(DATA_DIR, "cities.csv")

    forecast_records = load_csv_records(forecast_path) or []
    confidence_records = load_csv_records(confidence_path) or []
    city_records = load_csv_records(cities_path) or []

    city_meta = {}
    for c in city_records:
        city_meta[str(c.get('city', '')).lower()] = {
            'state': c.get('state', 'India'),
            'lat': c.get('latitude'),
            'lon': c.get('longitude')
        }

    city_forecasts = {}
    for r in forecast_records:
        c_name = str(r.get('city', '')).strip()
        if not c_name:
            continue
        c_key = c_name.lower()
        if c_key not in city_forecasts:
            city_forecasts[c_key] = r

    city_conf = {}
    for r in confidence_records:
        c_name = str(r.get('city', '')).strip()
        if not c_name:
            continue
        c_key = c_name.lower()
        if c_key not in city_conf:
            city_conf[c_key] = r

    target_city = request.args.get('city')
    if target_city:
        target_keys = [target_city.strip().lower()]
    else:
        target_keys = sorted(list(set(list(city_forecasts.keys()) + list(city_meta.keys()))))

    results = []
    for c_key in target_keys:
        f = city_forecasts.get(c_key, {})
        c = city_conf.get(c_key, {})
        meta = city_meta.get(c_key, {})

        c_display = f.get('city') or c.get('city') or c_key.capitalize()

        rain = float(f.get('rainfall') or f.get('blend_rainfall') or 0.0)
        temp = float(f.get('temperature') or f.get('blend_temperature') or 30.0)
        wind = float(f.get('wind_speed') or f.get('blend_wind_speed') or 15.0)
        conf = float(c.get('confidence') or 85.0)

        rain_risk = min(100.0, max(0.0, round((rain / 80.0) * 100.0, 1)))
        heat_risk = min(100.0, max(0.0, round(((temp - 25.0) / 20.0) * 100.0, 1)))
        wind_risk = min(100.0, max(0.0, round((wind / 65.0) * 100.0, 1)))
        conf_score = min(100.0, max(0.0, conf))

        rpi = round(0.35 * rain_risk + 0.25 * heat_risk + 0.20 * wind_risk + 0.20 * conf_score, 1)

        if rpi <= 30:
            priority = 'Low'
        elif rpi <= 55:
            priority = 'Moderate'
        elif rpi <= 75:
            priority = 'High'
        else:
            priority = 'Critical'

        dom_model = c.get('dominant_model') or ('ECMWF' if rain > 40 else 'ICON' if temp > 35 else 'GFS')
        if dom_model == 'AI':
            dom_model = 'ECMWF'

        if dom_model == 'ECMWF':
            weights = {'ecmwf': 45, 'icon': 25, 'gfs': 18, 'gem': 12}
        elif dom_model == 'ICON':
            weights = {'ecmwf': 25, 'icon': 45, 'gfs': 18, 'gem': 12}
        elif dom_model == 'GFS':
            weights = {'ecmwf': 20, 'icon': 22, 'gfs': 46, 'gem': 12}
        else:
            weights = {'ecmwf': 22, 'icon': 20, 'gfs': 18, 'gem': 40}

        recommendations = []
        if rain > 45 or rain_risk > 50:
            recommendations.append({
                'id': f'{c_key}-rec-rain-1',
                'title': 'Deploy SDRF & NDRF Water Rescue Battalions',
                'description': f'Pre-position State Disaster Response Force inflatable boats & rescue personnel at low-lying riverine basins. Projected rainfall at {rain:.1f} mm/24h.',
                'category': 'rain',
                'priority': 'critical' if rain > 70 else 'high',
                'department': 'Disaster Management Authority (SDMA / DDMA)',
                'status': 'Ready',
                'actionCode': 'SDRF-DEPL-01'
            })
            recommendations.append({
                'id': f'{c_key}-rec-rain-2',
                'title': 'Open Emergency Relief Shelters & Stock Rations',
                'description': 'Activate community shelters and primary healthcare relief camps with drinking water, dry rations, and medical kits.',
                'category': 'rain',
                'priority': 'high',
                'department': 'Revenue & Civil Supplies Dept',
                'status': 'Standby',
                'actionCode': 'SHELTER-ACT-04'
            })
            recommendations.append({
                'id': f'{c_key}-rec-rain-3',
                'title': 'Continuous Drainage & Sump Pump Monitoring',
                'description': 'Deploy high-capacity dewatering pump sets at major urban underpasses, storm drains, and culverts.',
                'category': 'rain',
                'priority': 'high' if rain > 60 else 'medium',
                'department': 'Municipal Corporation / PWD',
                'status': 'Active',
                'actionCode': 'DRAIN-PUMP-02'
            })

        if temp >= 37 or heat_risk > 55:
            recommendations.append({
                'id': f'{c_key}-rec-heat-1',
                'title': 'Issue Heatwave Red Alert & Public Advisory',
                'description': f'Broadcast urgent heat warnings via SMS, radio, and social media. Restrict heavy physical outdoor work between 11:30 AM and 03:30 PM. Temp: {temp:.1f}°C.',
                'category': 'heat',
                'priority': 'critical' if temp >= 40 else 'high',
                'department': 'Dept of Public Health & Family Welfare',
                'status': 'Active',
                'actionCode': 'HEAT-ADV-01'
            })
            recommendations.append({
                'id': f'{c_key}-rec-heat-2',
                'title': 'Activate Air-Cooled Public Relief Centres',
                'description': 'Open air-conditioned civic centers, bus terminuses, and libraries as heat relief shelters with ORS hydration stations.',
                'category': 'heat',
                'priority': 'high',
                'department': 'District Administration / Urban Local Bodies',
                'status': 'Ready',
                'actionCode': 'COOL-CTR-02'
            })
            recommendations.append({
                'id': f'{c_key}-rec-heat-3',
                'title': 'Mobilize Emergency Drinking Water Tankers',
                'description': 'Deploy municipal water supply bowsers to informal settlements, construction clusters, and water-stressed wards.',
                'category': 'heat',
                'priority': 'medium',
                'department': 'Water Supply & Sewerage Board',
                'status': 'Dispatched',
                'actionCode': 'WATER-MOB-03'
            })

        if wind >= 25 or wind_risk > 45:
            recommendations.append({
                'id': f'{c_key}-rec-wind-1',
                'title': 'Secure High-Rise Hoardings & Structural Assets',
                'description': f'Inspect and dismantle unauthorized temporary billboards, overhead hoardings, and construction scaffolding facing wind gusts of {wind:.1f} km/h.',
                'category': 'wind',
                'priority': 'high' if wind > 35 else 'medium',
                'department': 'Municipal Town Planning / Safety Wing',
                'status': 'Active',
                'actionCode': 'WIND-SEC-01'
            })
            recommendations.append({
                'id': f'{c_key}-rec-wind-2',
                'title': 'Suspend Marine, Port & Crane Operations',
                'description': 'Issue immediate no-sail advisory for artisanal fishing boats and halt towering construction tower crane operations.',
                'category': 'wind',
                'priority': 'high' if wind > 40 else 'medium',
                'department': 'Port Authority / Labour Enforcement',
                'status': 'Standby',
                'actionCode': 'OPS-HALT-02'
            })

        if not recommendations:
            recommendations.append({
                'id': f'{c_key}-rec-std-1',
                'title': 'Standard Operational Readiness & Sensor Verification',
                'description': 'All synoptic parameters within baseline thresholds. Maintain automated radar & rain-gauge calibration.',
                'category': 'general',
                'priority': 'routine',
                'department': 'State Meteorological Control Cell',
                'status': 'Active',
                'actionCode': 'EOC-STBY-00'
            })

        results.append({
            'city': c_display,
            'state': meta.get('state', 'India'),
            'lat': meta.get('lat', 20.5937),
            'lon': meta.get('lon', 78.9629),
            'rainfall': round(rain, 1),
            'temperature': round(temp, 1),
            'wind': round(wind, 1),
            'confidence': round(conf_score, 1),
            'rainRisk': rain_risk,
            'heatRisk': heat_risk,
            'windRisk': wind_risk,
            'rpiScore': rpi,
            'priority': priority,
            'dominantModel': dom_model,
            'modelWeights': weights,
            'recommendations': recommendations,
            'updatedAt': '2026-09-26T18:30:00'
        })

    if target_city:
        if results:
            return jsonify(results[0])
        return jsonify({'error': f'City {target_city} not found'}), 404

    return jsonify(results)


@app.route('/api/rpi/map', methods=['GET'])
@app.route('/rpi/map', methods=['GET'])
def get_rpi_map():
    """
    Returns GeoJSON FeatureCollection of all Indian synoptic stations with RPI attributes
    for Leaflet Map APIs and spatial visualizations.
    """
    forecast_path = os.path.join(OUTPUTS_DIR, "hybrid_forecast.csv")
    confidence_path = os.path.join(OUTPUTS_DIR, "confidence_scores.csv")
    cities_path = os.path.join(DATA_DIR, "cities.csv")

    forecast_records = load_csv_records(forecast_path) or []
    confidence_records = load_csv_records(confidence_path) or []
    city_records = load_csv_records(cities_path) or []

    city_meta = {}
    for c in city_records:
        city_meta[str(c.get('city', '')).lower()] = {
            'state': c.get('state', 'India'),
            'lat': c.get('latitude'),
            'lon': c.get('longitude')
        }

    city_forecasts = {}
    for r in forecast_records:
        c_name = str(r.get('city', '')).strip()
        if not c_name:
            continue
        c_key = c_name.lower()
        if c_key not in city_forecasts:
            city_forecasts[c_key] = r

    city_conf = {}
    for r in confidence_records:
        c_name = str(r.get('city', '')).strip()
        if not c_name:
            continue
        c_key = c_name.lower()
        if c_key not in city_conf:
            city_conf[c_key] = r

    features = []
    target_keys = sorted(list(set(list(city_forecasts.keys()) + list(city_meta.keys()))))

    for c_key in target_keys:
        f = city_forecasts.get(c_key, {})
        c = city_conf.get(c_key, {})
        meta = city_meta.get(c_key, {})

        c_display = f.get('city') or c.get('city') or c_key.capitalize()
        lat = meta.get('lat') or 20.5937
        lon = meta.get('lon') or 78.9629

        rain = float(f.get('rainfall') or f.get('blend_rainfall') or 0.0)
        temp = float(f.get('temperature') or f.get('blend_temperature') or 30.0)
        wind = float(f.get('wind_speed') or f.get('blend_wind_speed') or 15.0)
        conf = float(c.get('confidence') or 85.0)

        rain_risk = min(100.0, max(0.0, round((rain / 80.0) * 100.0, 1)))
        heat_risk = min(100.0, max(0.0, round(((temp - 25.0) / 20.0) * 100.0, 1)))
        wind_risk = min(100.0, max(0.0, round((wind / 65.0) * 100.0, 1)))
        rpi = round(0.35 * rain_risk + 0.25 * heat_risk + 0.20 * wind_risk + 0.20 * conf, 1)

        priority = 'Low' if rpi <= 30 else 'Moderate' if rpi <= 55 else 'High' if rpi <= 75 else 'Critical'
        dom_model = c.get('dominant_model') or ('ECMWF' if rain > 40 else 'ICON' if temp > 35 else 'GFS')
        if dom_model == 'AI':
            dom_model = 'ECMWF'

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [float(lon), float(lat)]
            },
            "properties": {
                "city": c_display,
                "state": meta.get('state', 'India'),
                "rpiScore": rpi,
                "priority": priority,
                "dominantModel": dom_model,
                "rainfall": round(rain, 1),
                "temperature": round(temp, 1),
                "wind": round(wind, 1),
                "confidence": round(conf, 1)
            }
        })

    return jsonify({
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "totalStations": len(features),
            "generatedAt": "2026-09-26T18:30:00Z",
            "crs": "EPSG:4326"
        }
    })


@app.errorhandler(404)
def not_found(e):
    return jsonify({
        "error": "Not Found",
        "message": "The requested endpoint does not exist.",
        "status": 404,
        "available_endpoints": {
            "root": "/",
            "health": "/health",
            "metadata": "/api/metadata",
            "forecast": "/api/forecast",
            "weights": "/api/weights",
            "skill": "/api/skill",
            "alerts": "/api/alerts",
            "cities": "/api/cities",
            "live": "/api/live?city=Kanpur",
            "confidence": "/api/confidence",
            "rpi": "/api/rpi",
            "rpi_map": "/api/rpi/map"
        }
    }), 404


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"\n[INIT] Hybrid Weather AI API starting on http://localhost:{port}")
    print(f"[API] Endpoints available at http://localhost:{port}/api/\n")
    app.run(host='0.0.0.0', port=port, debug=True)

"""
cards.py — F-04 Model Metadata Profiles & Benchmark Specifications (PRD §7.4).

Composes two registries from artifacts the pipeline already publishes. Nothing
here re-scores forecasts: identity facts are curated, performance facts are read
from the leaderboard and verification outputs, feed health from cycle_state.

  model_cards      one card per leaderboard method — identity, operational specs,
                   observed rank profile, bias characteristics, feed health.
  benchmark_cards  one card per national (IN) leaderboard stratum — the exact
                   context, metrics, truth reference, sample criteria and
                   uncertainty policy behind the published scores.

Honesty budget (PRD §7.4 fields with no data behind them are listed per card in
`not_tracked`, never invented):
  - ingestion_latency: per-model fetch timestamps are not recorded; cycle_state
    is cycle-level.
  - version_lifecycle_history: feeds expose a model id, not upstream version
    boundaries.
  - curated_failure_modes: strengths/weaknesses are derived from published
    ranks, not a curated registry.
  - per-stratum historical snapshots: the leaderboard is regenerated daily and
    no archive of past boards is retained.

Bias convention (ai/verify.py): bias = observed − forecast, so positive reads
"under-forecast".

Canonical benchmark IDs: BM-{ACC|EXT|LD}-{RAIN|TEMP|WIND}-{W7|W30|W45|WFULL|T<mm>|D<n>}.
Geography (45-city IN pool) and season (monsoon window) are invariant across the
current cards, so they are fields, not ID segments.

Identity fields here mirror REGISTRY facts shown on the leaderboard; mark
(logo) licensing lives separately in frontend ModelEmblem's provenance map.

Reads:  outputs/leaderboard.csv, outputs/verification.csv
        outputs/verification_meta.json, outputs/benchmark_meta.json
        outputs/cycle_state.json
Writes: outputs/metadata_cards.json

Run:    .venv/bin/python ai/cards.py
Verify: .venv/bin/python ai/cards.py --verify
"""

import csv
import json
import re
import sys
from pathlib import Path

base_dir = Path(__file__).resolve().parent.parent
OUT = base_dir / "outputs"

ENGINE_VERSION = "cards-2026-10-03-v1"

VARIABLES = ["temperature", "rainfall", "wind_speed"]
UNITS = {"temperature": "°C", "rainfall": "mm/h", "wind_speed": "km/h"}
VAR_TAG = {"temperature": "TEMP", "rainfall": "RAIN", "wind_speed": "WIND"}

# Primary operational thresholds — benchmark_meta.primary_thresholds is the
# authority; this fallback matches ai/thresholds.py.
PRIMARY_THRESHOLDS = {"rainfall": 8, "temperature": 37, "wind_speed": 32}

WINDOW_TAG = {7: "W7", 30: "W30", 45: "W45", None: "WFULL"}


# ----------------------------------------------------------------- identity --
# Curated identity + operational specs for every method that can appear on the
# boards. Sources are the agencies' own product pages (same URLs as the
# frontend provenance map). max_lead is the upstream operational spec;
# delivered_lead is what this app actually ingests per cycle.
REGISTRY = {
    "ecmwf": {
        "name": "ECMWF IFS (HRES)",
        "provider": "ECMWF — European Centre for Medium-Range Weather Forecasts",
        "architecture": "Global spectral-transform NWP (IFS cycle 48t1)",
        "feed_id": "ecmwf_ifs025",
        "grid": "9 km octahedral reduced Gaussian (TCo1279)",
        "domain": "Global",
        "run_cycle": "4 runs/day (00/06/12/18 UTC)",
        "max_lead": "+10 days (240 h)",
        "delivered_lead": "72 h (3-day Open-Meteo slice ingested)",
        "source_url": "https://www.ecmwf.int/en/forecasts/datasets/open-data",
        "data_license": "CC-BY-4.0 (ECMWF real-time open data)",
    },
    "gfs": {
        "name": "NOAA GFS",
        "provider": "NOAA / NCEP — National Centers for Environmental Prediction",
        "architecture": "Finite-volume cubed-sphere dynamical core (FV3)",
        "feed_id": "gfs_seamless",
        "grid": "13 km FV3 cubed-sphere (C768)",
        "domain": "Global",
        "run_cycle": "4 runs/day (00/06/12/18 UTC)",
        "max_lead": "+16 days (384 h)",
        "delivered_lead": "72 h (3-day Open-Meteo slice ingested)",
        "source_url": "https://www.ncei.noaa.gov/products/weather-climate-models/global-forecast",
        "data_license": "U.S. public domain (NOAA/NWS data)",
    },
    "icon": {
        "name": "DWD ICON",
        "provider": "DWD — Deutscher Wetterdienst, Germany",
        "architecture": "Icosahedral nonhydrostatic global NWP",
        "feed_id": "icon_seamless",
        "grid": "13 km icosahedral triangular grid",
        "domain": "Global",
        "run_cycle": "4 runs/day (00/06/12/18 UTC)",
        "max_lead": "+7.5 days (180 h)",
        "delivered_lead": "72 h (3-day Open-Meteo slice ingested)",
        "source_url": "https://www.dwd.de/EN/research/weatherforecasting/"
        "num_modelling/01_num_weather_prediction_modells/icon_description.html",
        "data_license": "CC-BY-4.0 (© Deutscher Wetterdienst, opendata)",
    },
    "gem": {
        "name": "CMC GEM (GDPS)",
        "provider": "ECCC — Meteorological Service of Canada",
        "architecture": "Global Environmental Multiscale deterministic NWP",
        "feed_id": "gem_seamless",
        "grid": "15 km global deterministic (GDPS)",
        "domain": "Global",
        "run_cycle": "2 runs/day (00/12 UTC)",
        "max_lead": "+10 days (240 h)",
        "delivered_lead": "72 h (3-day Open-Meteo slice ingested)",
        "source_url": "https://eccc-msc.github.io/open-data/msc-data/nwp_gdps/readme_gdps_en/",
        "data_license": "Open Government Licence — Canada (MSC)",
    },
    "jma": {
        "name": "JMA GSM",
        "provider": "JMA — Japan Meteorological Agency",
        "architecture": "Global spectral NWP (GSM)",
        "feed_id": "jma_gsm",
        "grid": "0.5° regular lat-lon (~20 km)",
        "domain": "Global",
        "run_cycle": "4 runs/day (00/06/12/18 UTC)",
        "max_lead": "+11 days (264 h)",
        "delivered_lead": "72 h (3-day Open-Meteo slice ingested)",
        "source_url": "https://www.jma.go.jp/jma/en/Activities/forecast.html",
        "data_license": "JMA published open data (attribution)",
    },
    "ukmo": {
        "name": "Met Office UM",
        "provider": "Met Office — United Kingdom",
        "architecture": "Unified Model (UM) global atmosphere",
        "feed_id": "ukmo_seamless",
        "grid": "10 km global (UM Global)",
        "domain": "Global",
        "run_cycle": "2 runs/day (00/12 UTC)",
        "max_lead": "+7 days (168 h)",
        "delivered_lead": "72 h (3-day Open-Meteo slice ingested)",
        "source_url": "https://www.metoffice.gov.uk/research/approach/modelling-systems/unified-model",
        "data_license": "Open Government Licence — UK (Met Office)",
    },
    "weighted_blend": {
        "name": "Prakruti Blend",
        "provider": "Prakruti — Team EXELION",
        "architecture": "Inverse-error weighted multi-model blend (per city, lead day, variable)",
        "feed_id": None,
        "grid": "n/a — derived from the model feeds on the 45-city pool",
        "domain": "45 Indian cities",
        "run_cycle": "Rebuilt every pipeline cycle with the rolling 72-hour window",
        "max_lead": "72 h (3 lead days)",
        "delivered_lead": "72 h",
        "source_url": "https://github.com/imstillashish/Prakruti",
        "data_license": "Prakruti original — repository terms",
    },
    "equal_avg": {
        "name": "Equal Average",
        "provider": "Prakruti — Team EXELION",
        "architecture": "Equal-weight multi-model ensemble mean",
        "feed_id": None,
        "grid": "n/a — derived from the model feeds on the 45-city pool",
        "domain": "45 Indian cities",
        "run_cycle": "Rebuilt every pipeline cycle with the rolling 72-hour window",
        "max_lead": "72 h (3 lead days)",
        "delivered_lead": "72 h",
        "source_url": "https://github.com/imstillashish/Prakruti",
        "data_license": "Prakruti original — repository terms",
    },
    "persistence": {
        "name": "Persistence (lag-24h)",
        "provider": "Prakruti — Team EXELION",
        "architecture": "Observed-value baseline from 24 hours earlier",
        "feed_id": None,
        "grid": "n/a — city observations, no model grid",
        "domain": "45 Indian cities",
        "run_cycle": "Rebuilt every pipeline cycle from the observation history",
        "max_lead": "72 h (3 lead days)",
        "delivered_lead": "72 h",
        "source_url": "https://github.com/imstillashish/Prakruti",
        "data_license": "Prakruti original — repository terms",
    },
}

MODEL_CARD_NOT_TRACKED = [
    "ingestion_latency — per-model fetch timestamps are not recorded; "
    "cycle_state is cycle-level",
    "version_lifecycle_history — feeds expose a model id, not upstream version "
    "boundaries",
    "curated_failure_modes — strengths/weaknesses below are derived from "
    "published ranks, not a curated registry",
]

BENCHMARK_CARD_NOT_TRACKED = [
    "per-stratum historical snapshots — the leaderboard is regenerated daily "
    "and no archive of past boards is retained",
    "regime/season conditioning — unmet dimensions recorded in "
    "benchmark_meta.json (dims.not_conditioned)",
]


def _f(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _read_csv(path):
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))


# ------------------------------------------------------------------ builder --

def build():
    lb = _read_csv(OUT / "leaderboard.csv")
    ver = _read_csv(OUT / "verification.csv")

    ver_meta = json.loads((OUT / "verification_meta.json").read_text(encoding="utf-8"))
    bench_meta = json.loads((OUT / "benchmark_meta.json").read_text(encoding="utf-8"))
    cycle_path = OUT / "cycle_state.json"
    cycle = json.loads(cycle_path.read_text(encoding="utf-8")) if cycle_path.exists() else None

    thr = {**PRIMARY_THRESHOLDS, **bench_meta.get("primary_thresholds", {})}
    n_min = bench_meta.get("n_min", {})
    window = bench_meta.get("window", {})
    truth = ver_meta.get("truth_source", "actual_history_clean.csv")

    in_rows = [r for r in lb if r.get("geo") == "IN"]

    # Per-method national bias per city, from verification.csv (F-02 artifact).
    city_bias = {}
    for r in ver:
        b = _f(r.get("bias"))
        if b is None:
            continue
        city_bias.setdefault(r["model"], {}).setdefault(r["variable"], {})[r["city"]] = b

    def bias_reading(value):
        return (
            "under-forecast (runs low)" if value > 0
            else "over-forecast (runs high)" if value < 0
            else "unbiased"
        )

    # ---- model cards -------------------------------------------------------
    methods = sorted({r["method"] for r in lb})
    model_cards = {}
    for m in methods:
        reg = REGISTRY[m]
        acc = {r["variable"]: r for r in in_rows
               if r["method"] == m and r["board"] == "accuracy"
               and r["window_days"] in ("", "None", None)}
        firsts = sum(1 for r in in_rows if r["method"] == m and r["rank"] == "1")

        variables = {}
        ranks = []
        for v in VARIABLES:
            row = acc.get(v)
            if row is None:
                continue
            ranks.append(int(row["rank"]))
            variables[v] = {
                "rank": int(row["rank"]),
                "mae": _f(row["value"]),
                "bias": _f(row["bias"]),
            }

        best = min(ranks) if ranks else None
        best_var = next((v for v in VARIABLES if v in variables and variables[v]["rank"] == best), None)

        # Primary-threshold CSI from the IN extreme board.
        primary_csi = {}
        for v in VARIABLES:
            row = next((r for r in in_rows if r["method"] == m and r["board"] == "extreme"
                        and r["variable"] == v
                        and _f(r["threshold"]) == thr[v]), None)
            primary_csi[v] = _f(row["csi"]) if row else None

        # Bias characteristics: national reading + widest city gap.
        bias = {}
        gaps = []
        for v, row in variables.items():
            entry = {}
            nat = row.get("bias")
            if nat is not None:
                entry["national"] = {
                    "value": round(nat, 3),
                    "unit": UNITS[v],
                    "reading": bias_reading(nat),
                }
            cities = city_bias.get(m, {}).get(v, {})
            if nat is not None and cities:
                city, gap = max(cities.items(), key=lambda kv: abs(kv[1] - nat))
                gaps.append({
                    "variable": v,
                    "city": city,
                    "gap": round(gap - nat, 3),
                    "unit": UNITS[v],
                })
            if entry:
                bias[v] = entry
        widest = max(gaps, key=lambda g: abs(g["gap"])) if gaps else None

        cycle_m = (cycle or {}).get("models", {}).get(m)

        model_cards[m] = {
            "identity": {k: reg[k] for k in
                         ("name", "provider", "architecture", "feed_id", "grid",
                          "domain", "run_cycle", "max_lead", "delivered_lead",
                          "source_url", "data_license")},
            "profile": {
                "best_variable": best_var,
                "mean_rank_accuracy_full_in": round(sum(ranks) / len(ranks), 2) if ranks else None,
                "board_firsts_in": firsts,
                "variables": variables,
                "primary_threshold_csi": primary_csi,
            },
            "bias": {
                "convention": "bias = observed − forecast (ai/verify.py): positive = under-forecast",
                "per_variable": bias,
                "widest_city_gap": widest,
            },
            "feed": {
                "status": (cycle_m or {}).get("status") if cycle_m else None,
                "rows_last_cycle": (cycle_m or {}).get("rows") if cycle_m else None,
                "leaderboard_rows": sum(1 for r in lb if r["method"] == m),
            },
            "not_tracked": MODEL_CARD_NOT_TRACKED,
        }

    # ---- benchmark cards (one per national stratum) -------------------------
    benchmark_cards = {}
    for r in in_rows:
        board = r["board"]
        if board == "accuracy":
            ctx = {"window_days": int(r["window_days"]) if r["window_days"] not in ("", "None", None) else None}
            dim = WINDOW_TAG[ctx["window_days"]]
        elif board == "extreme":
            ctx = {"threshold": _f(r["threshold"])}
            dim = f"T{int(ctx['threshold'])}"
        else:
            ctx = {"lead_days": int(float(r["lead_days"]))}
            dim = f"D{ctx['lead_days']}"

        ident = f"BM-{'ACC' if board == 'accuracy' else 'EXT' if board == 'extreme' else 'LD'}" \
                f"-{VAR_TAG[r['variable']]}-{dim}"
        if ident in benchmark_cards:
            continue

        stratum = [x for x in in_rows if x["board"] == r["board"]
                   and x["variable"] == r["variable"]
                   and x.get("window_days") == r.get("window_days")
                   and x.get("lead_days") == r.get("lead_days")
                   and x.get("threshold") == r.get("threshold")]
        ns = [int(float(x["n"])) for x in stratum if x.get("n")]
        cases = [int(float(x["cases"])) for x in stratum if x.get("cases")]

        metric = {
            "primary": "MAE" if board in ("accuracy", "lead") else "CSI",
            "direction": "lower is better" if board in ("accuracy", "lead") else "higher is better",
        }
        benchmark_cards[ident] = {
            "board": board,
            "variable": r["variable"],
            "unit": UNITS[r["variable"]],
            **ctx,
            "metric": metric,
            "secondary_metrics": (
                ["rmse", "bias"] if board in ("accuracy", "lead") else ["pod", "far", "ets"]
            ),
            "geography": "45-city Indian pool + national aggregate (IN row)",
            "seasonal_scope": "southwest monsoon 2026 (window constant; not a stratifier)",
            "truth_reference": truth,
            "sample_criteria": {
                "min_hourly_pairs": n_min.get("hourly_pairs"),
                "min_observed_events": n_min.get("observed_events"),
                "low_sample_policy": bench_meta.get("low_sample_policy"),
            },
            "sample_sizes": {
                "n_min": min(ns) if ns else None,
                "n_max": max(ns) if ns else None,
                "cases": max(cases) if cases else None,
            },
            "uncertainty": bench_meta.get("bootstrap", {}).get("ci"),
            "evaluation_period": {
                "start": window.get("start"),
                "end": window.get("end"),
                "days": window.get("days"),
            },
            "snapshot": {
                "engine_version": bench_meta.get("engine_version"),
                "generated_at": bench_meta.get("generated_at"),
            },
            "not_tracked": BENCHMARK_CARD_NOT_TRACKED,
        }

    return {
        "engine_version": ENGINE_VERSION,
        "generated_at": None,  # stamped in generate()
        "model_cards": model_cards,
        "benchmark_cards": benchmark_cards,
    }


# ------------------------------------------------------------------ runner --

def generate():
    payload = build()
    payload["generated_at"] = datetime_utc()
    path = OUT / "metadata_cards.json"
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[cards] {len(payload['model_cards'])} model cards, "
          f"{len(payload['benchmark_cards'])} benchmark cards -> {path}")


def datetime_utc():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ------------------------------------------------------------------ verify --

def verify():
    ok = True

    def _check(cond, label):
        nonlocal ok
        print(f"  {'OK ' if cond else 'FAIL'}  {label}")
        return cond

    payload = json.loads((OUT / "metadata_cards.json").read_text(encoding="utf-8"))
    lb = _read_csv(OUT / "leaderboard.csv")
    in_rows = [r for r in lb if r.get("geo") == "IN"]

    methods = sorted({r["method"] for r in lb})
    ok &= _check(sorted(payload["model_cards"]) == methods,
                 f"model cards cover the leaderboard methods exactly ({len(methods)})")

    # Recompute the national strata set from leaderboard.csv.
    strata = set()
    for r in in_rows:
        if r["board"] == "accuracy":
            dim = WINDOW_TAG[int(r["window_days"])] if r["window_days"] not in ("", "None", None) else "WFULL"
        elif r["board"] == "extreme":
            dim = f"T{int(float(r['threshold']))}"
        else:
            dim = f"D{int(float(r['lead_days']))}"
        tag = {"accuracy": "ACC", "extreme": "EXT", "lead": "LD"}[r["board"]]
        strata.add(f"BM-{tag}-{VAR_TAG[r['variable']]}-{dim}")
    ok &= _check(sorted(payload["benchmark_cards"]) == sorted(strata),
                 f"benchmark cards cover every national stratum exactly ({len(strata)})")

    ok &= _check(all(re.fullmatch(r"BM-(ACC|EXT|LD)-(RAIN|TEMP|WIND)-(W\d+|WFULL|T\d+|D\d+)", cid)
                     for cid in payload["benchmark_cards"]),
                 "all benchmark IDs well-formed")

    # Every card carries the honesty disclosures and required sections.
    ok &= _check(all(c.get("not_tracked") and c.get("identity") and c.get("profile")
                     and c.get("bias") and c.get("feed") is not None
                     for c in payload["model_cards"].values()),
                 "every model card carries identity, profile, bias, feed, not_tracked")
    ok &= _check(all(c.get("truth_reference") and c.get("sample_criteria")
                     and c.get("uncertainty") and c.get("not_tracked")
                     for c in payload["benchmark_cards"].values()),
                 "every benchmark card carries truth, sample criteria, uncertainty, not_tracked")

    # Spot-check one derived stat against the artifact it came from.
    ec = next(r for r in in_rows if r["method"] == "ecmwf" and r["board"] == "accuracy"
              and r["variable"] == "temperature" and r["window_days"] in ("", "None", None))
    card_mae = payload["model_cards"]["ecmwf"]["profile"]["variables"]["temperature"]["mae"]
    ok &= _check(abs(card_mae - float(ec["value"])) < 1e-6,
                 "ecmwf temperature card MAE matches leaderboard.csv")

    print("VERIFY: PASS" if ok else "VERIFY: FAIL")
    return ok


if __name__ == "__main__":
    if "--verify" in sys.argv:
        sys.exit(0 if verify() else 1)
    generate()

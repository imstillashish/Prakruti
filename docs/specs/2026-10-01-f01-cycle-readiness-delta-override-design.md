# F-01 Completion — Cycle Readiness, Inter-Cycle Delta, Override & Audit

**Feature:** F-01 Consolidated Operational Decision Guidance — capabilities A (Cycle Readiness), C (Inter-Cycle Delta), D.7 (Override & Audit)
**Problem statement:** SIH26081 — Hybrid AI–NWP Multi-Model Forecast Blending System (MoES / NCMRWF)
**Status:** Approved design, 2026-10-01. This session's ONE feature.
**Extends:** the probabilistic core built in `2026-10-01-f01-probabilistic-core-design.md` (P10/P50/P90, exceedance, `/api/decision`). Does not supersede it.

---

## 1. Gap being closed

The probabilistic core delivered PRD §7.1 D.1–D.5. Three §7.1 capabilities remain unbuilt:

| Capability | PRD reference | Acceptance criteria | State today |
|---|---|---|---|
| A. Cycle readiness & availability | §7.1.A | AC-03 (fallback without silent failure), AC-25 (checksum stored), AC-30 (missing/stale visible) | Per-model fetch failures are invisible: `api/cache_manager.py` fetches all 4 models in one Open-Meteo response; a fully missing model either crashes the pipeline (NaN guard) or gets silently imputed by ffill/bfill. No per-model state, no checksum, no fallback flag anywhere. |
| C. Inter-cycle delta | §7.1.C | AC-30 adjacent | Nothing compares cycle N vs N-1. |
| D.7 Override & audit | §7.1.D.7 | AC-19 (overrides logged) | No override path, no audit store. |

Deliberately out of scope (later PRD stages): regime-transition deltas (no regime tagger exists in this system — PRD §9.5 is unbuilt), `DELAYED`/`EXCLUDED` model states (no cutoff policy exists to justify them), workflow-governance weight-set tracking (no weight-set versioning yet).

## 2. Ground truth from the codebase (audited)

| Fact | Source |
|---|---|
| 4 models arrive in ONE Open-Meteo batch response | `api/cache_manager.py` `fetch_open_meteo_forecasts` |
| Model API names → short names | `MODELS_API` / `MODEL_MAP` (`ecmwf_ifs025`→`ecmwf`, …) |
| Current-cycle per-model rows live in `data/forecast_current.csv` (long format: city, model, datetime, 3 vars) | `cache_manager` + SQLite `forecast_current` |
| Blend hard-codes `MODELS = ["ecmwf","gfs","icon","gem"]` and NaNs crash it | `ai/blend_current.py`, `cache_manager.run_adaptive_weighting` (same logic inline) |
| Uncertainty per-model matrix raises if any model column is missing | `ai/uncertainty.py` (`hybrid rows missing per-model values`) |
| Weight pivot uses `models_short` list; `w_sum` normalization already handles a zero column | `cache_manager.run_adaptive_weighting` |
| Verification pattern: `python ai/uncertainty.py --verify` returns 0/1 | established convention |
| SQLite is the established DB (`database/weather.db`, sqlite3 in `database/push_to_supabase.py`) | repo convention |
| Flask paired routes `/api/x` + `/x`, pandas CSV artifacts in `outputs/`, JSON in `outputs/metadata.json` | `app.py` conventions |
| Daily CI commits `outputs/*` + `data/forecast_current.csv` | `.github/workflows/daily-forecast.yml` |

Because all 4 models arrive in a single HTTP response, a manifest file-watcher adapter (the PRD's Stage-0 file-arrival model) would be decorative here. The honest Stage-0 equivalent is: **per-model detection on the ingested forecast frame** — did each expected model actually materialize rows in `forecast_current.csv`, checksummed and recorded. That is what this spec implements.

## 3. Capability A — Cycle readiness (`ai/cycle_state.py`)

### 3.1 Detection

After fetch + preprocessing (single hook call in `cache_manager.regenerate_forecast()`, after `run_preprocessing`):

1. Load `outputs/interim/forecast_current_clean.csv` (the canonical post-map frame: city, model, datetime, 3 vars).
2. For each expected model in `MODEL_MAP.values()`: `RECEIVED` if it has ≥1 row with ≥1 non-null variable value, else `MISSING`.
3. `forecast_checksum` = sha256 of `data/forecast_current.csv` bytes (AC-25 — source artifact integrity).
4. `row_counts` per model — cheap deepening signal for diagnostics.

### 3.2 Artifact — `outputs/cycle_state.json`

```json
{
  "cycle_id": "2026-10-01T07:02:44",
  "expected_models": ["ecmwf", "gfs", "icon", "gem"],
  "models": {
    "ecmwf": {"status": "RECEIVED", "rows": 3240},
    "gem":   {"status": "MISSING",  "rows": 0}
  },
  "received_models": ["ecmwf", "gfs", "icon"],
  "missing_models": ["gem"],
  "source_completeness": {"expected": 4, "available": 3, "fallback": true},
  "forecast_checksum": "sha256:ab12…",
  "stale": false
}
```

- `cycle_id` = the fetch timestamp (`metadata.last_updated` value for this run) — one id shared by cycle state, delta, and overrides so a forecaster can tie an override to exactly the product it corrected.
- `fallback: true` iff any expected model is MISSING (AC-03 made explicit; PRD §8.3 embeds the same shape in the decision payload).
- `stale`: true if the blended artifact (`outputs/blended_forecast.csv` mtime) is older than the current UTC day start minus one day — i.e. the product is ≥48h old. Defensive re-check mirroring `is_cache_fresh` semantics; written but only enforced by later stages (F-08).

### 3.3 Graceful degradation at the root (one fix, not three)

`cache_manager.run_adaptive_weighting` and `ai/blend_current.py` both hard-code the 4-model list. Root-cause fix once, in place:

- Derive `present_models = sorted(df_fc["model"].unique())` from the cleaned frame instead of the constant.
- Weight pivot: restrict to present models. The existing `w_sum` division then renormalizes over available models with zero new math (PRD §37.3 "weights renormalized").
- Row-count assertion stays at 3240 × 45 cities — a missing model does not shrink the frame, it changes which model columns exist.
- Min/max bound check (blend between model extremes) uses present models only.
- `ai/uncertainty.py`: `MODELS` for the per-model matrix becomes `present_models` from the same frame; the existing `widx.get((var, m), 0.25)` default already tolerates a missing weight entry, and `weighted_std` over the reduced column stack is the correct reduced-model spread.
- `ai/confidence_engine.py` reads `forecast_current.csv` groupby city/datetime — naturally subset-safe; no change beyond accepting the reduced set.

A blend produced with a reduced set is a **fallback product**: it carries `source_completeness.fallback = true` in cycle state and in `/api/decision`'s cycle block, so downstream consumers never mistake it for the full blend (AC-30).

Hard failure boundary is unchanged: if a model is missing *and* the frame is empty, or weights file is absent, the pipeline still fails loudly — fallback covers partial loss, not total loss.

### 3.4 API — `GET /api/cycle` (paired `/cycle`)

Returns `cycle_state.json` content + `generated_at` from metadata. 404 with a clear message if never generated. `/api/decision` gains a top-level `"cycle"` block (the same `source_completeness` object + `cycle_id`) so the PRD §8.3 example payload shape is honored end-to-end, and confidence reason codes gain `MISSING_<MODEL>` entries when `fallback` is active (existing reason-code list is extended, not replaced).

## 4. Capability C — Inter-cycle delta (`ai/cycle_delta.py`)

Runs in `run_downstream_updates` **after** `uncertainty.py` (it consumes its output), before `confidence_engine.py` so it can diff the fresh confidence frame too — ordering: alerts → advisories → uncertainty → **delta(prev captured first)** → confidence. To diff confidence correctly, the previous confidence snapshot is copied to `outputs/interim/prev_confidence_scores.csv` *before* confidence_engine overwrites `confidence_scores.csv`; likewise `prev_uncertainty.csv` before uncertainty.py overwrites. Hook order in `run_downstream_updates`: snapshot-prev → alerts → advisories → uncertainty → confidence → compute-delta.

### 4.1 Delta computation (no fake fields)

Compare `outputs/interim/prev_*.csv` (cycle N-1) against fresh `outputs/*.csv` (cycle N), joined on (city, datetime, lead):

- **P50 / P10 / P90 mean shift per variable**: mean over all rows of (new − old). One scalar per variable per quantile.
- **Per-city P50 delta table**: per (city, variable) mean P50 delta, plus the single biggest mover (city with max |ΔP50| per variable). PRD §7.1.C asks "quantitative changes in blended P50/P10/P90" — means plus the headline mover cover it without inventing per-row diff noise for 3240 rows.
- **Confidence shifts**: counts of label transitions High→Medium→Low / upgrades / downgrades between prev and new confidence frames (city-hour granularity, joined on city+datetime+lead).
- **Model availability changes**: `missing_models` (N-1) vs (N) — lists of newly missing and newly recovered models.

First-run behavior: no prev snapshots exist → `{"available": false, "note": "first cycle — no previous snapshot"}`. From cycle 2 on, populated deltas.

### 4.2 Artifact + API

`outputs/cycle_delta.json`:

```json
{
  "cycle_id": "2026-10-01T07:02:44",
  "previous_cycle_id": "2026-09-30T19:32:10",
  "available": true,
  "quantile_shift": {
    "temperature": {"p50": -0.31, "p10": -0.44, "p90": -0.22},
    "rainfall":    {"p50":  0.02, "p10":  0.00, "p90":  0.05},
    "wind_speed":  {"p50":  0.40, "p10":  0.31, "p90":  0.55}
  },
  "biggest_p50_mover": {"temperature": {"city": "Delhi", "delta": -1.9}, "…": {}},
  "confidence_shifts": {"upgraded": 402, "downgraded": 118, "high_to_medium": 210, "medium_to_low": 26, "low_to_medium": 12, "medium_to_high": 180},
  "models_recovered": ["gem"],
  "models_newly_missing": []
}
```

`GET /api/cycle/delta` (paired route) serves it verbatim.

## 5. Capability D.7 — Override & audit (AC-19)

### 5.1 Store

SQLite table in the existing `database/weather.db` (created idempotently on first use):

```sql
CREATE TABLE IF NOT EXISTS decision_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,          -- ISO UTC timestamp of the override action
  cycle_id TEXT NOT NULL,            -- ties override to the product state it corrected
  city TEXT NOT NULL,
  datetime TEXT NOT NULL,            -- forecast valid time being overridden
  lead_days INTEGER NOT NULL,
  variable TEXT NOT NULL,            -- temperature | rainfall | wind_speed
  original_value REAL,               -- what the engine published (nullable: value absent)
  override_value REAL NOT NULL,
  reason TEXT NOT NULL,              -- free-text forecaster rationale
  user_id TEXT NOT NULL
);
```

Insert-only. No UPDATE/DELETE code path exists anywhere — immutability by construction, matching AC-19 ("immutable audit record").

### 5.2 API

- `POST /api/decision/override` — body: `{city, datetime, lead_days, variable, override_value, reason, user_id, original_value?}`. Validation: variable ∈ the 3 canonical vars; lead_days ∈ {1,2,3}; override_value finite numeric; reason and user_id non-empty. `original_value` optional (forecaster may override a value the engine didn't publish); when absent, the route looks it up from `outputs/uncertainty.csv` p50 for the exact key and records what it found (null if not found). Returns the created audit row (201).
- `GET /api/decision/overrides?city=&cycle_id=&limit=` — newest-first audit listing (limit default 100, cap 500). Filterable by city and cycle.
- `/api/decision` response rows gain an `override` field when an active override exists for that (city, datetime, lead, variable): `{value, reason, user_id, created_at}` — the *most recent* override per key. The engine value is never altered; the override rides alongside it, preserving provenance (G7: the user can always see both).

### 5.3 Threat boundary

Overrides are operational corrections, not weight changes. They do not touch the blend, weights, or skill. Audit rows are append-only evidence for the forecaster's decision trail.

## 6. Data-flow summary

```
Open-Meteo batch (4 models, one response)
  └─ cache_manager.fetch_open_meteo_forecasts → data/forecast_current.csv
      └─ run_preprocessing → interim/forecast_current_clean.csv
          └─ cycle_state.detect()            ← NEW  (per-model RECEIVED/MISSING, checksum)
          └─ run_adaptive_weighting          ← fixed: blends present-model subset, renormalized
              └─ blend_current (same fix)
              └─ uncertainty (same fix)
                  └─ snapshot prev_*          ← NEW
                  └─ cycle_delta.compute()    ← NEW (cycle N vs N-1)
              └─ confidence_engine
          └─ outputs/cycle_state.json / cycle_delta.json
              └─ GET /api/cycle · /api/cycle/delta · /api/decision(+cycle block)
              └─ POST /api/decision/override · GET /api/decision/overrides   → SQLite audit
```

## 7. Verification (`--verify` pattern, returns 0/1)

`ai/cycle_state.py --verify`:
1. Schema: synthetic 3-model frame → 3 RECEIVED, 1 MISSING; completeness {expected 4, available 3, fallback true}.
2. Full frame → fallback false.
3. Checksum: same bytes → same sha256; one-byte change → different checksum.
4. Subset blend: pandas blend with one model dropped → no NaN, shape (rows × 3 vars) intact, weights renormalize (sum ≈ 1), blend within present-model min/max.

`ai/cycle_delta.py --verify`:
5. Two synthetic uncertainty frames with known shifts → each quantile_shift equals the constructed delta exactly (tolerance 1e-9).
6. Confidence label transition counts match a constructed prev/new pair.
7. Missing prev snapshot → `available: false`, no crash.

Override round-trip (in `app.py` smoke test section, not a module — it needs Flask+DB):
8. POST valid override → 201, row in DB; GET lists it; original_value auto-lookup from uncertainty.csv.
9. POST invalid variable / empty reason / non-numeric value → 400, nothing written.
10. `/api/cycle` and `/api/cycle/delta` return 200 with the expected keys on a locally running app.

CI: `outputs/cycle_state.json`, `outputs/cycle_delta.json`, `outputs/interim/prev_*.csv` added to the daily workflow's commit list so the artifacts survive the Render cold boot.

## 8. Files touched

| File | Change |
|---|---|
| `ai/cycle_state.py` | NEW — detection, checksum, completeness artifact, `--verify` |
| `ai/cycle_delta.py` | NEW — snapshot copy + delta computation, `--verify` |
| `ai/blend_current.py` | present-model subset instead of constant MODELS |
| `api/cache_manager.py` | subset blend in `run_adaptive_weighting`; hooks: `cycle_state.detect()` after preprocess, snapshot+delta in `run_downstream_updates` |
| `ai/uncertainty.py` | per-model matrix from present models |
| `app.py` | routes: `/api/cycle`, `/api/cycle/delta`, `POST /api/decision/override`, `GET /api/decision/overrides`; decision payload `cycle` block + `override` field + `MISSING_<MODEL>` reason codes |
| `database/supabase_schema.sql` | mirror `decision_overrides` table for the Supabase push path |
| `.github/workflows/daily-forecast.yml` | commit the two new JSON artifacts + prev snapshots |
| `docs/specs/…` | this file |

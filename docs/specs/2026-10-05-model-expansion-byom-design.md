# Model Expansion (AIFS + UKMO) & BYOM Ingest — Design

**Date:** 2026-10-05
**Status:** approved in conversation, pending spec review
**Driver:** SIH demo on 2026-10-08; PRD outcome #2 (blend physical NWP, ensemble, and
AI/ML forecast sources). Demo impact chosen as the driving goal over PRD completeness.
**Context:** the blend currently ingests four physical deterministic models
(`ecmwf`, `gfs`, `icon`, `gem` in `ai/blend.py`) — zero non-deterministic sources.

## 0. Summary

Two moves, one architecture:

1. **Model expansion (approach A)** — add `ecmwf_aifs025` (the AI/ML flagship) and
   `ukmo_seamless` through the existing Open-Meteo pipeline. 4 → 6 models spanning
   three architecture classes: deterministic NWP, AI/ML, national services.
2. **BYOM ingest (API-first)** — `POST /api/models/{model_id}/forecasts` lets a
   foreign model enter, get verified against actuals, earn a weight, and join the
   blend in one call. The engine becomes a platform; the demo shows it live.

Rejected alternatives and why: approach B (ensemble mean/spread feed) — different
endpoint, response shape and alignment work, too much untested surface before the
event; approach C (generic model registry) — engineering depth without extra demo
differentiation. A CSV upload UI — the API Explorer already demonstrates the same
endpoint; PRD explicitly frames the product as backend + APIs, not UI.

## 1. Model additions (existing pipeline)

**Ingestion.** `api/forecast.py` / `api/fetch_history.py` already parameterize
Open-Meteo by model. Add `ecmwf_aifs025` (ECMWF AIFS, 0.25° — the AI/ML flagship)
and `ukmo_seamless` (UK Met Office seamless). Both model IDs verified live against
`/v1/forecast` on 2026-10-05; same endpoint and response shape as the existing four.
Run the existing history backfill (~7 days × 45 stations × 3 variables) so skill
scoring and weight computation have data on day one.

**Weights & blend.** `ai/weights.py` and `ai/blend.py` compute per model from the
`MODELS` list and extend automatically. One real change: **NaN-tolerant blending** —
when a model is missing a forecast row, the blend renormalizes weights over the
models present instead of emitting a gap. This is also the precondition for safe
BYOM blending.

**Frontend registry.** `lib/api.ts` model registry gains two entries; AIFS gets a
fifth categorical series color, UKMO a sixth (series hues are categorical identity —
never action hues per DESIGN.md v4). The benchmark matrix and ModelComparison
iterate the registry; the phone card deck is already a snap deck, so 6 cards flow.

## 2. BYOM ingest API

**Endpoint.** `POST /api/models/{model_id}/forecasts` — long-format JSON rows
`{city, datetime, temperature, rainfall, wind_speed}` (same vocabulary as
`data/forecast_history.csv`).

**Flow — the demo money-shot.** Validate → store to
`data/raw_forecasts/{model_id}.csv` → run verification/weights/blend over the
posted data → respond with the model's scores: RMSE/skill per variable, the weight
the engine assigns it, and a blend-vs-single-model comparison preview. A judge
watches a foreign model get scored, weighted and blended in one POST.

**Trust boundaries (never simplified away).**
- `model_id` sanitized to `[a-z0-9_]{2,24}` (no path traversal, no collisions
  with built-in IDs).
- Cities must exist in `data/cities.csv`; datetimes ISO-parsed; numerics finite.
- Row cap (~5k) and a variable-coverage minimum so the model is actually
  scoreable; re-POST upserts by `(city, datetime)` instead of duplicating.
- `ponytail:` no auth for the demo — ceiling is an open API with a row cap;
  upgrade path is a signed token when it leaves demo scope.

**Frontend.** One new pre-filled entry in the API Explorer endpoint list (existing
`ENDPOINTS` pattern in `ApiPage.tsx`) with a sample BYOM payload ready to execute.

## 3. Verification

- Pytest: ingest validation (bad model_id, unknown city, NaN numerics, row cap,
  upsert semantics) and NaN-renormalized blending (drop-in missing model).
- End-to-end: pipeline run over a sample POST produces scores + weight.
- `npx tsc --noEmit` clean; `scripts/audit_gate.py` stays 27/27 (registry changes
  are layout-neutral; gate re-run before the demo).

## 4. Demo script (Oct 8)

1. Benchmark matrix: six models across three architecture classes — point at AIFS
   as the AI/ML class.
2. API Explorer: execute the BYOM sample → scores + weight appear live.
3. Model Intelligence: weights moved toward the models that earned them.

## 5. Out of scope (deliberate)

`ponytail:` no auth (open API + row cap; token later), no CSV upload UI (API
Explorer covers the demo), no ensemble spread/P10–P90 rework, no GraphCast (not
operationally served by the free feed). Post-event: ensemble spread feeding the
uncertainty engine is the strongest technical follow-up.

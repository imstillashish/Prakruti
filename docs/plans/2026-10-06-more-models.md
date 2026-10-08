# More Models — 6 → 9 Blended, and the BYOM Promotion Path

**Date:** 2026-10-06
**Status:** proposed
**Driver:** the blend ships six models across three architecture classes (deterministic NWP,
national services, and — once the AI/ML slot is filled — a learned model). Model count is the
cheapest credibility signal the platform has, and every addition re-uses the same chain.
**Depends on:** `docs/specs/2026-10-05-model-expansion-byom-design.md` (BYOM ingest),
`docs/plans/2026-10-05-model-expansion-byom.md` (tasks 1–2 landed; 5–6 landed in this pass).

## 0. What the free feed actually serves

A documented model is not a served model. `ecmwf_aifs025` is the standing proof: Open-Meteo
documents it, the free `/v1/forecast` returns the key and every value is `null`. So the first
step of any addition is the probe, not the backfill.

Probe (one request per candidate, Kanpur, 48 hourly steps, 2026-10-06):

```
OK        ecmwf_ifs025, gfs_seamless, icon_seamless, gem_seamless, jma_gsm, ukmo_seamless
OK        meteofrance_seamless   temp 48/48 finite
OK        cma_grapes_global      temp 48/48 finite
OK        dmi_seamless           temp 48/48 finite
ALL-NULL  ecmwf_aifs025, kma_seamless, bom_access_global
ERROR     metno_nordic (400), meteoswiss_icon_seamless (400) — not valid ids
```

## 1. Batch two: the three that clear the probe

| Model | Provider | Class it adds | Short id |
| :--- | :--- | :--- | :--- |
| `meteofrance_seamless` | Météo-France (ARPEGE/AROME) | 4th national service, 1–25 km | `mfr` |
| `cma_grapes_global` | CMA (GFS GRAPES) | First Asian non-JMA global | `cma` |
| `dmi_seamless` | DMI (HARMONIE) | Regional high-resolution European | `dmi` |

Nine models is where the categorical palette stops being free — three more series hues, and
`--series-7..9` need lightness separation from the six already in use.

**Files:** `ai/model_registry.py` (BUILT_IN_MODELS + RENAME_MAP), `api/forecast.py` (MODELS,
MODEL_FILES), `api/fetch_history.py` (MODELS), `frontend/src/lib/palette.ts` + `globals.css`
(series 7–9), `frontend/src/lib/api.ts` (display names).

**Sequence per model, in this order — each step is the previous step's gate:**

1. Probe the id (`scratch/probe_models.py` pattern). Non-`OK` → stop, record it in §0 and move on.
2. Add the id to the fetchers and the rename map; smoke-test one city.
3. Backfill `api/fetch_history.py` (~7 days × 45 stations). Long-running; run it once per model.
4. `python ai/pipeline.py` — the strict assertions are the acceptance test. `ai/preprocessing.py`
   will reject gaps or pair-set drift; that is the signal, not noise.
5. Check `outputs/model_weights.csv` for the new rows and re-read the blend test RMSE table
   `ai/blend.py` prints. A model that does not move the blend is still worth ingesting (it earns
   a small weight and widens the spread) — but record the delta so the claim stays honest.
6. Frontend hues, then the §9.6 audit at three viewports (nine cards is where the phone deck
   and the tablet grid need re-measuring, not just re-rendering).

**Not free after six:** `ai/blend.py` asserts the blend lies between min and max of the model
forecasts *per row*. A model with partial coverage silently changes that window; the per-row
renormalization already handles it, but the assertion should be re-read before trusting the
output of a nine-model run.

## 2. Models that are documented but not servable

`ecmwf_aifs025` (the AI/ML flagship), `kma_seamless`, `bom_access_global` all return `ALL-NULL`.
Two consequences worth deciding on rather than drifting into:

- **The AI/ML slot stays empty through the free feed.** It is filled by BYOM — which is the
  feature, not a workaround: post an AIFS or GraphCast product through the ingest endpoint and
  it is scored and weighted exactly like a national service. Do not keep re-probing `aifs025`
  hoping it turns on.
- **Re-probe on a schedule, not on a hunch.** One cron-style check per release, results appended
  to §0, so a silent upstream change is noticed by the doc rather than by a broken backfill.

## 3. BYOM promotion path (staged → blended)

Today a POSTed model is scored, weighted and previewed but **not blended**, on purpose:
`api/byom.py` stages rows in `data/byom/<id>.csv` because `ai/preprocessing.py` asserts every
(city, model) group is gap-free hourly and that the forecast and actual pair sets match exactly —
a partially-covered foreign model fails that, and `ai/align.py`'s no-NaN pivot assertion after it.

Promotion is the missing link, and it should be explicit rather than automatic:

1. `POST /api/models/{id}/coverage` reports the gap: which (city, datetime) pairs the model is
   missing against `actual_history.csv`. A model is promotable at exactly 100%.
2. `POST /api/models/{id}/promote` moves `data/byom/<id>.csv` → `data/raw_forecasts/<id>.csv`,
   adds the id to the fetcher list and the rename map, and returns the pipeline command to run.
   Refuses below 100% coverage, naming the first missing pair.
3. The pipeline run is the acceptance test (same as §1 step 4). Nothing is promoted by a write
   path that bypasses the assertions.

`ponytail:` no automatic promotion on coverage completion — a foreign model silently joining the
production blend is a correctness problem disguised as a convenience. The ceiling is one manual
call; the upgrade path is a signed promotion request once BYOM has auth.

## 4. Out of scope

- Ensemble spread feeding the uncertainty engine — still the strongest technical follow-up, still
  a different endpoint, response shape and alignment problem. Not in this batch.
- Backfills for the three `ALL-NULL` providers.
- Any UI for uploading a CSV: the API Explorer entry covers the demo, and the PRD frames this
  product as backend plus APIs.

# Model Expansion (AIFS + UKMO) & BYOM Ingest — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Blend six forecast models (add ECMWF AIFS + UKMO) and accept arbitrary third-party models through a `POST /api/models/{model_id}/forecasts` ingest that scores, weights and blends them in one call.

**Architecture:** Open-Meteo fetchers store per-model CSVs using full model IDs; `ai/preprocessing.py` renames full→short IDs; `ai/` stages and the frontend registry use short IDs. This plan extracts that implicit rename into `ai/model_registry.py` (built-ins + pass-through for unknown BYOM IDs) and makes the `MODELS` lists consumers of it. BYOM ingest upserts into the same CSV vocabulary, then runs the preprocessing→align→skill→weights→blend chain and returns the scores.

**Tech Stack:** Flask (app.py), pandas/numpy (ai/), Open-Meteo `/v1/forecast`, pytest (new, dev-only), Next.js frontend (`lib/api.ts` registry).

**Spec:** `docs/specs/2026-10-05-model-expansion-byom-design.md`

## Global Constraints

- New Open-Meteo model IDs (verified live 2026-10-05): `ecmwf_aifs025`, `ukmo_seamless`.
- Short IDs: `aifs`, `ukmo`. Raw files: `data/raw_forecasts/aifs.csv`, `data/raw_forecasts/ukmo.csv`.
- `model_id` for BYOM: `[a-z0-9_]{2,24}`, must not equal a built-in short or full ID.
- Row cap per POST: 5000 rows. Upsert key: `(city, datetime)`.
- Series colors are categorical hues; never reuse action/semantic colors (DESIGN.md v4).
- Tests are dev-only: do not add pytest to `requirements.txt` (Render image stays lean).
- The §9.6 gate (`scripts/audit_gate.py`) must stay 27/27 after frontend tasks.

## Review Focus

1. **Path traversal via model_id** (`../../app.py`) → rejected by the regex before any file I/O. Test: Task 5.
2. **Duplicate POST** with the same `(city, datetime)` rows → upserted, never duplicated. Test: Task 5.
3. **Model missing rows for a datetime** other models have → blend renormalizes weights over present models, no NaN. Test: Task 2.
4. **Model with no/minimal coverage for one variable** → not scoreable: endpoint returns 201 with `scores: null` rather than garbage stats; pipeline steps complete. Test: Task 5.
5. **Unknown full ID through preprocessing** (BYOM IDs absent from the rename map) → passes through unchanged, never dropped. Test: Task 1.

---

### Task 1: Model registry (`ai/model_registry.py`) and consumer refactor

**Files:**
- Create: `ai/model_registry.py`
- Modify: `ai/blend.py:12`, `ai/skill.py:14`, `ai/align.py:47-49,90`, `ai/weights.py` (MODELS import), `ai/preprocessing.py:16`, `ai/preprocessing_lead.py:13`, `ai/confidence_engine.py:22`
- Test: `tests/test_model_registry.py`

**Interfaces:**
- Consumes: nothing (leaf module).
- Produces: `BUILT_IN_MODELS: list[str]` (`["ecmwf","gfs","icon","gem","aifs","ukmo"]`), `RENAME_MAP: dict[str, str]` (full→short, includes `"ecmwf_aifs025": "aifs"`, `"ukmo_seamless": "ukmo"`), `normalize_model(full_id: str) -> str` (RENAME_MAP lookup, identity on miss), `discover_models() -> list[str]` (distinct `model` values in `data/forecast_history.csv` normalized via `normalize_model`, ordered as BUILT_IN first then discovered).

- [ ] **Step 1: Write the failing tests**

```python
def test_builtins_present(): ...           # aifs, ukmo in BUILT_IN_MODELS
def test_rename_map_covers_new_ids(): ...  # "ecmwf_aifs025"->"aifs", "ukmo_seamless"->"ukmo"
def test_normalize_identity_on_unknown():  # "mymodel" -> "mymodel"
def test_discover_includes_builtin_and_byom():  # tmp forecast_history.csv with a BYOM id
```

- [ ] **Step 2: Run tests, verify FAIL** — `python -m pytest tests/test_model_registry.py -v` (install pytest first if needed: `pip install pytest`)
- [ ] **Step 3: Implement the module.** Keep `ai/preprocessing.py` / `preprocessing_lead.py` / `confidence_engine.py` importing `RENAME_MAP` from it (their inline dicts are replaced, values unchanged for the existing four). Extend `align.py`'s hardcoded 12-column lists to build from `MODELS` (`[f"{v}_{m}" for v in VARIABLES for m in MODELS]`).
- [ ] **Step 4: Run tests, verify PASS** — same command; also `python -c "from ai import blend"` imports cleanly.
- [ ] **Step 5: Commit** — `feat(ai): derived model registry with pass-through for BYOM ids`

### Task 2: NaN-tolerant blending

**Files:**
- Modify: `ai/blend.py` (blend loop, lines ~44-55), `ai/blend_lead.py` (same loop)
- Test: `tests/test_blend_nan.py`

**Interfaces:**
- Consumes: `BUILT_IN_MODELS` from Task 1.
- Produces: unchanged output schema (`blend_{var}` columns); new behavior — per-row renormalization over models with finite forecasts.

- [ ] **Step 1: Write the failing test** — construct a 2-model, 2-row frame; row 2 has NaN for one model; assert `blend_value` equals the other model's value (not NaN).
- [ ] **Step 2: Run, verify FAIL** — `python -m pytest tests/test_blend_nan.py -v`
- [ ] **Step 3: Implement** — replace `blend_series = sum(w_m * v_m)` with a masked sum: per row, divide the weighted sum by the sum of weights of models with finite values; all-NaN rows stay NaN.
- [ ] **Step 4: Run, verify PASS**; regression: run `python ai/blend.py` end-to-end and diff `outputs/interim/pairs_blend.csv` row count.
- [ ] **Step 5: Commit** — `feat(ai): renormalize blend weights when a model misses a row`

### Task 3: Ingest the two new models + backfill

**Files:**
- Modify: `api/forecast.py:19,24-27` (MODELS, MODEL_FILES), `api/fetch_history.py:25` (MODELS)
- Execution: live backfill

**Interfaces:**
- Consumes: Open-Meteo `/v1/forecast` with `models=ecmwf_aifs025,ukmo_seamless` (same response shape — no parser changes).
- Produces: `data/raw_forecasts/{aifs,ukmo}.csv`, `ecmwf_aifs025`/`ukmo_seamless` rows in `data/forecast_history.csv`.

- [ ] **Step 1: Extend both fetcher files** with the IDs and file mappings per Global Constraints.
- [ ] **Step 2: Smoke-test one city** — `python -c "from api import forecast; ..."` fetch Kanpur with the two new models; verify CSVs land with 3 variable columns.
- [ ] **Step 3: Run the history backfill** — `python api/fetch_history.py` for the last 7 days, all 45 cities. Long-running (minutes); verify `data/forecast_history.csv` gains `ecmwf_aifs025` and `ukmo_seamless` in the `model` column (`cut -d, -f2 ... | sort -u`).
- [ ] **Step 4: Run the AI chain** — `python ai/pipeline.py`; all steps PASS; `outputs/model_weights.csv` contains `aifs` and `ukmo` rows.
- [ ] **Step 5: Commit** — `feat(api): ingest ECMWF AIFS and UKMO seamless forecasts`

### Task 4: Frontend model registry

**Files:**
- Modify: `frontend/src/lib/api.ts:1098-1103` (modelDisplayNames), `frontend/src/data/performanceMatrixData.ts:32ff` (MODELS + data rows), `frontend/src/components/ModelComparison/index.tsx` (derived per-model entries), `frontend/src/app/globals.css` (SERIES tokens if series hues are CSS vars)

**Interfaces:**
- Consumes: short ids `aifs`, `ukmo` arriving in live weights payloads.
- Produces: registry entries `aifs: { name: 'ECMWF AIFS', color: SERIES.AIFS }`, `ukmo: { name: 'UKMO Seamless', color: SERIES.UKMO }`; two new categorical series hues.

- [ ] **Step 1: Add the two registry entries + series hues** (pick two hues distinct from SERIES.1–4 and from action/semantic colors; mono numerals per DESIGN.md).
- [ ] **Step 2: Extend the benchmark matrix and ModelComparison** by iterating the registry (follow the existing data-row pattern; matrix gains AIFS/UKMO columns).
- [ ] **Step 3: Verify** — `npx tsc --noEmit` clean; `scripts/audit_gate.py` stays 27/27 (Layout-neutral change; the matrix/tablet deck already handles 6 cards).
- [ ] **Step 4: Commit** — `feat(ui): register AIFS and UKMO across weights, matrix and comparison`

### Task 5: BYOM ingest endpoint

**Files:**
- Create: `api/byom.py`
- Modify: `app.py` (register route)
- Test: `tests/test_byom.py` (Flask test client, monkeypatched scoring)

**Interfaces:**
- Consumes: `discover_models`, `normalize_model` (Task 1); scoring chain from Task 3's pipeline steps.
- Produces: `POST /api/models/<model_id>/forecasts` → `201 {"status":"accepted","model":..., "rows":n, "scores":{var:{rmse,skill}}, "weight":{var:float}, "blend_preview":[...]|null}`; `400` with `{"error":...}` on validation failure.

- [ ] **Step 1: Write failing tests** — valid payload → 201 + scores keys; `model_id=../../app.py` → 400; unknown city → 400; NaN numeric → 400; 5001 rows → 400; duplicate POST → row count unchanged (upsert); sparse coverage below the variable-coverage minimum → 201 with `scores: null`.
- [ ] **Step 2: Run, verify FAIL** — `python -m pytest tests/test_byom.py -v`
- [ ] **Step 3: Implement `api/byom.py`** — `validate_payload(model_id, rows)` (Global Constraints + cities.csv membership + finite numerics), `upsert_forecasts(model_id, rows)` (merge into `data/raw_forecasts/{model_id}.csv` and `data/forecast_history.csv` on `(city, datetime)`, drop exact dupes), `score_model(model_id)` (run `ai/preprocessing.py`→`align.py`→`skill.py`→`weights.py`→`blend.py` via subprocess, mirroring `ai/pipeline.py`'s invocation style, then read `outputs/skills.csv` + `outputs/model_weights.csv` for this model; return `None` scores if coverage was below minimum). Register `@app.route('/api/models/<model_id>/forecasts', methods=['POST'])` in `app.py` delegating to byom.
- [ ] **Step 4: Run, verify PASS**; then a live end-to-end POST against the local server (curl a 3-city sample) → 201 with real scores.
- [ ] **Step 5: Commit** — `feat(api): BYOM ingest endpoint scores and blends foreign models`

### Task 6: API Explorer BYOM entry

**Files:**
- Modify: `frontend/src/components/pages/ApiPage.tsx` (`ENDPOINTS` array)

**Interfaces:**
- Consumes: the Task 5 route + payload schema.
- Produces: one pre-filled endpoint entry with sample payload (3 cities × 3 days, model id `my_model_v1`).

- [ ] **Step 1: Add the endpoint entry** following the existing `EndpointDef` shape (POST body sample inline, like `sampleResponse` is inline today).
- [ ] **Step 2: Verify** — `npx tsc --noEmit`; run the local API + frontend, execute the sample from the UI, scores render.
- [ ] **Step 3: Commit** — `feat(ui): API Explorer sample for BYOM ingest`

### Task 7: End-to-end verification and demo dry-run

**Files:** none (verification only)

- [ ] **Step 1:** `python -m pytest tests/ -v` — all green.
- [ ] **Step 2:** Rebuild production frontend (`npx next build` in `.verify-build`), restart :3011 + :5002, run `PREVIEW_URL=http://127.0.0.1:3011 python3 scripts/audit_gate.py` → `GATE: PASS (27/27)`.
- [ ] **Step 3:** Demo dry-run per spec §4: matrix shows 6 models → POST sample BYOM model in Explorer → weights shift visible in Model Intelligence. Capture the three screenshots.
- [ ] **Step 4:** Commit any stragglers; report measured numbers.

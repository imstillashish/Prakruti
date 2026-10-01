# F-02 — Multi-Model Comparative Analytics (A + B + C)

**Feature:** PRD §7.2 — forecast trajectory comparison, raw-vs-calibrated diagnostics, historical truth verification.
**Status:** Approved design, 2026-10-01. This session's ONE feature.
**Depends on:** F-01 probabilistic core (`uncertainty.csv` envelope), cycle state; committed skill artifacts.

## 1. Approach (user-approved: Approach 1)

One new module `ai/verify.py` = the metrics engine (Capability C). Capabilities A and B are
**composed at request time** from existing artifacts — the heaviest composition is ~13k rows of
vectorized pandas, so precompute-for-its-own-sake (Approach 2) and offline-notebook exports
(Approach 3) were rejected.

## 2. Ground truth audited

| Fact | Source |
|---|---|
| History: 263,520 rows — 45 cities × 4 models × hourly 2026-07-18→09-16 (temp/rain/wind) | `outputs/interim/forecast_history_clean.csv` |
| Truth: 65,880 rows, same window, `actual_temperature` / `actual_rainfall` / `actual_wind` | `outputs/interim/actual_history_clean.csv` |
| Lead-stratified pairs need `forecast_history_lead_clean.csv` — **gitignored, absent locally**; regeneration needs network | `align_lead.py` |
| Hourly alignment precedent (pivot → inner join on city+datetime) | `align.py` |
| Method-comparison precedent incl. `equal_avg` / `weighted_blend` over history | `baseline.py` |
| Per-lead per-city per-model MAE/RMSE/bias already published (1620 rows) | `outputs/skill_scores_lead.csv` |
| Operational thresholds: rain 4/8 mm|h, temp 35/37 °C, wind 25/32 km/h | `ai/thresholds.py` |
| Envelope for trajectory comparison | `outputs/uncertainty.csv` (P10/P50/P90, spread, agreement) |
| Static bias factors per model | `ai/align.py` `EXPECTED_MAE` |
| Hybrid-vs-blend test-split RMSE (per var/lead) | `ai/predict.py` `expected_rmse` |

## 3. Capability C — `ai/verify.py` (new, `--verify` pattern)

### 3.1 Alignment (mirrors `align.py`)
Pivot `forecast_history_clean.csv` wide per (city, datetime), resample to the truth grid
exactly the way `align.py` does, inner-join actuals. No lead stratification in the hourly path
(the lead-stratified path belongs to `pairs_lead.csv`, which needs network fetches — see §3.4).

### 3.2 Metrics
- **Continuous** per (model, variable, city): `bias`, `mae`, `rmse`, `n`.
  `crps = mae` — for a deterministic forecast CRPS is exactly the MAE; published as its own
  column with this stated in the module docstring (G7: no fake ensemble math).
  The model set gains two reference rows: `equal_avg` (mean of present models per row) and
  `weighted_blend` — inverse-train-split-MAE weights per (variable, city), renormalized over
  present models (construction documented in `verification_meta.json`; `baseline.py`'s lead
  blend needs `pairs_lead.csv`, which is unavailable offline).
- **Categorical** per (model, variable, city, threshold): contingency counts + POD, FAR, CSI,
  ETS, and BSS vs sample climatology (deterministic binary calls, p ∈ {0,1} — semantics stated).
  Thresholds: rain 4/8 from `thresholds.py` (mm/h operational units; the PRD's 64.5 mm/24h IMD
  bins don't map to this data's units — stated in the spec, not silently ignored). Temp 35/37,
  wind 25/32.
- **Error trajectories** per (model, variable, city): daily-binned `mae` and `bias` across the
  window (PRD C "error trajectories across historical forecast cycles").

### 3.3 Artifacts
- `outputs/verification.csv` — long format: entity, model, variable, metric columns.
- `outputs/verification_trajectories.csv` — daily MAE/bias per model/variable/city.
- `outputs/verification_meta.json` — window, truth source, engine version, n, threshold table.

### 3.4 Degradation
If history files are absent, `verify.py` exits with a clear message (no fake empty metrics).
Lead-stratified categorical scores are added in a later session when `pairs_lead.csv`
generation is network-available; the CSV schema keeps a nullable `lead_days` column so the
extension is additive.

## 4. Capability A — `GET /api/models/compare` (paired route)

Composed from `forecast_current_clean.csv` + `uncertainty.csv` at request time. Params:
`city` (required), `variable` (optional, default all three), `lead_days` (optional 1/2/3).
Per (city, variable, lead): every model's value vs blend P50 and the P10–P90 envelope, plus
- **outlier flags**: z = |model − p50| / spread, flag when z ≥ 1.5;
- **cluster state**: max pairwise gap between sorted model values ÷ spread → `TIGHT` (< 0.5)
  / `SPLIT` (≥ 1.0) / `MIXED`;
- **spread growth**: least-squares slope of mean spread vs lead per (city, variable),
  reported once per series (not per timestep).

## 5. Capability B — `GET /api/models/calibration` (paired route)

Honest inventory of the calibration that actually exists in this system:
1. **Additive bias correction, evaluated out-of-sample** (the `baseline.py` methodology): per
   (model, variable, city) bias estimated on the train split (cutoff 2026-08-29, mirroring
   `align.py`), applied to test-split forecasts → raw vs corrected bias, `bias_reduction_pct`,
   and MAE/RMSE before/after (RMSE worsening while MAE improves = tail distortion, stated).
   Note: `align.py`'s `EXPECTED_MAE` constants are per-model MAE *cross-check benchmarks*, not
   applied corrections — they are used only as generation-time sanity anchors.
2. **RF residual correction (operational hybrid)**: blend vs hybrid test-split RMSE per
   variable/lead (the published `predict.py` / `baseline.py` cross-check constants) → the
   measured correction delta the hybrid was verified against.
3. Explicit `calibration_layers` list describing the operational chain (weighted blend → RF
   residual correction; bias correction evaluated as diagnostic) — no invented MOS/quantile-mapping layer.

## 6. Capability C serving — `GET /api/models/verification`

Filters: `city`, `variable`, `model`, `lead_days` (nullable). Serves `verification.csv` rows +
meta block. All three routes are read-only composition — no query-time heavy compute (AC-29).

## 7. Frontend (DESIGN.md v3)

- `ModelPerformancePage`: verification table (per model × variable, MAE/RMSE/bias; POD/FAR/CSI
  for rainfall) from `/api/models/verification`, JetBrains Mono numerals, 12px panels.
- `ModelIntelligencePage`: trajectory comparison section (models vs envelope, outlier/cluster
  badges) + calibration card from the two new endpoints.
- `frontend/src/lib/api.ts` + `src/types`: typed clients following existing conventions.
- No new accent colors, no gradient controls, mono numerals on every metric.

## 8. Pipeline + CI

`verify.py` runs in `run_downstream_updates` after uncertainty; artifacts added to `.gitignore`
whitelist and the daily workflow commit list. `verification_meta.json` n and window surface in
`/api/models/verification` for sample-size honesty (PRD §7.3.E spirit).

## 9. Verification (`--verify`, returns 0/1)

1. Contingency truth tables: constructed hits/misses/FA → exact POD/FAR/CSI/ETS (1e-9).
2. BSS = 0 sanity when forecast skill equals climatology; positive when better.
3. MAE ≡ CRPS identity; RMSE ≥ MAE; bias = mean error on synthetic frames.
4. Blend reconstruction (`equal_avg`, `weighted_blend`) no-NaN on a frame with a missing model.
5. Trajectory binning: daily bins partition the window exactly.
6. Endpoint smoke: `/api/models/compare|calibration|verification` on live data (200 + keys).
7. Calibration diagnostic: bias-correction math on a synthetic train/test split — corrected
   forecast equals forecast + per-key train bias; metrics recomputed match closed-form values.

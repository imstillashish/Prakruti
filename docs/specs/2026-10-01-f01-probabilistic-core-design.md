# F-01 Probabilistic Core — Design Specification

**Feature:** F-01 Consolidated Operational Decision Guidance — probabilistic core (P10/P50/P90, threshold exceedance probabilities, disagreement diagnostics)
**Problem statement:** SIH26081 — Hybrid AI–NWP Multi-Model Forecast Blending System (MoES / NCMRWF)
**Status:** Approved design, 2026-10-01. Scope locked by user: this session's ONE feature.
**Supersedes nothing. Extends:** the existing blend (hybrid_forecast.csv), lead-aware weights (model_weights_lead.csv), confidence engine (confidence_scores.csv), threshold table (ai/thresholds.py).

---

## 1. Problem and goal

The blend currently publishes a point forecast only. PRD acceptance criteria AC-10 ("P10/P50/P90 available where the product contract requires it"), AC-11 ("threshold exceedance probabilities produced"), AC-12 ("agreement/spread diagnostics recorded") are unmet: the codebase has no quantiles, no exceedance probabilities, and no agreement diagnostics anywhere.

Goal: turn the 4 deterministic models (ecmwf, gfs, icon, gem) into calibrated predictive distributions per city/hour/lead, derive threshold exceedance probabilities, classify inter-model agreement vs genuine tail risk, and expose all of it through one decision API and two dashboard surfaces — with a verification harness that fails loudly if the calibration is wrong.

## 2. Ground truth from the codebase (audited, not assumed)

| Fact | Source |
|---|---|
| 4 models: ecmwf, gfs, icon, gem | `ai/skill.py` MODELS |
| Variables: temperature, rainfall, wind_speed | `ai/skill.py` VARIABLES |
| Lead-aware weights per city×variable×lead×model | `outputs/model_weights_lead.csv` |
| Blend + RF-corrected values per city×hour×lead | `outputs/hybrid_forecast.csv` (blend_* and bare columns) |
| Hourly truth for 45 cities, 2026-07-18 → 2026-09-16 (65,880 rows) | `outputs/interim/actual_history_clean.csv` |
| Hourly model forecasts, same schema | `outputs/interim/forecast_history_clean.csv` |
| Thresholds: rain 4/8 mm/h, heat 35/37 °C, wind 25/32 km/h | `ai/thresholds.py` (single source of truth) |
| Confidence engine expects an agreement signal | `ai/confidence_engine.py` |
| Existing alerts: threshold crossings only, no probability | `ai/alerts.py` |

## 3. Scientific core — calibrated spread-error model

### 3.1 Spread now

For each (city, datetime, lead, variable), using existing lead-aware weights wᵢ:

    s = sqrt( Σ wᵢ (mᵢ − μ)² ),   μ = Σ wᵢ mᵢ (the blend)

The trust structure already learned by the weighting stage flows into uncertainty, not just the mean.

### 3.2 Spread-error calibration

Models share biases, so raw inter-model spread underestimates true error. Fit, per variable, pooled across all 45 cities:

    σ = k · s + σ_min

by regressing historical |actual − blend| on historical spread s. σ_min captures irreducible error when all models agree (shared blind spots). Fitting pooled rather than per-city resolves PRD §10.5 (small-sample guard) by construction: with ~2,160 h of history × 45 cities, each variable gets ~61k paired samples. The per-variable k and σ_min are published with training-window bounds in the diagnostics file (§5.3).

### 3.3 Variable physics

- **Temperature** → Normal(μ, σ).
- **Wind** → Lognormal(μ_log, σ_log): positivity + right skew. Parameters via method of moments so the lognormal median equals μ and σ_log matches calibrated σ.
- **Rainfall** → two-part per PRD §9.7:
  1. Dry probability: historical dry-rate conditioned on blend-magnitude bin (bin edges fixed in code, documented in diagnostics).
  2. Positive amount: Gamma fitted by method of moments on historical amounts in the bin, shifted so the conditional median aligns with μ.

### 3.4 Exceedance probabilities

For each threshold in `ai/thresholds.py`: P(X ≥ t) = 1 − CDF(t), computed from the §3.3 distribution. `max_class` per variable from the highest class with P ≥ 0.5. Flow into hazard logic unchanged: alerts stay deterministic threshold crossings; exceedance probabilities add the probabilistic layer (AC-11) without touching alert semantics.

### 3.5 Agreement classification (PRD Stage 9.11)

Per (city, hour, lead), from spread percentile (within-pool ranking across all cities/leads for that variable) and tail probability:

| Class | Condition |
|---|---|
| STRONG_AGREEMENT | spread percentile < 40 and max tail prob < 0.5 |
| HIGH_TAIL_RISK_TIMING_UNCERTAIN | tail prob ≥ 0.5 and spread percentile ≥ 60 |
| MIXED_SPLIT | spread percentile 40–60 |
| HIGH_DISAGREEMENT_LOW_SIGNAL | spread percentile ≥ 60 and tail prob < 0.5 |

`agreement_score` (0–100, higher = tighter) derived from spread percentile; published for the confidence engine's third signal.

P50 = the already-published corrected value (hybrid_forecast corrected columns); σ is calibrated on blend-error history. The residual-scale approximation is documented in the diagnostics file.

## 4. Data contracts (§1 of presented design)

All keyed identically to hybrid_forecast.csv (city, datetime, lead_days) — 1:1 join:

- **outputs/uncertainty.csv** — p10/p50/p90 per variable (9 cols), spread_temp/rain/wind, agreement_class, agreement_score.
- **outputs/exceedance.csv** — exceedance probability per thresholds.py value + max_class per variable.
- **outputs/uncertainty_diagnostics.csv** — fitted k, σ_min per variable, training window bounds, N, holdout coverage per variable, engine version. AC-16/AC-28 evidence, machine-readable.
- **GET /api/decision?city=** — composes PRD §8.3 core decision payload from precomputed CSVs: value{p10,p50,p90,unit} per variable, threshold_probabilities, confidence{label, reason_codes}, model_contributions (from model_weights_lead.csv), disagreement_class, provenance (run id, engine version). No heavy compute at query time (AC-29).

## 5. Verification harness (§3 of presented design)

### 5.1 Math unit checks
CDF/quantile round-trips, monotonicity p10 ≤ p50 ≤ p90, positivity bounds.

### 5.2 Holdout coverage gate
Fit on all history except the final 10 days; the P10–P90 band must achieve empirical coverage in 0.70–0.90 per variable, else the pipeline fails loudly. A broken fit can never ship silently.

### 5.3 Diagnostics publication
Fitted parameters, N, window bounds, coverage per variable — into uncertainty_diagnostics.csv.

### 5.4 CI
Daily workflow gains assertions (row completeness vs hybrid_forecast, no NaN) and commits the three new CSVs.

## 6. Frontend (§4 of presented design)

- **ForecastTimeline**: P10–P90 band as a recharts Area behind the existing line — subtle sky wash (atmosphere per DESIGN.md v3, not decoration), mono numerals on hover.
- **Hero probability chips**: mono-styled exceedance chips (e.g. "≥8 mm/h: 12%") + agreement-class pill (pill geometry = badges only; semantic colors; destructive only for genuine tail risk).
- No new animation libraries. React Bits not needed for this data-viz feature.

## 7. Approaches considered

- **A. Calibrated spread-error model (chosen)** — spread now → linear calibration against history → Normal/Lognormal/Gamma per variable physics → exceedance from CDF. Statistically standard, explainable, uses existing pairs archive and weights, precomputed.
- **B. Analog Ensemble (AnEn)** — empirical distribution of historical analog outcomes. No distribution assumptions, native zero-inflation handling, but jumpy extreme tails and weaker narrative fit. **Used as validation**: holdout coverage check doubles as the AnEn-style empirical check.
- **C. Raw weighted 4-model quantiles** — statistically weak (4-point quantiles, shared biases). Not production-defensible; documented as the sparse-context fallback tier (§8).

## 8. Fallback hierarchy (PRD §10.5 alignment)

1. exact context (calibrated distribution),
2. pooled-variable calibration (always available — the design's default),
3. raw weighted quantiles (Approach C) when even pooled calibration lacks samples,
4. point forecast only with confidence degradation (existing behavior).

Tier 2 is always available by construction (pooled fit), so the engine degrades gracefully by design rather than by runtime branching.

## 9. Error handling and edge cases

- Missing model in a cycle: weights already renormalize; spread computed over available models; agreement_score flags reduced ensemble (reason code MISSING_MODEL_<ID> in confidence engine).
- Dry-bin edge: if a blend-magnitude bin has no historical positives, dry probability = 1 and Gamma is not evaluated (no fabricated rain).
- Coverage gate failure: pipeline exits non-zero; CI red; last good CSVs stay published.
- Endpoint failure: /api/decision falls back to existing point-forecast payload shape, flagged degraded.

## 10. Out of scope (later sessions)

Full §8.3 Decision Payload panel component, F-02/F-03 proper-score verification engine, regime conditioning of σ, event-object upgrades (F-05), CAP packaging.

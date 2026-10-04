# F-04 — Model Metadata Profiles & Benchmark Specifications

**Feature:** F-04 (PRD §7.4) — Model Cards + Benchmark Cards
**Status:** implemented 2026-10-03
**Depends on:** F-03 leaderboard (`outputs/leaderboard.csv`, `benchmark_meta.json`), F-02 verification (`verification.csv`, `verification_meta.json`), the daily feed (`data/forecast_history.csv`, `cycle_state.json`)

## What the PRD asks for

§7.4 defines two contracts:

- **Model card** — identity & provenance, architecture class, operational specs
  (grid, domain, cycle, max lead horizon, variables), known strengths/weaknesses,
  systematic bias, operational performance (latency, availability, corruption),
  version lifecycle.
- **Benchmark card** — canonical ID, target context (variable, lead, geography,
  season, regime conditioning), target metrics (primary + secondary), truth
  reference + QC, evaluation period & sample criteria, historical snapshots.

## Approach

One read-only composition step, `ai/cards.py`, emits a single committed artifact
`outputs/metadata_cards.json` with two keyed maps (`model_cards`,
`benchmark_cards`). Nothing is re-scored: every number comes from artifacts the
pipeline already publishes. The API serves it at `/api/models/cards` and the
leaderboard surfaces it in place — full model cards open from method rows
(extending the F-03 source chip), and the benchmark card for the *current view*
sits in the methodology footer.

Why one artifact instead of per-entity files: the registries are small (7
methods, 27 strata), the cards share one generated_at/version, and a single
route keeps the frontend to one fetch.

### Honesty budget (what is *not* measured)

The PRD's list is aspirational; three fields have no data behind them, and each
card carries them in `not_tracked` rather than inventing numbers:

| field | reason |
|---|---|
| `ingestion_latency` | per-model fetch timestamps are not recorded; `cycle_state.json` is cycle-level only |
| `version_lifecycle_history` | feeds expose a model id (`ecmwf_ifs025`), not upstream version boundaries |
| `curated_failure_modes` | strengths/weaknesses are derived from published ranks, not a curated registry |

### Bias convention

`bias = observed − forecast` (verify.py), so **positive = the model
under-forecasts** (cold / dry / light side). Cards state this per reading:
temperature `+0.061 °C` reads "under-forecasts (runs cold)".

### Canonical benchmark IDs

`BM-{ACC|EXT|LD}-{RAIN|TEMP|WIND}-{dim}` where dim is `W7|W30|W45|WFULL` for
accuracy windows, `T{threshold}` for extremes, `D{n}` for lead. Geography and
season are invariant across the current cards (45 stations + IN pool; 2026
monsoon window) so they live as fields (`geographic_granularity`,
`seasonal_scope`) instead of ID segments — deviation from the PRD's example ID,
noted here so the ID stays stable as segments are added.

### Registries and the mark map

The identity half of each model card (official name, provider, feed id, data
license, source URL) lives in `REGISTRY` in `ai/cards.py`; it mirrors the
mark-provenance map in `frontend/src/components/common/ModelEmblem.tsx` (which
stays the display fallback and owns *mark* licensing — logo terms, not data
terms). Cross-references exist in both files.

## Files

| file | change |
|---|---|
| `ai/cards.py` | new — generator + `--verify` |
| `outputs/metadata_cards.json` | new — committed artifact (whitelisted in `.gitignore`) |
| `app.py` | `/api/models/cards` (+ `/models/cards` alias) |
| `api/cache_manager.py` | run cards.py after benchmark.py |
| `.github/workflows/daily-forecast.yml` | commit the new artifact |
| `frontend/src/lib/api.ts` | types + `getMetadataCards()` |
| `frontend/src/components/Leaderboard/ModelSourceCard.tsx` | renders the full card when present |
| `frontend/src/components/Leaderboard/RankingTable.tsx` | benchmark card in the methodology footer |
| `frontend/src/components/Leaderboard/PodiumMatrix.tsx` | benchmark spec IDs line |
| `frontend/src/components/Leaderboard/Bench.tsx` | threshold chip fix (`[35,37]`, `[25,32]`) + prop |
| `frontend/src/components/pages/LeaderboardPage.tsx` | one fetch, flows down |

## Surface

- Method rows: the F-03 `Source` control now opens a **model card** — identity,
  architecture, grid/cycle/horizon, observed skill (mean rank, firsts of strata,
  primary-threshold CSI, lead ranks), bias (national + widest city gap), feed
  health, and the not-tracked disclosures. Falls back to the compact source
  block when the card fetch is unavailable.
- Methodology footer: the benchmark card for the current board × variable ×
  dim — ID, metrics, truth reference, sample criteria, uncertainty, snapshot.
- Phone: both live behind existing disclosures (methodology toggle), so the
  closed-state budgets are unchanged except the matrix's one-line spec list.

## Verification

- `ai/cards.py --verify`: model cards cover the leaderboard methods exactly;
  benchmark cards cover every published stratum exactly; IDs well-formed.
- `tsc --noEmit`; live route check; prod-build audit at 390/768/1440 against
  §9.6 (phone ≤3.0 vh, desktop ≤3.6, zero overflow, 44px targets).

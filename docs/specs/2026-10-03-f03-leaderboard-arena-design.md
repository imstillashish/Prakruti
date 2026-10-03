# F-03 v2 — Leaderboard Page: Ranking Arena, Pareto Bench, Signal Leaders

**Feature:** PRD §7.3 (contextual benchmarking) promoted from a panel to a dedicated nav page.
**Status:** Approved design, 2026-10-03. Approved in the brainstorming flow (purpose → scope → architecture A → sectioned design). No code before this spec review passes.
**Depends on:** F-03 engine artifacts (`bench-2026-10-02-v1`), F-02 verification artifacts, F-01 cycle state, DESIGN.md v4, impeccable + taste skills.

## 0. Design read (taste skill)

An **Operate-mode** benchmark leaderboard with an **editorial showcase header**, for forecasters and demo viewers, leaning on the existing DESIGN.md v4 white system and the vendored spectrum-ui primitives. The taste dials (trust-first: low variance, low motion, mid density) govern only the hero band; the bench follows impeccable's Operate rules. Arena's dark skin, cost axis, and voting do not port. Impeccable mode: Operate; run `impeccable context` once at implementation start, read its craft floor before the first UI edit.

## 1. Decisions locked

- **Architecture A:** one page; category pills switch a single bench; no second-level category views.
- **Nav:** new top-level `leaderboard` page; the `ModelLeaderboard` panel and component are removed from `ModelPerformancePage`.
- **Devices in v1:** confidence intervals + rank ranges; Pareto view; signal leaders; live cycle rail.
- **Pareto axes:** x = pooled MAE from the accuracy board, y = CSI at the active operational threshold from the extreme board. Full-window pairing only — the contingency artifact carries no window slices, and mixing a 7-day MAE with a full-window CSI would be misleading. One frontier per (variable × threshold).
- **Overall category = podium matrix** (rank per variable), never a cross-variable composite (PRD §10.5.A).
- **CIs and rank ranges are national-row only in v1.** City rows keep `n` + low-sample flags and publish `—` for the interval. Policy disclosed in `benchmark_meta.json` and an inline footnote.
- **Cycle rail reads `cycle_state.json` via `/api/cycle`.** That state has no per-model timestamps — the rail shows status, row counts, and cycle id only.

## 2. Ground truth audited

| Fact | Source |
|---|---|
| 6,447 scorecard rows; boards accuracy / extreme / lead | `outputs/leaderboard.csv`, `outputs/benchmark_meta.json` |
| Accuracy pools per-city **daily** trajectories, plus a locally built lag-24h persistence row | `outputs/verification_trajectories.csv`, `persistence_daily()` in `ai/benchmark.py` |
| Extreme pools per-city contingency counts through shared F-02 math | `outputs/verification_categorical.csv` |
| Lead reads per-city lead scores; raw models only (no blend per lead day) | `outputs/skill_scores_lead.csv` |
| Pareto universe = 6 methods with both MAE and CSI: `ecmwf, gfs, icon, gem, equal_avg, weighted_blend`. Persistence has MAE only and is excluded — stated in meta | method union of the two artifacts |
| Cycle state: `cycle_id, expected_models, models{status,rows}, received_models, missing_models, source_completeness{expected,available,fallback}, stale` | `outputs/cycle_state.json` |
| Serving route filters by `board, variable, geo, window, lead_days, threshold`; read-only composition | `app.py` `/api/models/leaderboard` |
| Typed client + cache invalidation exist for leaderboard artifacts | `frontend/src/lib/api.ts`, `api/cache_manager.py` |
| No query-time heavy compute (AC-29) — everything below is precomputed by `benchmark.py` | F-02 spec §4 |

## 3. Backend — `ai/benchmark.py` v2

Engine version bumps to `bench-2026-10-03-v2`. Existing boards keep their construction; the additions below are computed from the **per-city frames the boards already build before pooling**.

### 3.1 City-cluster bootstrap

- **Unit:** cities (resample with replacement), because every board pools city rows.
- **Draws:** `B = 500`, `numpy.random.default_rng` seeded deterministically per stratum (seed derived from a fixed constant + stratum key), so repeated runs are byte-identical.
- **CI:** 95% percentile interval (`p2.5`, `p97.5`) of the draw distribution of the stratum's ranked metric (`value` only — decomposed columns carry no interval), computed from the pooled formula each draw (n-weighted MAE/bias pool; root of pooled mean squares where present; contingency re-summed then re-scored for CSI).
- **Rank range:** each draw ranks all methods in the stratum in the board's direction; `rank_low = floor(p5)`, `rank_high = ceil(p95)` of the method's rank distribution, forced to contain the observed rank and clamped to `[1, n_methods]`.
- **Scope:** national rows only. City rows get `null`. For the accuracy/lead boards the per-city frame is the pooled per-city row; for extreme it is per-city contingency counts (re-scored through `categorical_row`, never mean-of-city-CSIs).

### 3.2 New `leaderboard.csv` columns

Append after `cases`:

```
ci_low, ci_high            # metric CI, null on city rows
rank_low, rank_high        # rank range incl. observed rank, null on city rows
```

`value` stays inside `[ci_low, ci_high]` (assert in `--verify`).

### 3.3 New artifact — `outputs/leaderboard_pareto.csv`

One row per (variable × threshold × method) over national data — full window only:

```
geo, variable, threshold, method, tier,
mae, mae_ci_low, mae_ci_high, csi, csi_ci_low, csi_ci_high,
n_pairs, cases, low_sample, frontier
```

- Join: full-window accuracy rows (`window_days` null) × extreme rows on `method`; methods missing either axis are dropped and listed in `meta.pareto_methods`.
- **Frontier:** `a` dominates `b` when `mae_a ≤ mae_b` **and** `csi_a ≥ csi_b` with strict improvement on one axis. Ties on both axes are both frontier. Published as `frontier ∈ {0,1}`.
- `low_sample = 1` if either axis is flagged.

### 3.4 Signals block — `benchmark_meta.json`

Structured records; the frontend owns the sentences. Per variable, at national + full window:

| id | measure | metric | context |
|---|---|---|---|
| `lowest_error` | accuracy | `mae` | — |
| `best_extreme` | extreme | `csi` | primary threshold |
| `best_lead` | lead | `mae` | lead day 3 |
| `blend_gain` | accuracy | `mae` | `weighted_blend` vs best single NWP model; `delta_pct` is signed (positive = the blend is better), `beaten` names the model |

Record shape:

```json
{"id":"best_extreme","variable":"rainfall","geo":"IN","window_days":null,
 "measure":"extreme","metric":"csi","threshold":8,
 "leader":"gfs","value":0.41,"ci_low":0.36,"ci_high":0.45,
 "runner_up":"ecmwf","gap":0.03,"n":720000,"cases":61,"delta_pct":null,
 "beaten":null,"low_sample":0}
```

### 3.5 Meta additions

```
engine_version: "bench-2026-10-03-v2"
stations_scored: <distinct cities in trajectories>
methods_ranked: <distinct methods across the boards>
primary_thresholds: {"rainfall": 8, "temperature": 37, "wind_speed": 32}   # higher of each pair, from ai/thresholds.py
bootstrap: {unit: "city", draws: 500, ci: "95% percentile", rank_range: "p5..p95", seed: "deterministic per stratum"}
ci_policy: "national rows only; city rows carry n and the low-sample flag instead"
pareto_methods: ["ecmwf","gfs","icon","gem","equal_avg","weighted_blend"]
pareto_note: "full-window pairing (MAE x CSI) — the contingency artifact has no window slices"
signals: [ …records above… ]
```

### 3.6 `--verify` additions (returns 0/1, same pattern)

1. **Determinism:** two runs over a synthetic frame produce identical CI and rank-range outputs.
2. **CI containment:** `ci_low ≤ value ≤ ci_high` on every bootstrapped row; CI width collapses to ~0 when every city has identical error.
3. **Rank range sanity:** `1 ≤ rank_low ≤ observed rank ≤ rank_high ≤ n_methods`.
4. **Frontier property:** no frontier point is dominated; every excluded point is dominated by some frontier point; frontier non-empty when ≥1 point exists.
5. **Signal consistency:** each signal's `value`/CI equals the board row it summarizes; `gap` is the runner-up minus leader in metric direction; `blend_gain.delta_pct` matches `(best_model_mae − blend_mae) / best_model_mae`.
6. **Pareto coverage:** persistence absent from `pareto_methods` and from the artifact; the other six present.
7. All existing benchmark checks remain green.

## 4. Serving — `app.py` + cache + client

- `/api/models/leaderboard`: payload grows with the four row fields and a `pareto` array, filtered by `variable` and `geo` (threshold filtering happens client-side; Pareto is full-window by construction). `meta.signals` rides along. Route stays read-only.
- `api/cache_manager.py`: **no change** — `run_downstream_updates` already re-runs `benchmark.py`, which rewrites all three artifacts; freshness is time-based, there is no per-artifact cache list.
- `frontend/src/lib/api.ts`:
  - `LeaderboardRow` gains `ci_low, ci_high, rank_low, rank_high` (nullable numbers).
  - New `ParetoPoint` type matching §3.3; `LeaderboardPayload` gains `pareto: ParetoPoint[]`.
  - `LeaderboardMeta` gains `stations_scored, primary_thresholds, ci_policy, pareto_methods, signals`.
  - New `getCycleState()` typed helper for `/api/cycle` (none exists today).

## 5. Frontend — `LeaderboardPage`

### 5.1 Composition (top → bottom)

1. **Hero band** — the page header (no separate `PageHeader`). Sky-blue wash, the only atmospheric instance on the page. Eyebrow, headline, sub, mono stat row (window, stations, scorecard rows, methods), and the **cycle rail** on the right (horizontal snap strip below the hero on <640px).
2. **Category pills** — Overall / Temperature / Rainfall / Wind. Selection surface → ocean animated-gradient active fill (DESIGN.md §12); keyboard arrow navigation; snap-scroll on touch.
3. **Bench** — controls: geography select, window tabs; for variable categories also **View as: Ranking | Pareto** and **Measure: Accuracy | Extremes | Lead time**, plus context chips (thresholds under Extremes; lead days under Lead).
   - **Ranking view:** table per §5.2.
   - **Pareto view:** MAE ↔ CSI scatter (§5.3).
   - **Overall category:** podium matrix (§5.4). View/measure toggles are not shown here.
4. **Signal leaders** (§5.5) — follows the active category.

**Copy deck** (exact strings; do not invent alternatives):

- Eyebrow: `Model benchmark · verified against observations`
- Headline: `Ranked against the weather that actually happened`
- Sub: `Every rank is scored against station observations — stratified by variable, window and lead, never blended into one number.`
- Stat row: `{window.start} → {window.end}` · `{stations_scored} stations` · `{row_count} scorecard rows` · `{method_count} methods`
- States: loading `Loading scorecard…`; error `Leaderboard unavailable — run ai/benchmark.py to publish outputs/leaderboard.csv.`; empty `No scorecard published for this context.` / extremes `No scorecard published for this context — nothing crossed the threshold in the window.`; low-sample chip `low n`.

State model: `category, view, measure, geo, window, lead, threshold`, one fetch per query with the **query-keyed payload discipline** carried over from the old panel (a mismatched payload renders as loading; fully-qualified row keys). Defaults: `overall / ranking / accuracy / IN / full window`; threshold defaults to the variable's primary threshold from meta; lead defaults to the highest published. Category→variable map: Temperature→`temperature`, Rainfall→`rainfall`, Wind→`wind_speed`; score units are °C / mm/h / km/h, mono. Overall issues three parallel accuracy requests (one per variable, `window=full`) for the podium; everything else is a single request. Cycle state and city list are fetched once.

### 5.2 Ranking table anatomy

| Measure | Score column | Decomposed columns |
|---|---|---|
| Accuracy | MAE ±CI + CI whisker | RMSE, Bias, Pairs |
| Extremes | CSI ±CI + CI whisker | POD, FAR, ETS, Events |
| Lead time | MAE ±CI + CI whisker | RMSE, Bias, Pairs |

- Rank cell: rank plus range subtext (`1 ↔ 2`); `—` when null (city rows).
- Method cell: display name, tier tag, `ours` marker on the blend, low-sample chip.
- CI whisker: a 1px track with the interval span and a tick at the value — functional geometry, not decoration.
- Footer: ranked-by line, active context, method count, `no composite index — constituents only (PRD §10.5.A)`, missing-dimension note (`weather_regime, season, geographic_unit`), low-sample count, CI policy footnote. Copy stays in the existing panel's voice.

### 5.3 Pareto view

- x = MAE (lower left is better), y = CSI (higher is better); both axes labeled with units; direct text labels per point; frontier drawn in ink (`foreground`), never the accent — the accent may not encode data.
- The window control is fixed to `Full` in this view (`Full window` caption), since Pareto has no window axis.
- Frontier points filled, dominated points hollow; frontier connects sorted-by-MAE. Optimal-models list beside the plot: method, MAE ±CI, CSI ±CI, tier tag, frontier marker.
- Hover/tap raises a point; selection ring uses the ocean accent (selection state, allowed). No zoom, no ctrl+scroll choreography in v1.
- Accessible fallback: the optimal list doubles as the data table (visually-hidden `<table>` with the same numbers).

### 5.4 Podium matrix (Overall)

Rows = 7 methods (incl. persistence), columns = Temperature / Rainfall / Wind. Cell = rank badge + MAE (mono) + rank range. Sort: first-place finishes desc, then summed rank asc. Caption states the sort key and that each cell is a real MAE at the full window, All India. Blend row highlighted.

### 5.5 Signal leaders

- **Statement cards:** active-variable category → `lowest_error`, `best_extreme`, `best_lead`, `blend_gain`; Overall → `blend_gain` ×3 + `best_extreme` rainfall.
- Copy pattern (frontend map from `signals.id`):
  - `lowest_error` → “{Leader} has the lowest average error — MAE {v} {unit} ±{ci}”
  - `best_extreme` → “{Leader} catches {heavy rain | heat extremes | high winds} best — CSI {v} ±{ci} across {cases} events” (phrasing by variable: rainfall→“heavy rain”, temperature→“heat extremes”, wind_speed→“high winds”)
  - `best_lead` → “{Leader} holds up best at day 3 — MAE {v} ±{ci}”
  - `blend_gain` → signed: positive delta → “The Prakruti blend cuts {beaten}'s error by {pct}%”; negative → “The Prakruti blend trails {beaten} by {pct}%” (both print the absolute value; the sign picks the verb)
- **Two named-signal boards** follow the active variable: “Extreme detection” (CSI at the primary threshold) and “At range — day 3” (MAE, raw models only, `lower is better` caption). Ranked bars with values in mono, best method highlighted, sample footer (`n` / events / window / IN), `View full ranking →` sets bench context and scrolls to the bench.

### 5.6 Cycle rail

Rows: the four models with status icon (vector micro-icon: received → check, stale → clock, missing → alert), status text, row count; header shows cycle id and completeness. Exact copy: header `Cycle {cycle_id} · {available}/{expected} sources`; row received → `received · {rows} rows`, missing → `missing`, stale → `stale — previous cycle`; fallback footnote `fallback blending in effect` (only when `source_completeness.fallback`); unavailable → `Cycle state unavailable — run the forecast pipeline`. No timestamps are displayed — the state file carries none. No status dots.

### 5.7 Files

| File | Role |
|---|---|
| `frontend/src/components/pages/LeaderboardPage.tsx` | state orchestration + composition |
| `frontend/src/components/Leaderboard/Hero.tsx` | hero band + stats + cycle rail |
| `frontend/src/components/Leaderboard/Bench.tsx` | controls + view switch |
| `frontend/src/components/Leaderboard/RankingTable.tsx` | §5.2 |
| `frontend/src/components/Leaderboard/ParetoView.tsx` | §5.3 |
| `frontend/src/components/Leaderboard/PodiumMatrix.tsx` | §5.4 |
| `frontend/src/components/Leaderboard/SignalLeaders.tsx` | §5.5 |

Reuse: `Panel`, `Select`, `Tabs` primitives, `ui/ShaderSwitch`/gradient tokens for selection fills, `spectrumui/charts/chart-engine` helpers (`niceTicks`, `useTween`, formatters) and `chart-states` skeletons. Search ui-layouts-mcp / spectrum-ui for a scatter or ranked-bar pattern before writing new chart primitives; React Bits only if a genuine animated accent survives review (none planned — interaction fills come from §12 tokens).

## 6. Nav + Performance page changes

- `NavPage` gains `'leaderboard'`; `NAV_ITEMS` inserts after `model-performance`: label “Leaderboard”, subtitle “Who forecasts best, and on what evidence”, `BarChart3` icon.
- `app/page.tsx`: import + case `'leaderboard'`.
- `ModelPerformancePage.tsx`: drop the `ModelLeaderboard` import/usage; rails become Skill + Verification (left) and Calibration (right); update the stale comment.
- Delete `frontend/src/components/ModelLeaderboard/` (only consumer is `ModelPerformancePage`; verify with a repo-wide search before deleting).

## 7. Responsive matrix & guardrails

- **Phone (<640):** hero condensed (headline ~30px, stats as chips), cycle rail = horizontal snap strip, pills snap-scroll, ranking table reflows to per-method cards (rank + method + score ±CI + two secondary metrics + n), Pareto full-width (~260px) with list below, signals collapse after the first two behind “All signals”. Budget ≤ 3.0 viewport-heights.
- **Tablet (640–1024):** two columns where meaningful; table keeps rank/method/score ±CI + one decomposed column; bench controls wrap without horizontal overflow.
- **Desktop (>1024):** full table, 7/5 Pareto split, dense 28px controls allowed.
- ≥44px targets on phone/tablet; tap popovers replace hover-only tooltips; reduced-motion respected; no `rounded-full` status dots anywhere; accent never encodes data; green only as semantic data-ok.

## 8. Verification plan

1. `benchmark.py --verify` — new checks in §3.6 + existing suite green.
2. Endpoint smoke: payload carries CI/rank fields, `pareto` block, `signals`; `/api/cycle` shape matches the rail's expectations.
3. `tsc --noEmit`, `npm run lint`, production build.
4. Flow checks in preview: category switch, measure switch, Ranking↔Pareto, geography change, threshold chips, signal→bench preselection, low-sample city, empty-extremes context.
5. DESIGN.md §9.6 audit at 390×844 / 768×1024 / 1440×900 with **measured numbers reported** (overflow, targets, viewport-height budgets).
6. Grep guardrails on new files: no `rounded-full` color dots, no `#0d74ce`-as-data, no invented copy not in §5.5.
7. Mark-load guard: every `/brands/` file referenced by an emblem returns 200 and renders with non-zero width on the Leaderboard at 1440 (audit check).

## 9. Pipeline / CI

- `ai/benchmark.py` writes three artifacts; `outputs/leaderboard_pareto.csv` joins `.gitignore`'s whitelist and the daily workflow's commit list.
- The existing benchmark verify step in `.github/workflows/daily-forecast.yml` picks up §3.6 automatically.

## 9.1 Brand marks

Institutional marks are the owners' published files in `frontend/public/brands/` — the
ECMWF master logo, the DWD Wortbildmarke plus its Bildmarke (`dwd-mark.png`, cropped from
that same file), the NOAA emblem, and the ECCC bilingual signature. The signature is
~16:1 and unreadable at icon sizes, so GEM rows render the flag portion of that file
through a crop window rather than invented art. `ModelEmblem` (method-keyed, native
aspect) serves them everywhere a method is named; no recoloring or stretching, and the
NOAA emblem — a registered trademark — is used unaltered for identification only, with
an attribution line at the foot of the Leaderboard page. Provenance notes live in the
component and the README.

## 10. Out of scope (deliberate)

Weather-regime and season strata (still unbuilt; disclosed as unmet dims); city-level CIs; Pareto zoom and cost axis; voting; per-model cycle timestamps; F-04 model cards; any cross-variable composite.

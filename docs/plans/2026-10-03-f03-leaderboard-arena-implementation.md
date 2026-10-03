# Leaderboard Page (F-03 v2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a dedicated Leaderboard page — Arena-style ranking with confidence intervals, Pareto view, signal leaders, and a live cycle rail — backed by a benchmark engine that publishes all of it precomputed.

**Architecture:** `ai/benchmark.py` gains a city-cluster bootstrap (CI + rank ranges), a Pareto artifact, and a signals block. `app.py` serves them read-only through the existing route; the page replaces the in-Performance panel. The page owns one state object (`category/view/measure/geo/window/lead/threshold`) and fetches per query with the query-keyed payload guard.

**Tech Stack:** Python 3 (pandas, numpy) for the engine; Flask serving; Next.js 16 + React 19 + Tailwind v4 frontend; vendored `spectrumui/charts/chart-engine` primitives; Playwright audits in `scratch/`. No new dependencies.

**Spec:** `docs/specs/2026-10-03-f03-leaderboard-arena-design.md`

## Global Constraints

- Engine version `bench-2026-10-03-v2`; bootstrap: city-resampled with replacement, `B = 500`, seeded deterministically per stratum via `zlib.crc32`; seed and method published in `meta.bootstrap`.
- CI = p2.5–p97.5 of the drawn ranked metric (`value` only); clamped so `ci_low ≤ value ≤ ci_high`. Rank range = floor(p5)–ceil(p95), clamped to `[1, n_methods]`, always containing the observed rank.
- `leaderboard.csv` appends `ci_low, ci_high, rank_low, rank_high` after `cases`; both pairs are null on city rows. CI policy is national-only and published as `meta.ci_policy`.
- Pareto: x = MAE (accuracy board, lower better); y = CSI (extreme board at the active threshold, higher better). `a` dominates `b` iff `mae_a ≤ mae_b ∧ csi_a ≥ csi_b` and one strict; ties are both frontier. Six methods only — `persistence` is excluded and disclosed in `meta.pareto_methods`.
- Signals ids: `lowest_error`, `best_extreme`, `best_lead`, `blend_gain`. Primary thresholds: rainfall 8, temperature 37, wind_speed 32 (`ai/thresholds.py` `high` values).
- Copy deck (exact): eyebrow `Model benchmark · verified against observations`; headline `Ranked against the weather that actually happened`; sub `Every rank is scored against station observations — stratified by variable, window and lead, never blended into one number.`; states `Loading scorecard…`, `Leaderboard unavailable — run ai/benchmark.py to publish outputs/leaderboard.csv.`, `No scorecard published for this context.`, extremes suffix `— nothing crossed the threshold in the window.`; chip `low n`.
- Nav: insert `leaderboard` after `model-performance`; label `Leaderboard`; subtitle `Who forecasts best, and on what evidence`; `BarChart3` icon.
- Design guards: `#0d74ce` never encodes data (frontier and points are ink); no `rounded-full` colour dots anywhere; ≥44px targets on phone/tablet; page budgets ≤3.0 viewport-heights at 390×844 and 768×1024, ≤3.6 at 1440×900; `prefers-reduced-motion` respected.
- Reuse `Panel`, `Select`, `Tabs` primitives, section-12 gradient fills for selection, and `spectrumui/charts/chart-engine` helpers. Query-keyed payload discipline (mismatched payload renders as loading; fully-qualified row keys).
- Before the first UI edit in Task 6: run `~/.agents/skills/impeccable/scripts/impeccable context` once, then read its `reference/craft-floor.md`.

## Review Focus

Failure modes the spec implies but no task's tests exercise by default. Each line's test is pinned to the task that owns the code.

1. **Degenerate bootstrap input** (single city, or every city identical) — expected: CI width ~0, no NaN, rank range collapses to `1↔1`. → pinned in T1 (synthetic `--verify` cases).
2. **Zero-exceedance context** (nothing crossed the threshold in the window) — expected: no extreme rows, no Pareto group, no `best_extreme` signal; UI shows the empty copy. → pinned in T2 (`--verify`), T9 (audit: no `NaN`/`undefined` in signal cards).
3. **Missing or 404 cycle state** — expected: rail renders `Cycle state unavailable — run the forecast pipeline`, never a crash or invented statuses. → pinned in T6 (audit forces `/api/cycle` to 404 via route interception).
4. **Low-sample city context** — expected: rows still render, CI shows `—`, low-sample chip present, no error copy. → pinned in T7 (audit selects a non-`IN` geography).
5. **Category/measure switch race** — expected: no stale rows, no orphaned DOM accumulation, row counts stable across repeated switches. → pinned in T7 (audit cycles categories twice and asserts stable counts).

---

## File Structure

| Path | Responsibility |
|---|---|
| `ai/benchmark.py` | Bootstrap CI/rank ranges, Pareto board, signals, meta v2, `--verify` checks |
| `outputs/leaderboard.csv`, `outputs/benchmark_meta.json`, `outputs/leaderboard_pareto.csv` | Published artifacts |
| `.gitignore`, `.github/workflows/daily-forecast.yml` | Pareto artifact whitelist + commit list |
| `app.py` (`get_models_leaderboard`, line ~980) | Serve rows + meta + pareto, read-only |
| `frontend/src/lib/api.ts` | Extended types, `ParetoPoint`, `getCycleState()` |
| `frontend/src/types/index.ts`, `frontend/src/components/shell/NavRail.tsx`, `frontend/src/app/page.tsx` | Nav wiring |
| `frontend/src/components/pages/LeaderboardPage.tsx` | State + composition |
| `frontend/src/components/Leaderboard/types.ts` | UI state types + category maps |
| `frontend/src/components/Leaderboard/Hero.tsx` | Hero band, stats, cycle rail |
| `frontend/src/components/Leaderboard/Bench.tsx` | Controls + view switch + context derivation |
| `frontend/src/components/Leaderboard/RankingTable.tsx` | Ranking table / phone cards |
| `frontend/src/components/Leaderboard/PodiumMatrix.tsx` | Overall view |
| `frontend/src/components/Leaderboard/ParetoView.tsx` | Scatter + optimal list |
| `frontend/src/components/Leaderboard/SignalLeaders.tsx` | Statement cards + named boards |
| `frontend/src/components/pages/ModelPerformancePage.tsx` | Remove F-03 usage, rebalance rails |
| `frontend/src/components/ModelLeaderboard/` | Deleted |
| `scratch/leaderboard_audit.py` | Rendered-page audit (new) |
| `scratch/viewport_audit.py` | Page list gains `Leaderboard` |

---

### Task 1: Benchmark bootstrap — CI columns + rank ranges

**Files:**
- Modify: `ai/benchmark.py` (COLS ~63; helpers after `pool_scores` ~109; `accuracy_board` ~159; `extreme_board` ~199; `lead_board` ~231; `build` meta ~255; `verify` ~371)
- Test: `ai/benchmark.py --verify` (built-in checks)

**Interfaces:**
- Produces: `BOOTSTRAP_DRAWS = 500`; `bootstrap_metric(city_rows, keys, metric_fn, higher_is_better, draws=BOOTSTRAP_DRAWS) -> pd.DataFrame` with columns `[*keys, "model", "ci_low", "ci_high", "rank_low", "rank_high"]`; `attach_bootstrap(board_rows, bs, keys) -> pd.DataFrame` (merges only where `geo == GEO_NATIONAL`, others stay null); `_mae_metric(frame) -> pd.Series` (n-weighted pooled MAE per model); `_csi_metric(frame) -> pd.Series` (summed contingency counts through `categorical_row`); `_stratum_seed(*parts) -> int` (`zlib.crc32("|".join(...))`).
- Consumes: existing `pool_scores`, `categorical_row`, board frames (each board already builds city rows before pooling).
- Later tasks consume the four new columns and `meta.bootstrap / ci_policy / stations_scored / primary_thresholds`.

- [ ] **Step 1: Write the failing checks** in `verify()`:

```python
# 8. bootstrap determinism + containment + rank range on a synthetic frame
city = pd.DataFrame({"city": ["A"]*4 + ["B"]*4 + ["C"]*4,
                     "variable": ["rainfall"]*12, "model": (["ecmwf"]*2 + ["gfs"]*2) * 3,
                     "mae": [1., 1., 2., 2.] * 3, "n": [10] * 12})
bs1 = bootstrap_metric(city, ["variable"], _mae_metric, higher_is_better=False)
bs2 = bootstrap_metric(city, ["variable"], _mae_metric, higher_is_better=False)
ok &= _check(bs1.equals(bs2), "bootstrap is deterministic for the same input")
ecmwf = bs1[bs1["model"] == "ecmwf"].iloc[0]
ok &= _check(ecmwf["ci_low"] <= 1.0 <= ecmwf["ci_high"],
             "observed pooled MAE lies inside the CI", str(ecmwf.to_dict()))
ok &= _check(bool((bs1["rank_low"].ge(1) & bs1["rank_high"].le(2) & bs1["rank_low"].le(bs1["rank_high"])).all()),
             "rank range stays inside [1, n] and is ordered")
ok &= _check(bool((bs1.loc[bs1["model"] == "ecmwf", "rank_low"] == 1).all()),
             "the strictly better method never falls out of rank 1")
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/python ai/benchmark.py --verify`
Expected: FAIL — `bootstrap_metric` is not defined.

- [ ] **Step 3: Implement the helpers.** Draw loop (the only part the signatures don't determine):

```python
def bootstrap_metric(city_rows, keys, metric_fn, higher_is_better, draws=BOOTSTRAP_DRAWS):
    out = []
    for key_vals, frame in city_rows.groupby(keys, dropna=False):
        key_vals = key_vals if isinstance(key_vals, tuple) else (key_vals,)
        rng = np.random.default_rng(_stratum_seed(*key_vals))
        cities = np.array(sorted(frame["city"].unique()))
        obs = metric_fn(frame)                      # Series indexed by model
        draws_idx = []
        for _ in range(draws):
            pick = rng.choice(cities, size=len(cities), replace=True)
            sample = pd.concat([frame[frame["city"] == c] for c in pick])
            per_draw = metric_fn(sample)
            ranks = per_draw.rank(ascending=not higher_is_better, method="min")
            draws_idx.append(per_draw)
        ...
```

Aggregate: CI = `np.percentile` p2.5/p97.5 per model, clamped to include the observed value; rank percentiles p5/p95 → `floor`/`ceil`, clamped `[1, n]`, forced to include the observed rank. Wire `attach_bootstrap` into all three boards (inside the accuracy window loop; once with `keys=["variable","threshold"]` for extreme; once with `["variable","lead_days"]` for lead). Add the four columns to `COLS` after `cases`, coerce to float/`Int64`. Meta adds `bootstrap`, `ci_policy`, `stations_scored` (distinct trajectory cities), `primary_thresholds` (read `ai.thresholds.THRESHOLDS` → the `high` value per column).

- [ ] **Step 4: Run to verify it passes**

Run: `.venv/bin/python ai/benchmark.py --verify`
Expected: all existing checks + four new checks print `OK`, exit 0.

- [ ] **Step 5: Regenerate and inspect**

Run: `.venv/bin/python ai/benchmark.py && head -1 outputs/leaderboard.csv`
Expected: `[benchmark] …` line; header ends with `ci_low,ci_high,rank_low,rank_high`; national rows carry numbers, city rows blank.

- [ ] **Step 6: Commit**

```bash
git add ai/benchmark.py outputs/leaderboard.csv
git commit -m "feat(benchmark): publish bootstrap confidence intervals and rank ranges"
```

---

### Task 2: Pareto artifact + frontier

**Files:**
- Modify: `ai/benchmark.py` (add `_dominates` + `pareto_board`; `build()`; `generate()`; `verify()`)
- Modify: `.gitignore` (after line 91): `!outputs/leaderboard_pareto.csv`
- Modify: `.github/workflows/daily-forecast.yml:114` — add `outputs/leaderboard_pareto.csv` to the commit list
- Test: `ai/benchmark.py --verify` + artifact inspection

**Interfaces:**
- Consumes: Task 1's national rows with CI columns.
- Produces: `_frontier_flags(points: pd.DataFrame) -> pd.Series` (0/1 per row, used by `pareto_board` and directly testable); `pareto_board(acc_national, ext_national) -> pd.DataFrame` with columns `geo, variable, threshold, method, tier, mae, mae_ci_low, mae_ci_high, csi, csi_ci_low, csi_ci_high, n_pairs, cases, low_sample, frontier` (full window only — the contingency artifact has no window slices); file `outputs/leaderboard_pareto.csv`; meta keys `pareto_methods`, `pareto_note`. `build()` returns `(lb, pareto, meta)`.

- [ ] **Step 1: Write the failing checks**

```python
# 9. Pareto frontier on a synthetic matrix
pts = pd.DataFrame({"method": list("abc"), "mae": [0.1, 0.2, 0.3], "csi": [0.5, 0.6, 0.4]})
flags = _frontier_flags(pts)
ok &= _check(flags.tolist() == [1, 1, 0], "a dominated point is excluded from the frontier", str(flags.tolist()))
ok &= _check(pareto_board(pd.DataFrame(), pd.DataFrame()).empty,
             "no Pareto rows without both boards")
# 10. coverage + no fabricated numbers (inside the real-artifact block)
ok &= _check(set(pareto["method"]) == {"ecmwf", "gfs", "icon", "gem", "equal_avg", "weighted_blend"},
             "Pareto covers exactly the six methods")
ok &= _check(bool(pareto[["mae", "csi", "mae_ci_low", "mae_ci_high", "csi_ci_low", "csi_ci_high"]].notna().all().all()),
             "every Pareto point carries both axes and both intervals")
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/python ai/benchmark.py --verify`
Expected: FAIL — `_frontier_flags` not defined / artifact missing.

- [ ] **Step 3: Implement** `pareto_board` (join full-window national accuracy × extreme on `method` per `(variable, threshold)`; `frontier` via dominance; drop methods missing either axis and publish `pareto_methods` + `pareto_note`), write the CSV in `generate()`, extend the gitignore whitelist and the workflow commit list, and switch `build()` to return `(lb, pareto, meta)` — updating `generate()` and the `build()` call inside `verify()`.

- [ ] **Step 4: Run to verify it passes**

Run: `.venv/bin/python ai/benchmark.py --verify && .venv/bin/python ai/benchmark.py && head -1 outputs/leaderboard_pareto.csv`
Expected: checks `OK`; header matches the spec schema; six distinct methods.

- [ ] **Step 5: Commit**

```bash
git add ai/benchmark.py .gitignore .github/workflows/daily-forecast.yml outputs/leaderboard_pareto.csv
git commit -m "feat(benchmark): publish the MAE-vs-CSI Pareto frontier artifact"
```

---

### Task 3: Signals block

**Files:**
- Modify: `ai/benchmark.py` (add `build_signals`; `build()` meta; `verify()`)
- Test: `ai/benchmark.py --verify`

**Interfaces:**
- Consumes: the finished leaderboard frame (post rename, CI attached).
- Produces: `build_signals(lb: pd.DataFrame) -> list[dict]`; `meta.signals` records with fields `id, variable, geo, window_days, measure, metric, threshold, lead_days, leader, value, ci_low, ci_high, runner_up, gap, n, cases, delta_pct, beaten, low_sample` (irrelevant fields null). Records exist only when the source rows exist.

- [ ] **Step 1: Write the failing checks**

```python
# 11. every signal mirrors its board row and skips missing contexts
sig = {s["id"] for s in meta["signals"]}
ok &= _check(sig <= {"lowest_error", "best_extreme", "best_lead", "blend_gain"},
             "only known signal ids are published", str(sig))
for s in meta["signals"]:
    row = lb[(lb["board"] == s["measure"]) & (lb["variable"] == s["variable"])
             & (lb["geo"] == "IN") & (lb["method"] == s["leader"])]
    ok &= _check(not row.empty and abs(float(row.iloc[0]["value"]) - s["value"]) < 1e-9,
                 f"signal {s['id']}/{s['variable']} mirrors its board row")
```

(For the synthetic/real pass, run `verify()` after importing `meta` inside it; the check reads the just-built frame, not disk.)

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/bin/python ai/benchmark.py --verify`
Expected: FAIL — no `signals` key.

- [ ] **Step 3: Implement** the four selectors per the spec table (§3.4), including `blend_gain.delta_pct = (best_model_mae − blend_mae) / best_model_mae`, and omit a record when its source rows are absent.

- [ ] **Step 4: Run to verify it passes**

Run: `.venv/bin/python ai/benchmark.py --verify && .venv/bin/python ai/benchmark.py && .venv/bin/python -c "import json; print(len(json.load(open('outputs/benchmark_meta.json'))['signals']))"`
Expected: checks `OK`; at least 12 records (4 ids × 3 variables, where data exists).

- [ ] **Step 5: Commit**

```bash
git add ai/benchmark.py outputs/benchmark_meta.json
git commit -m "feat(benchmark): derive the signal leaders block"
```

---

### Task 4: Serving — pareto block + numeric coercion

**Files:**
- Modify: `app.py:980-1052` (`get_models_leaderboard`)
- Test: Flask test-client smoke (command below)

**Interfaces:**
- Consumes: `outputs/leaderboard_pareto.csv` (Task 2) and the extended meta (Tasks 1-3).
- Produces: response `{"meta", "rows", "pareto"}`; existing row coercion gains `ci_low, ci_high` (float) and `rank_low, rank_high` (int); pareto coercion ints `window_days, threshold, n_pairs, cases, low_sample, frontier`, floats `mae, csi, mae_ci_low, mae_ci_high, csi_ci_low, csi_ci_high`.

- [ ] **Step 1: Write the failing smoke check**

```bash
.venv/bin/python - <<'EOF'
import app
c = app.app.test_client()
r = c.get('/api/models/leaderboard?board=accuracy&variable=rainfall&geo=IN&window=full')
d = r.get_json()
assert r.status_code == 200
assert 'pareto' in d and len(d['pareto']) > 0, 'pareto block missing'
row = next(r for r in d['rows'] if r['geo'] == 'IN')
assert isinstance(row['ci_low'], float) and isinstance(row['rank_low'], int)
print('OK pareto=%d rows=%d' % (len(d['pareto']), len(d['rows'])))
EOF
```

Expected: `AssertionError: pareto block missing`.

- [ ] **Step 2: Implement** the route changes: load the pareto CSV with `load_csv_records`; filter by `variable` and `geo` (threshold stays client-side; Pareto is full-window); extend `int_keys`/`float_keys`; return the third key.

- [ ] **Step 3: Run to verify it passes**

Run the same command.
Expected: `OK pareto=… rows=…` (pareto > 0).

- [ ] **Step 4: Commit**

```bash
git add app.py
git commit -m "feat(api): serve Pareto points and interval columns on the leaderboard route"
```

---

### Task 5: Client types + cycle helper

**Files:**
- Modify: `frontend/src/lib/api.ts` (`LeaderboardMeta`, `LeaderboardRow`, `LeaderboardPayload` at ~848; add `ParetoPoint`, `LeaderboardSignal`, `CycleState`, `getCycleState`)

**Interfaces:**
- Produces: `ParetoPoint` (`geo, variable, window_days, threshold, method, tier, mae, mae_ci_low, mae_ci_high, csi, csi_ci_low, csi_ci_high, n_pairs, cases, low_sample, frontier`); `LeaderboardSignal` (Task 3 fields); `CycleState` (`cycle_id, expected_models, models: Record<string,{status,rows}>, received_models, missing_models, source_completeness:{expected,available,fallback}, forecast_checksum, stale`); `getCycleState(): Promise<CycleState | null>` calling `/api/cycle` via `fetchFromApi`.
- Consumed by: T6 (`getCycleState`, meta), T7 (rows), T8 (`ParetoPoint`), T9 (`LeaderboardSignal`).

- [ ] **Step 1: Add the types and helper** (additive; `LeaderboardRow` gains `ci_low/ci_high/rank_low/rank_high` as `number | null`; `LeaderboardPayload` gains `pareto: ParetoPoint[]`; `LeaderboardMeta` gains `stations_scored, primary_thresholds, ci_policy, pareto_methods, signals`).

- [ ] **Step 2: Verify**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: clean (no new findings).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat(web): type the leaderboard intervals, pareto points and cycle state"
```

---

### Task 6: Nav + page shell + hero + cycle rail + audit seed

**Files:**
- Modify: `frontend/src/types/index.ts` (`NavPage`), `frontend/src/components/shell/NavRail.tsx` (insert item), `frontend/src/app/page.tsx` (import + case)
- Create: `frontend/src/components/pages/LeaderboardPage.tsx`, `frontend/src/components/Leaderboard/Hero.tsx`, `scratch/leaderboard_audit.py`

**Interfaces:**
- Consumes: `getModelLeaderboard` (meta), `getCycleState` (T5).
- Produces: `LeaderboardPage`; `Hero({ meta }: { meta: LeaderboardMeta | null })`; audit script contract (`PREVIEW_URL` env, viewports `[(390,844),(768,1024),(1440,900)]`, exit 1 on failure).

- [ ] **Step 1: Write the failing audit** — `scratch/leaderboard_audit.py` modeled on `scratch/viewport_audit.py` (same env/viewports/print style). Against the running preview it: clicks nav `Leaderboard`; asserts eyebrow/headline/sub text exactly; asserts four stat chips or the error copy; asserts the cycle rail shows `Cycle … sources` **and**, in a second pass with `page.route("**/api/cycle", abort)`, shows `Cycle state unavailable — run the forecast pipeline`; asserts no horizontal overflow; prints page-height/viewport ratio with a `<BUDGET>` flag over 3.0 (390/768) / 3.6 (1440).

- [ ] **Step 2: Run to verify it fails**

Run: `python3 scratch/leaderboard_audit.py` (preview server running)
Expected: FAIL — nav button `Leaderboard` not found.

- [ ] **Step 3: Implement** the nav wiring, the page (one meta fetch via `getModelLeaderboard({board:'accuracy', variable:'rainfall', geo:'IN', window:'full'})`, bench area rendering the `Loading scorecard…` state until T7), and `Hero` (band, stats, cycle rail with the copy deck and vector status icons). Run the impeccable `context` command first, then read `reference/craft-floor.md`.

- [ ] **Step 4: Run to verify it passes**

Run: `python3 scratch/leaderboard_audit.py && cd frontend && npx tsc --noEmit && npm run lint`
Expected: audit OK at three viewports; clean typecheck/lint.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/components/shell/NavRail.tsx frontend/src/app/page.tsx frontend/src/components/pages/LeaderboardPage.tsx frontend/src/components/Leaderboard/Hero.tsx scratch/leaderboard_audit.py
git commit -m "feat(web): add the Leaderboard page shell, hero and cycle rail"
```

---

### Task 7: Bench — pills, controls, ranking table, podium

**Files:**
- Create: `frontend/src/components/Leaderboard/types.ts`, `Bench.tsx`, `RankingTable.tsx`, `PodiumMatrix.tsx`
- Modify: `frontend/src/components/pages/LeaderboardPage.tsx`
- Modify: `scratch/leaderboard_audit.py` (new assertions)

**Interfaces:**
- Produces: `LeaderboardState` (`category: 'overall'|'temperature'|'rainfall'|'wind'; view: 'ranking'|'pareto'; measure: 'accuracy'|'extreme'|'lead'; geo: string; window: number|'full'; lead: number|null; threshold: number|null`); `CATEGORY_VARIABLE`, `MEASURE_BOARD`, `VARIABLE_UNIT` maps; `Bench({ state, onChange, payload, isError, cities, meta, unit })`; `RankingTable({ rows, measure, unit })`; `PodiumMatrix({ meta, onSelectVariable })`.
- Consumes: T5 types, T1 columns.
- Page defaults: `overall / ranking / accuracy / IN / full`; threshold defaults to `meta.primary_thresholds[variable]`; lead defaults to the highest published.

- [ ] **Step 1: Extend the audit with failing assertions** — cycle categories `Overall → Temperature → Rainfall → Wind → Overall → Temperature` and assert the DOM row count is identical on the two `Temperature` visits (race guard); select the first non-`IN` geography and assert rows render with no error copy and CI cells show `—`; assert national rows show `±` interval values; assert podium renders 7 rows × 3 variables when Overall is active.

- [ ] **Step 2: Run to verify it fails**

Run: `python3 scratch/leaderboard_audit.py`
Expected: FAIL — bench controls/table absent.

- [ ] **Step 3: Implement** `Bench` (pills with section-12 ocean fill; window tabs; measure/view switches; context chips for thresholds/lead days; query-keyed fetch + stale-payload guard; category→board mapping), `RankingTable` (columns per measure; rank + range subtext; CI whisker; low-sample chip; phone card reflow; footer with the ranked-by line, active context, method count, the `no composite index — constituents only (PRD §10.5.A)` line, missing-dimension note, low-sample count and the CI policy footnote), `PodiumMatrix` (three parallel `window=full` accuracy fetches; sort by firsts then summed rank; cell click switches category). Before building the controls, search ui-layouts-mcp / spectrum-ui for a segmented or ranked-bar pattern and reuse `chart-engine` helpers where one fits.

- [ ] **Step 4: Run to verify it passes**

Run: `python3 scratch/leaderboard_audit.py && cd frontend && npx tsc --noEmit && npm run lint`
Expected: audit OK (stable counts, no error states, budgets within flags); clean typecheck/lint.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Leaderboard/types.ts frontend/src/components/Leaderboard/Bench.tsx frontend/src/components/Leaderboard/RankingTable.tsx frontend/src/components/Leaderboard/PodiumMatrix.tsx frontend/src/components/pages/LeaderboardPage.tsx scratch/leaderboard_audit.py
git commit -m "feat(web): build the leaderboard bench — pills, ranking table, podium"
```

---

### Task 8: Pareto view

**Files:**
- Create: `frontend/src/components/Leaderboard/ParetoView.tsx`
- Modify: `Bench.tsx`, `scratch/leaderboard_audit.py`

**Interfaces:**
- Produces: `ParetoView({ points, threshold, unit })`; frontier points carry `data-frontier="1"`; optimal list rows carry `data-pareto-optimal="1"` (the audit and the a11y table rely on these hooks).
- Consumes: `payload.pareto` (T5), chart-engine `niceTicks`/`useTween`.

- [ ] **Step 1: Extend the audit** — with a variable category active, click `Pareto`; assert a frontier path element exists; assert the optimal-list count equals the count of `data-frontier="1"` points; assert two axis labels with units; switch back to `Ranking` and assert the table returns.

- [ ] **Step 2: Run to verify it fails**

Run: `python3 scratch/leaderboard_audit.py`
Expected: FAIL — no `Pareto` control.

- [ ] **Step 3: Implement** the view: SVG scatter (ink points; filled = frontier; direct labels), frontier path in `foreground`, optimal list with MAE/CSI ±CI, selection ring in accent, visually-hidden `<table>` mirror of the numbers; the window control reads `Full window` and its tabs are disabled in this view. Search ui-layouts-mcp / spectrum-ui for a scatter pattern before writing new primitives.

- [ ] **Step 4: Run to verify it passes**

Run: `python3 scratch/leaderboard_audit.py && cd frontend && npx tsc --noEmit && npm run lint`
Expected: OK; clean.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Leaderboard/ParetoView.tsx frontend/src/components/Leaderboard/Bench.tsx scratch/leaderboard_audit.py
git commit -m "feat(web): add the MAE-vs-CSI Pareto view"
```

---

### Task 9: Signal leaders

**Files:**
- Create: `frontend/src/components/Leaderboard/SignalLeaders.tsx`
- Modify: `frontend/src/components/pages/LeaderboardPage.tsx`, `scratch/leaderboard_audit.py`

**Interfaces:**
- Produces: `SignalLeaders({ category, meta, onSelect })`; statement cards keyed by signal id with the exact copy patterns (spec §5.5); curation — Overall → three `blend_gain` cards + rainfall `best_extreme`; variable categories → `lowest_error`, `best_extreme`, `best_lead`, `blend_gain`; a card is skipped when its record is absent. Two named boards (`Extreme detection` = extreme rows at primary threshold; `At range — day 3` = lead rows at day 3) which own their fetches; `onSelect(patch: Partial<LeaderboardState>)` + scroll to bench.
- Consumes: `meta.signals` (T3), T5 types.

- [ ] **Step 1: Extend the audit** — assert four statement cards for a variable category; assert no card text contains `NaN`/`undefined`; assert a `blend_gain` card with a negative `delta_pct` renders the `trails` form; click the first card and assert the bench context label changes to the card's variable/measure.

- [ ] **Step 2: Run to verify it fails**

Run: `python3 scratch/leaderboard_audit.py`
Expected: FAIL — signals section absent.

- [ ] **Step 3: Implement** the cards + named boards (ranked bars, best highlighted, sample footer `n` / events / window / IN, `View full ranking →`), skipping a card when its signal record is absent (Review Focus #2).

- [ ] **Step 4: Run to verify it passes**

Run: `python3 scratch/leaderboard_audit.py && cd frontend && npx tsc --noEmit && npm run lint`
Expected: OK; clean.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Leaderboard/SignalLeaders.tsx frontend/src/components/pages/LeaderboardPage.tsx scratch/leaderboard_audit.py
git commit -m "feat(web): add signal leaders and named signal boards"
```

---

### Task 10: Switchover from the Performance page

**Files:**
- Modify: `frontend/src/components/pages/ModelPerformancePage.tsx`
- Delete: `frontend/src/components/ModelLeaderboard/`
- Modify: `scratch/viewport_audit.py` (PAGES list gains `Leaderboard`)

**Interfaces:**
- Consumes: the working bench (T7).
- Produces: Performance page rails (Skill + Verification left; Calibration right) and a repo without the old panel.

- [ ] **Step 1: Confirm the only consumer**

Run: `grep -rn "ModelLeaderboard" frontend/src --include='*.tsx' --include='*.ts'`
Expected: only `ModelPerformancePage.tsx` (import + usage).

- [ ] **Step 2: Remove and delete** — drop the import/usage, update the stale rail comment, `git rm -r frontend/src/components/ModelLeaderboard`, add `Leaderboard` to `scratch/viewport_audit.py`'s PAGES.

- [ ] **Step 3: Verify**

Run: `cd frontend && npx tsc --noEmit && npm run lint && npm run build && cd .. && python3 scratch/viewport_audit.py`
Expected: clean build; viewport audit reports the new page and no regression on Performance.

- [ ] **Step 4: Guardrail greps**

Run: `grep -rEn "rounded-full[^\"']*bg-(data|series|action)|#0d74ce" frontend/src/components/Leaderboard --include='*.tsx'`
Expected: no matches (no dots, no accent-as-data).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/pages/ModelPerformancePage.tsx scratch/viewport_audit.py
git commit -m "refactor(web): retire the in-page leaderboard panel now that F-03 has its own page"
# the folder deletion was already staged by git rm
```

---

### Task 11: Responsive completion + measured gate

**Files:**
- Modify: bench/responsive components as findings require; `scratch/leaderboard_audit.py` (final assertions)

- [ ] **Step 1: Run the full gate**

Run: `python3 scratch/leaderboard_audit.py && python3 scratch/viewport_audit.py`
Expected: no failures; note every measured page-height ratio and overflow/target result.

- [ ] **Step 2: Fix findings** — the budget offenders (likely hero height, signal stack, bench controls on phone): collapse signals after two cards behind `All signals`, condense the hero, compact controls; re-run until phone/tablet ≤3.0 VH and desktop ≤3.6 with zero horizontal overflow and ≥44px touch targets on phone/tablet.

- [ ] **Step 3: Final verification**

Run: `cd frontend && npx tsc --noEmit && npm run lint && npm run build && cd .. && .venv/bin/python ai/benchmark.py --verify`
Expected: all clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Leaderboard frontend/src/components/pages/LeaderboardPage.tsx scratch/leaderboard_audit.py
git commit -m "fix(web): land the leaderboard inside the device budgets"
```

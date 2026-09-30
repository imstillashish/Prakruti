# Data-Driven Advisories for the Hero "What to do about it" Section

Date: 2026-09-30
Status: Approved (design walkthrough 2026-09-30)
Owner: Prakruti / EXELION (SIH 2026 · PS 26081)

## Problem

The hero's "What to do about it" section in `frontend/src/components/ForecastHero/index.tsx`
selects a scenario from four hardcoded thresholds (`rain ≥ 15 mm`, `temp ≥ 38 °C`,
`wind ≥ 30 km/h`) and then renders **fixed string constants** — the same three advice
lines for every city, every day. The text never references the actual forecast values,
peak timing, or confidence, while the pipeline already produces richer evidence
(`extreme_alerts.csv`, 72h timeline, confidence scores) that the section ignores.

## Goal

Advice must be **computed from the data, true by construction, and guarded by CI**:
every line cites the evidence that triggered it; the scenario matches the alerts
pipeline's thresholds; calm days get a data-cited "All Clear" instead of filler.

## Decisions (from brainstorming)

1. Full rebuild on real data (scenario logic + advice text), not a patch.
2. Evidence-flavored advice: each line cites peak value / window / threshold.
3. Advice categories adapt to the hazard (rain → gear/transit/outdoors;
   heat → hydration/shade/vulnerable groups; wind → loose objects/two-wheelers/ops).
4. Calm days render a data-cited neutral card, badge "All Clear".
5. Approach A — pipeline-generated: the advice is written to a CSV by the same
   pipeline that produces the forecast, served via the API, rendered by the hero.

## Architecture

```
ai/thresholds.py        (new) shared threshold table, imported by alerts + advisories
ai/advisories.py        (new) generates outputs/advisories.csv
outputs/advisories.csv  (new artifact, committed daily like other outputs)
api/cache_manager.py    calls advisories.generate() after the alerts step
app.py                  GET /api/advisories?city=<name>
ForecastHero            fetches advisories, renders headline/badge/3 cards from rows
.github/workflows/
  daily-forecast.yml    asserts advisories exist, ≥135 rows, 45 cities; commits the CSV
```

## §1 Data model — `outputs/advisories.csv`

Generated each pipeline run from `outputs/hybrid_forecast.csv` (72h × 45 cities).
One row per action: **45 cities × 3 actions = 135 rows**.

Columns:

| column | content |
|---|---|
| `city` | city name (joins to metadata / forecast) |
| `scenario` | `heavy_rain` \| `light_rain` \| `heat` \| `wind` \| `calm` |
| `severity` | `high` \| `moderate` \| `none` (calm) |
| `badge` | display label, e.g. "Heavy Downpour", "All Clear" |
| `tone` | `destructive` \| `info` \| `muted` — maps to the hero's badge color classes |
| `headline` | h1 text, e.g. "Heavy rain expected — peak ~38 mm around 15:00 IST." |
| `category` | card title, e.g. "Personal Gear" |
| `action` | the instruction, evidence-flavored |
| `evidence` | citation string, e.g. `peak 12 mm · 15:00–19:00 IST · 6h above 4 mm` |
| `rank` | action order within a city (1–3) |

### Scenario selection

- Thresholds are **the same table as `ai/alerts.py`** (rain > 4/8 mm, heat > 35/37 °C,
  wind > 25/32 km/h). The table moves to `ai/thresholds.py`; `ai/alerts.py` imports it
  with unchanged behavior (single source of truth).
- Per city: scan the 72h window. Dominant scenario = highest severity wins;
  ties break rain → wind → heat. `heavy_*` = high threshold crossed;
  `light_rain` = moderate only; `calm` = nothing crossed.
- Evidence is computed in pandas: peak value, peak window (first–last hour above
  threshold, IST), count of hours above threshold.

### Scenario copy maps

Each scenario defines badge, tone, headline template, and three category/action
templates (rain: gear/transit/outdoors; heat: hydration/shade/vulnerable;
wind: loose objects/two-wheelers/outdoor ops). Calm cities use fixed categories
**Rain Outlook / Temperature / Wind**, each citing its 72h margin — e.g.
"Rain stays below 4 mm through 72h (peak 0.8 mm)" — so the calm card is also
evidence, not filler. All templates interpolate the computed evidence; no static strings.

## §2 Backend

- `api/cache_manager.py`: after the alerts/confidence step, invoke
  `advisories.generate()` so every regeneration path (Render background thread,
  CI run, local) refreshes advisories.
- `app.py`: `/api/advisories` — optional `city` query param, same
  `load_csv_records` + filter pattern as `/api/alerts`; 404 with the standard
  error body if the file is missing.
- `.github/workflows/daily-forecast.yml`: validation step additionally asserts
  `advisories.csv` exists, has ≥ 135 rows, and covers all 45 cities; the file joins
  the commit list and Render seed set.

## §3 Frontend — `ForecastHero`

- Replace the ~40-line hardcoded if/else synthesis with a
  `/api/advisories?city=` fetch inside the existing `useEffect` (same `mounted`
  guard pattern as the metrics fetch).
- Render from rows: `headline` → h1, `badge` + `tone` → badge class map,
  three cards (category, action, evidence). Evidence renders in JetBrains Mono
  (numerals in mono per DESIGN.md v3).
- Icons per scenario from existing lucide imports (Umbrella/Car/Sun today;
  heat/wind icons per scenario map).
- Layout unchanged: badge + h1 + three cards + ShaderButton. Only the content
  source changes.

## §4 Errors, loading, testing

- **Loading:** skeleton lines matching the final card shape (no spinner blob).
- **API failure:** calm-toned honest state — "Advisory feed unavailable — see Data
  Health" — never fabricated advice.
- **Tests:** local `generate()` → 135 rows covering all 45 cities; spot-check that
  each city's scenario matches what the alerts pipeline produced for the same
  window (consistency, not a date-bound expectation); `tsc --noEmit`,
  `next build`; visual verify in dev + production after deploy; CI assertions
  guard every future run. `ai/alerts.py` output must be byte-identical after the
  thresholds refactor.

## Out of scope

- Notification channels (SMS/bot) — they can consume `/api/advisories` later.
- Changes to alert thresholds themselves.
- Non-hero surfaces (Alert Center already renders alerts data).

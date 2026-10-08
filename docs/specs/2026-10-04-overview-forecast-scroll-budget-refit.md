# Overview & Forecast — Scroll Budget Refit

**Status:** implemented 2026-10-04 · **phone closed 2026-10-05, see addendum at the bottom**
**Supersedes the tier numbers in:** `2026-10-01-multi-device-refit-plan.md` §1.0
**Gate:** DESIGN.md §9.6 — phone 390×844 ≤ 3.0, tablet 768×1024 ≤ 3.0, desktop 1440×900 ≤ 3.6

## 1. Measured before and after (production build, live API)

| Tier | Overview before → after | Forecast before → after | Budget | Verdict |
|---|---|---|---|---|
| Phone 390×844 | 4.04 → **3.64** | 3.84 → **3.51** | ≤ 3.0 | still over |
| Tablet 768×1024 | 3.07 → **2.90** | 2.95 → **2.78** | ≤ 3.0 | pass |
| Desktop 1440×900 | 3.79 → **3.60** | 3.11 → **2.92** | ≤ 3.6 | pass |

All nine nav sections were walked at each viewport, not just the two that changed: tablet 9/9
(worst Overview 2.90) and desktop 9/9 (worst Overview 3.60) pass; phone is 7/9, with Overview and
Forecast the two misses. Horizontal overflow is 0px in all 27 measurements and the phone nav stays
docked in the thumb zone on every section. Desktop Overview sits exactly on its budget (3238px
against 3240px) — it has no slack, and it is the number to watch when data grows.

## 2. Cause 1 — the hero carried two advice decks

`ForecastHero` rendered "What to do about it" from the advisories feed *and* `CitizenWeatherBrief`
below it. Both present the same three categories (Rain & Commute, Heat & Comfort, Model Consensus);
the brief adds a Scientific Basis line and is the one the 10-03 humanised-weather work introduced as
the citizen advice surface. The stale deck was the tallest element in the hero's left column, so it
set the hero row height and the 2×2 metric grid stretched into it — 611px desktop, 643px tablet,
with each metric tile inflated to ~305px around a 44px sparkline.

Deleting the deck and its now-unused `categoryIcon` (and the icon imports that only it used) gave
tablet −0.17 and desktop −0.19. The `advisories` feed still reaches the user: the brief renders the
high-severity advisory from it, and the hero keeps its feed-unavailable state.

## 3. Cause 2 — panel headers squeezed their titles on a phone

`Panel`'s header put the title block and the segmented controls on one line. Model Skill (four
periods) and Model Agreement (three variables) have control rows ~250–330px wide, which squeezed the
`flex-1` title to a sliver and wrapped its subtitle into a ten-line column: a *collapsed* panel
measured 261px and 357px tall on a phone. Below `sm` the title now owns its row and the control row
follows, scrolling sideways if it ever outgrows the screen; from `sm` the two share one line exactly
as before, which is why the tablet and desktop numbers are unchanged. Model Agreement's header went
357 → 145px, and Model Intelligence on a phone came down from the 2.37 recorded on 10-01 to 1.92.

## 4. Deliberate trade-off left on phone

Phone Overview needs about 500px less and Forecast about 430px less to reach 3.0. What is on those
pages is the map (360px), the 72h chart (535px on Overview, 893px on the Forecast page), the hero
band (1031px: metric grid, citizen brief, evidence disclosure), and the remaining panels at 67–145px
each. Trimming the footer, the map canvas and the chart chrome recovers perhaps 250–300px and no
more; the rest has to come out of those four blocks. The 10-01 refit made the same call for the same
reason ("kept inline rather than trimmed to a number"), and this pass did not overrule it.

The 3.64 / 3.51 measured here are marginally above the 3.58 / 3.43 recorded on 10-01. About 44px of
that is the tap-target fix below, which is deliberate: DESIGN.md §9.6 gates 44×44 targets on every
touch viewport.

## 5. Ride-alongs

- **Tap targets.** The strip's refresh button and the phone "Models" glossary glyph were the only
  sub-44×44 phone targets left. Both sit directly under the fixed TopBar, which clips the
  `after:-inset-*` hit-zone convention the repo uses elsewhere, so both now carry a real 44px box
  below `sm`. A few other glossary glyphs still measure under 44px where two of them sit close
  enough for their expanded zones to overlap; the tap still lands on a control, so this is left
  alone.
- **Spacing.** The hero band's `mb-6` went; the page's own `space-y-5/6` already spaces it, and the
  two margins collapsed to one anyway.
- **Header flex basis.** `Panel`'s title block no longer carries a flex basis at `sm`+, so a long
  action row can no longer force a header to wrap and cost a collapsed panel ~40px.

## 6. Verification

Scripts used for this pass (`scratch/block_measure.py`, `scratch/final_audit.py`, `scratch/tap_probe.py`)
are local-only and not committed; they run against `next build` + `next start` on :3011 with the API
on :5002. Touch targets are measured by hit area (`elementFromPoint` at ±22px), not by bounding box,
so a control whose pseudo-element expands its tap zone counts as passing. `npx tsc --noEmit` is clean.

## 7. Addendum 2026-10-05 — the phone tier closes

The two remaining phone misses are fixed by the same snap-deck mechanism the hero metric
cards already use, applied to the page's operational grid: below `sm` the cards become one
horizontal `carousel-snap-deck` (evidence first: map, trend, hazards, then the deep
panels); the two rail wrappers dissolve via `max-lg:contents` so at `lg:` the desktop
global geometry is untouched (Overview desktop still measures exactly 3.60). Phone cuts beyond
the deck: Forecast chart canvas 220→180px below `sm`, deck pagination dots are passive
indicators on phone (cards already tap-scroll), and the deck's `(D+1–D+3)` legend shortens.
Measured: Overview 3.77 → **2.60vh**, Forecast 3.62 → **2.99vh**; tablet and desktop rows
unchanged. Ongoing verification is `scripts/audit_gate.py` (27 rows, one verdict, baseline
of the known tap punch list in `audit_gate_baseline.json`).

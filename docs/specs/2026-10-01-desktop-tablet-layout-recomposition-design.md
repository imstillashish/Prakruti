# Desktop & Tablet Layout Recomposition

**Status:** Implemented 2026-10-01 — plan at `docs/plans/2026-10-01-desktop-tablet-layout-recomposition.md`, deviations recorded in §8
**Date:** 2026-10-01
**Companion to:** `2026-10-01-multi-device-responsive-layout-system.md` (target architecture) and `2026-10-01-multi-device-refit-plan.md` (phone-stage baseline). The refit plan closed the phone spine; this spec covers the desktop/tablet pass it left open.

---

## 1. Why this pass exists

Walking the production build at 1440×900 and 768×1024 across all eight sections turned up three structural defects and one layout habit. They are not eight separate bugs; they reduce to a cascade leak, a stretch rule, and a fixed track count.

### 1.1 Measured desktop 1440×900 (budget 3.6 screens)

| Section | Screens | Findings |
|---|---|---|
| Overview | **3.64** | 4 metric cells with 139–159px internal voids (~576px dead), model strip orphaned (6 cells / 5 cols), 4 clipped labels, advice rendered twice |
| Forecast | 2.90 | same 4 metric-cell voids (~576px) |
| Model Intelligence | 2.44 | Model contribution cell **299px void**, orphan (6/5), 4 clipped labels (`ICON 20<28`, `AI Blend 26<44`) |
| Performance | **3.92** | five full-width stacked panels: skill 374, verification 737, raw-vs-calibrated 920, 3D matrix 668, history 292 |
| RPI & Trust Atlas | 1.20 | clean |
| Extreme Weather | 2.01 | clean |
| Data Health | 1.24 | clean |
| API Explorer | 1.20 | clean (inner scroll is the response log, deliberate) |

### 1.2 Measured tablet 768×1024 (budget 3.0)

Overview **3.46**, Forecast **3.40**, Performance **3.54**, Model Intelligence 2.25 (181px void in one cell), remaining sections ≤1.75. Clipped: "All forecast param…" (Overview), "Coordinates: 26.45…" (RPI). Advice rendered twice here as well. Zero horizontal overflow on every section at both tiers.

### 1.3 Root cause 1 — unlayered CSS defeats every breakpoint variant

`.carousel-snap-deck` declares `display: flex; overflow-x: auto` at `globals.css:363`, outside any `@layer`. Tailwind v4 emits utilities inside `@layer utilities`, and unlayered author CSS outranks layered CSS, so `display:none` from `sm:hidden` and `display:grid` from `lg:grid` never apply to any element carrying that class.

Rendered evidence at 1440px, Overview:

- Advice deck A — `sm:hidden carousel-snap-deck` computed `display: flex`, 507px wide, 3 children of 340px (1020px of content in a 507px box).
- Advice deck B — `carousel-snap-deck lg:grid lg:grid-cols-3` computed `display: flex`, 717px wide.

Both rows paint. The first is clipped mid-sentence by the hero edge. The same leak silently voided the tablet 3-up advice grid added in the previous pass, and it applies to every deck in the app — `ForecastHero`, `ModelComparison`, `ForecastTimeline`.

### 1.4 Root cause 2 — stretch without distribution

Grid rows stretch children to the tallest sibling, and content pins to the top. Metric cells sit in 2×2 tracks with a sparkline at the top and nothing under it: 139–159px of tail per cell on Overview and Forecast, 299px in the Model contribution cell, 181px on tablet. The dead space is not padding; it is unallocated height.

### 1.5 Root cause 3 — track count fixed against a moving item count

`ModelComparison/index.tsx:195` renders `grid grid-cols-5` over six models. At 1440 that orphans the sixth cell beside four empties and truncates names to measure (`ECMWF 12<43`, `GFS 10<22` on Overview; `ICON 20<28`, `AI Blend 26<44` on Model Intelligence).

### 1.6 Root cause 4 — one-panel-per-row on Performance

Performance stacks five full-width cards at every width above 640: 374 + 737 + 920 + 668 + 292 = 2991px before gaps. Nothing about that content needs full width; it needs two columns and one deliberate pair row.

## 2. Design read

Trust-first public-sector operations surface — forecast intelligence for emergency managers reading under time pressure, inside the editorial white world DESIGN.md v3 already fixes (white canvas, ink #171717, Inter 600/400, JetBrains Mono on numerals, 8px controls / 12px panels). Dials: **VARIANCE 3** (structure stays predictable; only the hero band carries atmosphere), **MOTION 2** (one authored moment — map and chart state change; no section entrances), **DENSITY 6 desktop / 4 tablet / 3 phone**. Restraint is the point; the enemy is noise, not blandness.

`ui-layouts-mcp` was searched for dashboard/grid layout blocks and has nothing applicable — its Layout group is decorative (background grids, masonry galleries). No new dependency enters the project for this work.

## 3. Structural model

### 3.1 Spatial thesis

Reading and task path: **verdict → spatial evidence → temporal evidence → method → operations**. Grouping follows those questions, not data sources.

- One deliberate breath: the hero verdict band, full width, alone.
- Tight workspace beneath: map with the station strip; 72h chart with the horizon summary; models with weights and skill.
- Spacing contrast: hero padding stays generous; workspace panels tighten to 16–20px with 12px gaps; telemetry and data health tighten furthest.

### 3.2 Four rules

1. **Layer the deck utilities.** Move `.carousel-snap-deck` and `.carousel-snap-item` into `@layer components` so breakpoint variants win. One declaration; every deck in the app then honors its own breakpoints.
2. **Cells size to content.** Rows carrying unequal children stop stretching by default. Where a cell is deliberately taller, its content distributes — chart grows, actions anchor — so no cell trails more than 90px of empty height.
3. **Track count follows item count.** Repeated-item panels use auto-fit tracks with min/max item widths. Six models fit six tracks at desktop and three at tablet without ellipsis.
4. **Two-context components take a variant, not a viewport class.** Panels that render both in a hero column and full width get their internal arrangement from a prop (`variant: 'full' | 'rail'`), so the same component reads correctly in either slot.

### 3.3 Tier contracts

| Tier | Composition |
|---|---|
| Desktop >1024 | Hero band full width; two-column evidence workspace (evidence left, method right); Performance as paired rows, not a stack |
| Tablet 640–1024 | Same content in touch pairs — two cards side by side instead of collapsed cards; ≥44px targets; no hover-only disclosure |
| Phone <640 | Unchanged spine from the refit plan: verdict, actions, tap-to-activate map, chart, collapsed secondary; station switching in the docked thumb bar |

## 4. Per-page composition

### 4.1 Overview

- Hero keeps the verdict-first lead. Advice cards become three equal rails at desktop and tablet once rule 1 lands (they were always authored that way; the cascade leak prevented it).
- Metric cells become a compact 4-up row whose internals distribute label → value → sparkline anchored to the bottom edge, removing the 576px of tail.
- Model strip switches to auto-fit tracks — six at ≥1280, three at tablet — with full names.
- Workspace: map and 72h chart share the left column; model consensus, contribution, skill and telemetry fill the right column in that order, retaining `collapsibleOnPhone`.

### 4.2 Model Intelligence

- `ModelContribution` becomes the two-context component: full width with chart and legend side by side at desktop, stacked in the hero column variant. Removes the 299px void.
- `ModelComparison` takes auto-fit tracks (three-up desktop, two-up tablet) and the `grid-cols-5` fixed track is deleted.
- Regional dominance becomes a real table with a sticky first column at desktop and tablet; the phone keeps its deck.

### 4.3 Performance

- Pair what is equal: Model skill (374) and Historical skill scores (292) share one row — a ~380px row replacing 666px.
- Pair what is tall: Verification (737) and Raw vs calibrated (920) sit side by side — a ~920px row replacing 1657px.
- 3D matrix stays full width as the closing explorer and collapses by default on tablet, where it is supplementary to the flat calibration table.
- Projected ≈2.2 desktop screens from 3.92. The number gets measured, not asserted.

## 5. Out of scope

- CI enforcement of the audit (separate decision).
- Container-query migration beyond the two-context panels in §4.2 — the app has three viewports, not an arbitrary embed surface.
- Phone spine changes: the refit plan's phone contracts stand.
- Copy rewrites: this pass moves structure only.

## 6. Acceptance gates

Re-run the programmatic audit at 390×844, 768×1024 and 1440×900 — nav clicked section by section, measuring `scrollHeight / viewportHeight`, overflow, per-cell void depth, clipped leaf text, rendered deck count. A section passes when:

| Check | Gate |
|---|---|
| Scroll budget | Phone and tablet ≤3.0 screens, desktop ≤3.6 |
| Horizontal overflow | zero offenders |
| Cell voids | none >90px |
| Clipped leaf labels | zero (earlier passes tolerated these; this pass does not) |
| Rendered decks | no panel paints twice |
| Touch targets | ≥44px, no hover-only disclosure |

## 7. Sequencing

1. CSS layer fix (§3.2 rule 1) — unblocks every other change; re-measure, since it alone should remove both duplicate rows.
2. Overview composition (§4.1).
3. Model Intelligence composition (§4.2).
4. Performance composition (§4.3).
5. Full three-tier audit, then replace §1 of `2026-10-01-multi-device-refit-plan.md` with the new baseline.

Deliberate deferral: if the layered-CSS fix turns out to shift `.carousel-snap-item` snapping in the phone decks, the deck utilities get scoped per component rather than layered globally (`ponytail:` note lands in the code at that point).

---

## 8. Deviations the measurements forced

Three design statements did not survive contact with the numbers. Each was replaced by what the measurement supported rather than by what reads best in a spec.

1. **§3.3's tablet contract said touch pairs, no collapse.** Measured at 768×1024: the workspace split 644px into 375/268, the model strip rendered 179px wide, and the left column reached 2188px against the right column's 603px. Pairs at 310px do not work for these panels. Tablet now keeps the 7/5 split but stacks the comparison/advisory pair (375px each instead of 179px), hides Overview's D+1–3 deck below `lg` (`phoneCompact` now `hidden lg:block`), and collapses secondary analysis below desktop — `Panel` gained `collapsibleOnTablet` beside `collapsibleOnPhone`, sharing one open state.
2. **§4.1's Overview workspace reshuffle was dropped.** Overview measured 0.04 screens over its desktop budget and Tasks 1–2 removed height from the same hero; the reshuffle never became justified. The hero keeps its current shape; only the metric cells' internal distribution changed.
3. **§4.2's regional-dominance table was dropped.** Measurement showed no orphan, no void and no truncation there — six cards already fit three-up. Rewriting working content into a table would have been churn.

The reverse also happened once: the tablet collapse on the right column was briefly reverted on the reasoning that its 603px never sets the page height. That was true only while the left column was still 2188px; after the left column was trimmed to 1440px, the right column at 1944px became the binding constraint. The flags went back in, and the comment in `page.tsx` records the measured numbers behind them.

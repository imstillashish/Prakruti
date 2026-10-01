# Multi-Device Refit: Measured Baseline & Per-Page Refit Plan

**Status:** Approved plan for the responsive implementation phase
**Date:** 2026-10-01
**Companion to:** `2026-10-01-multi-device-responsive-layout-system.md` (the approved design). That spec defines the target architecture; this one measures the gap and sequences the refit.

---

## 1. Measured baseline (updated 2026-10-01 post-refit, production build on :3000)

### 1.0 Post-refit numbers (this supersedes §1.1's pre-refit table below)

Second pass (verification/calibration/dominance panels collapsed on phone, sparklines hidden on phone, Overview's D+1–3 deck phone-gated via `phoneCompact`, Forecast's station card tablet+ only):

| Tier | Pass | Misses |
|---|---|---|
| Phone 390×844 | 6/8 (MI 2.37, RPI 1.56, Perf 2.28, EW 2.66, DH 1.76, API 1.82) | Overview 3.58, Forecast 3.43 |
| Tablet 768×1024 | **8/8** (Overview 2.79, Forecast 2.86, Performance 2.90, rest ≤ 2.25) | none |
| Desktop 1440×900 | **8/8** (Overview 3.52, Forecast 2.68, Performance 2.83, MI 2.44, rest ≤ 2.01) | none |

Desktop and tablet now hold the §6 gate; phone stands at 6/8 with Overview 3.58 and Forecast 3.43, where the map and the interactive 72h chart are primary content and stay inline rather than trimmed to hit a number.

### 1.0a The desktop/tablet defect had one dominant cause

`.carousel-snap-deck` was declared outside any `@layer`. Unlayered author CSS outranks Tailwind v4's `@layer utilities`, so `sm:hidden` and `lg:grid` were inert on every element carrying the class: the phone advice deck painted on desktop and tablet beside the desktop grid, and the tablet 3-up advice grid written in the previous pass had never applied at all. Layering the utilities (`globals.css`) removed both rows at once — desktop Overview 3.64 → 3.51 before any composition work.

The composition work that followed: hero metric cells distribute their height instead of trailing 139–159px of dead tail; the six-model strip auto-fits its tracks instead of a fixed five; paired panels size to content (`items-start`), killing Model Intelligence's 299px void; Performance became paired rows (2.83 desktop, 2.90 tablet, from 3.92/3.54); and the comparison panel plus the right-column analysis collapse below desktop, where measurement showed the left column at 1440px and the right at 1944px were each setting the page height in turn.

Ride-alongs fixed in this pass: `app.py` `load_csv_records` emitted bare `NaN` for empty categorical-verification cells (invalid JSON, console errors) — now `null` via `astype(object)` before the notnull mask; the station dossier's coordinates wrapped instead of ellipsizing at tablet; the model card's name and provider stacked so auto-fit tracks stop clipping `AI Blend`.

Known non-defect: Model Intelligence's auto-fit strip wraps 4 + 2 in its ~700px slot on desktop. That is a trailing partial row, not the old fixed-5 orphan beside four empty cells, and no label truncates.

Live viewports walked like a user: phone 390×844, tablet 768×1024, desktop 1440×900. All 8 nav sections visited on each. Method: programmatic nav clicks + `scrollHeight` / overflow measurement.

### 1.1 Scroll budgets (screens-tall = pageHeight ÷ viewportHeight)

| Section | Phone 390px | Tablet 768px | Desktop 1440px | Budget (phone) |
|---|---|---|---|---|
| Overview | **7.1** | 3.4 | 3.6 | ≤ 3 |
| Forecast | **5.2** | 3.3 | 2.9 | ≤ 3 |
| Model Intelligence | 3.7 | 2.0 | 2.2 | ≤ 3 |
| Performance | 3.5 | 2.3 | 2.5 | ≤ 3 |
| Extreme Weather | 2.7 | 1.7 | 2.0 | ≤ 3 |
| Data Health | 1.8 | 1.1 | 1.1 | ≤ 3 |
| API Explorer | 1.9 | 1.2 | 1.1 | ≤ 3 |
| RPI & Trust Atlas | 1.6 | 1.3 | 1.2 | ≤ 3 |

Note that **desktop Overview is 3.6 screens too** — the overview spine is too long on every device, not just mobile. The refit must collapse the overview spine everywhere (see §3.1), not merely stack it differently on phones.

### 1.2 What already works (keep, don't rebuild)

- Zero horizontal overflow on all three viewports (only leaflet canvas internals cross the edge — clipped, harmless).
- Tri-modal nav exists: `NavRailView.tsx` ships desktop 88px rail (>1024px), tablet 64px icon rail (640–1024px), mobile pill strip (<640px).
- Forecast/Model Intelligence already use snap carousels (`snap-start` decks, `w-[82vw] sm:w-[300px]` slides, `min-h-[44px]` targets).
- Tablet Overview is a genuine 2-column grid; tablet pages sit at ≤3.4 screens.

### 1.3 Gaps (ordered by user pain)

1. **Mobile nav sits at the top** (`sticky top-16` strip). The spec (§9.5 / §3.3) calls for a **docked thumb command bar**. Sections "Extreme Weather"… are a 3-tap thumb stretch from a 7-screen page.
2. **Overview violates the 2-viewport rule on every device.** 13 sections ride one spine: status strip, hero verdict, 4 metric cards, 72h map, hourly chart, D+1–3 cards, consensus table, advisory, station picker, model contribution, skill score, telemetry. Critical actions (station switch, alerts) land ~4–5 screens deep.
3. **No map anti-trap mode.** The Leaflet map on a phone captures single-finger swipes; spec §9.4 requires scroll pass-through + tap-to-activate + two-finger protocol.
4. **No hover-free disclosure path.** "What is …?" tooltips, station hover cards, and map popups have no tap-first equivalent on touch; chart scrubbing is cursor-only in places.
5. **Content regression:** the "WHAT TO DO ABOUT IT" panel repeats the rain sentence for the Temperature and Wind rows ("stays below 4 mm through 72h (peak 0.2 mm)" ×3).

---

## 2. Design decisions locked

- **Reuse before build:** the pill-strip nav keeps its markup and re-docks to the bottom (new wrapper classes + a page `pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]` offset; no new component). Carousel primitives (`snap-start` decks) extend to the remaining tall panels. No new dependencies — Radix `@radix-ui/react-accordion` (already installed) covers progressive disclosure if sheets prove heavier than needed.
- **Tooltips → tap-first everywhere:** "What is …?" buttons must toggle on tap (not hover-only) on touch devices; desktop keeps hover.
- **Fix the copy bug** in the advisory panel as part of the Overview refit (§3.1).
- **Fonts 404:** `/fonts/inter-medium.woff` 404s in the production build; fix alongside (one-line manifest fix), not part of this plan's scope.

## 3. Per-page refit plan

### 3.1 Overview (all devices — worst offender)

**Phone (<640px)**
1. Keep: status strip → verdict hero.
2. Metric cards (temp/precip/wind/confidence) → **horizontal snap deck** (one card per view, peek of next).
3. Map → anti-trap container (§3.4) with fixed 280px canvas.
4. Hourly chart → keep, but collapse controls under a `44px` segmented control.
5. D+1–3 cards, consensus table, model contribution, skill score → **snap carousel groups**; telemetry → collapsed by default (details/summary or accordion).
6. Station picker + advisory → merged into the docked thumb bar's sheet triggers.
7. Target: ≤ 3 viewports.

**Tablet (640–1024px)** — already 2-col; move telemetry + skill score into the right column and cut the D+1–3 row into a 3-up touch grid. Target: ≤ 2.5 viewports.

**Desktop (>1024px)** — collapse the spine: metric cards 4-up, chart + map side-by-side (7/5 split), advisory + station picker merged into one right-rail panel; skill score + telemetry into a 2-col sub-grid under the chart. Target: ≤ 3 viewports.

### 3.2 Forecast (phone)
Trim to: hero → snap deck (D+1–3) → chart (collapsible controls) → advisory snippet → docked bar. Kill the 5.2-screen stack; target ≤ 3 viewports.

### 3.3 Model Intelligence (phone)
Already 3.7 — verify snap decks cover verification/calibration/trajectories after the models endpoints ship (the three `/api/models/*` 404s), then re-measure.

### 3.4 Map anti-trap (WeatherMap, all pages)
1. `touch-action: pan-y` on the map container for single-finger pass-through.
2. Tap-to-activate overlay pill ("Tap to interact with map") that unlocks single-finger map gestures; "Done" re-locks.
3. Two-finger pan/zoom always allowed (`pointer-events` routed per gesture).
4. Same container reused by Overview/Forecast/Extreme Weather maps.

### 3.5 Docked thumb bar (all pages, phone)
- Reuse the existing mobile nav strip, re-docked: `fixed bottom-0` + safe-area inset; content offset `pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]`.
- Carries: section pills + alert trigger; station switcher stays in-page.
- Desktop/tablet navs unchanged.

### 3.6 Data Health / API Explorer / RPI (phone)
Already ≤1.9 screens. No structural work; verify 44px targets on segmented controls.

---

## 3.7 Acceptance gates (measured, per device)

Re-run the audit script on every refit PR; a page passes its tier when:

| Tier | Gate |
|---|---|
| Phone 390×844 | every page ≤ 3.0 screens tall; zero horizontal overflow; nav docked bottom; 44px targets |
| Tablet 768×1024 | every page ≤ 3.0 screens; icon rail; no hover-only disclosures |
| Desktop 1440×900 | every page ≤ 3.6 screens; hover tooltips; keyboard reachable |

Zero horizontal overflow is a hard gate on every tier (leaflets' clipped canvas internals excluded).

---

## 4. Sequencing

1. **Overview spine collapse** (§3.1) — largest win, all devices.
2. **Docked thumb bar** (§3.5) — unblocks thumb-first nav.
3. **Map anti-trap** (§3.4).
4. **Forecast trim** (§3.2), then Model Intelligence re-measure (§3.3).
5. Copy fix + fonts 404 as ride-alongs.
6. Re-run acceptance gates; record new baseline in this file's §1 (replace, don't append).

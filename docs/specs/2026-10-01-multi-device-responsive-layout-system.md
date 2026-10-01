# Multi-Device Responsive Layout System Specification

**Status:** Approved for Implementation Planning  
**Date:** 2026-10-01  
**Target:** Frontend Shell, Pages (`Overview`, `RPI`, `API`), `DESIGN.md`, `AGENTS.md`  

---

## 1. Problem Statement & Motivation

Prior to this specification, responsive behavior was primarily treated as CSS box-scaling: elements squeezed their widths, but layout structures remained identical to the desktop 12-column grid. This created three critical user experience failures:

1. **Endless Vertical Scrolling on Mobile & Tablet:** Because all 8+ dashboard panels stacked vertically on smaller screens, mobile users had to scroll over 3,000 vertical pixels simply to change their station via `RegionSelector` or view model comparisons.
2. **Ignored Input Modalities:** Desktop experiences rely on precision cursor hover and drag scrubbers; mobile and tablet experiences rely on coarse finger touch, thumb zones, and swipe gestures. Hover-only disclosures were inaccessible on touchscreens.
3. **Touch Gesture Traps:** Interactive components such as the full-width `WeatherMap` captured single-finger drags, trapping users attempting to scroll past the map vertically.

This specification establishes a **Tri-Modal Device Architecture** where each device class receives an intentional, custom layout and interaction model designed to minimize vertical scrolling and maximize ergonomic usability.

---

## 2. Tri-Modal Device Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Mobile Phone (<640px) — 1-Column Thumb-Centric Stack                     │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ TopBar (Compact Brand + Alert Pill + Status)                           │ │
│ │ Hero Card (Primary Temperature, Risk Badge, Critical Summary)           │ │
│ │ Horizontal Snap Carousel: 24h & 72h Timeline Forecast [Cards 1..3]      │ │
│ │ Interactive Radar Map (Scroll-Protected: Tap-to-Activate overlay)       │ │
│ │ Horizontal Snap Carousel: Model Comparisons (ECMWF, GFS, ICON, GEM)     │ │
│ │ Docked Bottom Quick Bar (Fixed thumb switcher: City, Alert, Mode)      │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. Tablet (640px–1024px) — 2-Column Balanced Touch Grid                     │
│ ┌───────┬──────────────────────────────────┬──────────────────────────────┐ │
│ │ 64px  │ Left Col: Visualizations         │ Right Col: Intelligence      │ │
│ │ Touch │ • Forecast Hero (Wide)           │ • Region/Station Selector    │ │
│ │ Rail  │ • Timeline & Radar Map           │ • Model Skill & Contribution │ │
│ │       │ • Model Comparison Deck          │ • Data Health & Diagnostics  │ │
│ └───────┴──────────────────────────────────┴──────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. Desktop (>1024px) — 12-Column Precision Analytical Dashboard             │
│ ┌───────┬──────────────────────────────────────┬──────────────────────────┐ │
│ │ 88px  │ 7-Col Precision Visualizations       │ 5-Col Deep Telemetry     │ │
│ │ Rail  │ Hero + Interactive Map + Timeline    │ Region + Model Weights   │ │
│ │       │ Hover scrubbers, full tooltips       │ Synoptic audit & logs    │ │
│ └───────┴──────────────────────────────────────┴──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Mobile Phone Tier (`< 640px`)
- **Layout Paradigm:** Single-column thumb-centric stack with horizontal swipe snap decks.
- **Vertical Budget:** Reduces active scroll height by over $65\%$ compared to naive vertical stacking.
- **Navigation:** TopBar condensed (brand icon + title + alert bell); left rail hidden; persistent Docked Thumb Bar at `bottom-0` (`h-14` plus `env(safe-area-inset-bottom)`).
- **Primary Controls:** Thumb-accessible station switcher modal trigger and active alert pill in bottom bar.

### 2.2 Tablet Tier (`640px` to `1024px`)
- **Layout Paradigm:** Balanced 2-column touch grid ($60\% / 40\%$ split).
  - **Left Column:** `ForecastHero` (compact), `ForecastTimeline` swipe deck, and `WeatherMap`.
  - **Right Column:** `RegionSelector` (touch-friendly cards), `ModelContribution`, and `DataHealthPanel`.
- **Navigation:** Left rail condensed to an icon-only touch rail (`w-16`, 64px width) with $48\times 48\text{px}$ touch targets.
- **Input:** Full touch-swipe support on carousels, with larger touch targets and no hover-only requirements.

### 2.3 Desktop Tier (`> 1024px`)
- **Layout Paradigm:** 12-column analytical dashboard ($7 / 5$ column split).
- **Navigation:** Full 88px fixed left rail with two-line typographic badges (`label` + `subtitle`).
- **Input:** Precision cursor interactions: hover tooltips, scrubbers, code copy, and keyboard shortcuts.

---

## 3. Anti-Scroll Mechanics & Touch Architecture

### 3.1 Horizontal Snap Carousels (`scroll-snap-x`)
Multi-card data panels that stack vertically on desktop reflow into horizontal, swipeable carousels on mobile and tablet:
1. **Container Styling:**
   ```css
   .carousel-snap-deck {
     display: flex;
     overflow-x: auto;
     scroll-snap-type: x mandatory;
     scroll-behavior: smooth;
     touch-action: pan-y;
     gap: 0.75rem;
     padding-bottom: 0.5rem;
     scrollbar-width: none;
   }
   .carousel-snap-deck::-webkit-scrollbar {
     display: none;
   }
   ```
2. **Slide Sizing:** Each slide takes `w-[88vw] sm:w-[360px] shrink-0 snap-center`.
3. **Visual Pagination Indicators:** A subtle indicator bar (`[ • ◦ ◦ ]`) renders below each carousel showing active slide index and allowing direct tap-to-jump.

### 3.2 Weather Map Gesture Isolation (Anti-Trap)
To prevent the full-width Leaflet map from trapping single-finger vertical page scroll on touchscreens:
- **Touch Guard:** On touch devices (`@media (pointer: coarse)`), a translucent overlay intercepts single-finger touch and allows the vertical page scroll to pass through undisturbed.
- **Two-Finger Gesture:** Multi-touch two-finger drag and pinch-to-zoom pass directly through to the map.
- **Tap to Activate:** A prominent pill button (`"Tap to interact with map"`) unlocks full single-finger panning, with a `"Lock / Done"` button to re-engage scroll pass-through.

### 3.3 Docked Thumb Command Bar
On mobile viewports (`< 640px`), a fixed bottom bar provides instant access to primary actions without scrolling:
- **Station Chip:** Displays active station (e.g., `KANPUR · UP`) with chevron; tapping opens a bottom-sheet station picker with search and regional filters.
- **Risk Badge:** Instant visual warning pill (`Low Risk` / `Severe Alert`).
- **Quick Actions:** Instant triggers for Alert Center Drawer and Synoptic Refresh.
- **Ergonomics:** Positioned directly in the thumb reach zone (bottom 25% of viewport).

---

## 4. Component Reflow Matrix

| Component | Desktop (`>1024px`) | Tablet (`640px–1024px`) | Mobile (`<640px`) |
| :--- | :--- | :--- | :--- |
| **`TopBar`** | Full branding, time in IST, station badge, engine status, alert bell, health button | Compact branding, station badge, alert bell | Minimal lockup, alert bell with badge, engine status dot |
| **`NavRail`** | Fixed left rail `w-[88px]`, icon + 2-line label | Fixed left rail `w-16`, icon-only with $48\text{px}$ touch pads | Hidden; replaced by Docked Thumb Bar + Top Drawer |
| **`ForecastHero`** | Wide 12-col layout; secondary telemetry side-by-side | 2-column compact card; touchable lead day pills | Stacked single card; full-width segmented control; full-width 44px CTA |
| **`ForecastTimeline`**| 3-column side-by-side cards (Days 1, 2, 3) | 2-column wrap or swipe deck | 1-card-per-view horizontal snap carousel with pagination dots |
| **`ModelComparison`** | 4-column model matrix | 2×2 touch grid | Horizontal swipe deck with model cards side-by-side |
| **`RegionSelector`** | Fixed 5-col vertical card with station list | Right-column card, 48px station items | Horizontal quick-pill strip on page + Bottom-Sheet Picker |
| **`WeatherMap`** | 480px interactive canvas | 360px canvas, touch zoom controls | 280px canvas with tap-to-activate touch guard |

---

## 5. Codification in Project Contracts

### 5.1 Update to `AGENTS.md` (Under `## UI / UX`)
Add mandatory multi-device rule requiring all future frontend changes to design for Mobile, Tablet, and Desktop simultaneously, forbidding pure element resizing, mandating anti-scroll architecture, and enforcing touch/swipe vs. cursor ergonomics.

### 5.2 Update to `DESIGN.md` (Section 9: Responsive & Multi-Device System)
Replace the basic 3-row breakpoint table with full design system specifications:
- 9.1 Tri-Modal Device Hierarchy
- 9.2 Anti-Scroll & Horizontal Snap Carousels
- 9.3 Input Modality Specifications (Touch vs. Pointer)
- 9.4 Map & Canvas Gesture Isolation
- 9.5 Docked Thumb Command Bar

---

## 6. Verification & Quality Gates

1. **Automated Verification:**
   - `npx tsc --noEmit` must pass with 0 errors.
   - `npm run build` must compile clean production bundles.
2. **Visual & Device Verification:**
   - Mobile Viewport ($375\times 667\text{px}$, $390\times 844\text{px}$): Verify zero horizontal overflow, thumb bar docked at bottom, horizontal swipe snap on timeline and models, map scroll pass-through active.
   - Tablet Viewport ($768\times 1024\text{px}$, $820\times 1180\text{px}$): Verify 64px icon touch rail, 2-column balanced grid, $48\times 48\text{px}$ tap targets.
   - Desktop Viewport ($1440\times 900\text{px}$, $1920\times 1080\text{px}$): Verify 88px nav rail, 12-column grid, cursor tooltips.

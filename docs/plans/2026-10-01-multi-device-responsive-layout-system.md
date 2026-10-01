# Multi-Device Responsive Layout System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a Tri-Modal Responsive Layout System for Mobile Phone (<640px), Tablet (640px–1024px), and Desktop (>1024px) across Prakruti with horizontal snap decks, anti-scroll mechanics, touch gesture isolation, a docked thumb command bar, and codify these rules into `AGENTS.md` and `DESIGN.md`.

**Architecture:** A device-adaptive layout architecture replacing rigid box-resizing with distinct structural shifts: a 1-column thumb stack with horizontal snap carousels and docked bottom controls on mobile, a balanced 2-column touch grid with 64px icon rail on tablet, and a 12-column analytical dashboard on desktop. Touch inputs receive $\ge 44\text{px}$ targets, map scroll pass-through protection, and zero hover-only dependencies.

**Tech Stack:** Next.js 15 (App Router, Turbopack), React 19, Tailwind CSS v4, Lucide React, Leaflet / React Leaflet.

---

### Task 1: Codify Multi-Device Responsive Rules into `AGENTS.md` and `DESIGN.md`

**Files:**
- Modify: `AGENTS.md:60-75`
- Modify: `DESIGN.md:496-538`

- [ ] **Step 1: Update `AGENTS.md` with the mandatory multi-device rule**

Under `## UI / UX`, add:
```markdown
- **Mandatory Multi-Device Architecture (Mobile, Tablet, PC):** Whenever there is ANY frontend-related task — building components, modifying layouts, styling, pages, interactions, or UI/UX — you MUST ALWAYS design and implement for ALL devices simultaneously:
  1. **Different Layouts, Not Just Resizing:** Never merely squeeze or scale down desktop boxes. Shift the layout structure deliberately between 1-column thumb stacks (mobile `<640px`), balanced 2-column touch grids (tablet `640px–1024px`), and 12-column precision analytical dashboards (desktop `>1024px`).
  2. **Zero Endless Scrolling:** Never force users into infinite vertical scrolling on mobile or tablet. Reflow tall tabular data and multi-card panels into horizontal snap carousels (`scroll-snap-x`), docked thumb bars, and quick-access sheets so critical actions (e.g. station switcher, hazards) are immediately reachable within 1–2 screen heights.
  3. **Input Modality Awareness (Touch/Swipe vs. Cursor):** Respect physical input modes:
     - **Mobile & Tablet:** Touch gestures, horizontal swipe decks, $\ge 44\times 44\text{px}$ touch targets, zero hover-only dependencies, map gesture isolation (anti-trap), and instant `:active` tactile feedback.
     - **PC / Laptop:** Precision cursor tracking, hover tooltips, fine scrubbers, keyboard navigation, and high information density.
```

- [ ] **Step 2: Update `DESIGN.md` Section 9 (Responsive & Multi-Device System)**

Replace Section 9 with:
- `9.1 Tri-Modal Device Hierarchy (Phone, Tablet, Desktop)`
- `9.2 Anti-Scroll Architecture & Snap Carousels`
- `9.3 Input Modality Discipline (Coarse Touch vs Fine Cursor)`
- `9.4 Map & Canvas Gesture Isolation`
- `9.5 Docked Thumb Command Bar & Safe Areas`

- [ ] **Step 3: Commit documentation updates**

```bash
git add AGENTS.md DESIGN.md
git commit -m "docs(design): codify multi-device responsive architecture, anti-scroll, and touch rules"
```

---

### Task 2: Responsive CSS Primitives & Snap Carousel Utilities in `globals.css`

**Files:**
- Modify: `frontend/src/app/globals.css:260-310`

- [ ] **Step 1: Add horizontal snap carousel and touch-safe CSS utilities**

Add utility classes to `frontend/src/app/globals.css`:
```css
/* Responsive Snap Carousel Deck */
.carousel-snap-deck {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  scrollbar-width: none;
}
.carousel-snap-deck::-webkit-scrollbar {
  display: none;
}

.carousel-snap-item {
  scroll-snap-align: center;
  flex-shrink: 0;
}

/* Touch-Safe Hit Target (WCAG AAA / Apple HIG) */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}
```

- [ ] **Step 2: Verify CSS builds cleanly**

Run: `cd frontend && npm run build`
Expected: Compile success without CSS syntax errors.

- [ ] **Step 3: Commit CSS utilities**

```bash
git add frontend/src/app/globals.css
git commit -m "feat(css): add responsive snap carousel and touch-target utilities"
```

---

### Task 3: Tri-Modal Navigation Shell (`TopBar.tsx`, `NavRailView.tsx`, `DockedThumbBar.tsx`)

**Files:**
- Create: `frontend/src/components/shell/DockedThumbBar.tsx`
- Modify: `frontend/src/components/shell/NavRailView.tsx:1-68`
- Modify: `frontend/src/components/shell/TopBar.tsx:20-89`

- [ ] **Step 1: Create `DockedThumbBar.tsx` for mobile viewports (`<640px`)**

Component provides:
1. Thumb-accessible Active Station chip with tap-to-open bottom sheet / picker.
2. Synoptic Risk Status badge (`KANPUR · LOW RISK`).
3. Quick actions: Alerts bell and Synoptic Refresh.
4. Anchored at `fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border`.
5. Padding respecting `env(safe-area-inset-bottom)`.

- [ ] **Step 2: Update `NavRailView.tsx` for tablet and desktop reflow**

Refactor `NavRailView.tsx`:
- Desktop (`lg:flex`, `>1024px`): `w-[88px]`, full labels + subtitles.
- Tablet (`md:flex lg:hidden`, `640px-1024px`): compact `w-16` icon-only rail with $48\text{px}$ touch targets.
- Mobile (`<640px`): hidden from side; navigation handled via top horizontal bar and docked thumb bar.

- [ ] **Step 3: Update `TopBar.tsx` with responsive layout adaptation**

Ensure `TopBar.tsx`:
- Mobile: Condenses title, removes non-essential text timestamps, maintains Mor mark and alert bell.
- Tablet/Desktop: Shows full station badge and IST clock.

- [ ] **Step 4: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit shell components**

```bash
git add frontend/src/components/shell/
git commit -m "feat(ui): implement tri-modal navigation shell with docked mobile thumb bar"
```

---

### Task 4: Anti-Scroll Horizontal Snap Decks for Overview (`ForecastTimeline.tsx`, `ModelComparison.tsx`)

**Files:**
- Modify: `frontend/src/components/ForecastTimeline.tsx:1-200`
- Modify: `frontend/src/components/ModelComparison.tsx:1-200`

- [ ] **Step 1: Refactor `ForecastTimeline.tsx` to support horizontal snap carousel on mobile/tablet**

- Desktop (`lg:grid-cols-3`): Side-by-side cards for Day 1, Day 2, Day 3.
- Mobile/Tablet (`<1024px`): Reflow into `.carousel-snap-deck` with cards sized `w-[88vw] sm:w-[340px] shrink-0 carousel-snap-item`.
- Include visual dot pagination indicators (`• ◦ ◦`) beneath the deck so touch users see current slide and can tap to jump.

- [ ] **Step 2: Refactor `ModelComparison.tsx` to support horizontal snap deck on mobile/tablet**

- Desktop: 4-model comparison table or grid.
- Mobile/Tablet: Horizontal snap deck (`w-[82vw] sm:w-[300px] shrink-0`) allowing seamless swipe between ECMWF, GFS, ICON, and GEM cards.

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit snap carousel components**

```bash
git add frontend/src/components/ForecastTimeline.tsx frontend/src/components/ModelComparison.tsx
git commit -m "feat(ui): reflow timeline and model comparison into horizontal snap decks on mobile"
```

---

### Task 5: Weather Map Gesture Isolation & Mobile Station Ribbon

**Files:**
- Modify: `frontend/src/components/WeatherMap.tsx:1-250`
- Modify: `frontend/src/components/RegionSelector.tsx:1-250`

- [ ] **Step 1: Add gesture isolation overlay to `WeatherMap.tsx`**

- On touch devices, render a subtle translucent scroll-protection overlay.
- Single-finger touches on the overlay pass vertical page scrolling through safely.
- Provide a clear button: `"Tap to explore map"`, unlocking interactive pan/zoom.
- When active, show `"Done scrolling"` lock button to resume page scroll pass-through.
- Two-finger touches always pan the map directly.

- [ ] **Step 2: Add quick horizontal station pill ribbon to `RegionSelector.tsx`**

- On mobile viewports (`<640px`), render a compact, horizontal scrollable station ribbon at the top of the selector so top-tier stations (`Kanpur`, `Delhi`, `Mumbai`, `Bengaluru`, `Kolkata`) can be selected in 1 tap without vertical scrolling.

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit gesture isolation and station ribbon**

```bash
git add frontend/src/components/WeatherMap.tsx frontend/src/components/RegionSelector.tsx
git commit -m "feat(ui): add map scroll pass-through protection and quick station ribbon"
```

---

### Task 6: Main Shell & Page Integration (`frontend/src/app/page.tsx`)

**Files:**
- Modify: `frontend/src/app/page.tsx:50-125`

- [ ] **Step 1: Wire `DockedThumbBar` and reflow grid layouts in `page.tsx`**

- Integrate `<DockedThumbBar>` for mobile screens.
- Refactor the main content grid:
  - Mobile (`<640px`): `space-y-4 px-3 pt-18 pb-28`.
  - Tablet (`640px-1024px`): 2-column balanced grid (`md:grid-cols-12 md:pl-20 md:pr-4 md:pt-20`).
  - Desktop (`>1024px`): 12-column grid (`lg:grid-cols-12 lg:pl-[112px] lg:pr-6 lg:pt-24`).
- Add station selection modal / sheet triggered from `DockedThumbBar`.

- [ ] **Step 2: Verify full build**

Run: `cd frontend && npm run build`
Expected: 5/5 static pages prerendered successfully with 0 errors.

- [ ] **Step 3: Commit page integration**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat(ui): integrate tri-modal layout grid and docked thumb bar in main page"
```

---

### Task 7: Production Build, Deployment & Live Verification

**Files:**
- Verification only

- [ ] **Step 1: Run TypeScript validation**

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 2: Push changes to GitHub `main`**

```bash
git push origin main
```

- [ ] **Step 3: Deploy to Vercel production from repository root**

```bash
vercel --prod --yes --archive=tgz
```

- [ ] **Step 4: Verify production deployment**

Run: `curl -s -o /dev/null -w "%{http_code}\n" https://prakruti-ten.vercel.app`
Expected: 200 OK.

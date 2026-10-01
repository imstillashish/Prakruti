# Desktop & Tablet Layout Recomposition — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the duplicated-content and dead-space defects on desktop and tablet, then recompose Overview, Model Intelligence and Performance so both tiers land inside the scroll budgets in `DESIGN.md` §9.6.

**Architecture:** One CSS cascade fix carries most of the visible payoff — moving the carousel utilities into `@layer components` restores every breakpoint variant that is currently being overridden. The remaining work is composition, not new components: cells size to content, repeated-item panels use auto-fit tracks, and Performance stops stacking five full-width cards.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind v4 (`@import "tailwindcss"` + `@layer`), Radix primitives already installed, Leaflet. No new dependency.

**Spec:** `docs/specs/2026-10-01-desktop-tablet-layout-recomposition-design.md`

**Status:** Executed 2026-10-01. The measured outcome lives in `docs/specs/2026-10-01-multi-device-refit-plan.md` §1.0; the steps below stay unchecked because they read as the procedure, not as a progress record.

---

## Why there are no unit tests here

This codebase has no JS test runner (`frontend/package.json` ships `dev`, `build`, `start`, `lint` only), and the defects are computed-layout faults — a unit test cannot see them. The TDD loop for this plan is **measure → fix → measure** against the browser harness below, with numeric expectations per task. Adding a test framework for this pass would be new scaffolding the project does not use (`AGENTS.md`, Ponytail YAGNI).

## Verification harness (used by every task)

Save as `.planning/audit/layout-metrics.js` — gitignored scratch instrumentation (`.planning/` is the project's memory area; this is not shipped code). Paste the function body into the Playwright MCP `browser_evaluate` call after resizing to the viewport under test.

```js
async () => {
  const doc = document.documentElement;
  const tier = window.innerWidth >= 1024 ? 'Desktop' : window.innerWidth >= 640 ? 'Tablet' : 'Mobile';
  const nav = [...document.querySelectorAll('nav')].find(n => (n.getAttribute('aria-label') || '').includes(tier));
  const out = [];
  for (const btn of [...nav.querySelectorAll('button')]) {
    btn.click();
    await new Promise(r => setTimeout(r, 1100));
    const main = document.querySelector('main');
    const f = {
      page: (btn.textContent || btn.title || '').replace(/\s+/g, ' ').trim().slice(0, 22),
      screens: +(doc.scrollHeight / window.innerHeight).toFixed(2),
      overflowX: doc.scrollWidth - doc.clientWidth,
      voidPx: [], orphans: [], clipped: [], decks: [],
    };
    document.querySelectorAll('main [class*=grid]').forEach(g => {
      const cs = getComputedStyle(g);
      if (cs.display !== 'grid') return;
      const cols = cs.gridTemplateColumns.split(' ').filter(Boolean).length;
      const kids = [...g.children].filter(k => k.getBoundingClientRect().height > 120);
      if (kids.length > cols && kids.length % cols !== 0) f.orphans.push(kids.length + '/' + cols);
      kids.forEach(k => {
        const kr = k.getBoundingClientRect();
        const desc = [...k.querySelectorAll('*')].filter(e => e.getBoundingClientRect().height > 0);
        if (!desc.length) return;
        const last = desc.reduce((a, b) => a.getBoundingClientRect().bottom > b.getBoundingClientRect().bottom ? a : b);
        const v = Math.round(kr.bottom - last.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(k).paddingBottom) || 0));
        if (v > 90) f.voidPx.push(v);
      });
    });
    document.querySelectorAll('main *').forEach(el => {
      if (el.children.length) return;
      const cs = getComputedStyle(el);
      if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2 && (cs.overflow === 'hidden' || cs.textOverflow === 'ellipsis'))
        f.clipped.push(el.textContent.replace(/\s+/g, ' ').trim().slice(0, 18));
    });
    f.decks = [...main.querySelectorAll('.carousel-snap-deck')]
      .filter(d => d.getBoundingClientRect().width > 0)
      .map(d => Math.round(d.getBoundingClientRect().width));
    out.push(f);
  }
  return JSON.stringify(out);
}
```

Budgets: phone 390×844 ≤3.0 screens (post-refit baseline), tablet 768×1024 ≤3.0, desktop 1440×900 ≤3.6. Zero overflow, zero voids >90px, zero clipped labels, and `decks.length` must never report two blown-up advice decks on one page.

## Files touched

| File | Responsibility after the change |
|---|---|
| `frontend/src/app/globals.css` | Deck utilities layered so breakpoint variants win |
| `frontend/src/components/ForecastHero/index.tsx` | Metric cell distributes its height instead of trailing dead space |
| `frontend/src/components/ModelComparison/index.tsx` | Model strip uses auto-fit tracks; no orphan cell, no truncated names |
| `frontend/src/components/pages/ModelIntelligencePage.tsx` | Paired panels size to content |
| `frontend/src/components/pages/ModelPerformancePage.tsx` | Paired rows replace the five-card stack |
| `frontend/src/components/shell/Panel.tsx` | Gains a tablet collapse flag beside the phone one |
| `frontend/src/components/PerformanceMatrix3D/index.tsx` | Matrix collapses on tablet |
| `docs/specs/2026-10-01-multi-device-refit-plan.md` | New measured baseline replaces §1.0 |

---

### Task 1: Layer the deck utilities (root-cause fix)

**Files:**
- Modify: `frontend/src/app/globals.css:361-380`

- [ ] **Step 1: Measure the defect (red)**

Resize to 1440×900, run the harness, confirm Overview reports two advice decks and `clipped` contains `ECMWF` / `GFS`.

Expected: `decks: [507, 717, 0]` on Overview, `clipped` non-empty.

- [ ] **Step 2: Wrap the utilities in a layer**

Replace the block that starts with `/* Responsive Snap Carousel Deck (Mobile / Tablet Horizontal Flow) */` with:

```css
/* Snap deck utilities. Must stay inside @layer components: unlayered rules
   outrank Tailwind's @layer utilities, which silently kills every
   breakpoint variant (sm:hidden, lg:grid) on any element using these. */
@layer components {
  .carousel-snap-deck {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  }

  .carousel-snap-deck::-webkit-scrollbar {
    display: none;
  }

  .carousel-snap-item {
    scroll-snap-align: center;
    flex-shrink: 0;
  }
}
```

- [ ] **Step 3: Typecheck and build**

Run: `cd frontend && npx tsc --noEmit && npx next build`
Expected: no output from `tsc`; `next build` ends with `✓ Compiled successfully`.

- [ ] **Step 4: Restart the preview and re-measure desktop**

Kill the listener on :3000, relaunch with the run doc's detach recipe, then re-run the harness at 1440×900.

Expected: Overview `decks` reports a single advice deck at `lg` width (or none, because the desktop branch is now a real 3-up grid) — **not** two. `clipped` empty for `ECMWF`/`GFS`.

- [ ] **Step 5: Re-measure tablet**

At 768×1024: Overview and Forecast must report one advice row each, and `clipped` must be empty.

- [ ] **Step 6: Confirm the phone decks still behave**

At 390×844: Overview advice deck still renders (~86vw cards, one per view) and scrolls horizontally; no layout shift on `ForecastTimeline` or `ModelComparison` decks.

- [ ] **Step 7: Commit (only if the owner asked for commits)**

The tree already carries uncommitted work from the refit pass, so scope the staging to this file:

```bash
git add frontend/src/app/globals.css
git commit -m "fix(css): layer snap-deck utilities so breakpoint variants apply"
```

---

### Task 2: Hero cells distribute, model strip auto-fits

**Files:**
- Modify: `frontend/src/components/ForecastHero/index.tsx:150-225` (MetricCell) and `:414`
- Modify: `frontend/src/components/ModelComparison/index.tsx:195`

- [ ] **Step 1: Distribute the metric cell height**

In `MetricCell`, change the wrapper and the sparkline block:

```tsx
// wrapper — was: <div className="p-4 sm:p-5 bg-card min-w-0">
<div className="p-4 sm:p-5 bg-card min-w-0 h-full flex flex-col">
```

```tsx
// sparkline — was: <div className="mt-2 hidden sm:block">
<div className="mt-2 sm:mt-auto hidden sm:block">
```

The cell keeps its label and value at the top and anchors the sparkline and caption to the bottom edge, so the height a stretched row hands it is used rather than trailing.

- [ ] **Step 2: Re-measure the hero**

At 1440×900 on Overview: expect `voidPx: []` (was four cells at 139–159px) and Forecast likewise.

- [ ] **Step 3: Auto-fit the model strip**

In `ModelComparison`, replace the desktop grid:

```tsx
// was: <div className="grid grid-cols-5 gap-2.5 mt-4 pt-3 border-t border-border">
<div className="grid gap-2.5 mt-4 pt-3 border-t border-border [grid-template-columns:repeat(auto-fit,minmax(9rem,1fr))]">
```

Six models now take six tracks where width allows and fewer where it does not — the orphan cell disappears and names keep their measure.

- [ ] **Step 4: Re-measure**

At 1440×900: Overview and Model Intelligence report `orphans: []` and `clipped: []`.

- [ ] **Step 5: Commit (only if the owner asked for commits)**

```bash
git add frontend/src/components/ForecastHero/index.tsx frontend/src/components/ModelComparison/index.tsx
git commit -m "fix(ui): distribute hero metric height and auto-fit the model strip"
```

---

### Task 3: Model Intelligence sizes cells to content

**Files:**
- Modify: `frontend/src/components/pages/ModelIntelligencePage.tsx:44-48`

- [ ] **Step 1: Stop the pair from stretching**

```tsx
// was: <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
```

`ModelContribution` was inheriting `ModelComparison`'s height — the 299px void measured on desktop. Ragged card bottoms are the correct result here: each panel is as tall as its own content.

- [ ] **Step 2: Re-measure**

At 1440×900 on Model Intelligence: `voidPx: []` (was 299), `screens` unchanged or lower.

- [ ] **Step 3: Compose the two cards deliberately**

The pair is now unequal by content, which is honest but visually loose at `md`. Give the shorter card the narrower track so the ragged edge reads as intentional:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
  <div className="lg:col-span-5"><ModelContribution collapsibleOnPhone /></div>
  <div className="lg:col-span-7"><ModelComparison collapsibleOnPhone /></div>
</div>
```

Tablet keeps the plain two-column split — a 12-track split at 768px would leave the weight rows under 300px wide, which is worse than unequal card heights.

- [ ] **Step 4: Re-measure at tablet and desktop**

768×1024 and 1440×900: `voidPx: []`, `orphans: []`, `clipped: []`, and Model Intelligence `screens` ≤2.5.

- [ ] **Step 5: Commit (only if the owner asked for commits)**

```bash
git add frontend/src/components/pages/ModelIntelligencePage.tsx
git commit -m "fix(ui): size model intelligence panels to their content"
```

---

### Task 4: Performance — pair rows instead of a five-card stack

**Files:**
- Modify: `frontend/src/components/pages/ModelPerformancePage.tsx:38-110`
- Modify: `frontend/src/components/shell/Panel.tsx`
- Modify: `frontend/src/components/PerformanceMatrix3D/index.tsx:362`

- [ ] **Step 1: Pair what is equal**

Wrap Model skill and the historical table in one row. The table panel moves out of the tail of the page (exact JSX — replace the existing `<ModelSkillPanel />` line and the trailing `<Panel title="Historical skill scores (RMSE mm)" …>` block):

```tsx
{/* Equal-weight summaries pair; 374 + 292 stacked became one ~380px row.
    Paired at lg only: the history table carries six columns and needs ~500px. */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
  <ModelSkillPanel />

  <Panel
    title="Historical skill scores (RMSE mm)"
    subtitle="Validation results by period — the blend column is ours"
    term="skillScore"
  >
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono border-collapse">
        {/* table markup unchanged — moved verbatim from the page tail */}
      </table>
    </div>
    <p className="text-[11px] font-mono text-muted-foreground mt-3">
      Evaluated against 61-day ERA5 reanalysis dataset. Lower RMSE indicates superior accuracy.
    </p>
  </Panel>
</div>
```

- [ ] **Step 2: Pair what is tall (desktop only)**

Verification and calibration go side by side at `xl` and stay stacked below it — the calibration panel needs the width:

```tsx
<div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
  <ModelVerification />
  <ModelCalibration />
</div>
```

Delete the two original comment lines (`{/* F-02.C: historical truth verification */}`, `{/* F-02.B: raw vs calibrated diagnostics */}`) along with the blocks they label.

- [ ] **Step 3: Let Panel collapse on tablet**

In `Panel.tsx`, extend the existing phone collapse rather than inventing a second mechanism:

```tsx
export function Panel({ title, subtitle, term, actions, children, className, bodyClassName, collapsibleOnPhone, collapsibleOnTablet }: {
  title: string; subtitle?: string; term?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string;
  collapsibleOnPhone?: boolean;
  collapsibleOnTablet?: boolean;
}) {
  const [phoneOpen, setPhoneOpen] = useState(false);
  const collapsible = collapsibleOnPhone || collapsibleOnTablet;
  const collapsed = collapsible && !phoneOpen;
  const hideBelow = collapsibleOnTablet ? 'lg' : 'sm';
```

and in the header button plus body wrapper use the computed breakpoint:

```tsx
          {collapsible && (
            <button
              type="button"
              onClick={() => setPhoneOpen((v) => !v)}
              aria-expanded={phoneOpen}
              aria-label={`Toggle ${title} details`}
              className={`${hideBelow}:hidden flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground active:scale-95 transition-all touch-manipulation`}
            >
              <ChevronDown size={18} className={`transition-transform ${phoneOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
```

```tsx
      <div className={`${bodyClassName ?? 'p-4'} ${collapsed ? `hidden ${hideBelow}:block` : ''}`}>{children}</div>
```

Tailwind cannot see interpolated class names, so both breakpoint strings must exist literally in the file. Write the button class as a ternary over the two full strings:

```tsx
              className={`${hideBelow === 'lg' ? 'lg:hidden' : 'sm:hidden'} flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground active:scale-95 transition-all touch-manipulation`}
```

and the body wrapper as:

```tsx
      <div className={`${bodyClassName ?? 'p-4'} ${collapsed ? 'hidden ' + (hideBelow === 'lg' ? 'lg:block' : 'sm:block') : ''}`}>{children}</div>
```

- [ ] **Step 4: Collapse the matrix on tablet**

In `PerformanceMatrix3D`, add the tablet flag beside the phone one:

```tsx
      collapsibleOnPhone
      collapsibleOnTablet
```

The 3D explorer is supplementary to the flat calibration table, and it is the single tallest panel on the page at tablet width.

- [ ] **Step 5: Typecheck and build**

Run: `cd frontend && npx tsc --noEmit && npx next build`
Expected: clean `tsc`, `✓ Compiled successfully`.

- [ ] **Step 6: Re-measure Performance**

Restart the preview, then at 1440×900 expect Performance `screens` ≈2.2 (was 3.92) — the pair rows carry that. At 768×1024 expect ≤3.0 (was 3.54); the tablet savings come from the matrix collapse (~0.6 screens), not from the pair rows. At 390×844 confirm the page stays where it was (≈2.28) and the tablet collapse is not active.

- [ ] **Step 7: Commit (only if the owner asked for commits)**

```bash
git add frontend/src/components/pages/ModelPerformancePage.tsx frontend/src/components/shell/Panel.tsx frontend/src/components/PerformanceMatrix3D/index.tsx
git commit -m "feat(ui): recompose model performance into paired analytical rows"
```

---

### Task 5: Full audit, then record the baseline

**Files:**
- Modify: `docs/specs/2026-10-01-multi-device-refit-plan.md` §1.0
- Modify: `docs/specs/2026-10-01-desktop-tablet-layout-recomposition-design.md` (status line)

- [ ] **Step 1: Walk all three tiers**

Run the harness at 390×844, 768×1024 and 1440×900 over all eight sections.

Gate per section: phone/tablet ≤3.0 screens, desktop ≤3.6, `overflowX` 0, `voidPx` empty, `clipped` empty, `orphans` empty.

- [ ] **Step 2: Handle the expected residual honestly**

Overview and Forecast were 3.58/3.43 on phone before this pass and phone is untouched, so they stay over. Record the shortfall with its cause (map + interactive 72h chart kept inline) rather than trimming primary content to hit a number.

- [ ] **Step 3: Replace §1.0's table with the new numbers**

Replace, don't append — the refit plan's §1 exists to state the current measured state.

- [ ] **Step 4: Mark the spec implemented**

Set the recomposition spec's status line to `Implemented <date>, see docs/plans/2026-10-01-desktop-tablet-layout-recomposition.md`.

- [ ] **Step 5: Commit (only if the owner asked for commits)**

```bash
git add docs/specs/2026-10-01-multi-device-refit-plan.md docs/specs/2026-10-01-desktop-tablet-layout-recomposition-design.md
git commit -m "docs: record post-recomposition measured baseline"
```

---

## Layering scope note

Only the deck utilities move into `@layer components`. The other unlayered classes in `globals.css` (`.touch-target`, `.map-touch-guard`, `.map-touch-overlay`, `.hero-sky`) do not currently fight any breakpoint variant, and `.map-touch-guard.locked`'s `pointer-events` rule is deliberate. Layering them would change map interaction behavior to fix nothing (`AGENTS.md`: Ponytail YAGNI). If a future panel needs a variant on one of them, layer that class then.

## Self-review notes

- **Spec coverage:** cascade fix (Task 1 = §3.2 rule 1), content-sized cells (Tasks 2–3 = rule 2), auto-fit tracks (Task 2 = rule 3), tablet collapse + paired rows (Task 4 = §4.3), baseline recording (Task 5). The spec's §4.2 regional-dominance table is **dropped**: measurement showed no orphan, void or truncation there — cards already fit three-up and the page sits at 2.44 screens. Rewriting working content into a table would be churn, not a fix. The spec's §4.1 Overview workspace reshuffle is likewise deferred: Overview is 0.04 screens over budget and Tasks 1–2 remove height from the same hero, so the reshuffle is only justified if the numbers still miss after Task 2.
- **Placeholder scan:** the only elided block is the historical-skill table markup, which moves verbatim and is shown as a comment marker with its surrounding JSX intact.
- **Consistency:** `collapsibleOnPhone` and the new `collapsibleOnTablet` share one state variable and one computed breakpoint; no task renames an existing prop, so the ten call sites already passing `collapsibleOnPhone` keep working unchanged.

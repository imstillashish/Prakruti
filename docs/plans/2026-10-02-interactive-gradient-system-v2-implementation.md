# Interactive Gradient System v2 — Implementation Plan

**Spec:** `docs/specs/2026-10-02-interactive-gradient-system-design.md` (approved 2026-10-02)
**Branch:** `feat/color-system-v4` (continues from the v4 work; do not start on `main`)
**Shape:** eight tasks, harness first. Task 1 writes the checks and runs them red against today's
code, so every later task turns a failing assertion green rather than an opinion.

**Harness policy (binding):** the scripts under `scratch/` are per-machine and gitignored
(`.gitignore:47`; the branch history was rewritten on 2026-10-02 to purge them). They are run
locally and **never committed** — no task stages a `scratch/` path, and their red/green output is
the evidence recorded in the ledger instead.

**Coordination rule (binding for every task):** another agent is working the same checkout. Before
touching a file, run `git status --porcelain <file>`; if it is dirty, that file belongs to them —
leave the hunk, record the skip in the ledger, and continue with the rest of the task. Never stage a
file you did not write in full.

---

## Task 1: Gradient harness (fails loudly on today's code)

**Files:**
- Modify: `scratch/palette_audit.py` (add the six assertions from spec §8, plus a
  `prefers-reduced-motion` context pass)
- Create: `scratch/mesh_budget.py` (phone frame-timing probe for Task 7)

**Interfaces:**
- Consumes: the existing audit's page walk (`PAGES`, `VIEWPORTS`, `PROBE`, `check_section`).
- Produces: `COLOURWAYS = {"ocean", "emerald", "amber", "neutral"}`, a `colorway` field on every
  probed element, and a `reduced` pass that re-visits one page per viewport with
  `context(reduced_motion="reduce")`.

- [ ] **Step 1: Add the gradient assertions**
  1. colourway ∈ sanctioned set; `gradient-animated-ink|indigo` appear nowhere.
  2. An element carrying an animated gradient must also be active: `aria-selected=true`,
     `aria-current`, `data-state=active|checked`, `aria-pressed=true`, or marked
     `data-gradient-tier="focal|primary"`.
  3. White label on a Tier 1/2 control ≥ 4.5:1 against its computed `background-color`.
  4. Canvas count ≤ 1 per page and only inside `[data-gradient-tier="focal"]`.
  5. Reduced-motion pass: no element resolves `animation-name: gradient-flow`.
- [ ] **Step 2: Extend the probe** to read `background-color`, `background-image`, `animation-name`
  and the four state attributes per element, and to expose them on `texts` and a new `gradients`
  collection.
- [ ] **Step 3: Run both scripts — expected FAIL**, with today's state listed: 0 sanctioned
  colorways in use, 1 live mesh consumer, and `gradient-animated-ink|indigo` utilities present in
  the stylesheet.
- [ ] **Step 4: Record the red run** in the ledger (no commit — the harness is untracked by policy)

---

## Task 2: Colorway tokens and the two-layer fill

**Files:**
- Modify: `frontend/src/app/globals.css` (the `gradient-animated-*` block, lines 318–380, and the
  reduced-motion list)
- Modify: `frontend/src/lib/palette.ts` (`SHADER_FILL` gains a `deep` entry per colorway)
- Modify: `frontend/src/components/ui/ShaderButton.tsx` (stops read the corrected values)

**Interfaces:**
- Consumes: nothing from the v4 colour work beyond `palette.ts`.
- Produces: four self-contained utilities — `.gradient-animated-{ocean,emerald,amber,neutral}` —
  each setting a deep `background-color` plus a **translucent** animated overlay, so text contrast
  is a property of the deep base (spec §3.2) rather than of whichever stop sits under the label.

- [ ] **Step 1: Rewrite the utilities to the two-layer recipe**

```css
.gradient-animated-ocean {
  background-color: #0d74ce;                 /* deep base — text is measured against this */
  background-image: linear-gradient(135deg,
    rgba(30, 111, 184, 0.90), rgba(13, 116, 206, 0.55), rgba(56, 189, 248, 0.40));
  background-size: 250% 250%;
  animation: gradient-flow 6s ease infinite;
  color: #ffffff;
}
```

Emerald deep `#047857`, amber deep `#b45309`, plus the new **neutral** (deep `#33373e`, overlay from
the retired ink stops `#171717`/`#9ca3af`). Delete `.gradient-animated-indigo` and
`.gradient-animated-ink`; update the reduced-motion list to the four surviving names. Drop the glow
`box-shadow` — `impeccable`'s restraint rule, and it is the one property here that paints outside the
control.

- [ ] **Step 2: Mirror the values in `palette.ts`** — `SHADER_FILL.<colorway>` becomes
  `{ deep, stops }`, and `ShaderButton` reads `deep` for the fallback fill.
- [ ] **Step 3: Measure, do not assume** — run `scratch/palette_audit.py`; assertion 3 is
  authoritative. If a colorway fails, lower its overlay alphas; never lighten the deep base.
- [ ] **Step 4: Commit** `feat(design): deep-base gradient colorways with a neutral for toggles`

---

## Task 3: A gradient variant for the shared primitives

**Files:**
- Modify: `frontend/src/components/ui/button.tsx` (opt-in `gradient` variant, ocean by default)
- Modify: `frontend/src/components/ui/switch.tsx` (checked state → neutral mesh)
- Modify: `frontend/src/components/ui/tabs.tsx` (active trigger → ocean mesh, replacing the grey wash)

**Interfaces:**
- Consumes: the utilities from Task 2.
- Produces: `<Button variant="gradient" />` for page-primary actions, and primitives whose active
  state carries the mesh, so call sites stop hand-writing gradient class strings.

- [ ] **Step 1: `button.tsx`** — add the variant beside `default`; `default` stays the flat accent
  fill (spec §4: hierarchy). Only page-primary actions opt in.
- [ ] **Step 2: `switch.tsx`** — `data-[state=checked]:bg-action` becomes the neutral mesh. The
  primitive has one live consumer in a vendor block; the change is for the pattern, not the page.
- [ ] **Step 3: `tabs.tsx`** — active trigger moves from the grey `bg-accent` wash to
  `gradient-animated-ocean`, white label.
- [ ] **Step 4: Verify** `npx tsc --noEmit && npx eslint src/components/ui` → clean.
- [ ] **Step 5: Commit** `feat(design): gradient variant and animated active states in the primitives`

---

## Task 4: Selection surfaces take the ocean mesh

**Files:**
- Modify: `frontend/src/components/shell/NavRailView.tsx:39,117,144`, `shell/DockedThumbBar.tsx`
- Modify: `frontend/src/components/WeatherMap/index.tsx:55` (lead-time chips)
- Modify: `frontend/src/components/RegionSelector/index.tsx` (mobile station ribbon + selector chips)
- Modify: `frontend/src/components/spectrumui/data-table.tsx:480,1583` (row filters, selected rows)
- Modify: `frontend/src/components/spectrumui/charts/chart-engine.tsx:442`,
  `charts/chart-states.tsx:119` (chart toggles)

**Interfaces:**
- Consumes: `gradient-animated-ocean`, `data-gradient-tier="primary"` on the element's own action.
- Produces: every active/selected control animates; inactive controls stay flat neutral.

- [ ] **Step 1: Apply the mesh only to the active branch** of each conditional — the inactive
  branch keeps its neutral surface. No blanket class on the control group.
- [ ] **Step 2: Run the audit** — assertions 1, 2 and 3 must pass on these surfaces.
- [ ] **Step 3: Commit** `feat(design): animate the selection surfaces on the ocean colorway`

---

## Task 5: Role actions — verify in emerald, hazard in amber

**Files:**
- Modify: `frontend/src/components/pages/RpiPage.tsx:141` (Refresh Index), plus any recalculate /
  accept-weights control
- Modify: `frontend/src/components/RPI/ResourceRecommendation.tsx:165` (`ShaderButton` gains
  `variant="amber"`), `RPI/StationDossier.tsx:377` (protocol toggle → amber)

**Interfaces:**
- Consumes: Task 2's emerald and amber utilities, Task 3's `variant="gradient"`.
- Produces: exactly two non-ocean action colorways in the product, both meaning what §12 says.

- [ ] **Step 1: Convert the two existing literals** to the task's corrected utilities and remove the
  hand-written class strings.
- [ ] **Step 2: Sweep for other verify/hazard actions** and assign them; anything ambiguous stays
  ocean (the default action colorway).
- [ ] **Step 3: Run the audit** — assertions 1 and 3 across the RPI page.
- [ ] **Step 4: Commit** `feat(design): emerald for verification, amber for hazard protocols`

---

## Task 6: Offscreen pause, reduced motion, and the focal canvas

**Files:**
- Modify: `frontend/src/components/ui/ShaderButton.tsx` (mount the canvas only while on screen)
- Modify: `frontend/src/app/globals.css` (offscreen pause rule)
- Create: `frontend/src/components/shell/MeshVisibility.tsx` — one module-level
  `IntersectionObserver` for every `.gradient-animated-*` element, mounted once beside the existing
  `TooltipProvider` in `frontend/src/app/layout.tsx:53`. One observer for the whole page, not one
  per control; a hook per control would install dozens.

**Interfaces:**
- Consumes: nothing.
- Produces: a `data-offscreen` attribute (or the hook) that sets `animation-play-state: paused` for
  Tier 2 controls and unmounts the Tier 1 canvas — the spec's "any nonessential loop must stop when
  offscreen or hidden".

- [ ] **Step 1: Pause Tier 2 offscreen** — `.gradient-animated-*[data-offscreen="true"]`
  `{ animation-play-state: paused; }` plus the single observer that sets the attribute.
- [ ] **Step 2: Unmount the canvas offscreen** in `ShaderButton`, keeping the static deep fill
  visible so nothing flashes.
- [ ] **Step 3: Reduced-motion pass** — the audit's `reduced` context must find zero
  `gradient-flow` animations and state still legible (deep base + text).
- [ ] **Step 4: Commit** `perf(design): pause gradients offscreen and unmount the focal canvas`

---

## Task 7: Budget measurement

**Files:**
- Modify: `scratch/mesh_budget.py` (finalise)
- No product changes expected; if the budget fails, the fix lands here.

- [ ] **Step 1: Measure** Extreme Weather (the 76-button page) at 390×844: long tasks, worst frame
  during a scripted scroll, canvases ≤ 1.
- [ ] **Step 2: Height budgets unchanged** — `python3 scratch/viewport_audit.py` must reproduce the
  phone/tablet/desktop baseline recorded in the v4 acceptance ledger, with zero horizontal overflow.
  A moved number means the gradient changed layout, which is a failure, not a new baseline.
- [ ] **Step 3: Record the numbers** in the ledger (script changes stay untracked).

---

## Task 8: Design-language amendment and acceptance

**Files:**
- Modify: `DESIGN.md` §12 (four colorways, the state matrix, the deep-base rule), the Colors
  section's accent table if the deep bases belong there, and `AGENTS.md`'s colourway list
  — both are **gitignored and untracked** (`.gitignore:39,41`; policy commit `005f270`
  "stop tracking internal agent docs"), so these amendments are local to the checkout.
  The tracked record of the same change belongs in the spec under `docs/specs/`.
- Modify (local, uncommitted): `scratch/palette_contrast_check.py` — assert the four colorway names
  in `DESIGN.md`, that `indigo|ink` are absent as live colorways, and that no ramp stop
  composites below 4.5:1 with white over its deep base.

**Interfaces:**
- Consumes: everything above.
- Produces: a binding doc that describes what shipped, and a green acceptance run.

- [ ] **Step 1: Doc assertions first** — run red, then amend `DESIGN.md` and `AGENTS.md`.
- [ ] **Step 2: Full acceptance** — `python3 scratch/palette_audit.py` PASS on 8 pages × 3
  viewports; `python3 scratch/palette_contrast_check.py` PASS; `npx tsc --noEmit` clean; the CI
  palette guard unchanged.
- [ ] **Step 3: Perceptual evidence** — screenshots of a selection-dense page and an RPI page at the
  three viewports, plus a `forced-colors` capture proving the active state survives without colour.
- [ ] **Step 4: Commit** the AA ramp correction and the spec amendment — `DESIGN.md` and
  `AGENTS.md` themselves cannot be committed; they are gitignored by policy.

---

## Open coordination items (not tasks)

- Files the other agent holds (`NavRail.tsx`, `TopBar.tsx`, `StatusStrip`, `badge`, `mockData`,
  `performanceMatrixData`, `api.ts`, the icon set) are out of scope here; if a task's surface lives
  in one of them, skip it and record the skip.
- `palette-prototype`'s guard treatment is a separate decision and is not part of this plan.

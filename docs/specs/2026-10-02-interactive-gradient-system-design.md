# Interactive Gradient System v2 — Tiered Role Motion

**Status:** Specified 2026-10-02 — awaiting owner review; implementation plan not yet written
**Date:** 2026-10-02
**Companion to:** `AGENTS.md` (binding rules), `DESIGN.md` v4 (§12 amended in §3.3 and §6 here),
`docs/specs/2026-10-01-animated-gradient-components-system.md` (its dual-engine section is extended,
not replaced), `docs/specs/2026-10-02-color-system-design.md` (the roles this reuses)

---

## 1. Why this pass exists

The request was to put an animated ShaderGradient on every button and switch, in different colours,
with the colour plan blessed by `impeccable` and `taste`.

Measured on the running app first, because the numbers decide the design:

| Fact | Value |
|---|---|
| Buttons on the densest page (Extreme Weather) | **76** |
| Buttons across the eight pages | **341** |
| Live WebGL canvases per page today | **1** |
| Live consumers of the CSS mesh engine today | **1** (RPI's "Refresh Index") |
| Pages with no gradient surface at all | **4 of 8** |

Two conclusions follow. First, the literal reading is not shippable: browsers hold 8–16 live WebGL
contexts, then evict the oldest — which is why the 2026-10-01 spec established the dual-engine split
in the first place. A shader on 76 controls blanks the page's actual CTAs first. Second, the flatness
the owner is reacting to is a **coverage** problem, not a colour problem: the mesh engine exists and
is nearly unused, and half the pages never show any gradient at all.

### 1.1 What the two skills require

`impeccable` (`reference/animate.md`, `reference/operate.md` — this product is an Operate surface):

- "Use motion to explain state, relationship, and hierarchy… Decoration without purpose is animation debt."
- "Do not stack techniques for spectacle. One strong material idea, carried through the focal sequence and quiet supporting states, is usually enough."
- "Bound blur, filter, shadow, canvas, and shader work to isolated regions."
- "Any nonessential loop must stop when offscreen or hidden."
- "Product defaults to Restrained"; "Accent color used for primary actions, current selection, and state indicators only, not decoration."
- Anti-pattern named explicitly: "Heavy color or full-saturation accents on inactive states."

`taste` (`design-taste-frontend`):

- "MOTION MUST BE MOTIVATED (mandatory)… Invalid answer: 'it looked cool'."
- Its list of LLM defaults to avoid includes "infinite-loop micro-animations everywhere".
- For mesh gradients: "SVG or layered radial gradients. No library."
- One accent per project, with a consistency lock — no hue drifting between sections.

All three agree, and none of them forbid this feature. They forbid *undifferentiated* motion: the
gradient must mean something about the control it sits on.

### 1.2 A defect in the shipped colorways

White text on the current emerald stops measures **3.30:1** (`#16a34a`) and **3.77:1** (`#059669`),
and amber's mid stop **3.19:1** (`#d97706`) — all below the 4.5:1 floor for the 12–14px semibold
labels they carry. Ocean passes (`#0d74ce` 4.77, `#1e6fb8` 5.22). Spreading these colorways across
more controls multiplies a contrast failure, so the fix is part of this spec (§6), not a follow-up.

## 2. Decisions taken with the owner

| Question | Answer |
|---|---|
| Engine split | **A — tiered role motion**: WebGL for the page's focal action, the CSS mesh engine for every other interactive control |
| Motion coverage | **State-driven only**: motion appears on state change (active / selected / hovered / pressed / on); rest states stay still |

### 2.1 One interpretation to confirm

A primary action is in its action state at rest — that is what makes it the primary action. So the
focal CTA keeps the always-on mesh it ships today, and everything else animates only on state
change. Read strictly, "rest states stay flat" would also still the hero CTA, which removes the
authored focal moment and hides the page's action affordance until hover. Say the word and §5's
Tier 1 rest row changes to "flat deep fill" — it is one line of the state matrix either way.

## 3. Architecture

### 3.1 Three tiers

| Tier | Engine | Ceiling | Controls | Colourway |
|---|---|---|---|---|
| **1 — Focal** | WebGL `ShaderGradient` (`ShaderButton`) | **1 per view** | The page's single primary action (Hero "Inspect Model Evidence", API "Execute Request ▶") | ocean |
| **2 — Control layer** | CSS mesh (`@keyframes gradient-flow` + `.gradient-animated-*`) | Bounded by paint cost, not context limits — dozens are safe | Tab pills, segmented controls, filter chips, lead-time chips, map region chips, table row filters, switches/toggles when a control is on, primary action buttons on interaction | ocean / emerald / amber / neutral, by role (§4) |
| **3 — Flat** | none, ever | — | Secondary, ghost, icon, destructive, disabled, and every inactive state | semantic tokens only |

Tier 2 is the same visual family as Tier 1 — a multi-stop animated gradient — with a different
renderer. The difference is invisible to the user; it is what makes "every control animates"
possible at all.

### 3.2 Text-safe fills

A gradient whose stops span light to dark cannot guarantee text contrast, which is how `#cfe7ff`
(1.27:1) and `#bbf7d0` (1.21:1) came to sit behind white labels. So every Tier 1 and Tier 2 control
carries **two layers**:

1. a **deep base fill** — the colorway's darkest stop, which is what text is measured against, and
2. the **animated gradient as an overlay** on top, under the label.

Contrast is then a property of a single known value per colorway (§6) rather than of whichever stop
happens to be under the text at that moment. The highlight stops survive as motion, which is what
they are good for.

### 3.3 The neutral colorway, and §12's amendment

Passive operational toggles (units, auto-refresh, density) have no semantic role to claim: painting
them ocean would fake hierarchy, and painting them a data hue would break the invariant. They get a
**neutral colorway** — a cool-grey mesh built from the stopped ink gradient's stops (`#171717`,
`#33373e`, `#9ca3af`), which carries no hue and therefore makes no claim. This is a new colorway
name (`neutral`), not a new hue: ink's stops are reused, and `.gradient-animated-ink` stays retired
as a selection marker.

`DESIGN.md` §12 therefore reads: **ocean** (action), **emerald** (verification), **amber** (hazard
protocols), **neutral** (hue-less on/off) — with indigo and ink still retired as action colorways.

## 4. Colour assignment — where each colour goes

| Control | Tier | Colourway | Reason |
|---|---|---|---|
| Page's focal action | 1 | ocean | The one authored moment per view |
| Active tab / pill / segment / step | 2 | ocean | Selection |
| Primary action buttons (submit, execute, apply, launch) | 2 | ocean | Action |
| Lead-time and map region chips | 2 | ocean | Selection |
| Table row filters, saved views | 2 | ocean | Selection |
| Verify / recalculate / refresh / run model / accept weights | 2 | emerald | Verification |
| Standby / dispatch / NDMA logistics / acknowledge hazard | 2 | amber | Hazardous action |
| Passive operational toggles | 2 | neutral | On/off without a semantic role |
| Destructive (delete, purge, reset) | 3 | `--destructive` flat | Red is a status colour; a data hue must never fill an action, and an animated destructive action reads celebratory |
| Secondary / ghost / icon / disabled | 3 | tokens | Keeps the accent rare — `taste`'s consistency lock |

**Exclusions, which are the whole point of the plan:** never `--data-*` on a control (rainfall teal,
temperature ramp, wind slate and hazard red encode readings); never `--series-*` on a control (a
GFS-orange filter chip would claim that GFS is an action, and drift hue between sections); never a
different accent per page (selection is ocean everywhere, even where the data is about models).

## 5. State matrix

| State | Tier 1 (focal) | Tier 2 (control layer) | Tier 3 (flat) |
|---|---|---|---|
| Rest | animated mesh over deep base | flat — inactive: neutral surface; primary action: deep base fill | flat token |
| Hover | brightness/speed nudge | gradient overlay fades in under the label | token hover wash |
| Focus-visible | 2px accent ring | 2px accent ring | 2px accent ring |
| Active / selected / on | n/a (always in its action state) | animated mesh over deep base, white label | token active wash |
| Pressed | 1px translate + deeper base | 1px translate + deeper base | token press |
| Disabled | static deep base at 40% | static deep base at 40%, no animation | token disabled |
| `prefers-reduced-motion` | static deep base | static deep base (state still legible) | unchanged |
| Offscreen / hidden | canvas unmounted (`IntersectionObserver`) | animation paused (`animation-play-state`) | unchanged |

## 6. Colorway stop corrections

| Colorway | Deep base (text-safe) | White on deep | Overlay stops | Owner-visible effect |
|---|---|---|---|---|
| ocean | `#0d74ce` | 4.77 | `#1e6fb8` · `#cfe7ff` | unchanged |
| emerald | `#047857` | 5.48 | `#16a34a` · `#059669` · `#34d399` | "Refresh Index" and verify actions get darker |
| amber | `#b45309` | 5.02 | `#d97706` · `#f59e0b` | Dispatch/standby get slightly deeper |
| neutral | `#33373e` | 11.95 | `#171717` · `#9ca3af` | new hue-less colorway |

Stops live in `globals.css` for the mesh utilities and in `lib/palette.ts` for the WebGL uniforms, as
the v4 invariant already requires. No component carries a gradient stop of its own.

### 6.1 Amendment, 2026-10-02 (Task 8, after measurement)

The table above is what this spec prescribed. Measurement changed two things, and the
values below are what shipped.

**A stop that composites below 4.5:1 with white is a defect.** A control's label reads the
*composite* of the deep base and the translucent ramp, not the base on its own, so the
prescribed highlight stops put the painted fill at 3.40:1 (ocean), 3.53:1 (emerald) and
3.34:1 (amber). Verified twice: by compositing each stop at its declared alpha, and by
sampling painted pixels on the running app (the emerald role action read `rgb(7,147,100)`,
3.91:1 against its white label). The defects §1.2 set out to remove were therefore still
present — they had moved from the base to the composite. Contrast measured against the
deep-base token, which is what the audit's assertion does, cannot see this.

**The action ramps now sweep between a deep shade of the hue and the accent.** Ocean
`#084b86` · `#0a5faa` · `#0d74ce`; emerald `#034f39` · `#036348` · `#047857`; amber
`#6b3105` · `#8f4207` · `#b45309`; neutral unchanged. `SHADER_FILL` in `lib/palette.ts`
takes the same three per colorway, because the WebGL canvas covers the deep base while it
is mounted and its previous stops included `#cfe7ff` (1.27:1). Measured afterwards: focal
CTA 4.77:1, active lead-time chip 4.90:1, nav item 4.92:1, "Refresh Index" 7.08:1.

**Cost, accepted by the owner:** the ramps no longer carry a light highlight, so the fills
read deeper and flatter; the colour lives in the base hue rather than a sheen. The
guarantee is now structural — every stop clears 4.5:1 on its own, and a composite of two
AA-safe colours is AA-safe — and `scratch/palette_contrast_check.py` composites every stop
over its base and fails on any that drops below.

## 7. Motion discipline and budget

- One focal moment per view. Tier 2 motion is feedback and state, never ambience.
- Loops stop offscreen; `prefers-reduced-motion` renders the static deep base with state intact.
- Budget to measure, not assume: WebGL canvases ≤ 1 per page; phone scroll through a control-dense
  page (Extreme Weather, 76 buttons) at 390×844 with no long-task storm; page heights unchanged from
  the v4 acceptance numbers.
- Animate compositor properties only (`background-position`, `filter` avoided on Tier 2, no
  `box-shadow` animation, no layout-affecting properties).

## 8. Verification gates

Extend `scratch/palette_audit.py`; every assertion is mechanical, none is by eye.

1. Every animated gradient element carries a sanctioned colorway — `ocean|emerald|amber|neutral`; the
   retired `ink|indigo` appear nowhere.
2. No gradient on an inactive control: an element holding an animated fill must also be
   `aria-selected=true`, `aria-current`, `data-state=active|checked`, or a primary action.
3. Text contrast on every Tier 1 and Tier 2 control ≥ 4.5:1 against its deep base.
4. WebGL canvas count ≤ 1 per page, and only on a designated focal action.
5. `prefers-reduced-motion` emulation renders static fills with the state still distinguishable.
6. Page height budgets unchanged at 390/768/1440; zero horizontal overflow.

## 9. Coordination with the in-flight v4 migration

Selection states land on ocean under both efforts, so order does not matter for intent. Until the
parallel v4 worker's sweep stops, this work takes only files they do not hold; the ledger records
attribution per commit.

## 10. Out of scope

- No new animation library. `ui-layouts-mcp` has no switch/toggle/segmented component (checked:
  only `buttons` and `liquid-gradient`, the latter an SVG + `motion/react` button, kept as an option
  for the focal CTA only). React Bits remains the sanctioned source if a *new* pattern is ever
  needed, and that would be its own install decision.
- Charts, tables, maps and informational panels stay still: data marks are not controls.
- The `palette-prototype` dev route stays out of this spec; its guard treatment is a separate call.

## 11. Critical files

- `frontend/src/app/globals.css` — colorway utilities, deep bases, offscreen pause, reduced-motion.
- `frontend/src/lib/palette.ts` — deep bases and stops for WebGL uniforms.
- `frontend/src/components/ui/ShaderButton.tsx` — focal tier, unchanged in behaviour, corrected stops.
- The control primitives and their call sites: `ui/tabs.tsx`, nav rail/thumb bar, segmented filter
  groups, chip rows, `spectrumui/data-table.tsx` row filters, `WeatherMap` lead-time chips,
  `RPI/RealTrustAtlasMap` region chips, `RPI/ResourceRecommendation` dispatch (amber).

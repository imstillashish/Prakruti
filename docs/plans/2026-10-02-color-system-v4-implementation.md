# Color System v4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Prakruti a professional, meaning-bound colour system: one accent for action/selection, fixed hues per data role, and one categorical palette for models — with zero raw hex left in components.

**Architecture:** Tokens land in `app/globals.css`; JS consumers (recharts props, Leaflet `divIcon` HTML) read one new module, `lib/palette.ts`, because CSS variables cannot cross that boundary. Water leaves blue (the accent claims it) and becomes cyan-teal; model identity becomes a single 4-hue categorical palette consumed by every chart and map. Minimal dosage: page furniture stays monochrome, colour lives in charts, marks, badges, markers and accent states.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind v4 (`@theme inline`), recharts, Leaflet, plus Python 3 `playwright` (already used by the repo's audit scripts) — no new dependencies.

**Spec:** `docs/specs/2026-10-02-color-system-design.md`

## Global Constraints

- Accent set — base `#0d74ce` (4.77:1 on white), hover `#0b63b0` (6.13), pressed `#0a5594` (7.66), soft `#ecf4fc`; focus ring `#0d74ce` at 40%, 2px.
- Data roles — rain `#0e7490` (text `#155e75`, fill-only `#67e8f9`); temp `#fbbf24` → `#f97316` → `#dc2626` (**fill/scale only, never text**); wind `#475569`; confidence/hazard `#16a34a` / `#ab6400` / `#b42318` (**unchanged semantics**); OK text variant `#15803d` (5.02:1, because `#16a34a` is 3.30:1 and fails AA for small text).
- Categorical series — ECMWF `#171717`, ICON `#4f46e5`, GFS `#c2410c`, GEM `#be185d`.
- Invariants: accent never encodes data; data hues never encode action; colour is never the only code (label/shape/pattern accompanies it); neutrals stay cool-grey; **no raw hex outside `app/globals.css` and `lib/palette.ts`**; hazard red is status-only, never a series or fill.
- Minimal dosage: no tinted page bands, no tinted stat surfaces, no panel recolouring. Hero wash, panels, borders, body copy and section chrome are unchanged.
- Data band fills run 10–14% opacity; AA thresholds are body ≥ 4.5:1, large text ≥ 3:1, verified on computed styles.
- Light theme only. No dark-mode work. `prefers-reduced-motion` behaviour unchanged.
- Frozen baselines that must not regress: `npx tsc --noEmit` clean; `RealLeafletMap` ESLint stays at its 5 pre-existing findings (1 error, 4 warnings) and `RealTrustAtlasMap` at 0; page budgets 390×844 Overview 3.5 / Forecast 3.4; 768×1024 Overview 3.0; 1440×900 Overview 3.5 — no horizontal overflow at any viewport.

## Review Focus

Failure modes the spec implies but a naive implementation breaks. Each line's test is pinned to the task that owns the code.

1. **Colour-blind users cannot separate teal (rain), green (OK) and red (hazard) when they sit side by side.** Expected: every series swatch and hazard badge carries adjacent text, and line charts distinguish models by dash pattern too. → pinned in T8 (label-adjacency assertion) and T11 (deuteranopia capture).
2. **A fill-only hue gets used as text, producing invisible labels.** Expected: no computed text colour ever equals `#fbbf24`, `#f97316` or `#67e8f9`. → pinned in T6/T7 (audit text-colour assertion).
3. **Leaflet popups and markers keep stale hex**, because their colours travel inside HTML template strings the compiler never checks. Expected: rendered popup innerHTML contains no retired value. → pinned in T7.
4. **White text on accent fills breaks at hover/pressed**, which the default state's 4.77:1 hides. Expected: white on `#0b63b0` and `#0a5594` also ≥ 4.5:1. → pinned in T4 (contrast-checker pairs).
5. **Windows high-contrast (`forced-colors`) erases hue, taking the selected state with it.** Expected: active/selected state still readable via border or weight when hue is unavailable. → pinned in T11 (forced-colors emulation).

---

## File Structure

| Path | Responsibility |
|---|---|
| `frontend/src/app/globals.css` | The only source of CSS colour truth: v4 tokens, `@theme inline` utility mappings, gradient utilities |
| `frontend/src/lib/palette.ts` (new) | The only source of JS colour truth: same values for recharts/Leaflet/table consumers |
| `frontend/src/components/ui/{button,switch,tabs,badge}.tsx` | Primitives whose fill/active states carry the accent |
| `frontend/src/components/shell/*`, `components/pages/*`, `components/RegionSelector` | Navigation, tab and filter *selection* states |
| `frontend/src/components/spectrumui/charts/chart-engine.tsx` | Chart series variables, consumed by every spectrum chart |
| `frontend/src/components/{ModelTrajectories,ModelComparison,PerformanceMatrix3D}/index.tsx` | Series-coloured recharts surfaces |
| `frontend/src/components/{WeatherMap,RPI}/*` | Leaflet maps: marker and popup colour |
| `frontend/src/components/spectrumui/data-table.tsx` | Tabular status/emphasis colour |
| `frontend/src/data/*`, `frontend/src/lib/api.ts` | Mock/seed values that carry hex |
| `scratch/palette_contrast_check.py`, `scratch/palette_audit.py` (new) | Token/palette assertions and rendered-page audit |
| `.github/workflows/palette-guard.yml` (new) | CI enforcement of the no-raw-hex rule |
| `DESIGN.md` | v4 design-language amendments |

`frontend/src/lib/mapConfig.ts` needs **no change** — it holds tile URLs, not palette values.

---

### Task 1: Verification harness (fails loudly on today's code)

**Files:**
- Create: `scratch/palette_contrast_check.py`, `scratch/palette_audit.py`, `.github/workflows/palette-guard.yml`

**Interfaces:**
- Consumes: nothing.
- Produces: `palette_contrast_check.py` (exit 0 = tokens + palette parity + contrast pass), `palette_audit.py` (exit 0 = rendered roles correct), `palette-guard.yml` (CI hex grep).

- [ ] **Step 1: Write `scratch/palette_contrast_check.py`**

Parses `frontend/src/app/globals.css` for `--action*`, `--data-*`, `--series-*` and `frontend/src/lib/palette.ts` for the same names, then asserts: (a) every Global-Constraint value is present, (b) CSS and TS agree exactly, (c) these pairs meet AA — `#0d74ce`, `#0e7490`, `#155e75`, `#15803d`, `#475569`, `#171717`, `#4f46e5`, `#c2410c`, `#be185d` on white ≥ 4.5; white on `#0d74ce`, `#0b63b0`, `#0a5594` ≥ 4.5; `#dc2626` on white ≥ 4.5. `#fbbf24`, `#f97316`, `#67e8f9` are asserted **below** 3:1 and recorded as fill-only.

- [ ] **Step 2: Run it to see it fail**

Run: `python3 scratch/palette_contrast_check.py`
Expected: FAIL — missing `--action`, missing `lib/palette.ts`.

- [ ] **Step 3: Write `scratch/palette_audit.py`**

Playwright, viewports 390×844 / 768×1024 / 1440×900, all 8 sections (same nav-clicking loop as `scratch/viewport_audit.py`). Asserts: (a) no computed text colour equals a fill-only hue; (b) retired values `#111827`, `#94a3b8`, `#f8fafc`, `#6f6f6f` appear in no computed style or popup HTML, and `#1e6fb8` survives only as a stop inside the ocean action gradient — never on a rainfall surface; (c) rain teal appears only on rainfall surfaces and the accent only on action/selection surfaces; (d) every series swatch has adjacent text; (e) body-text contrast ≥ 4.5:1 on every coloured pair; (f) active/selected elements resolve to the accent family; (g) per-section distinct hue count stays within a fixed budget of 10 (ink, greys and the accent included).

- [ ] **Step 4: Run it to see it fail**

Run: `python3 scratch/palette_audit.py`
Expected: FAIL — rain surfaces still `#1e6fb8`, CTA still black.

- [ ] **Step 5: Write `.github/workflows/palette-guard.yml`**

A `grep -rEn '#[0-9a-fA-F]{3,8}' frontend/src --include='*.tsx' --include='*.ts'` step that fails when matches exist outside `frontend/src/lib/palette.ts`. Model it on `.github/workflows/attribution-guard.yml`.

- [ ] **Step 6: Run the guard locally to see it fail**

Run: `grep -rEc '#[0-9a-fA-F]{3,8}' frontend/src --include='*.tsx' --include='*.ts' | grep -v 'lib/palette.ts' | awk -F: '$2>0'`
Expected: FAIL — lists the current offenders (`ShaderButton.tsx` 26, `RealTrustAtlasMap.tsx` 18, …).

- [ ] **Step 7: Commit the harness**

```bash
git add scratch/palette_contrast_check.py scratch/palette_audit.py .github/workflows/palette-guard.yml
git commit -m "test(design): add palette contrast, rendered-role and hex-guard checks"
```

---

### Task 2: v4 tokens in `globals.css`

**Files:**
- Modify: `frontend/src/app/globals.css` (`:root` block from line 66; `@theme inline` from line 92; delete `--water` at line 83 and `--color-water` at line 109)

**Interfaces:**
- Consumes: Task 1's contrast checker.
- Produces: CSS tokens `--action`, `--action-hover`, `--action-pressed`, `--action-soft`, `--ring`, `--data-rain`, `--data-rain-dark`, `--data-rain-light`, `--data-wind`, `--data-temp-cool/mid/hot`, `--data-ok`, `--data-ok-text`, `--data-watch`, `--data-hazard`, `--data-confidence-high/watch/low`, `--series-1..4`, each with a matching `--color-*` mapping in `@theme inline`.

- [ ] **Step 1: Add the tokens** with the exact Global-Constraint values; set `--ring: #0d74ce`; point `--primary` at `var(--action)` and `--primary-active` at `var(--action-pressed)` so existing `bg-primary` utilities (3 consumers) follow the accent without a rename; keep `--primary-foreground: #ffffff`. The three `--data-confidence-*` tokens are aliases of `--data-ok`/`--data-watch`/`--data-hazard` and need no `--color-*` utilities of their own — consumers keep using the ok/watch/hazard utilities.
- [ ] **Step 2: Add `@theme inline` mappings** — `--color-action`, `--color-action-hover`, `--color-action-pressed`, `--color-action-soft`, `--color-data-rain(+/-dark/-light)`, `--color-data-wind`, `--color-data-temp-*`, `--color-data-ok`, `--color-data-ok-text`, `--color-data-watch`, `--color-data-hazard`, `--color-series-1..4`.
- [ ] **Step 3: Delete `--water` and `--color-water`** (27 consumers are migrated in T6/T7; the rename is deliberate — no alias).
- [ ] **Step 4: Verify tokens only**

Run: `npx tsc --noEmit` (still clean) then `python3 scratch/palette_contrast_check.py`
Expected: FAIL only on the missing `lib/palette.ts` half.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "feat(design): add v4 accent, data-role and series tokens"
```

---

### Task 3: `lib/palette.ts`

**Files:**
- Create: `frontend/src/lib/palette.ts`

**Interfaces:**
- Consumes: Task 2's token values.
- Produces:

```ts
export type ModelName = 'ECMWF' | 'ICON' | 'GFS' | 'GEM';
export const ACCENT: { base: string; hover: string; pressed: string; soft: string };
export const DATA: { rain: string; rainDark: string; rainLight: string; wind: string;
  tempCool: string; tempMid: string; tempHot: string; ok: string; okText: string;
  watch: string; hazard: string };
export const SERIES: Record<ModelName, string>;
export const SERIES_ORDER: readonly ModelName[];
export function seriesColor(model: string): string;   // case-insensitive; falls back to SERIES.ECMWF
```

- [ ] **Step 1: Implement the module** with the exact Global-Constraint values, and note in a header comment why it exists (recharts `stroke=` and Leaflet `divIcon` HTML cannot read CSS variables).
- [ ] **Step 2: Verify parity + contrast**

Run: `python3 scratch/palette_contrast_check.py`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/palette.ts
git commit -m "feat(design): add palette module for chart and map consumers"
```

---

### Task 4: Accent on action (CTAs, toggles, focus, links)

**Files:**
- Modify: `frontend/src/components/ui/button.tsx:12`, `frontend/src/components/ui/switch.tsx:14`, `frontend/src/components/ui/ShaderButton.tsx` (fallback/focus colours → `ACCENT` from `palette.ts`)

**Interfaces:**
- Consumes: `ACCENT`, `--primary`/`--primary-active`/`--ring` retargeted in T2.
- Produces: every primary CTA, toggle and focus ring resolves to the accent; `bg-primary` utility unchanged in name.

- [ ] **Step 1: Extend the contrast checker** with the hover/pressed pairs from Review Focus 4 and run it (expected FAIL until values are wired in).
- [ ] **Step 2: Retarget the primitives** — button default variant, switch checked state, ShaderButton ocean fallback/focus; leave `--primary-foreground` white.
- [ ] **Step 3: Verify rendered accent**

Run: `python3 scratch/palette_audit.py` (assertion (c) for action surfaces)
Expected: action surfaces accented; remaining failures belong to later tasks.

- [ ] **Step 4: Verify lint/type baselines**

Run: `npx tsc --noEmit && npx eslint src/components/ui`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/button.tsx frontend/src/components/ui/switch.tsx frontend/src/components/ui/ShaderButton.tsx scratch/palette_contrast_check.py
git commit -m "feat(design): accent primary actions, toggles and focus rings"
```

---

### Task 5: Accent on selection, and retire the ink colorway

**Files:**
- Modify: `frontend/src/components/shell/NavRailView.tsx:44,120,147`, `frontend/src/components/pages/ApiPage.tsx:564,575,586,661`, `frontend/src/components/pages/RpiPage.tsx:170`, `frontend/src/components/RegionSelector/index.tsx:136`, `frontend/src/components/ui/tabs.tsx:32`, `frontend/src/app/globals.css:319,338`
- Do **not** touch: `bg-foreground text-white` chips that are data or emphasis (`RealLeafletMap.tsx:155` selected-marker styling excepted — that is selection), `ModelVerification`'s emphasis badge, or any series-1 (ECMWF) ink usage.

**Interfaces:**
- Consumes: accent tokens from T2.
- Produces: `gradient-animated-ink` has zero consumers and its utility block is removed; selected states use `--action`/`--action-soft`.

- [ ] **Step 1: Extend the audit** with assertion (f): every active/selected element's computed background or border resolves to the accent family, and `gradient-animated-ink` appears in no stylesheet. Run it — expected FAIL.
- [ ] **Step 2: Convert the nine gradient sites plus the tabs primitive** to the ocean gradient / `--action-soft` + accent text; move `tabs.tsx` active state off the grey `bg-accent` wash onto `--action-soft` with accent text.
- [ ] **Step 3: Delete `.gradient-animated-ink`** (line 319) and its entry in the reduced-motion list (line 338).
- [ ] **Step 4: Verify** `python3 scratch/palette_audit.py` (assertion f) → PASS for selection surfaces; `npx tsc --noEmit && npx eslint src/components/shell src/components/ui src/components/pages` → no new findings.
- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/shell/NavRailView.tsx frontend/src/components/pages/ApiPage.tsx frontend/src/components/pages/RpiPage.tsx frontend/src/components/RegionSelector/index.tsx frontend/src/components/ui/tabs.tsx frontend/src/app/globals.css
git commit -m "feat(design): move selection states to the accent and retire the ink colorway"
```

---

### Task 6: Water → teal on class/utility surfaces (23 files)

**Files:**
- Modify: `AlertCenter`, `ForecastHero`, `ForecastTimeline`, `ModelComparison`, `ModelSkill`, `pages/ModelIntelligencePage`, `pages/RpiPage`, `PerformanceMatrix3D`, `RegionSelector`, `RPI/ModelTrustAtlas`, `RPI/ResourceRecommendation`, `RPI/RpiHero`, `RPI/StationDossier`, `shell/DockedThumbBar`, `StatusStrip`, `ui/badge`, `WeatherMap/index`, `WhyForecast`, `data/mockData`, `data/performanceMatrixData`, `lib/api` (all under `frontend/src/`)
- Note: `ForecastTimeline/index.tsx:14` reads `var(--water)` directly — it becomes `var(--data-rain)`.

**Interfaces:**
- Consumes: `--data-rain` from T2.
- Produces: zero `water`-named utility usages outside `vendor` code; rainfall surfaces render teal.

- [ ] **Step 1: Run the audit assertion (c) for rain** — expected FAIL with today's `#1e6fb8`/`text-water` surfaces listed.
- [ ] **Step 2: Migrate the files** — `text-water`/`bg-water`/`border-water` → `-data-rain` utilities; `var(--water)` → `var(--data-rain)`; any local rainfall hex → `DATA.rain` from `palette.ts` or the token. Text on tinted fills uses `--data-rain-dark`.
- [ ] **Step 3: Verify no water names remain**

Run: `grep -rnE "text-water|bg-water|border-water|--water" frontend/src --include='*.tsx' --include='*.ts' --include='*.css'`
Expected: no matches.

- [ ] **Step 4: Verify rendered** `python3 scratch/palette_audit.py` (assertions a, c, e) → rain surfaces teal, no fill-only hue used as text, contrast holds.
- [ ] **Step 5: Commit**

```bash
git add frontend/src/components frontend/src/data frontend/src/lib/api.ts
git commit -m "feat(design): migrate rainfall surfaces from water blue to teal"
```

---

### Task 7: Water → teal in chart, map and table consumers (4 files)

**Files:**
- Modify: `frontend/src/components/spectrumui/charts/chart-engine.tsx:592`, `frontend/src/components/spectrumui/data-table.tsx`, `frontend/src/components/WeatherMap/RealLeafletMap.tsx`, `frontend/src/components/RPI/RealTrustAtlasMap.tsx`

**Interfaces:**
- Consumes: `DATA` and `SERIES` from `palette.ts`.
- Produces: chart series variables and Leaflet marker/popup colours read `palette.ts`; the maps' inline marker HTML carries no literal palette hex.

- [ ] **Step 1: Extend the audit** with the popup-HTML scan (Review Focus 3) and run it — expected FAIL (popups carry `#1e6fb8`, `#60646c`, `#f0f0f3` literals).
- [ ] **Step 2: Replace the literals** in all four files with `DATA`/`SERIES` reads (chart-engine's `seriesVarsClassName` is rebuilt from `SERIES`, keeping its `--spectrum-*` variable names so existing chart components keep working).
- [ ] **Step 3: Verify** `python3 scratch/palette_audit.py` → no retired value in any rendered popup or computed style.
- [ ] **Step 4: Verify baselines** `npx tsc --noEmit && npx eslint src/components/WeatherMap src/components/RPI src/components/spectrumui` → `RealLeafletMap` at 5 findings, `RealTrustAtlasMap` at 0.
- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/spectrumui/charts/chart-engine.tsx frontend/src/components/spectrumui/data-table.tsx frontend/src/components/WeatherMap/RealLeafletMap.tsx frontend/src/components/RPI/RealTrustAtlasMap.tsx
git commit -m "feat(design): source chart and map colours from the palette module"
```

---

### Task 8: One model palette everywhere

**Files:**
- Modify: `frontend/src/components/ModelTrajectories/index.tsx:160,215`, `frontend/src/components/ModelComparison/index.tsx`, `frontend/src/components/RPI/ModelTrustAtlas.tsx:37-58`, `frontend/src/components/RPI/StationDossier.tsx:22-32`, `frontend/src/components/RPI/RealTrustAtlasMap.tsx` (`MODEL_STYLE_MAP`)

**Interfaces:**
- Consumes: `SERIES`, `seriesColor(model)` from `palette.ts`.
- Produces: four distinct model colours in every chart and map; dash patterns on multi-line charts.

- [ ] **Step 1: Write the label-adjacency and distinctness assertions** (Review Focus 1): the audit fails if any two rendered model series share a stroke colour, or if a series swatch has no adjacent text.
- [ ] **Step 2: Run it** — expected FAIL (`ModelTrajectories` paints all four `#9e9e9e`).
- [ ] **Step 3: Swap in `seriesColor()`** in all five consumers, delete their local hex maps, and add per-model dash patterns to the multi-line charts.
- [ ] **Step 4: Verify** `python3 scratch/palette_audit.py` → four distinct, labelled series on every model surface.
- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ModelTrajectories frontend/src/components/ModelComparison frontend/src/components/RPI
git commit -m "feat(design): unify model identity on one categorical palette"
```

---

### Task 9: Retire the remaining raw hex

**Files:**
- Modify: the 17 files with >4 hex values (e.g. `ShaderButton.tsx` 26, `RealTrustAtlasMap.tsx` 18, `ModelTrustAtlas.tsx` 16, `ModelTrajectories` 15, `PerformanceMatrix3D` 14, `ModelComparison` 13, `StationDossier` 12, `lib/utils.ts` 9, `ForecastTimeline` 8, `SplitFlapText.tsx` 6, `ForecastHero` 6, `lib/api.ts` 6, `data/performanceMatrixData.ts` 5, `RpiHero` 5, `pages/RpiPage` 5, `ModelSkill` 5, `components/icons/trophy-icon.tsx`)
- Also: delete the three unused helpers in `lib/utils.ts` (`getRiskColor`, `getRiskBg`, `getStatusColor` — no callers remain).

**Interfaces:**
- Consumes: `palette.ts`, tokens.
- Produces: the CI guard passes; every colour traces to a token or `palette.ts`.

- [ ] **Step 1: Run the guard** — expected FAIL with the offender list.
- [ ] **Step 2: Replace each remaining hex** with a token/utility or a `palette.ts` read. Off-palette decoration (`trophy-icon`'s `#FFD700/#FF4500/#00BFFF/#32CD32`, `SplitFlapText`'s stray values) maps to the nearest existing role — series or hazard/gold-free neutrals — per the "no decoration" invariant; if a value has no role, it is deleted rather than invented.
- [ ] **Step 3: Verify the guard passes**

Run: `grep -rEn '#[0-9a-fA-F]{3,8}' frontend/src --include='*.tsx' --include='*.ts' | grep -v 'lib/palette.ts'`
Expected: no output.

- [ ] **Step 4: Verify** `npx tsc --noEmit && npx eslint src` → no new findings.
- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "refactor(design): remove raw hex from components in favour of tokens"
```

---

### Task 10: `DESIGN.md` v4

**Files:**
- Modify: `DESIGN.md` (Colors section from line 286; Do's/Don'ts from line 473; §12 from line 673)

**Interfaces:**
- Consumes: the implemented token names and values (the doc must describe what shipped).
- Produces: the binding design language v4.

- [ ] **Step 1: Write doc assertions** into `scratch/palette_contrast_check.py`: `DESIGN.md` contains each role token name and value; no longer contains `Black is the only CTA fill`; does not describe more than three gradient colorways. Run — expected FAIL.
- [ ] **Step 2: Replace the Colors section** with the role tables (accent + states, data roles + restrictions, categorical series, invariants) — the role table is the section, not a narrative.
- [ ] **Step 3: Rewrite the CTA rule** to "the accent is the only CTA fill" and add the three new rules (no raw hex outside tokens/`palette.ts`; accent never data / data never accent; colour never the sole code).
- [ ] **Step 4: Amend §12 to three colorways** — ocean (action), amber (hazard protocols), emerald (verification) — recording that `#1e6fb8` remains an ocean *stop* while no longer meaning rainfall, and that `.gradient-animated-ink` is retired.
- [ ] **Step 5: Leave untouched** typography, spacing, radii, elevation, responsive sections and the Expo-derived Overview prose.
- [ ] **Step 6: Verify + commit**

Run: `python3 scratch/palette_contrast_check.py` → PASS.

```bash
git add DESIGN.md scratch/palette_contrast_check.py
git commit -m "docs(design): amend DESIGN.md to the v4 color system"
```

---

### Task 11: Acceptance run

**Files:**
- No source changes. Evidence recorded in the completion summary.

**Interfaces:**
- Consumes: everything above.
- Produces: measured acceptance evidence.

- [ ] **Step 1: Full audit** `python3 scratch/palette_audit.py` → PASS on all 8 sections × 3 viewports.
- [ ] **Step 2: Height budgets unchanged** `python3 scratch/viewport_audit.py` → Overview 3.5/3.0/3.5, Forecast 3.4, Performance 2.9/2.8, zero overflow.
- [ ] **Step 3: Static gates** `npx tsc --noEmit` clean; `npx eslint src` unchanged from baseline; guard green.
- [ ] **Step 4: Perceptual checks** — screenshots of all 8 sections at the three viewports; deuteranopia capture of the comparison and hazard surfaces; `forced-colors` emulation confirming the selected state survives without hue (Review Focus 5).
- [ ] **Step 5: Report** the measured numbers and any deviation, then commit any audit-script updates.

```bash
git add scratch
git commit -m "test(design): record v4 acceptance measurements"
```

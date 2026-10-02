# Color System v4 — Accent Promotion & Data Roles

**Status:** Specified 2026-10-02 — awaiting owner review; implementation plan not yet written
**Date:** 2026-10-02
**Companion to:** `AGENTS.md` (binding rules), `DESIGN.md` v3 (its Colors section and CTA rule are superseded here), `docs/specs/2026-10-01-animated-gradient-components-system.md` (§12, amended in §5.3 below)

---

## 1. Why this pass exists

The product reads as grey-on-white. That is measurable, and it is not one bug but four: the canvas is neutral by token count, the colour that does exist leaks as raw hex, two charts disagree about what a model looks like, and the binding design language contradicts itself about CTAs.

### 1.1 The canvas is neutral by token count

Counts across `frontend/src` (`*.tsx`, `*.ts`):

| Token | Uses | Role |
|---|---|---|
| `text-foreground` | 300 | ink text |
| `bg-secondary` | 137 | grey wash surfaces |
| `bg-muted` | 21 | soft canvas |
| `text-success` | 42 | semantic |
| `text-destructive` | 21 | semantic |
| `text-water` | 19 | semantic |
| `bg-success` | 18 | semantic |
| `text-warning` | 17 | semantic |
| `bg-water` | 7 | semantic |

Ink and grey outnumber every semantic colour, and the five §12 colourways are 15 ink uses out of 25 — so even the gradient system is effectively monochrome.

### 1.2 Colour leaks as raw hex

41 distinct hex values appear in components, concentrated in:

| File | Hex count |
|---|---|
| `components/ui/ShaderButton.tsx` | 26 |
| `components/RPI/RealTrustAtlasMap.tsx` | 18 |
| `components/RPI/ModelTrustAtlas.tsx` | 16 |
| `components/ModelTrajectories/index.tsx` | 15 |
| `components/PerformanceMatrix3D/index.tsx` | 14 |
| `components/WeatherMap/RealLeafletMap.tsx` | 13 |
| `components/ModelComparison/index.tsx` | 13 |
| `components/RPI/StationDossier.tsx` | 12 |
| `lib/utils.ts` | 9 |
| `components/ForecastTimeline/index.tsx` | 8 |

Most of these duplicate sanctioned tokens (`#171717`, `#60646c`, `#1e6fb8`, `#ab6400`, `#16a34a`) instead of using them; the rest is drift (`#111827`, `#94a3b8`, `#f8fafc`, `#6f6f6f`, and `trophy-icon`'s `#FFD700/#FF4500/#00BFFF/#32CD32`). `AGENTS.md` already bans hardcoded hex in components, so this is an existing violation, and it is why any colour that does appear looks accidental rather than systemic.

### 1.3 Two charts disagree about what a model looks like

`RPI/ModelTrustAtlas.tsx` and `RPI/StationDossier.tsx` give ECMWF/ICON/GFS/GEM four distinct hues (`#171717`, `#60646c`, `#1e6fb8`, `#9e9e9e`); `ModelTrajectories/index.tsx` paints all four with the same `#9e9e9e`. Model identity therefore means nothing in one chart and something in another, and GFS currently borrows the water blue that also means rainfall.

### 1.4 The binding language contradicts itself

`DESIGN.md` v3 Don'ts: *"Don't introduce a saturated brand action color. Black is the only CTA fill."* §12 mandates animated gradient CTAs with five semantic colourways, and `AGENTS.md` prohibits flat monochrome primary triggers. Shipped code follows §12 (ink ×15, emerald ×3, amber ×3, ocean ×2, indigo ×2), so the doc's CTA rule is already dead text.

### 1.5 Two skill doctrines constrain the fix

- `taste` (`design-taste-frontend`) §4.2: **max 1 accent**, saturation < 80%, one palette per project, no warm/cool neutral mixing, and a **Color Consistency Lock** — one accent used page-wide, no hue drifting between sections. Its dial table classifies this product as trust-first/public-sector (`VARIANCE 3–4`, `MOTION 2–3`, `DENSITY 4–5`) and the palette change as *redesign – preserve*.
- `impeccable` (`colorize`): on an Operate surface, colour encodes **action, selection, status, wayfinding**; build **roles, not swatches**; use the project's existing colour space; for data use distinct lightness/chroma/shape/label so colour is never the only code; verify AA contrast (body 4.5:1, large 3:1).

These reconcile exactly one way: **one accent for chrome, plus a small fixed set of semantic data roles** that are encoding rather than decoration. Page identity does not become a set of differently-coloured headers.

## 2. Decisions taken with the owner

| Question | Decision | Consequence |
|---|---|---|
| Where does colour live? | Data semantics + restrained chrome | Hues come from meaning; chrome gets only the accent |
| How much of the page? | **Minimal dosage** | Canvas stays white; no tinted page bands or stat surfaces; colour lives in charts, marks, badges, markers + accent states |
| Which accent? | **Ocean blue `#0d74ce`** | Black retires from CTA fill; rainfall/water must leave blue |
| Which approach? | **A — role tokens + data palette** | The 27-file water migration is token-driven, greppable and auditable |

The accent is not a new invention: `--text-link` is already `#0d74ce`, and `brand/MorMark.tsx` already draws the logo in the same blue family. This spec **promotes** that value from "inline links only" to the site's action/selection/wayfinding accent.

## 3. Architecture

### 3.1 Layer 1 — the accent (chrome only)

`--action` owns action, selection, focus and wayfinding: primary CTAs (§12 gradient and flat variants), active nav/segment/tab, focus ring, inline links. `--ring` moves from `#171717` to the accent. Ink stops being the active-selection colour.

| Accent token | Value | On white | Use |
|---|---|---|---|
| `--action` | `#0d74ce` | 4.77 | Base: fills, links, active states |
| `--action-hover` | `#0b63b0` | 6.13 | Pointer hover |
| `--action-pressed` | `#0a5594` | 7.66 | Press/active |
| `--action-soft` | `#0d74ce` @ 8% (`#ecf4fc`) | — | Selected row/segment wash |
| `--ring` | `#0d74ce` @ 40% | — | Focus ring, 2px |

### 3.2 Layer 2 — data roles (encoding, not accents)

| Role | Token | Value | Contrast on white | Usage restriction |
|---|---|---|---|---|
| Rainfall, water | `--data-rain` | `#0e7490` | 5.36 | `#155e75` (7.27) for text on tinted fills; `#67e8f9` (1.45) fill-only |
| Temperature | `--data-temp-{cool,mid,hot}` | `#fbbf24` / `#f97316` / `#dc2626` | 1.67 / 2.80 / 4.83 | **Scale inside temperature charts only, never text**; labels use ink or `#b45309` (5.02) |
| Wind | `--data-wind` | `#475569` | 7.58 | Speed by stroke width/opacity, not hue |
| Confidence, reliability | `--data-confidence-{high,watch,low}` | `#16a34a` / `#ab6400` / `#b42318` | 3.30 / 4.61 / 6.57 | 3-step reading; small text uses `--data-ok-text` |
| Hazard, RPI thresholds | `--data-{ok,watch,hazard}` | `#16a34a` / `#ab6400` / `#b42318` | 3.30 / 4.61 / 6.57 | **Unchanged**; saturated red is reserved for threshold badges |
| Verification, success | `--data-verified` | `#16a34a` (text `#15803d`) | 3.30 / 5.02 | Same green as confidence — "verified/OK" reads identically everywhere |

`--data-ok-text` (`#15803d`, 5.02) exists because the shipped success green measures 3.30:1, which fails AA for small text.

### 3.3 Categorical series (models) and the fills/lines rule

Model identity is a categorical scale, not a semantic hue, so it is allowed to be multi-hue — all four pass AA as marks and as text on white:

| Series | Model | Value | Contrast on white |
|---|---|---|---|
| `--series-1` | ECMWF | `#171717` | 17.93 |
| `--series-2` | ICON | `#4f46e5` | 6.29 |
| `--series-3` | GFS | `#c2410c` | 5.18 |
| `--series-4` | GEM | `#be185d` | 6.04 |

**The rule that prevents collisions:** in charts that plot a variable, *lines carry model identity and fills carry variable identity* — a rainfall-by-model chart draws four categorical model lines over a low-opacity rain-teal band, so a model hue never doubles as the rainfall hue. Every series also carries a label, and line charts add dash patterns, so colour is never the only code.

### 3.4 Invariants

1. The accent is never used for data; data hues are never used for action.
2. Saturated red is reserved for *status*, never chart decoration: hazard threshold badges and low-confidence badges. It is not a series or fill colour.
3. Colour is never the only carrier of state — label, shape or pattern accompanies it.
4. Neutrals stay cool-grey; no warm-grey/cool-grey mixing (`taste`).
5. No raw hex outside `app/globals.css` and `lib/palette.ts`.

### 3.5 Saturation audit against `taste`'s cap

`taste` §4.2 caps saturation at 80% *by default*. Measured HSL saturation of the proposed values:

| Value | Sat | Verdict |
|---|---|---|
| `#0d74ce` accent, `#0b63b0`, `#0a5594` | 88 / 88 / 87% | **Kept** — already pinned in the product as `--text-link` and the hero CTA; AA-verified at 4.77:1. Reducing chroma would break the existing brand value for no readability gain. |
| `#0e7490` rain | 82% | **Kept** — 3 points over, AA 5.36:1; the darker text variant `#155e75` sits at 70%. |
| `#ab6400` warning | 100% | **Pre-existing**, unchanged semantic; AA 4.61:1. |
| `#fbbf24` / `#f97316` temp ramp | 96 / 95% | **Kept** — fill-only, never text (1.67 / 2.80), so the cap does not govern legibility; the ramp's low end must stay unmistakably warm. |
| `#c2410c` series-3 | 88% | **Kept** — AA 5.18:1; needed to stay distinguishable from the amber ramp in adjacent charts. |
| `#4f46e5`, `#be185d`, `#16a34a`, `#b42318`, `#dc2626`, `#15803d`, `#475569` | 75 / 78 / 76 / 76 / 72 / 72 / 19% | **Within cap.** |

No new value above 88% saturation is introduced, and every one that exceeds the default is either pre-existing, AA-verified, or fill-only. `taste` states the cap as a default rather than an absolute, and the deviation is recorded here instead of silently ignored.

## 4. Surfaces

| Surface | Treatment |
|---|---|
| Hero band | Existing sky wash stays — the one place atmospheric colour is allowed |
| Primary CTAs, active nav/segment/tab, focus ring, inline links | Accent ocean |
| Charts (timeline, consensus, contribution, skill, calibration, verification, 3D matrix) | Data roles at full chroma; bands at 10–14% tint; grid/axis stay neutral |
| Status badges and pills | Hazard trio, confidence scale, rain teal |
| Map markers and popups | Rain teal by default; hazard trio for risk; categorical series + model initial in the Trust Atlas |
| Tables | Status cells and numeric emphasis only; chrome stays neutral |
| Docked thumb bar / nav rail | Neutral except the active state |
| Panels, borders, body copy, headings, section chrome | **Unchanged** — minimal dosage means the page furniture stays monochrome |

## 5. Design-language amendments (`DESIGN.md` v4)

1. **Colors section replaced** by the role table in §3 above (accent + data roles + series + invariants), replacing the Expo-derived swatch list.
2. **CTA rule changed** from "black is the only CTA fill" to "the accent is the only CTA fill" — removing the §1.4 contradiction.
3. **§12 drops five colourways to three:** ocean (action), amber (hazard protocols), emerald (verification/recalculate). Indigo leaves the action lane and survives only as the categorical ICON hue. Ink is retired rather than kept for "text chrome", because all nine `.gradient-animated-ink` usages are active/selected states that the accent now owns — keeping the utility would leave a dead colorway in the doc.
4. **Three new enforceable rules:** no raw hex outside the two token files; accent never data / data never accent; colour never the sole code.
5. **Untouched:** typography, spacing, radii, elevation, responsive/multi-device rules, the Expo-derived Overview prose, and §12's dual-engine motion mechanics. Repairing the doc's non-colour provenance is a separate decision.

## 6. Token plumbing and migration map

### 6.1 `frontend/src/app/globals.css`

Add `--action` (+ `--action-hover`, `--action-pressed`, `--action-soft`, `--ring` as pinned in §3.1), `--data-rain` (+ dark/light), `--data-temp-{cool,mid,hot}`, `--data-wind`, `--data-confidence-{high,watch,low}`, `--data-{ok,watch,hazard}`, `--data-ok-text`, `--data-verified`, `--series-1..4`, and map each through `@theme inline` so utilities (`text-data-rain`, `bg-series-2`, `ring-action`) exist. `--water` and `--ring: #171717` are **renamed, not aliased**; the audit in §7.2 is what catches stragglers.

### 6.2 `frontend/src/lib/palette.ts`

One module for JS consumers, because recharts `stroke=` props and Leaflet `divIcon` HTML cannot read CSS variables — which is precisely why hex leaked into components. It exports the series, hazard/status and marker colours, and replaces `MODEL_COLOR_CONFIG` (`ModelTrustAtlas`, `StationDossier`), `MODEL_STYLE_MAP` (`RealTrustAtlasMap`), the grey literals in `ModelTrajectories`, and `SERIES_COLORS` in `chart-engine.tsx` (re-exported from here rather than owned there). `lib/utils.ts`'s `getRiskColor`/`getRiskBg`/`getStatusColor` are already uncalled and fold in or are deleted.

### 6.3 Migration order

1. Tokens + `palette.ts` (nothing consumes them yet).
2. Accent promotion: links, selection/active states, focus ring, CTA fills.
3. Water → teal across **27 files**: `AlertCenter`, `brand/MorMark`, `ForecastHero`, `ForecastTimeline`, `ModelComparison`, `ModelSkill`, `pages/ModelIntelligencePage`, `pages/RpiPage`, `PerformanceMatrix3D`, `RegionSelector`, `RPI/ModelTrustAtlas`, `RPI/RealTrustAtlasMap`, `RPI/ResourceRecommendation`, `RPI/RpiHero`, `RPI/StationDossier`, `shell/DockedThumbBar`, `spectrumui/charts/chart-engine`, `spectrumui/data-table`, `StatusStrip`, `ui/badge`, `ui/ShaderButton`, `WeatherMap/index`, `WeatherMap/RealLeafletMap`, `WhyForecast`, `data/mockData`, `data/performanceMatrixData`, `lib/api`.
4. Model identity unified through `palette.ts` (fixes `ModelTrajectories`).
5. Hex retirement across the 17 files with >4 raw hex values, including the off-palette `trophy-icon` values.
6. `DESIGN.md` v4 rewrite (§5).

## 7. Verification and acceptance gates

### 7.1 Baselines that must not regress

- `npx tsc --noEmit` clean.
- ESLint: `RealLeafletMap`'s 5 pre-existing findings (1 error, 4 warnings) must not grow; `RealTrustAtlasMap` stays clean.
- Page-height budgets from the live audit must not move: 390×844 Overview 3.5 / Forecast 3.4 / Extreme Weather 2.6; 768×1024 Overview 3.0 / Performance 2.9; 1440×900 Overview 3.5 / Performance 2.8; zero horizontal overflow at all three viewports. Colour must not cost a single vh.

### 7.2 `scratch/palette_audit.py` (Playwright, all 8 pages × 390/768/1440)

1. Computed text/background contrast ≥ 4.5:1 for body and ≥ 3:1 for large text on every coloured pair.
2. Retired values (`#111827`, `#94a3b8`, `#f8fafc`, `#6f6f6f`) appear nowhere; `#1e6fb8` survives only as a stop inside the ocean *action* gradient and appears on no rainfall surface.
3. Teal appears only on rainfall surfaces; the accent appears only on action/selection surfaces.
4. Per-page distinct hue count stays within budget.

### 7.3 Grep guard

A `grep`-based CI step fails on hex outside `app/globals.css` and `lib/palette.ts` — the mechanical enforcement the current 41-hex drift has never had.

### 7.4 Perceptual checks

Before/after screenshots per page at all three viewports; deuteranopia spot-check on the model-comparison and hazard surfaces (labels and dash patterns are the safety net); verify `forced-colors` mode still conveys state without hue.

## 8. Risks, edge cases, upgrade lever

- **Minimal dosage may still read plain.** This is the owner's original complaint, and the honest mitigation is not to quietly tint surfaces: the named upgrade lever is 6% tinted stat surfaces → hero band saturation → nav active fill, each diallable independently once the result is visible.
- **Temperature hot end vs hazard red.** Defended by reservation: red badges are hazard-only, the ramp lives inside temp charts and is always labelled.
- **Accent vs water.** Defended by tokens plus audit assertion §7.2(3), not by eye.
- **Migration misses.** Defended by the greppable token rename, then the hex sweep, then the audit's retired-value assertion.
- **Contrast.** Teal `#0e7490` (5.36) is darker than today's water `#1e6fb8` (5.22), so water text improves; `--data-ok-text` `#15803d` fixes small green text that currently sits at 3.30.
- **Edge cases:** `prefers-reduced-motion` unaffected; `forced-colors` cannot rely on hue; light-only theme, so no mechanical dark inversion.

## 9. Deliberate deferrals

Dark mode; the Expo-derived non-colour prose in `DESIGN.md`; §12 motion/timing changes; any tinted stat surfaces or page bands (held behind the §8 lever); a reusable Storybook-style palette preview surface.

## 10. Critical files

`frontend/src/app/globals.css`, `frontend/src/lib/palette.ts` (new), `frontend/src/lib/mapConfig.ts` (marker/tile colours only), the 27 water-referencing files, the 17 hex-heavy components, `DESIGN.md` (v3 → v4), `scratch/palette_audit.py` (new), `.github/workflows/` (grep guard).

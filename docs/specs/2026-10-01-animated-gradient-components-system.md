# Specification: Animated Gradient Interactive Component System

**Date:** 2026-10-01  
**Author:** Pair Programming Agent & Developer  
**Status:** Approved for Implementation  
**Design Standard:** DESIGN.md v3 & AGENTS.md  
**Skills Consulted:** `impeccable` (delight/craft), `design-taste-frontend` (`VARIANCE: 6`, `MOTION: 5`, `DENSITY: 6`)

---

## 1. Problem Statement & Motivation

The user appreciated the fluid animated gradient effect on the primary hero button (`ShaderButton`), and requested expanding animated gradients to interactive controls across the application—including action buttons, multiswitch segmented controls, and toggles—while ensuring **different semantic colors are used for different component types**, and recording this standard in both `DESIGN.md` and `AGENTS.md`.

---

## 2. Technical Architecture: Dual-Engine Gradient Architecture

To avoid exceeding browser WebGL context limits (browsers allow a maximum of 8–16 simultaneous active WebGL canvases before crashing with `WEBGL_CONTEXT_LOST`), we establish a dual-engine architecture:

1. **WebGL Mesh Engine (`@shadergradient/react`):**
   - Reserved for prominent primary call-to-action buttons (e.g. Hero "Inspect Model Evidence", API Explorer "Execute Request").
   - Implemented via an upgraded `ShaderButton` with a `variant` prop (`ocean`, `emerald`, `amber`, `indigo`, `ink`).
2. **GPU Hardware-Accelerated CSS Mesh Engine:**
   - Used for multiswitches, segmented controls, small toggles, and secondary buttons.
   - Powered by `@keyframes gradient-flow` with multi-stop linear/radial gradients running on the GPU compositor at 60/120fps with zero WebGL overhead, zero lag, and instant hydration.

---

## 3. Semantic Colorway Taxonomy

| Colorway | Semantic Role | Gradient Stops | Target Component Types |
| :--- | :--- | :--- | :--- |
| **`ocean`** | Atmospheric / Meteorological | `#0d74ce` · `#1e6fb8` · `#38bdf8` | Meteorological exploration, Hero CTA, Weather layer toggles |
| **`emerald`** | Model Verification & Skill | `#16a34a` · `#059669` · `#34d399` | Model recalculate, Synoptic RPI refresh, AI verification buttons |
| **`amber`** | Disaster Risk & NDMA | `#ab6400` · `#d97706` · `#f59e0b` | Emergency alerts, Standby/Dispatch toggles, Hotspot focus |
| **`indigo`** | Developer & Terminal | `#4f46e5` · `#6366f1` · `#818cf8` | API Explorer "Execute Request ▶", CLI copy actions |
| **`ink`** | Editorial & Navigation | `#171717` · `#262626` · `#404040` | Active multiswitch segments, Dossier tabs, Model filter pills |

---

## 4. Component Implementation Plan

### 4.1. Global CSS Tokens (`frontend/src/app/globals.css`)
Define `@keyframes gradient-flow` and classes:
- `.gradient-animated-ocean`
- `.gradient-animated-emerald`
- `.gradient-animated-amber`
- `.gradient-animated-indigo`
- `.gradient-animated-ink`
- Each utility specifies high-contrast white text, smooth `background-size: 200% 200%`, and reduced-motion fallback.

### 4.2. Enhanced `ShaderButton` (`frontend/src/components/ui/ShaderButton.tsx`)
Add `variant?: 'ocean' | 'emerald' | 'amber' | 'indigo' | 'ink'` with:
- Configured 3-color palette per variant.
- Fallback background color matching the variant.

### 4.3. Interactive Component Integrations
- **API Explorer (`ApiPage.tsx`):** Execute Request CTA uses `ShaderButton variant="indigo"`. Active snippet tabs use `.gradient-animated-ink`.
- **Trust Atlas (`RpiPage.tsx`):** "Refresh Index" uses `gradient-animated-emerald` or `ShaderButton variant="emerald"`. Active model filter pill uses animated gradient.
- **Station Dossier (`StationDossier.tsx`):** Active tab switcher pill uses `.gradient-animated-ink`. Standby toggle uses `.gradient-animated-amber` when active.

---

## 5. Documentation Contracts

### 5.1. Update `DESIGN.md`
Add section:
`## 12. Animated Gradient Interactive System`
Documenting the 5 semantic colorways, usage matrix, and accessibility requirements.

### 5.2. Update `AGENTS.md`
Add rule under `## UI / UX`:
- Mandate that interactive CTAs, multiswitches, and active toggles employ the designated semantic animated gradient tokens, prohibiting monochrome flat default buttons for primary actions.

---

## 6. Verification Plan

1. **TypeScript Build:** `npx tsc --noEmit` returns 0 errors.
2. **Next.js Production Build:** `npm run build` succeeds cleanly.
3. **Interactive Validation:** Test buttons and toggles on `http://localhost:3000` across Overview, Trust Atlas, and API Explorer.
4. **Deploy & Sync:** Push to GitHub `main` and deploy to Vercel.

# Implementation Plan: Animated Gradient Interactive Component System

Expand animated gradients to interactive controls across the application—including action buttons, multiswitch controls, tabs, and toggles—with distinct semantic colorways per component type, and formalize this standard in both `DESIGN.md` and `AGENTS.md`.

## User Review Required

> [!NOTE]
> - **Dual-Engine Architecture:** WebGL-powered `ShaderButton` for major standalone CTAs + hardware-accelerated CSS flow for multiswitches, tabs, and toggles. This prevents WebGL context limits (`WEBGL_CONTEXT_LOST`) while providing smooth, fluid animated gradients across dozens of controls.
> - **Colorway Taxonomy:**
>   - `ocean`: Meteorological exploration (Hero "Inspect Model Evidence")
>   - `indigo`: Developer / API operations ("Execute Request ▶", CLI copy)
>   - `emerald`: Model verification & recalculation ("Refresh Index")
>   - `amber`: Emergency & NDMA logistics (Standby / Dispatch toggles)
>   - `ink`: Active multiswitch segments and tab pills

---

## Proposed Changes

### Component 1: Global CSS Tokens & Keyframes

#### [MODIFY] [globals.css](file:///home/asp/.gemini/antigravity/scratch/SIH_MVP202681/frontend/src/app/globals.css)
- Add `@keyframes gradient-flow` with smooth GPU translation and rotation.
- Define 5 utility classes with high-contrast text and glowing shadows:
  - `.gradient-animated-ocean`
  - `.gradient-animated-emerald`
  - `.gradient-animated-amber`
  - `.gradient-animated-indigo`
  - `.gradient-animated-ink`
- Include `@media (prefers-reduced-motion: reduce)` fallbacks.

---

### Component 2: Multi-Colorway WebGL ShaderButton

#### [MODIFY] [ShaderButton.tsx](file:///home/asp/.gemini/antigravity/scratch/SIH_MVP202681/frontend/src/components/ui/ShaderButton.tsx)
- Add `variant?: 'ocean' | 'emerald' | 'amber' | 'indigo' | 'ink'` prop.
- Configure color sets for `@shadergradient/react` and fallback background colors:
  - `ocean`: `#0d74ce`, `#1e6fb8`, `#cfe7ff`
  - `indigo`: `#4f46e5`, `#6366f1`, `#c7d2fe`
  - `emerald`: `#16a34a`, `#059669`, `#bbf7d0`
  - `amber`: `#ab6400`, `#d97706`, `#fde68a`
  - `ink`: `#171717`, `#33373e`, `#e5e7eb`

---

### Component 3: Component Integrations

#### [MODIFY] [ApiPage.tsx](file:///home/asp/.gemini/antigravity/scratch/SIH_MVP202681/frontend/src/components/pages/ApiPage.tsx)
- Primary CTA "Execute Request ▶": replace flat black button with `ShaderButton variant="indigo"`.
- Code snippet language switcher (cURL, Python, TS): active tab uses `.gradient-animated-ink`.

#### [MODIFY] [RpiPage.tsx](file:///home/asp/.gemini/antigravity/scratch/SIH_MVP202681/frontend/src/components/pages/RpiPage.tsx)
- "Refresh Index" button: uses `.gradient-animated-emerald` with subtle glow.
- Model filter pills (All, ECMWF, ICON, GFS, GEM): active pill uses `.gradient-animated-ink`.

#### [MODIFY] [StationDossier.tsx](file:///home/asp/.gemini/antigravity/scratch/SIH_MVP202681/frontend/src/components/RPI/StationDossier.tsx)
- Segmented tab bar (Risk & Trust / NDMA / Hotspots): active tab uses `.gradient-animated-ink`.
- Standby / Dispatch toggle button: active standby state uses `.gradient-animated-amber`.

---

### Component 4: Design System & Agent Directives

#### [MODIFY] [DESIGN.md](file:///home/asp/.gemini/antigravity/scratch/SIH_MVP202681/DESIGN.md)
- Add Section `12. Animated Gradient Interactive System` defining the 5 colorways, component mapping, keyframes, and accessibility requirements.

#### [MODIFY] [AGENTS.md](file:///home/asp/.gemini/antigravity/scratch/SIH_MVP202681/AGENTS.md)
- Under `## UI / UX`, add explicit rules mandating the animated gradient semantic system on interactive buttons, multiswitches, and toggles.

---

## Verification Plan

### Automated Tests
- TypeScript check:
  ```bash
  cd frontend && npx tsc --noEmit
  ```
- Production build:
  ```bash
  cd frontend && npm run build
  ```

### Manual Verification
- Test on `http://localhost:3000/`:
  - Verify Hero "Inspect Model Evidence" retains smooth ocean blue WebGL gradient.
  - Navigate to API Explorer (`/api`): verify "Execute Request ▶" renders with vibrant indigo animated shader, and code snippet tabs use animated ink gradients.
  - Navigate to Trust Atlas (`/rpi`): verify "Refresh Index" renders with emerald animated gradient, model filter pills switch with animated ink pill, and Standby toggles use animated amber.
- Push to GitHub `main` and deploy to Vercel production.

# Specification: Zero-Scroll API Explorer & Trust Atlas Redesign

**Date:** 2026-10-01  
**Author:** Pair Programming Agent & Developer  
**Status:** Approved for Implementation  
**Design Standard:** DESIGN.md v3 (White Editorial System, Inter + JetBrains Mono)  
**UX Mandate:** Zero-Outer-Scroll Viewport Command Deck (`h-[calc(100vh-6.5rem)]`)

---

## 1. Problem Statement & Motivation

1. **Trust Atlas (`/rpi`):** Previously, the page was arranged as a tall vertical stack (~1400px+ height): Page Header → Region Selector → RPI Hero Card → NDMA Resource Table → Leaflet Trust Atlas Map. Users had to scroll down past multiple screens to view the map, click a station marker, and then scroll back to the top to see the updated RPI score and resource allocations.
2. **API Explorer (`/api`):** Prakruti has high-value backend endpoints (probabilistic quantiles, ECE confidence metrics, Kalman-filtered weights, RPI spatial geojson, NDMA advisories), but no integrated interactive explorer. Traditional API docs (Swagger/Redoc) cause endless vertical scrolling.
3. **Core UX Directive:** *"I want something that will help users not to scroll too much! Because scrolling makes user experience annoying!"*

---

## 2. Design System & Constraints

All new and modified components must strictly abide by **DESIGN.md v3** and **AGENTS.md**:
- **Canvas:** Pure white canvas (`#ffffff`), ink `#171717` primary typography, pure black `#000000` for primary CTA button fills.
- **Typography:** Inter (600 display, 400 body) for prose/headings; JetBrains Mono for all numerals, metrics, latency badges, and code blocks.
- **Radii:** 8px on buttons/inputs (`rounded-md`), 12px on panels (`rounded-lg`), pill only on status badges.
- **Colors:** Semantic signals only (Success `#16a34a` = OK, Warning `#ab6400` = watch, Destructive `#b42318` = hazard, Water `#1e6fb8` = rainfall data).
- **Anti-Slop:** No generic floating AI gradients, no decorative filler cards, no excessive padding forcing page scrolling.

---

## 3. Component Architecture & Zero-Scroll Layouts

### 3.1. Trust Atlas Command Deck (`RpiPage.tsx` / `ModelTrustAtlas.tsx`)
**Layout:** Single-viewport 60/40 split (`h-[calc(100vh-6.5rem)]`) with zero outer page scroll.

```
┌───────────────────────────────────────────────┬───────────────────────────────────────────────┐
│ 🗺️ RealTrustAtlasMap (60% Width)              │ 📋 Station Dossier Dock (40% Width)           │
│ ┌───────────────────────────────────────────┐ │ ┌─ Tabs: [Overview] [NDMA Logistics] [Hotspots] │
│ │ Model Filters: [All] [ECMWF] [ICON] [GFS] │ │ │                                             │
│ │ Station Search: [ Quick city search...  ] │ │ │ • Selected: Kanpur, Uttar Pradesh           │
│ │                                           │ │ │ • RPI Score: 68/100 (HIGH RISK)             │
│ │ 📍 Interactive Leaflet Map                │ │ │ • Dominant NWP: ECMWF IFS (45% Weight)      │
│ │    45 Regional IMD/NWP Stations           │ │ │ • Kalman Weight Breakdown (EC/IC/GF/GE)     │
│ │    Color-coded by best-performing model   │ │ │ • Standby Equipment & Team Allocations      │
│ └───────────────────────────────────────────┘ │ └─────────────────────────────────────────────┘
└───────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

1. **Left Panel (60%): Interactive Map Viewport**
   - Fixed height container with rounded border (`rounded-lg border border-border`).
   - Model filter pill bar: `All Models`, `ECMWF (Europe)`, `ICON (Germany)`, `GFS (NOAA)`, `GEM (Canada)`.
   - Compact station search input with instant fly-to and pin selection.
   - Synchronized station pins with live RPI severity and dominant model halos.
2. **Right Panel (40%): Docked Station Intelligence Dossier**
   - Tab 1 — **Overview & Trust**:
     - Circular RPI Risk Gauge + Severity Badge (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`).
     - Dominant Model card with historical explanation and bias weight.
     - Live Kalman filter weight distribution progress bars (ECMWF, ICON, GFS, GEM).
     - Station confidence & ECE calibration score.
   - Tab 2 — **NDMA Logistics**:
     - Compact pre-positioning checklist for the active station (pumps, boats, rescue teams).
     - Response tier badge and urgency timeline.
   - Tab 3 — **National Hotspots**:
     - Top 5 highest RPI stations across India.
     - 1-click station jump to immediately focus the Leaflet map and update telemetry.

---

### 3.2. API Explorer Workbench (`ApiPage.tsx`)
**Layout:** Single-viewport 38/62 split (`h-[calc(100vh-6.5rem)]`) with zero outer page scroll.

```
┌──────────────────────────────────────┬────────────────────────────────────────────────────────┐
│ 🔌 Endpoint Navigator & Params (38%)  │ ⚡ Live Inspector & Schema (62%)                       │
│ ┌──────────────────────────────────┐ │ ┌─ Tabs: [Live Response] [Code Snippets] [Schema]      │
│ │ Search Endpoints: [ Search...  ] │ │ │                                                      │
│ │ • GET /api/forecast              │ │ │ Status: 200 OK  •  Latency: 142ms  •  Size: 1.4 KB   │
│ │ • GET /api/decision              │ │ │ [ Copy JSON ]                                        │
│ │ • GET /api/rpi                   │ │ │ {                                                    │
│ │ • GET /api/rpi/map               │ │ │   "city": "Kanpur",                                  │
│ │ • GET /api/weights               │ │ │   "temperature_c": 31.4,                             │
│ │                                  │ │ │   "rainfall_mm": 18.2                                │
│ │ Parameters:                      │ │ │ }                                                    │
│ │ • city: [ Kanpur           ▼ ]   │ │ └──────────────────────────────────────────────────────┘
│ │ • lead_day: [ 1            ▼ ]   │                                                          │
│ │ [ Execute Request (Render) ▶ ]   │                                                          │
│ └──────────────────────────────────┘                                                          │
└──────────────────────────────────────┴────────────────────────────────────────────────────────┘
```

1. **Left Panel (38%): Endpoint Navigator & Parameter Form**
   - Category-grouped endpoint catalog:
     - **Blended Forecasts:** `GET /api/forecast`, `GET /api/decision`, `GET /api/confidence`
     - **Synoptic Risk:** `GET /api/rpi`, `GET /api/rpi/map`, `GET /api/weights`
     - **Operations & Health:** `GET /api/alerts`, `GET /api/advisories`, `GET /api/cities`, `GET /api/health`
   - Active endpoint badge, description, and base URL indicator (`https://prakruti-api.onrender.com`).
   - Dynamic parameter inputs: `city` (45 station select), `lead_day` (1-7), `variable` (`temperature`, `rainfall`, `wind_speed`).
   - Primary action CTA: `Execute Request ▶` with loading spinner.
2. **Right Panel (62%): Pinned Inspector Console**
   - **Tab 1: Live Response**
     - Status badge (e.g. `200 OK` in green or `500` in red), round-trip latency (`142ms`), and response size (`1.4 KB`).
     - Syntax-highlighted, formatted JSON tree with 1-click clipboard copy.
     - Fallback / cold start warning banner if Render backend is sleeping.
   - **Tab 2: Code Snippets**
     - Sub-tabs for `cURL`, `Python (requests)`, and `TypeScript (fetch)`.
     - 1-click "Copy Code" button.
   - **Tab 3: Schema & Types**
     - Parameter table (Parameter, Type, Required, Default, Description).
     - Response field definitions and TypeScript interface example.

---

### 3.3. Navigation Integration
- Add `'api'` to `NavPage` in `frontend/src/types/index.ts`.
- Add `{ page: 'api', label: 'API Explorer', subtitle: 'Live test bench and schema for developers & civil defense', icon: Terminal }` to `NAV_ITEMS` in `NavRail.tsx`.
- Wire `'api'` route in `frontend/src/app/page.tsx` rendering `<ApiPage />`.

---

## 4. Verification & Testing Plan

1. **Build Validation:** Run `npm run build` in `frontend/` to ensure zero TypeScript, lint, or bundling errors.
2. **Viewport Fitting (Zero Outer Scroll):** Verify both `/rpi` and `/api` fit inside a standard 900px viewport height without triggering `window.scrollY`.
3. **Live API Integration:** Test execution against `https://prakruti-api.onrender.com` for `/api/forecast`, `/api/rpi`, and `/api/cities`.
4. **Synchronized State in Trust Atlas:** Clicking any pin on the map immediately updates the right-hand dossier without page repositioning.

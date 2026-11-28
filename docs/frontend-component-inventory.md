# Prakruti Frontend Component Inventory

The frontend contains **160 source files**, including:

- 144 component files
- App shell and global styling
- Page compositions
- Data and API utilities
- Type definitions
- Icon system
- Spectrum UI components

## 1. App entry, layout, and styling

| File | Purpose |
|---|---|
| `src/app/layout.tsx` | Root layout, metadata, font loading, tooltip provider, splash screen, mesh layer, Agentation |
| `src/app/page.tsx` | Main dashboard shell and client-side page switching |
| `src/app/globals.css` | Global design tokens, colors, spacing, typography, gradients, and animations |
| `src/app/favicon.ico` | Browser favicon |
| `src/app/icon.png` | App icon |

### Fonts

- **Inter** — body and UI text; weights 400, 500, 600, 700; `--font-inter`
- **JetBrains Mono** — numbers, timestamps, technical data, and code surfaces; weights 400, 500, 600; `--font-jetbrains-mono`
- **Noto Sans Devanagari** — Hindi and Devanagari text; `--font-devanagari`

## 2. Application shell

### Header and navigation

| File | Component |
|---|---|
| `components/shell/TopBar.tsx` | Fixed top header |
| `components/brand/MorMark.tsx` | Prakruti peacock/rain-dancer logo |
| `components/SplitFlapText.tsx` | Animated `PRAKRUTI` / `प्रकृति` wordmark |
| `components/shell/NavRail.tsx` | Navigation item definitions and groups |
| `components/shell/NavRailView.tsx` | Desktop rail, tablet rail, mobile navigation, and More menu |
| `components/shell/PhoneStationPicker.tsx` | Mobile station selector |
| `components/shell/PageHeader.tsx` | Page title and subtitle header |
| `components/shell/SectionBanner.tsx` | Section header/banner |
| `components/shell/Panel.tsx` | Reusable bordered panel with responsive disclosure |
| `components/shell/MeshVisibility.tsx` | Background mesh visibility controller |

### Header features

- Prakruti logo
- Animated split-flap brand name
- Desktop clock
- Active station badge
- Alert drawer trigger
- Data health shortcut
- Blending engine status trigger
- Collapsible desktop navigation rail
- Tablet icon rail
- Mobile bottom navigation
- Mobile More menu
- Station selection

## 3. Status and backend state

| File | Component |
|---|---|
| `components/StatusStrip/index.tsx` | Forecast cycle status, station/model counts, and refresh |
| `components/BackendConnectingIndicator/index.tsx` | Render/API cold-start indicator |
| `components/BlendingEngine/index.tsx` | Blending engine modal and processing pipeline |
| `components/AlertCenter/index.tsx` | Active alerts drawer |
| `components/WelcomeSplash/index.tsx` | Initial welcome/onboarding splash |

## 4. Main dashboard components

| File | Component |
|---|---|
| `components/ForecastHero/index.tsx` | Main forecast answer and hero |
| `components/ForecastHero/CitizenWeatherBrief.tsx` | Plain-language weather guidance |
| `components/LiveConditions/index.tsx` | Current live weather band |
| `components/LiveConditions/IntradayStrip.tsx` | Intraday temperature/current-condition strip |
| `components/ForecastTimeline/index.tsx` | Multi-day forecast timeline and area chart |
| `components/WeatherMap/index.tsx` | Weather map wrapper |
| `components/WeatherMap/RealLeafletMap.tsx` | Leaflet map implementation |
| `components/RegionSelector/index.tsx` | State, district, and quick-station selector |
| `components/ExtremeWeather/index.tsx` | Extreme weather panel |
| `components/WhyForecast/index.tsx` | Forecast explanation modal |
| `components/ModelContribution/index.tsx` | Model contribution visualization |
| `components/ModelComparison/index.tsx` | Forecast model comparison chart |
| `components/ModelSkill/index.tsx` | Historical model skill panel |
| `components/DataHealth/index.tsx` | Data-source and pipeline health panel |

## 5. Forecast and visualization components

### Charts

| File | Visualization |
|---|---|
| `ForecastTimeline/index.tsx` | Recharts `AreaChart` for rainfall, temperature, and wind |
| `ModelComparison/index.tsx` | Recharts `BarChart` for model comparison |
| `ModelTrajectories/index.tsx` | Recharts composed line/area forecast chart |
| `ModelCalibration/index.tsx` | Calibration statistics and model correction table |
| `ModelVerification/index.tsx` | Verification metrics and score comparisons |
| `LiveConditions/IntradayStrip.tsx` | Current-period data strip |
| `PerformanceMatrix3D/index.tsx` | Three.js / React Three Fiber performance matrix |

### Maps

| File | Function |
|---|---|
| `WeatherMap/index.tsx` | Dynamic Leaflet loader and map panel |
| `WeatherMap/RealLeafletMap.tsx` | Interactive forecast map |
| `RPI/RealTrustAtlasMap.tsx` | Interactive RPI/model trust map |
| `RegionSelector/index.tsx` | Location and station selection |

Map features include Leaflet or Mapbox/CartoDB tiles, station markers, popups, city selection, zoom controls, and model filters.

## 6. RPI and risk components

| File | Component |
|---|---|
| `components/RPI/RpiHero.tsx` | RPI score hero |
| `components/RPI/RealTrustAtlasMap.tsx` | Trust atlas map |
| `components/RPI/ModelTrustAtlas.tsx` | Model trust and adaptive weights |
| `components/RPI/StationDossier.tsx` | Selected-station risk dossier |
| `components/RPI/ResourceRecommendation.tsx` | Resource and emergency recommendation panel |

RPI features:

- Risk score
- Priority badge
- Rain, heat, and wind risk
- Confidence
- Dominant model
- Model weights
- Station hotspots
- NDMA recommendations
- Station map
- Model trust ranking

## 7. Model intelligence and performance

| File | Component |
|---|---|
| `ModelContribution/index.tsx` | Model contribution percentages |
| `ModelSkill/index.tsx` | Historical skill metrics |
| `ModelTrajectories/index.tsx` | Forecast trajectories |
| `ModelVerification/index.tsx` | Verification metrics |
| `ModelCalibration/index.tsx` | Bias correction and calibration |
| `ModelComparison/index.tsx` | Cross-model comparison |
| `PerformanceMatrix3D/index.tsx` | 3D RMSE/MAE/skill matrix |
| `common/ModelEmblem.tsx` | Model identity and provenance emblem |

Supported model identities include ECMWF, ICON, GFS, GEM, JMA, UKMO, and the hybrid blend.

## 8. Leaderboard components

| File | Component |
|---|---|
| `Leaderboard/Hero.tsx` | Leaderboard introduction |
| `Leaderboard/PodiumMatrix.tsx` | Top-model podium |
| `Leaderboard/RankingTable.tsx` | Model ranking table |
| `Leaderboard/ParetoView.tsx` | Pareto comparison visualization |
| `Leaderboard/SignalLeaders.tsx` | Category leaders |
| `Leaderboard/ModelSourceCard.tsx` | Model source and provenance card |
| `Leaderboard/Bench.tsx` | Benchmark summary |
| `Leaderboard/types.ts` | Leaderboard types |

## 9. Page-level screens

| File | Screen |
|---|---|
| `pages/ForecastPage.tsx` | Forecast screen |
| `pages/ModelIntelligencePage.tsx` | Model intelligence screen |
| `pages/ByomPage.tsx` | Bring Your Own Model screen |
| `pages/ExtremeWeatherPage.tsx` | Extreme weather screen |
| `pages/ModelPerformancePage.tsx` | Model performance screen |
| `pages/LeaderboardPage.tsx` | Leaderboard screen |
| `pages/DataHealthPage.tsx` | Data health screen |
| `pages/RpiPage.tsx` | Risk Priority Index screen |
| `pages/ApiPage.tsx` | API explorer screen |

### Navigation destinations

#### Operate

- Overview
- Forecast
- RPI & Trust Atlas
- Extreme Weather

#### Understand

- Model Intelligence
- Performance
- Leaderboard

#### System

- BYOM
- Data Health
- API Explorer

## 10. Reusable UI primitives

| File | Component |
|---|---|
| `ui/button.tsx` | Base button |
| `ui/badge.tsx` | Status/category badge |
| `ui/tabs.tsx` | Tabs |
| `ui/accordion.tsx` | Accordion |
| `ui/select.tsx` | Select/dropdown |
| `ui/popover.tsx` | Popover |
| `ui/tooltip.tsx` | Tooltip |
| `ui/switch.tsx` | Native-style switch |
| `ui/ShaderSwitch.tsx` | Animated gradient switch |
| `ui/ShaderButton.tsx` | Animated gradient button |
| `ui/Modal.tsx` | Modal dialog |
| `ui/ProgressBar.tsx` | Progress bar |
| `ui/skeleton.tsx` | Basic skeleton |
| `ui/SkeletonLoader.tsx` | Skeleton loading layouts |
| `ui/LoadingState.tsx` | Loading state with icon, label, and hint |

## 11. Spectrum UI blocks

### AI assistant blocks

| File | Component |
|---|---|
| `spectrumui/blocks/ai-assistants/error-state.tsx` | AI error state |
| `spectrumui/blocks/ai-assistants/loading-state.tsx` | AI loading state |
| `spectrumui/blocks/ai-assistants/status-tracker.tsx` | Task/status tracker |
| `spectrumui/blocks/ai-assistants/task-rows.tsx` | Task row list |

### Empty states

| File | Component |
|---|---|
| `spectrumui/blocks/empty-states/empty-state-kit.tsx` | Empty-state framework, icons, animation helpers, empty panels |
| `spectrumui/blocks/empty-states/notification-empty.tsx` | Empty notification state |

The empty-state kit includes empty medallions, panels, actions, ghost rows, keyboard shortcut badges, hints, meters, status indicators, drop targets, icons, reveal animations, and spring presets.

### Footers

| File | Component |
|---|---|
| `spectrumui/blocks/footers/minimal-footer.tsx` | Current application footer |
| `spectrumui/blocks/footers/service-status-footer.tsx` | Service/status footer |
| `spectrumui/blocks/footers/footer-kit.tsx` | Footer primitives, links, social icons, and brand lockup |

### Other Spectrum components

| File | Component |
|---|---|
| `spectrumui/avatar-stack.tsx` | Avatar stack |
| `spectrumui/data-table.tsx` | Generic data table |
| `spectrumui/charts/stat-cards.tsx` | Statistic cards |
| `spectrumui/charts/cohort-chart.tsx` | Cohort chart |
| `spectrumui/charts/chart-engine.tsx` | Chart utilities and primitives |
| `spectrumui/charts/chart-states.tsx` | Chart loading, empty, error, and ready states |

## 12. Backgrounds and decorative layers

| File | Feature |
|---|---|
| `components/DotGrid.tsx` | Canvas-based dot-grid background |
| `components/shell/MeshVisibility.tsx` | Mesh background visibility controller |
| `ui/ShaderButton.tsx` | Shader-gradient button surface |
| `ui/ShaderSwitch.tsx` | Shader-gradient switch surface |
| `empty-state-kit.tsx` | Medallion backdrop and decorative empty-state layers |
| `globals.css` | Hero wash, colorway gradients, transitions, and keyframes |

Current visual language:

- White editorial canvas
- Ink text
- Ocean-blue action color
- Ocean, emerald, amber, and neutral state gradients
- Soft hero atmosphere
- Thin borders
- Rounded panels
- Monospace metrics
- Limited shadows
- Animated shader controls
- Canvas dot-grid background

## 13. Icon system

The icon system is centralized through `components/icons/index.ts`.

### Navigation and layout icons

- Layout dashboard
- Sidebar collapse
- Globe
- Terminal
- CPU
- Gauge
- Bar chart
- Chart histogram
- Layers

### Weather icons

- Cloud variants
- Droplet
- Wind
- Sun
- Flame
- Thermometer
- Satellite dish

### Risk and operations icons

- Triangle alert
- Shield check
- Scan heart
- Truck
- Users
- Lock
- Checked
- Simple checked

### Interaction icons

- Chevron up/down/left/right
- Zoom in/out
- Refresh
- Copy
- Send
- External link
- Close/X
- Pointer
- Magnifier
- Arrow right

### Brand and visual icons

- Sparkles
- Brain circuit
- Trophy
- Player icon
- MorMark

The project also includes the animated icon wrapper in `icons/hover-host.tsx`, including `AnimatedIcon` and `AnimatedIconHandle`.

## 14. Explanation and glossary system

| File | Component |
|---|---|
| `components/explain/Explain.tsx` | Inline explanation/help trigger |
| `components/explain/glossary.ts` | Glossary terms and explanations |

The glossary supports concepts such as forecast horizon, model agreement, confidence, skill score, RPI, model count, uncertainty, and calibration.

## 15. Data and API files

| File | Purpose |
|---|---|
| `lib/api.ts` | API client, retries, backend status, forecasts, alerts, and metadata |
| `lib/mapConfig.ts` | Map configuration and Mapbox settings |
| `lib/palette.ts` | Color palette for charts, maps, and model series |
| `lib/utils.ts` | Shared utility helpers |
| `lib/useNow.ts` | Current-time hook |
| `lib/useMediaQuery.ts` | Responsive media-query hook |
| `lib/useLiveConditions.ts` | Live-conditions polling/store |
| `data/mockData.ts` | Mock fallback data |
| `data/byomSample.ts` | BYOM sample dataset |
| `data/performanceMatrixData.ts` | 3D performance matrix data |
| `types/index.ts` | Shared frontend TypeScript types |

## 16. Chart and graph types

The frontend includes:

- Area charts
- Bar charts
- Composed line/area charts
- Forecast timeline charts
- Model trajectory charts
- Model comparison charts
- Calibration tables
- Verification tables
- Leaderboard tables
- Pareto visualizations
- 3D performance matrix
- Map-based station plots
- RPI risk maps
- Progress bars
- Confidence meters
- Model-weight bars
- Statistic cards
- Intraday data strips
- Sparkline-style data blocks

Rendering technologies:

- Recharts
- React Three Fiber
- Three.js
- Leaflet
- Canvas
- CSS gradients and shader canvases

## 17. Component hierarchy

```text
RootLayout
├── TooltipProvider
├── Home dashboard
│   ├── TopBar
│   │   ├── MorMark
│   │   ├── SplitFlapText
│   │   ├── AlertDrawer
│   │   └── BlendingEngineModal
│   ├── NavRail
│   │   ├── Desktop navigation
│   │   ├── Tablet navigation
│   │   └── Mobile navigation + More menu
│   ├── BackendConnectingIndicator
│   ├── StatusStrip
│   ├── Active page
│   │   ├── Forecast
│   │   ├── RPI
│   │   ├── Model Intelligence
│   │   ├── BYOM
│   │   ├── Extreme Weather
│   │   ├── Performance
│   │   ├── Leaderboard
│   │   ├── Data Health
│   │   └── API Explorer
│   ├── MinimalFooter
│   └── MeshVisibility
└── WelcomeSplash
```

## 18. Reusable visual vocabulary

- Header
- Logo
- Wordmark
- Navigation rail
- Mobile bottom navigation
- Station picker
- Status strip
- Footer
- Page header
- Section banner
- Panel/card
- Modal
- Drawer
- Tabs
- Accordion
- Select
- Tooltip
- Badge
- Switch
- Button
- Progress bar
- Skeleton loader
- Loading state
- Error state
- Empty state
- Weather hero
- Forecast card
- Map
- Timeline
- Area chart
- Bar chart
- Line chart
- 3D chart
- Data table
- Ranking table
- Leaderboard
- Risk dossier
- Recommendation list
- Model-weight bars
- Confidence meter
- Alert drawer
- Backend connection indicator
- Glossary popover
- Animated icon
- Shader button
- Shader switch
- Dot-grid background
- Mesh background
- Spring/reveal animations

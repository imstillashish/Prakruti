'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Droplets,
  Thermometer,
  Wind,
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles,
  SlidersHorizontal,
  ChevronLeft,
  RefreshCw,
  Info,
  Check,
  Radio,
  Zap,
  Flame,
} from 'lucide-react';
import { ACCENT, DATA, SERIES, SERIES_ORDER } from '@/lib/palette';

// Helper contrast calculator for WCAG AA validation
function getLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const a = [r, g, b].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function getContrast(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return Math.round(ratio * 100) / 100;
}

export default function PalettePrototypePage() {
  const [dosageMode, setDosageMode] = useState<'minimal' | 'lift'>('minimal');
  const [activeTab, setActiveTab] = useState<'all' | 'tokens' | 'water' | 'models' | 'accent' | 'simulation' | 'indicators'>('all');
  const [indicatorMode, setIndicatorMode] = useState<'chip' | 'notch' | 'badge' | 'mono-tag' | 'icon'>('chip');
  const [waterComparison, setWaterComparison] = useState<'new' | 'old' | 'side-by-side'>('side-by-side');
  const [ctaComparison, setCtaComparison] = useState<'new' | 'old' | 'side-by-side'>('side-by-side');
  const [indicatorDuelMode, setIndicatorDuelMode] = useState<'impeccable' | 'slop-dot'>('impeccable');
  const [selectedModels, setSelectedModels] = useState<Record<string, boolean>>({
    ECMWF: true,
    ICON: true,
    GFS: true,
    GEM: true,
  });
  const [actionCount, setActionCount] = useState(0);

  const renderIndicator = (color: string, label: string) => {
    switch (indicatorMode) {
      case 'chip':
        return (
          <span
            className="w-3.5 h-2 rounded-xs border border-border/80 shadow-2xs shrink-0"
            style={{ backgroundColor: color }}
            title={`Specimen Chip ${color}`}
          />
        );
      case 'notch':
        return (
          <span
            className="w-1 h-3.5 rounded-xs shrink-0"
            style={{ backgroundColor: color }}
            title={`Hairline Notch ${color}`}
          />
        );
      case 'badge':
        return (
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-mono border font-semibold shrink-0"
            style={{ borderColor: `${color}40`, backgroundColor: `${color}15`, color }}
          >
            {label}
          </span>
        );
      case 'mono-tag':
        return (
          <span className="font-mono text-[10px] font-bold tracking-tight text-muted-foreground shrink-0">
            [{label}]
          </span>
        );
      case 'icon':
        return <Droplets size={14} className="shrink-0" style={{ color }} />;
      default:
        return null;
    }
  };

  // Mock 24h trajectory data for rainfall and models
  const timePoints = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '24:00'];
  const rainData = [1.2, 2.8, 5.4, 14.2, 18.6, 9.4, 4.1, 1.8, 0.4]; // mm/h
  const modelTrajectories: Record<string, number[]> = {
    ECMWF: [1.1, 2.6, 5.8, 15.1, 19.4, 10.2, 4.5, 1.9, 0.3],
    ICON: [1.4, 3.2, 6.2, 16.0, 17.8, 8.9, 3.8, 1.5, 0.5],
    GFS: [0.9, 2.1, 4.5, 12.4, 16.5, 8.1, 3.2, 1.4, 0.2],
    GEM: [1.3, 3.0, 5.1, 13.8, 20.1, 10.8, 5.0, 2.2, 0.6],
  };

  const toggleModel = (model: string) => {
    setSelectedModels((prev) => ({ ...prev, [model]: !prev[model] }));
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-action-soft selection:text-action">
      {/* Top Banner & Wayfinding */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border"
            >
              <ChevronLeft size={14} />
              Back to Overview
            </Link>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-action font-mono">v4 Palette Prototype</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-action-soft text-action border border-action/20">
                Decision Gate
              </span>
            </div>
          </div>

          {/* Dosage Switcher */}
          <div className="flex items-center gap-2 bg-secondary p-1 rounded-lg border border-border">
            <span className="text-[11px] font-mono text-muted-foreground pl-2 pr-1 hidden md:inline">Dosage Mode:</span>
            <button
              onClick={() => setDosageMode('minimal')}
              className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                dosageMode === 'minimal'
                  ? 'bg-card text-foreground shadow-xs border border-border font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              1. Minimal Dosage (v4 Spec)
            </button>
            <button
              onClick={() => setDosageMode('lift')}
              className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                dosageMode === 'lift'
                  ? 'bg-action text-white shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              2. Subtle Lift (4% Tint Lever)
            </button>
          </div>
        </div>
      </header>

      {/* Hero Overview */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        <section className="space-y-4">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-action-soft text-action border border-action/20 text-xs font-mono">
            <Sparkles size={13} />
            <span>Interactive Evaluation Lab — DESIGN.md v4</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            Color System v4: Accent Promotion & Data Roles
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-3xl leading-relaxed">
            Prakruti is moving from grey-on-white neutral wash to meaning-bound operational color. This prototype isolates the four pillars
            so you can judge whether <strong>minimal dosage</strong> is enough before repository-wide migration.
          </p>

          {/* Section Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-b border-border pb-4">
            {[
              { id: 'all', label: 'All Sections' },
              { id: 'tokens', label: '1. Tokens & Contrast' },
              { id: 'water', label: '2. Water → Teal' },
              { id: 'models', label: '3. Model Series' },
              { id: 'accent', label: '4. Accent Promotion' },
              { id: 'simulation', label: '5. Operational Simulation' },
              { id: 'indicators', label: '6. Indicator Lab (Anti-Dot)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-action text-white font-medium'
                    : 'bg-secondary text-muted-foreground hover:text-foreground border border-border/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 1: TOKEN MATRIX & CONTRAST GUARD                                   */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'tokens') && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border pb-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                  <span>1. Token Architecture & Contrast Guard</span>
                  <span className="text-xs font-mono font-normal text-muted-foreground">(`globals.css` ↔ `lib/palette.ts`)</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Single source of truth: all values pass WCAG AA on white (body ≥ 4.5:1, large ≥ 3:1). Scaled ramp values are strictly fill-only.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                <CheckCircle2 size={13} />
                <span>AA Contrast Passing</span>
              </span>
            </div>

            {/* Token Group 1: Chrome Accent */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-muted-foreground">
                Layer 1 — The Accent (Chrome Only: Action, Selection, Wayfinding)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {[
                  { name: '--action', js: 'ACCENT.base', hex: ACCENT.base, desc: 'Base CTA, links, active pills', bg: '#0d74ce', textWhite: true },
                  { name: '--action-hover', js: 'ACCENT.hover', hex: ACCENT.hover, desc: 'Pointer hover state', bg: '#0b63b0', textWhite: true },
                  { name: '--action-pressed', js: 'ACCENT.pressed', hex: ACCENT.pressed, desc: 'Active pressed state', bg: '#0a5594', textWhite: true },
                  { name: '--action-soft', js: 'ACCENT.soft', hex: ACCENT.soft, desc: 'Selected segment/row tint', bg: '#ecf4fc', textWhite: false },
                ].map((item) => {
                  const contrastOnWhite = getContrast(item.hex, '#ffffff');
                  return (
                    <div key={item.name} className="p-3.5 rounded-lg border border-border bg-card space-y-2.5">
                      <div className="h-12 rounded-md flex items-center justify-between px-3 text-xs font-mono" style={{ backgroundColor: item.bg, color: item.textWhite ? '#ffffff' : '#171717' }}>
                        <span className="font-semibold">{item.name}</span>
                        <span className="opacity-90">{item.hex}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-muted-foreground">{item.js}</span>
                        <span className={`px-1.5 py-0.5 rounded font-semibold ${contrastOnWhite >= 4.5 ? 'text-emerald-700 bg-emerald-50' : 'text-muted-foreground bg-secondary'}`}>
                          {contrastOnWhite}:1 on white
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Token Group 2: Data Roles */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-muted-foreground">
                Layer 2 — Data Roles (Encoding, Never Decoration)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {[
                  { name: '--data-rain', js: 'DATA.rain', hex: DATA.rain, role: 'Rainfall / Water', rule: '5.36:1 AA', bg: '#0e7490', textWhite: true },
                  { name: '--data-rain-dark', js: 'DATA.rainDark', hex: DATA.rainDark, role: 'Rain Text on Tint', rule: '7.27:1 AAA', bg: '#155e75', textWhite: true },
                  { name: '--data-rain-light', js: 'DATA.rainLight', hex: DATA.rainLight, role: 'Rain Fill Only', rule: 'Fill-only (1.45:1)', bg: '#67e8f9', textWhite: false },
                  { name: '--data-wind', js: 'DATA.wind', hex: DATA.wind, role: 'Wind Speed', rule: '7.58:1 AAA', bg: '#475569', textWhite: true },
                  { name: '--data-temp-cool', js: 'DATA.tempCool', hex: DATA.tempCool, role: 'Temp Low Ramp', rule: 'Fill-only, never text', bg: '#fbbf24', textWhite: false },
                  { name: '--data-temp-mid', js: 'DATA.tempMid', hex: DATA.tempMid, role: 'Temp Mid Ramp', rule: 'Fill-only, never text', bg: '#f97316', textWhite: true },
                  { name: '--data-temp-hot', js: 'DATA.tempHot', hex: DATA.tempHot, role: 'Temp High Ramp', rule: '4.83:1 AA on white', bg: '#dc2626', textWhite: true },
                  { name: '--data-ok-text', js: 'DATA.okText', hex: DATA.okText, role: 'Verification / OK Text', rule: '5.02:1 AA (fixes 3.30)', bg: '#15803d', textWhite: true },
                ].map((item) => (
                  <div key={item.name} className="p-3.5 rounded-lg border border-border bg-card space-y-2">
                    <div className="h-10 rounded-md flex items-center justify-between px-3 text-xs font-mono" style={{ backgroundColor: item.bg, color: item.textWhite ? '#ffffff' : '#171717' }}>
                      <span className="font-semibold">{item.name}</span>
                      <span className="opacity-90">{item.hex}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-foreground font-medium">{item.role}</span>
                      <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{item.rule}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Token Group 3: Categorical Model Series */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-muted-foreground">
                Layer 3 — Categorical Model Scale (Distinct Hues for Multi-Model Intelligence)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {SERIES_ORDER.map((model, idx) => {
                  const hex = SERIES[model];
                  const contrast = getContrast(hex, '#ffffff');
                  return (
                    <div key={model} className="p-3.5 rounded-lg border border-border bg-card space-y-2">
                      <div className="h-10 rounded-md flex items-center justify-between px-3 text-xs font-mono text-white" style={{ backgroundColor: hex }}>
                        <span className="font-semibold">{model}</span>
                        <span>--series-{idx + 1}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-muted-foreground">{hex}</span>
                        <span className="px-1.5 py-0.5 rounded font-semibold text-emerald-700 bg-emerald-50">
                          {contrast}:1 AA
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION 2: WATER → TEAL MIGRATION                                          */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'water') && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-border pb-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                  <span>2. Water → Teal Migration Lab</span>
                  <span className="text-xs font-mono font-normal text-muted-foreground">(Freeing blue for action)</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  In v3, rainfall borrowed blue (`#1e6fb8`), causing collision with buttons and links. In v4, rainfall moves to cyan-teal (`#0e7490`).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-secondary p-1 rounded-md border border-border text-xs font-mono">
                  <span className="text-[10px] text-muted-foreground px-1.5 uppercase tracking-wider font-semibold">Indicator:</span>
                  {(['chip', 'notch', 'badge', 'mono-tag', 'icon'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setIndicatorMode(m)}
                      className={`px-2 py-0.5 rounded capitalize transition-all ${
                        indicatorMode === m
                          ? 'bg-card text-foreground font-semibold shadow-xs border border-border'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 bg-secondary p-1 rounded-md border border-border text-xs font-mono">
                  <button
                    onClick={() => setWaterComparison('side-by-side')}
                    className={`px-2 py-0.5 rounded ${waterComparison === 'side-by-side' ? 'bg-card text-foreground font-semibold shadow-xs' : 'text-muted-foreground'}`}
                  >
                    Side-by-Side
                  </button>
                  <button
                    onClick={() => setWaterComparison('new')}
                    className={`px-2 py-0.5 rounded ${waterComparison === 'new' ? 'bg-card text-foreground font-semibold shadow-xs' : 'text-muted-foreground'}`}
                  >
                    v4 Teal Only
                  </button>
                  <button
                    onClick={() => setWaterComparison('old')}
                    className={`px-2 py-0.5 rounded ${waterComparison === 'old' ? 'bg-card text-foreground font-semibold shadow-xs' : 'text-muted-foreground'}`}
                  >
                    v3 Blue Only
                  </button>
                </div>
              </div>
            </div>

            <div className={`grid gap-6 ${waterComparison === 'side-by-side' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-2xl'}`}>
              {/* V3 Old Water Blue */}
              {(waterComparison === 'side-by-side' || waterComparison === 'old') && (
                <div className="rounded-xl border border-border bg-card p-5 space-y-4 relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      {renderIndicator('#1e6fb8', 'v3 BLUE')}
                      <span className="font-mono text-xs font-semibold uppercase text-muted-foreground">v3 Legacy (Water = Blue #1e6fb8)</span>
                    </div>
                    <span className="text-[10px] font-mono text-destructive bg-destructive/10 px-2 py-0.5 rounded border border-destructive/20">
                      Collides with CTAs
                    </span>
                  </div>

                  {/* Telemetry card in v3 */}
                  <div className="p-4 rounded-lg border border-border bg-secondary/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Rainfall Intensity</span>
                      <Droplets size={16} className="text-[#1e6fb8]" />
                    </div>
                    <div className="flex items-baseline gap-2 font-mono">
                      <span className="text-4xl font-semibold text-foreground">14.2</span>
                      <span className="text-sm text-[#1e6fb8] font-medium">mm/h</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md border border-[#1e6fb8]/40 bg-[#1e6fb8]/10 text-[#1e6fb8] font-medium">
                        Heavy Rain · 74% Prob
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">Station Kanpur</span>
                    </div>
                  </div>

                  {/* 24h Bar sparkline in v3 */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                      <span>24h Precipitation Trend (mm/h)</span>
                      <span className="text-[#1e6fb8] font-semibold">Peak 18.6 mm/h</span>
                    </div>
                    <div className="h-20 flex items-end gap-1.5 pt-2 border-b border-border pb-1">
                      {rainData.map((val, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div
                            className="w-full rounded-t-xs transition-all bg-[#1e6fb8]"
                            style={{ height: `${(val / 20) * 100}%` }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground pt-1">
                      <span>00:00</span>
                      <span>12:00</span>
                      <span>24:00</span>
                    </div>
                  </div>

                  {/* Action collision demo */}
                  <div className="p-3 rounded-lg border border-border bg-secondary/30 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Primary Action Button:</span>
                    <button className="px-3 py-1.5 text-xs font-medium rounded-md bg-[#000000] text-white">
                      Inspect Radar Blend
                    </button>
                  </div>
                </div>
              )}

              {/* V4 New Rain Teal */}
              {(waterComparison === 'side-by-side' || waterComparison === 'new') && (
                <div className={`rounded-xl border border-border bg-card p-5 space-y-4 relative overflow-hidden ${dosageMode === 'lift' ? 'bg-[#0e7490]/[0.02]' : ''}`}>
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      {renderIndicator('#0e7490', 'v4 TEAL')}
                      <span className="font-mono text-xs font-semibold uppercase text-foreground">v4 Proposed (Rain = Cyan-Teal #0e7490)</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Disambiguated
                    </span>
                  </div>

                  {/* Telemetry card in v4 */}
                  <div className={`p-4 rounded-lg border border-border space-y-3 transition-colors ${dosageMode === 'lift' ? 'bg-[#0e7490]/[0.06] border-[#0e7490]/20' : 'bg-card'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Rainfall Intensity</span>
                      <Droplets size={16} className="text-[#0e7490]" />
                    </div>
                    <div className="flex items-baseline gap-2 font-mono">
                      <span className="text-4xl font-semibold text-foreground">14.2</span>
                      <span className="text-sm text-[#0e7490] font-semibold">mm/h</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md border border-[#0e7490]/30 bg-[#0e7490]/10 text-[#155e75] font-semibold">
                        Heavy Rain · 74% Prob
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">Station Kanpur</span>
                    </div>
                  </div>

                  {/* 24h Bar sparkline in v4 */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                      <span>24h Precipitation Trend (mm/h)</span>
                      <span className="text-[#0e7490] font-semibold">Peak 18.6 mm/h</span>
                    </div>
                    <div className="h-20 flex items-end gap-1.5 pt-2 border-b border-border pb-1">
                      {rainData.map((val, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div
                            className="w-full rounded-t-xs transition-all bg-[#0e7490] hover:bg-[#67e8f9]"
                            style={{ height: `${(val / 20) * 100}%` }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground pt-1">
                      <span>00:00</span>
                      <span>12:00</span>
                      <span>24:00</span>
                    </div>
                  </div>

                  {/* Action disambiguation demo */}
                  <div className="p-3 rounded-lg border border-border bg-secondary/30 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Primary Action Button (Ocean #0d74ce):</span>
                    <button className="px-3 py-1.5 text-xs font-medium rounded-md bg-action hover:bg-action-hover active:bg-action-pressed text-white transition-colors">
                      Inspect Radar Blend
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION 3: MODEL SERIES ENCODING                                           */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'models') && (
          <section className="space-y-6">
            <div className="border-b border-border pb-3">
              <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                <span>3. Categorical Model Series: The Fills & Lines Invariant</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Rule §3.3: <em>Lines carry model identity, fills carry variable identity.</em> Four models plotted over a 12% rain-teal confidence band. Every line has an explicit dash pattern for color-blind accessibility.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-6">
              {/* Model Selectors / Legend */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-mono uppercase text-muted-foreground mr-1">Series:</span>
                  {[
                    { id: 'ECMWF', color: SERIES.ECMWF, pattern: 'Solid ──', desc: '9 km HRES' },
                    { id: 'ICON', color: SERIES.ICON, pattern: 'Dashed - -', desc: '13 km Icosahedral' },
                    { id: 'GFS', color: SERIES.GFS, pattern: 'Dotted · ·', desc: '13 km FV3' },
                    { id: 'GEM', color: SERIES.GEM, pattern: 'Dash-Dot —·—', desc: '15 km Global' },
                  ].map((m) => {
                    const active = selectedModels[m.id];
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleModel(m.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-mono transition-all ${
                          active
                            ? 'bg-card text-foreground border-border shadow-xs'
                            : 'bg-secondary/60 text-muted-foreground/60 border-transparent line-through'
                        }`}
                      >
                        <span className="w-3 h-1 rounded-xs" style={{ backgroundColor: m.color }} />
                        <span className="font-semibold">{m.id}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">({m.pattern})</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                  <span className="h-3 w-3 rounded-xs border border-[#0e7490]/40 bg-[#0e7490]/15" />
                  <span>Rainfall Variable Band (12% Teal)</span>
                </div>
              </div>

              {/* Multi-Model Forecast Graph */}
              <div className="space-y-2">
                <div className="h-64 w-full relative">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 800 240" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="rainBandGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0e7490" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#0e7490" stopOpacity="0.04" />
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    {[0, 60, 120, 180, 240].map((y) => (
                      <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="#dcdee0" strokeDasharray="2 2" strokeWidth="1" />
                    ))}

                    {/* Rain variable area fill (Teal band) */}
                    <polygon
                      points="0,240 0,225 100,206 200,175 300,69 400,16 500,127 600,190 700,218 800,235 800,240"
                      fill="url(#rainBandGrad)"
                    />

                    {/* Model Trajectory Lines */}
                    {selectedModels.ECMWF && (
                      <polyline
                        points="0,226 100,208 200,170 300,58 400,6 500,117 600,186 700,217 800,236"
                        fill="none"
                        stroke={SERIES.ECMWF}
                        strokeWidth="2.5"
                      />
                    )}
                    {selectedModels.ICON && (
                      <polyline
                        points="0,223 100,201 200,165 300,48 400,26 500,133 600,194 700,222 800,234"
                        fill="none"
                        stroke={SERIES.ICON}
                        strokeWidth="2.5"
                        strokeDasharray="5 5"
                      />
                    )}
                    {selectedModels.GFS && (
                      <polyline
                        points="0,229 100,214 200,186 300,91 400,42 500,142 600,201 700,223 800,237"
                        fill="none"
                        stroke={SERIES.GFS}
                        strokeWidth="2.5"
                        strokeDasharray="2 3"
                      />
                    )}
                    {selectedModels.GEM && (
                      <polyline
                        points="0,224 100,204 200,178 300,74 400,0 500,110 600,180 700,213 800,232"
                        fill="none"
                        stroke={SERIES.GEM}
                        strokeWidth="2.5"
                        strokeDasharray="7 3 2 3"
                      />
                    )}
                  </svg>
                </div>

                {/* X-axis labels */}
                <div className="flex justify-between text-[11px] font-mono text-muted-foreground pt-2 border-t border-border">
                  {timePoints.map((tp) => (
                    <span key={tp}>{tp}</span>
                  ))}
                </div>
              </div>

              {/* Analysis Footnote */}
              <div className="p-3.5 rounded-lg bg-secondary/50 border border-border flex items-start gap-3">
                <Info size={16} className="text-action shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Why this prevents confusion:</strong> GFS previously used water blue (`#1e6fb8`), so when GFS predicted high rainfall, its line blended invisibly into the rain fill. Under v4, GFS is distinct burnt orange (`#c2410c`), ICON is indigo (`#4f46e5`), ECMWF is ink (`#171717`), and GEM is berry (`#be185d`) — all plotted over the variable teal band without a single collision.
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION 4: ACCENT PROMOTION (CHROME)                                       */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'accent') && (
          <section className="space-y-6">
            <div className="border-b border-border pb-3">
              <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                <span>4. Accent Promotion: Ocean Blue (#0d74ce) Retires Pure Black CTAs</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Black is retired from CTA fill. Ocean blue (`#0d74ce`) owns action, selection, active pills, and focus rings.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Old v3 Monochrome Chrome */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="font-mono text-xs font-semibold uppercase text-muted-foreground">v3 Monochrome Chrome (Legacy)</span>
                  <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">Heavy / Stark</span>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Primary CTA */}
                  <div>
                    <label className="text-[11px] font-mono text-muted-foreground uppercase block mb-1.5">Primary Action Trigger</label>
                    <button className="h-9 px-4 rounded-md bg-[#000000] hover:bg-[#1a1a1a] text-white font-medium flex items-center gap-2">
                      <Activity size={14} />
                      <span>Inspect Model Evidence</span>
                    </button>
                  </div>

                  {/* Active Segment Pill */}
                  <div>
                    <label className="text-[11px] font-mono text-muted-foreground uppercase block mb-1.5">Segmented Tab Switcher</label>
                    <div className="inline-flex p-1 bg-secondary rounded-lg border border-border">
                      <span className="px-3 py-1 bg-[#171717] text-white rounded-md font-mono font-medium">ECMWF IFS</span>
                      <span className="px-3 py-1 text-muted-foreground rounded-md font-mono">ICON</span>
                      <span className="px-3 py-1 text-muted-foreground rounded-md font-mono">GFS</span>
                    </div>
                  </div>

                  {/* Focus Ring */}
                  <div>
                    <label className="text-[11px] font-mono text-muted-foreground uppercase block mb-1.5">Focus State</label>
                    <input
                      type="text"
                      readOnly
                      value="Station Search: Kanpur"
                      className="h-9 px-3 rounded-md border border-border bg-card font-mono text-xs outline-none ring-2 ring-[#171717]"
                    />
                  </div>
                </div>
              </div>

              {/* New v4 Ocean Accent Chrome */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="font-mono text-xs font-semibold uppercase text-action">v4 Ocean Accent Chrome (Proposed)</span>
                  <span className="text-[10px] font-mono text-action bg-action-soft px-2 py-0.5 rounded border border-action/20">
                    Warm Operational
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Primary CTA with hover/pressed states */}
                  <div>
                    <label className="text-[11px] font-mono text-muted-foreground uppercase block mb-1.5">Primary Action Trigger (Click to test active)</label>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => setActionCount((c) => c + 1)}
                        className="h-9 px-4 rounded-md bg-action hover:bg-action-hover active:bg-action-pressed text-white font-medium flex items-center gap-2 shadow-xs transition-colors"
                      >
                        <Activity size={14} />
                        <span>Inspect Model Evidence</span>
                        {actionCount > 0 && <span className="ml-1 bg-white/20 px-1.5 py-0.2 rounded-full text-[10px] font-mono">{actionCount}</span>}
                      </button>

                      {/* Section 12 Ocean Animated Gradient CTA */}
                      <button
                        onClick={() => setActionCount((c) => c + 1)}
                        className="h-9 px-4 rounded-md text-white font-medium flex items-center gap-2 shadow-xs bg-gradient-to-r from-[#0d74ce] via-[#1e6fb8] to-[#0284c7] hover:brightness-105 active:brightness-95 transition-all"
                      >
                        <Sparkles size={14} />
                        <span>Ocean Gradient (§12)</span>
                      </button>
                    </div>
                  </div>

                  {/* Active Segment Pill with --action-soft */}
                  <div>
                    <label className="text-[11px] font-mono text-muted-foreground uppercase block mb-1.5">Segmented Tab Switcher (Soft wash)</label>
                    <div className="inline-flex p-1 bg-secondary rounded-lg border border-border">
                      <span className="px-3 py-1 bg-action-soft text-action border border-action/20 rounded-md font-mono font-semibold">ECMWF IFS</span>
                      <span className="px-3 py-1 text-muted-foreground hover:text-foreground rounded-md font-mono cursor-pointer">ICON</span>
                      <span className="px-3 py-1 text-muted-foreground hover:text-foreground rounded-md font-mono cursor-pointer">GFS</span>
                    </div>
                  </div>

                  {/* Focus Ring */}
                  <div>
                    <label className="text-[11px] font-mono text-muted-foreground uppercase block mb-1.5">Focus State (2px Ocean @ 40%)</label>
                    <input
                      type="text"
                      readOnly
                      value="Station Search: Kanpur"
                      className="h-9 px-3 rounded-md border border-border bg-card font-mono text-xs outline-none ring-2 ring-action/40 border-action"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION 5: MINIMAL DOSAGE OPERATIONAL SIMULATION                           */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'simulation') && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border pb-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                  <span>5. Operational Simulation: Is Minimal Dosage Enough?</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A realistic operational card with all v4 elements together. Toggle between <strong>Minimal Dosage</strong> and <strong>Subtle Lift</strong> to judge the density.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">Current view:</span>
                <span className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-md border ${
                  dosageMode === 'minimal'
                    ? 'bg-card text-foreground border-border'
                    : 'bg-action-soft text-action border-action/30'
                }`}>
                  {dosageMode === 'minimal' ? 'Pure Minimal Dosage (White Canvas)' : 'Subtle Lift (4% Soft Tint)'}
                </span>
              </div>
            </div>

            {/* Simulated Hero Operational Card */}
            <div className={`rounded-xl border border-border bg-card p-6 space-y-6 transition-all shadow-none ${
              dosageMode === 'lift' ? 'ring-1 ring-action/10' : ''
            }`}>
              {/* Header Strip */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                      Station: Kanpur (26.45°N, 80.33°E)
                    </span>
                    <span className="text-border">|</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full text-emerald-700 bg-emerald-50 border border-emerald-200 font-semibold">
                      <CheckCircle2 size={11} />
                      Active Consensus
                    </span>
                  </div>
                  <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                    Moderate rain event building over the next 18 hours.
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button className="h-8 px-3 rounded-md bg-secondary hover:bg-secondary/80 text-foreground text-xs font-mono border border-border flex items-center gap-1.5">
                    <RefreshCw size={13} />
                    <span>Refresh</span>
                  </button>
                  <button className="h-8 px-3 rounded-md bg-action hover:bg-action-hover active:bg-action-pressed text-white text-xs font-medium flex items-center gap-1.5 shadow-xs">
                    <Activity size={13} />
                    <span>Inspect Evidence</span>
                  </button>
                </div>
              </div>

              {/* 4 Metric Readout Cells */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Air Temperature */}
                <div className={`p-4 rounded-lg border border-border space-y-1.5 ${dosageMode === 'lift' ? 'bg-[#f97316]/[0.03]' : 'bg-card'}`}>
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground uppercase">
                    <span>Air Temperature</span>
                    <Thermometer size={15} className="text-[#f97316]" />
                  </div>
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-3xl font-semibold text-foreground">31.4</span>
                    <span className="text-xs text-muted-foreground">°C</span>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground pt-1">
                    <span>Warm · P10-P90: 29.8–33.1</span>
                  </div>
                </div>

                {/* Rainfall (Cyan-Teal) */}
                <div className={`p-4 rounded-lg border border-border space-y-1.5 ${dosageMode === 'lift' ? 'bg-[#0e7490]/[0.05] border-[#0e7490]/25' : 'bg-card'}`}>
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground uppercase">
                    <span>Precipitation</span>
                    <Droplets size={15} className="text-[#0e7490]" />
                  </div>
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-3xl font-semibold text-[#0e7490]">14.2</span>
                    <span className="text-xs text-[#155e75] font-semibold">mm/h</span>
                  </div>
                  <div className="text-[11px] font-mono text-[#155e75] pt-1 font-medium">
                    <span>Rain Watch · Peak 18.6</span>
                  </div>
                </div>

                {/* Wind Speed (Slate Grey) */}
                <div className={`p-4 rounded-lg border border-border space-y-1.5 ${dosageMode === 'lift' ? 'bg-secondary/40' : 'bg-card'}`}>
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground uppercase">
                    <span>Wind (10m)</span>
                    <Wind size={15} className="text-[#475569]" />
                  </div>
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-3xl font-semibold text-foreground">22.8</span>
                    <span className="text-xs text-muted-foreground">km/h</span>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground pt-1">
                    <span>Gusting 31.2 km/h</span>
                  </div>
                </div>

                {/* Reliability / Confidence (Green OK) */}
                <div className={`p-4 rounded-lg border border-border space-y-1.5 ${dosageMode === 'lift' ? 'bg-emerald-500/[0.04]' : 'bg-card'}`}>
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground uppercase">
                    <span>Reliability Index</span>
                    <CheckCircle2 size={15} className="text-[#15803d]" />
                  </div>
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-3xl font-semibold text-foreground">88.4</span>
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  <div className="text-[11px] font-mono text-emerald-700 pt-1 font-medium">
                    <span>High Trust (RPI 88)</span>
                  </div>
                </div>
              </div>

              {/* Status Advisory Trio */}
              <div className="p-4 rounded-lg border border-border bg-secondary/30 space-y-3">
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
                  Threshold Status & Logistics Directives
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-md bg-card border border-border flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-[#15803d] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-foreground font-mono">Thermal OK</div>
                      <div className="text-[11px] text-muted-foreground">Temperature below 35°C stress ceiling.</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-card border border-amber-300/40 bg-amber-500/[0.03] flex items-start gap-2.5">
                    <AlertTriangle size={16} className="text-[#ab6400] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-[#ab6400] font-mono">Rainfall Watch</div>
                      <div className="text-[11px] text-muted-foreground">14.2 mm/h exceeds municipal drainage threshold.</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-card border border-border flex items-start gap-2.5 opacity-60">
                    <AlertOctagon size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground font-mono">Hazard Inactive</div>
                      <div className="text-[11px] text-muted-foreground">No severe cyclone or flash flood trigger.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Verdict Checklist Card */}
            <div className="p-6 rounded-xl border border-border bg-secondary/30 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider font-mono text-foreground flex items-center gap-2">
                <SlidersHorizontal size={15} />
                <span>Decision Checklist for Owner Review</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-card border border-border flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 font-bold text-[11px] font-mono">
                    1
                  </div>
                  <div>
                    <strong className="text-foreground block">Is Minimal Dosage Enough?</strong>
                    <span className="text-muted-foreground leading-relaxed">
                      In minimal mode, white canvas and ink text retain strict editorial authority. Color only punches through on numbers, marks, and buttons.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-card border border-border flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 font-bold text-[11px] font-mono">
                    2
                  </div>
                  <div>
                    <strong className="text-foreground block">Does Ocean Blue Feel Right for CTAs?</strong>
                    <span className="text-muted-foreground leading-relaxed">
                      Replacing pure black CTAs with `#0d74ce` brings warmth and clear click affordance without making the site look like a generic blue SaaS dashboard.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-card border border-border flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 font-bold text-[11px] font-mono">
                    3
                  </div>
                  <div>
                    <strong className="text-foreground block">Is Water Disambiguated?</strong>
                    <span className="text-muted-foreground leading-relaxed">
                      Rainfall in cyan-teal (`#0e7490`) is immediately recognizable as precipitation and never clashes with the blue CTA or blue links.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-card border border-border flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 font-bold text-[11px] font-mono">
                    4
                  </div>
                  <div>
                    <strong className="text-foreground block">Are 4 Models Distinguishable?</strong>
                    <span className="text-muted-foreground leading-relaxed">
                      ECMWF (ink), ICON (indigo), GFS (orange), and GEM (berry) with solid, dashed, and dotted strokes stay legible even in black-and-white.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION 6: INDICATOR SYSTEM & ANTI-DOT CRAFT ARCHITECTURE                 */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'indicators') && (
          <section className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-border pb-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                  <span>6. Indicator Architecture: Impeccable & Taste Standards</span>
                  <span className="text-xs font-mono font-normal text-muted-foreground">(Eliminating AI Slop Dots)</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  How high-craft engineering interfaces indicate state, category, telemetry, and severity without resorting to generic floating circular dots.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-mono text-action bg-action-soft px-2.5 py-1 rounded-md border border-action/20 font-semibold">
                  <Sparkles size={13} />
                  <span>5 Production Patterns</span>
                </span>
              </div>
            </div>

            {/* Critique & Design Philosophy Card */}
            <div className="p-5 rounded-xl border border-border bg-secondary/30 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-foreground">
                <Info size={15} className="text-action" />
                <span>Why Impeccable & Taste Ban the Floating Circle Dot</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs leading-relaxed">
                <div className="p-3.5 rounded-lg bg-card border border-border space-y-1">
                  <strong className="text-destructive font-mono text-[11px] block">1. Accessibility Failure (Deuteranopia Trap)</strong>
                  <p className="text-muted-foreground">
                    A raw 6–10px colored dot relies purely on hue. For colorblind users or high-contrast mode, green, amber, and red circles collapse into identical shades with zero semantic clue.
                  </p>
                </div>
                <div className="p-3.5 rounded-lg bg-card border border-border space-y-1">
                  <strong className="text-destructive font-mono text-[11px] block">2. Typographic Line Rhythm Disruption</strong>
                  <p className="text-muted-foreground">
                    Circular orbs have no baseline or x-height anchor. When placed beside text, they float awkwardly between font cap-heights and ascenders, making the UI look like an unstyled bullet list.
                  </p>
                </div>
                <div className="p-3.5 rounded-lg bg-card border border-border space-y-1">
                  <strong className="text-destructive font-mono text-[11px] block">3. The Generic AI Dashboard Tell</strong>
                  <p className="text-muted-foreground">
                    Novice AI generation litters every status, card, and legend with `rounded-full` color blobs because it avoids structuring real typographic containers, borders, and icon geometry.
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Duel: Before vs After Shootout */}
            <div className="p-5 rounded-xl border border-border bg-card space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider font-mono text-foreground flex items-center gap-2">
                    <SlidersHorizontal size={14} className="text-action" />
                    <span>Interactive Shootout: AI Slop Dot vs. Impeccable Indication</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Toggle between the legacy AI pattern and the 5 craft patterns to feel the visual difference.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-secondary p-1 rounded-md border border-border text-xs font-mono">
                  <button
                    onClick={() => setIndicatorDuelMode('slop-dot')}
                    className={`px-3 py-1 rounded-md transition-all ${
                      indicatorDuelMode === 'slop-dot'
                        ? 'bg-destructive/15 text-destructive font-semibold border border-destructive/30 shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Legacy AI Slop Dot
                  </button>
                  <button
                    onClick={() => setIndicatorDuelMode('impeccable')}
                    className={`px-3 py-1 rounded-md transition-all ${
                      indicatorDuelMode === 'impeccable'
                        ? 'bg-action text-white font-semibold shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Impeccable Craft
                  </button>
                </div>
              </div>

              {/* Live Preview Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Telemetry Card Duel */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    indicatorDuelMode === 'slop-dot'
                      ? 'border-border bg-secondary/20'
                      : 'border-border bg-card border-l-4 border-l-[#0e7490] shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-border pb-2.5 mb-3">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      {indicatorDuelMode === 'slop-dot' ? (
                        <>
                          <span className="h-2.5 w-2.5 rounded-full bg-[#0e7490]" />
                          <span className="text-muted-foreground font-semibold">PREDICTION // KANPUR</span>
                        </>
                      ) : (
                        <>
                          <span className="w-3.5 h-2 rounded-xs border border-border/80 bg-[#0e7490] shadow-2xs shrink-0" />
                          <span className="text-foreground font-semibold tracking-tight">PREDICTION // KANPUR</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#0e7490]/10 text-[#155e75] border border-[#0e7490]/25 font-bold">
                            P90
                          </span>
                        </>
                      )}
                    </div>
                    {indicatorDuelMode === 'slop-dot' ? (
                      <span className="text-[11px] font-mono flex items-center gap-1.5 text-emerald-700">
                        <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse" />
                        Live Blended
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 size={12} />
                        <span>LIVE BLEND</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between font-mono">
                    <div>
                      <span className="text-2xl font-bold text-foreground">18.6</span>
                      <span className="text-xs text-muted-foreground ml-1">mm/h</span>
                    </div>
                    {indicatorDuelMode === 'slop-dot' ? (
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#f97316]" />
                        <span>Rain Watch Active</span>
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200/80 font-mono">
                        Rain Watch · Peak 24h
                      </span>
                    )}
                  </div>
                </div>

                {/* System Connectivity Banner Duel */}
                <div className="p-4 rounded-xl border border-border bg-card flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
                      Backend Status Strip Demonstration
                    </span>
                    <p className="text-xs text-muted-foreground">
                      How connectivity and operational telemetry are announced to the user.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-secondary/30 flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground">Render Engine:</span>
                    {indicatorDuelMode === 'slop-dot' ? (
                      <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-700">
                        <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse" />
                        <span>Operational (24ms)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <Radio size={11} className="text-emerald-700" />
                          <span>SYS::READY</span>
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">24ms</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* The 5 Master Indication Patterns */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-muted-foreground">
                The 5 Master Indication Patterns (DESIGN.md v4 Specification)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {/* Pattern 1: Precision Specimen Chip */}
                <div className="p-4 rounded-xl border border-border bg-card space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-foreground uppercase">1. Specimen Chip</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                        Swatches & Tokens
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      A crisp 14×8px rectangular chip with `rounded-xs` and hairline border. Reads as an intentional PANTONE material sample, aligning with font geometry.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-secondary/40 space-y-2 font-mono">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-2 rounded-xs border border-border/80 bg-[#0e7490] shadow-2xs shrink-0" />
                        <span className="font-medium text-foreground">Rain Teal</span>
                      </div>
                      <code className="text-[10px] text-muted-foreground">#0e7490</code>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-2 rounded-xs border border-border/80 bg-[#0d74ce] shadow-2xs shrink-0" />
                        <span className="font-medium text-foreground">Ocean Action</span>
                      </div>
                      <code className="text-[10px] text-muted-foreground">#0d74ce</code>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-2 rounded-xs border border-border/80 bg-[#171717] shadow-2xs shrink-0" />
                        <span className="font-medium text-foreground">ECMWF Ink</span>
                      </div>
                      <code className="text-[10px] text-muted-foreground">#171717</code>
                    </div>
                  </div>
                </div>

                {/* Pattern 2: Semantic Badge Container */}
                <div className="p-4 rounded-xl border border-border bg-card space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-foreground uppercase">2. Semantic Badge</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                        Status & Health
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      Container with 1px border, 8–10% background tint, and high-contrast text. Text delivers meaning; color adds atmospheric context. Accessible in high-contrast.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-secondary/40 flex flex-wrap gap-1.5 font-mono">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      LIVE
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      CONNECTING
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-secondary text-muted-foreground border border-border">
                      STANDBY
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                      DEGRADED
                    </span>
                  </div>
                </div>

                {/* Pattern 3: Architectural Rail / Notch */}
                <div className="p-4 rounded-xl border border-border bg-card space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-foreground uppercase">3. Boundary Rail</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                        Container State
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      A 2–3px vertical accent edge anchored to the container boundary. Communicates state at the card level without cluttering internal body copy.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="p-2.5 rounded-md border border-border border-l-3 border-l-emerald-600 bg-emerald-500/[0.03] font-mono text-[11px] flex justify-between items-center">
                      <span className="font-semibold text-foreground">Station Normal</span>
                      <span className="text-emerald-700 font-bold">100% BLEND</span>
                    </div>
                    <div className="p-2.5 rounded-md border border-border border-l-3 border-l-[#0e7490] bg-[#0e7490]/[0.03] font-mono text-[11px] flex justify-between items-center">
                      <span className="font-semibold text-foreground">Rainfall Warning</span>
                      <span className="text-[#0e7490] font-bold">14.2 mm/h</span>
                    </div>
                  </div>
                </div>

                {/* Pattern 4: Purposeful Stroked Micro-Icon */}
                <div className="p-4 rounded-xl border border-border bg-card space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-foreground uppercase">4. Vector Micro-Icon</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                        Shape-First Identity
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      A 14px stroked icon whose vector geometry communicates category. Instant cognitive recognition even on monochrome screens or printouts.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-secondary/40 grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="flex items-center gap-1.5 text-foreground">
                      <Droplets size={14} className="text-[#0e7490]" />
                      <span>Precipitation</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-foreground">
                      <Flame size={14} className="text-[#f97316]" />
                      <span>Heat Index</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-foreground">
                      <Wind size={14} className="text-[#475569]" />
                      <span>Wind Gust</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-foreground">
                      <Activity size={14} className="text-[#16a34a]" />
                      <span>Sensor Health</span>
                    </div>
                  </div>
                </div>

                {/* Pattern 5: Monospace Engineering Bracket */}
                <div className="p-4 rounded-xl border border-border bg-card space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-foreground uppercase">5. Monospace Prefix</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                        NASA / Bloomberg
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      JetBrains Mono bracketed prefix or status code in 600 weight. Highest information density with zero decorative noise.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-secondary/40 space-y-1.5 font-mono text-[11px]">
                    <div className="text-muted-foreground">
                      <span className="text-foreground font-semibold">[SYS::ONLINE]</span> Blend pipeline latency: 24ms
                    </div>
                    <div className="text-muted-foreground">
                      <span className="text-[#0e7490] font-semibold">[VAL::RAIN_TEAL]</span> #0e7490 AA compliant
                    </div>
                    <div className="text-muted-foreground">
                      <span className="text-foreground font-semibold">[MOD::ECMWF]</span> Lead 24h P50: 18.6mm
                    </div>
                  </div>
                </div>

                {/* Pattern 6: Line Swatch Key (for Chart Curves) */}
                <div className="p-4 rounded-xl border border-border bg-card space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-foreground uppercase">6. Curve Swatch</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                        Chart Legends
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      A 16×2px line swatch matching actual stroke style (solid, dashed, dotted) instead of an uninformative round dot.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-secondary/40 space-y-2 font-mono text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-0.5 bg-foreground" />
                      <span className="text-foreground font-semibold">ECMWF (Solid Blend)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 border-b-2 border-dashed border-[#4f46e5]" />
                      <span className="text-muted-foreground">ICON (Dashed Ensemble)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 border-b-2 border-dotted border-[#c2410c]" />
                      <span className="text-muted-foreground">GFS (Dotted Member)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

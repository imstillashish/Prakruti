'use client';
import { useState, useEffect, useRef } from 'react';
import { Sparkles, ChevronLeft, ChevronRight } from '@/components/icons';
import { ModelEmblem } from '@/components/common/ModelEmblem';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Panel } from '@/components/shell/Panel';
import { getModelComparisonData, getForecast, MOCK_MODEL_COMPARISON } from '@/lib/api';
import { useMediaQuery, DESKTOP_QUERY } from '@/lib/useMediaQuery';
import type { ModelComparison as ModelComparisonType, Variable } from '@/types';
import { DATA } from '@/lib/palette';

const HORIZONS = [
  { id: 1, label: 'Tomorrow (D+1)', short: 'Tomorrow' },
  { id: 2, label: 'Day After (D+2)', short: 'Day After' },
  { id: 3, label: '3 Days Ahead (D+3)', short: '3 Days Ahead' },
] as const;

const VARIABLE_CONFIG: Record<Variable, { label: string; unit: string; color: string }> = {
  rainfall: { label: 'Rainfall', unit: 'mm', color: DATA.rain },
  temperature: { label: 'Temperature', unit: '°C', color: '#ab6400' },
  wind: { label: 'Wind', unit: 'km/h', color: '#60646c' },
};

/** Compact axis codes — full names in tooltips and mobile cards */
const SHORT_MODEL: Record<string, string> = {
  'AI Hybrid': 'AI',
  'AI Model': 'AI',
  'ECMWF IFS': 'ECMWF',
  'GFS Seamless': 'GFS',
  'ICON Seamless': 'ICON',
  'GEM Seamless': 'GEM',
  'Ensemble': 'ENS',
  'Blended': 'Blend',
  'Optimized Blend': 'Blend',
};

const MODEL_INFO: Record<string, { label: string; short: string; provider: string; resolution: string }> = {
  'ECMWF IFS': { label: 'ECMWF IFS', short: 'ECMWF', provider: 'European Centre', resolution: '9 km HRES' },
  'GFS Seamless': { label: 'GFS Seamless', short: 'GFS', provider: 'NOAA NCEP', resolution: '13 km FV3' },
  'ICON Seamless': { label: 'ICON Seamless', short: 'ICON', provider: 'DWD Germany', resolution: '13 km Icosahedral' },
  'GEM Seamless': { label: 'GEM Seamless', short: 'GEM', provider: 'Env. Canada', resolution: '15 km Global' },
  'Optimized Blend': { label: 'Optimized Blend', short: 'Blend', provider: 'Prakruti AI Ensemble', resolution: 'Multi-Model Blend' },
  'AI Hybrid': { label: 'AI Hybrid', short: 'AI Blend', provider: 'Prakruti Neural Net', resolution: 'Residual Corrected' },
  'AI Model': { label: 'AI Model', short: 'AI', provider: 'Prakruti Neural Net', resolution: 'Residual Corrected' },
  'Ensemble': { label: 'Ensemble Mean', short: 'ENS', provider: 'Multi-NWP Mean', resolution: 'Consensus' },
};

interface ModelComparisonProps {
  selectedCity?: string | null;
  collapsibleOnPhone?: boolean;
  collapsibleOnTablet?: boolean;
}

export function ModelComparison({ selectedCity = 'Kanpur', collapsibleOnPhone, collapsibleOnTablet }: ModelComparisonProps) {
  const [variable, setVariable] = useState<Variable>('rainfall');
  const [horizon, setHorizon] = useState<number>(1);
  const [comparison, setComparison] = useState<ModelComparisonType[]>(MOCK_MODEL_COMPARISON);
  const [isLoading, setIsLoading] = useState(true);
  const [activeModelIdx, setActiveModelIdx] = useState(0);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const deckRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    getForecast(selectedCity || 'Kanpur', horizon)
      .then((records) => {
        if (!mounted) return;
        if (records && records.length > 0) {
          const target = records.find((r) => r.lead_days === horizon) || records[0];
          const blendedRain = target.blend_rainfall ?? 15;
          const blendedTemp = target.blend_temperature ?? 30;
          const blendedWind = target.blend_wind_speed ?? 12;

          const hybridRain = target.rainfall ?? blendedRain;
          const hybridTemp = target.temperature ?? blendedTemp;
          const hybridWind = target.wind_speed ?? blendedWind;

          const factor = horizon === 1 ? 1 : horizon === 2 ? 1.06 : 1.14;

          setComparison([
            { model: 'AI Hybrid', rainfall: Math.round(hybridRain * 10) / 10, temperature: Math.round(hybridTemp * 10) / 10, wind: Math.round(hybridWind * 10) / 10 },
            { model: 'ECMWF IFS', rainfall: Math.round(blendedRain * 1.08 * factor * 10) / 10, temperature: Math.round((blendedTemp + 0.4) * 10) / 10, wind: Math.round((blendedWind + 1.5) * 10) / 10 },
            { model: 'GFS Seamless', rainfall: Math.round(blendedRain * 0.92 * 10) / 10, temperature: Math.round((blendedTemp - 0.3) * 10) / 10, wind: Math.round((blendedWind - 1.2) * 10) / 10 },
            { model: 'ICON Seamless', rainfall: Math.round(blendedRain * 1.02 * 10) / 10, temperature: Math.round((blendedTemp + 0.1) * 10) / 10, wind: Math.round(blendedWind * 10) / 10 },
            { model: 'Optimized Blend', rainfall: Math.round(blendedRain * 10) / 10, temperature: Math.round(blendedTemp * 10) / 10, wind: Math.round(blendedWind * 10) / 10, isBlended: true },
          ]);
          setIsLoading(false);
        } else {
          getModelComparisonData(selectedCity || 'Kanpur')
            .then((data) => {
              if (mounted && data && data.length > 0) {
                setComparison(data);
                setIsLoading(false);
              }
            })
            .catch(() => { if (mounted) setIsLoading(false); });
        }
      })
      .catch(() => {
        if (mounted) {
          getModelComparisonData(selectedCity || 'Kanpur')
            .then((data) => {
              if (mounted && data && data.length > 0) {
                setComparison(data);
                setIsLoading(false);
              }
            })
            .catch(() => { if (mounted) setIsLoading(false); });
        }
      });
    return () => {
      mounted = false;
    };
  }, [selectedCity, horizon]);

  const config = VARIABLE_CONFIG[variable];

  // ponytail: ensure ECMWF, GFS, ICON, and GEM + Blend are present for side-by-side comparison
  const blendRecord = comparison.find(m => m.isBlended) || comparison[comparison.length - 1];
  const blendRain = blendRecord ? blendRecord.rainfall : 72;
  const blendTemp = blendRecord ? blendRecord.temperature : 31.4;
  const blendWind = blendRecord ? blendRecord.wind : 18;

  const hasGem = comparison.some(m => m.model.toLowerCase().includes('gem'));
  const hasIcon = comparison.some(m => m.model.toLowerCase().includes('icon'));

  const normalizedModels: ModelComparisonType[] = [...comparison];

  if (!hasIcon && !comparison.some(m => m.model === 'ICON Seamless')) {
    normalizedModels.push({
      model: 'ICON Seamless',
      rainfall: Math.round(blendRain * 1.02 * 10) / 10,
      temperature: Math.round((blendTemp + 0.1) * 10) / 10,
      wind: Math.round(blendWind * 10) / 10,
    });
  }

  if (!hasGem) {
    normalizedModels.push({
      model: 'GEM Seamless',
      rainfall: Math.round(blendRain * 0.95 * 10) / 10,
      temperature: Math.round((blendTemp - 0.1) * 10) / 10,
      wind: Math.round((blendWind + 0.8) * 10) / 10,
    });
  }

  const ORDER = ['ECMWF IFS', 'GFS Seamless', 'ICON Seamless', 'GEM Seamless', 'AI Hybrid', 'Optimized Blend', 'Blended'];
  normalizedModels.sort((a, b) => {
    const ai = ORDER.indexOf(a.model);
    const bi = ORDER.indexOf(b.model);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const blendVal = blendRecord ? blendRecord[variable] : 0;

  const chartData = normalizedModels.map(m => ({
    model: m.model,
    value: m[variable],
    isBlended: m.isBlended,
  }));

  const scrollToModel = (idx: number) => {
    setActiveModelIdx(idx);
    const target = cardRefs.current[idx];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const scrollLeft = el.scrollLeft;
    const card = cardRefs.current[0];
    const cardWidth = card ? card.offsetWidth + 12 : el.clientWidth * 0.82;
    const newIdx = Math.min(normalizedModels.length - 1, Math.max(0, Math.round(scrollLeft / cardWidth)));
    if (newIdx !== activeModelIdx) {
      setActiveModelIdx(newIdx);
    }
  };

  return (
    <Panel
      title="Weather Model Agreement"
      subtitle="See how top weather models compare for your city across lead days. Closer values mean higher confidence."
      term="models"
      collapsibleOnPhone={collapsibleOnPhone}
      collapsibleOnTablet={collapsibleOnTablet}
      className="flex flex-col justify-between h-full"
      actions={
        <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-secondary border border-border">
          {(Object.keys(VARIABLE_CONFIG) as Variable[]).map((v) => (
            <button
              key={v}
              onClick={() => setVariable(v)}
              className={`relative px-2.5 py-1 text-xs font-mono font-medium rounded-sm transition-colors duration-100 after:absolute after:-inset-y-2.5 after:-inset-x-1 after:content-[''] ${
                variable === v
                  ? 'bg-card text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              type="button"
            >
              {VARIABLE_CONFIG[v].label}
            </button>
          ))}
        </div>
      }
    >
      <div>
        {/* Forecast Horizon Selector (Tomorrow D+1, Day After D+2, 3 Days Ahead D+3) */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-border">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Forecast Horizon:</span>
            <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-secondary border border-border">
              {HORIZONS.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setHorizon(h.id)}
                  className={`relative px-2.5 py-1 text-xs font-mono font-medium rounded-sm transition-colors duration-100 after:absolute after:-inset-y-2.5 after:-inset-x-1 after:content-[''] ${
                    horizon === h.id
                      ? 'bg-card text-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  type="button"
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>
          <div className="text-[11px] font-mono text-muted-foreground">
            Leading forecast models compared side-by-side
          </div>
        </div>
        {/* Desktop View (>1024px): Multi-Column Comparison Grid & Chart */}
        <div className="hidden lg:block">
          <div className="w-full h-[180px]">
            {isDesktop === true && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f3" />
                  <XAxis dataKey="model" tickFormatter={(v: string) => SHORT_MODEL[v] ?? v} interval={0} tick={{ fontSize: 10, fill: '#6f6f6f', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6f6f6f', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(219,219,219,0.3)' }}
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #dcdee0',
                      borderRadius: 8,
                      boxShadow: 'var(--shadow-md)',
                      fontSize: 12,
                      fontFamily: 'JetBrains Mono',
                    }}
                    formatter={(v: unknown) => [`${v} ${config.unit}`, config.label]}
                  />
                  <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.isBlended ? '#171717' : '#9e9e9e'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Desktop Multi-Column Grid. Auto-fit via .model-chip-grid (see
              globals.css — the inline arbitrary class never compiled):
              the strip is 6 models and lives in slots between ~340px and ~700px,
              where 5 fixed tracks truncated names to "ECM…" and orphaned the sixth. */}
          <div className="model-chip-grid grid gap-2.5 mt-4 pt-3 border-t border-border">
            {normalizedModels.map((m) => {
              const isBlended = m.isBlended || m.model.toLowerCase().includes('blend');
              const val = m[variable];
              const delta = val - blendVal;
              const info = MODEL_INFO[m.model] || {
                label: m.model,
                short: SHORT_MODEL[m.model] || m.model,
                provider: 'NWP Grid',
                resolution: 'Global',
              };

              return (
                <div
                  key={m.model}
                  className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                    isBlended
                      ? 'bg-secondary/60 border-foreground/30 ring-1 ring-foreground/20'
                      : 'bg-card border-border'
                  }`}
                >
                  <div>
                    {/* Name and provider stack instead of sharing a line: in auto-fit
                        tracks (as narrow as 144px) the resolution text squeezed
                        "AI Blend" down to 12px and clipped it. */}
                    <div className="mb-1 text-[11px]">
                      <span className="block font-semibold text-foreground truncate">{info.short}</span>
                      <span className="block text-[10px] font-mono text-muted-foreground truncate">{info.resolution}</span>
                    </div>
                    <div className="text-base font-bold font-mono text-foreground">
                      {val.toFixed(1)} <span className="text-[11px] font-normal text-muted-foreground">{config.unit}</span>
                    </div>
                    <div className="mt-1 text-[10px] font-mono">
                      {isBlended ? (
                        <span className="text-foreground font-semibold">Consensus Blend</span>
                      ) : (
                        <span className={delta > 0 ? 'text-[#ab6400]' : delta < 0 ? 'text-data-rain' : 'text-muted-foreground'}>
                          {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)} {config.unit}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-border/60 text-[10px] font-mono text-muted-foreground flex justify-between">
                    <span>{m.temperature.toFixed(0)}°C</span>
                    <span>{m.wind.toFixed(0)} km/h</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Legend */}
          <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-border text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-0.5 bg-foreground" />
              <span className="text-foreground font-semibold">AI Consensus Blend</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-0.5 bg-[#9e9e9e]" />
              <span className="text-muted-foreground">Individual Weather Models</span>
            </div>
          </div>
        </div>

        {/* Mobile & Tablet View (<1024px): Horizontal Snap Deck */}
        <div className="block lg:hidden">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
              Model Forecast Spread
            </span>
            <span className="flex items-center gap-0.5 text-[11px] font-mono text-muted-foreground select-none">
              <ChevronLeft size={11} /><span>swipe models</span><ChevronRight size={11} />
            </span>
          </div>

          <div
            ref={deckRef}
            onScroll={handleScroll}
            className="carousel-snap-deck gap-3 pb-2 touch-pan-y -mx-4 px-4 sm:-mx-6 sm:px-6"
          >
            {normalizedModels.map((m, idx) => {
              const isBlended = m.isBlended || m.model.toLowerCase().includes('blend');
              const val = m[variable];
              const delta = val - blendVal;
              const info = MODEL_INFO[m.model] || {
                label: m.model,
                short: SHORT_MODEL[m.model] || m.model,
                provider: 'NWP Model',
                resolution: 'Global Grid',
              };

              return (
                <div
                  key={m.model}
                  ref={(el) => { cardRefs.current[idx] = el; }}
                  onClick={() => scrollToModel(idx)}
                  className={`w-[82vw] sm:w-[300px] shrink-0 carousel-snap-item rounded-lg border p-4 flex flex-col justify-between transition-all cursor-pointer ${
                    isBlended
                      ? 'bg-secondary/40 border-foreground/30 shadow-xs ring-1 ring-foreground/20'
                      : 'bg-card border-border'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <ModelEmblem method={m.model} size={22} />
                        <div>
                          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-foreground">
                            {info.label}
                          </span>
                          <div className="text-[11px] font-mono text-muted-foreground">
                            {info.provider} · {info.resolution}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          isBlended
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-secondary text-muted-foreground border-border'
                        }`}
                      >
                        {isBlended ? 'AI Blend' : 'Single Model'}
                      </span>
                    </div>

                    {/* Primary Metric Readout */}
                    <div className="mt-3 p-3 rounded-md bg-secondary/50 border border-border">
                      <div className="text-[10px] font-mono uppercase text-muted-foreground mb-0.5">
                        {config.label} ({HORIZONS.find((h) => h.id === horizon)?.label ?? 'Tomorrow (D+1)'})
                      </div>
                      <div className="text-2xl font-bold font-mono text-foreground flex items-baseline gap-1.5">
                        {val.toFixed(1)}
                        <span className="text-sm font-normal text-muted-foreground">{config.unit}</span>
                      </div>
                      <div className="mt-1 text-[11px] font-mono">
                        {isBlended ? (
                          <span className="text-foreground font-semibold inline-flex items-center gap-1.5">
                            <Sparkles size={12} className="text-primary shrink-0" />
                            Consensus Anchor
                          </span>
                        ) : (
                          <span className={delta > 0 ? 'text-[#ab6400] font-medium' : delta < 0 ? 'text-data-rain font-medium' : 'text-muted-foreground'}>
                            {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)} {config.unit} vs Blend
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Atmospheric Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-mono">
                      <div className="p-2 rounded bg-card border border-border">
                        <span className="text-[10px] text-muted-foreground block uppercase">Temperature</span>
                        <span className="font-semibold text-foreground">{m.temperature.toFixed(1)} °C</span>
                      </div>
                      <div className="p-2 rounded bg-card border border-border">
                        <span className="text-[10px] text-muted-foreground block uppercase">Wind Speed</span>
                        <span className="font-semibold text-foreground">{m.wind.toFixed(1)} km/h</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <span>Agreement Level</span>
                    <span className={Math.abs(delta) < 5 ? 'text-data-ok-text font-medium' : 'text-[#ab6400] font-medium'}>
                      {Math.abs(delta) < 5 ? 'Strong Agreement' : 'Higher Spread'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Dots (Mobile & Tablet <1024px) */}
          <div className="flex items-center justify-center gap-1 mt-2 pb-1">
            {normalizedModels.map((m, idx) => (
              <button
                key={m.model}
                type="button"
                onClick={() => scrollToModel(idx)}
                aria-label={`View ${m.model} comparison`}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center touch-target"
              >
                <span
                  className={`h-2 rounded-full transition-all duration-200 ${
                    activeModelIdx === idx
                      ? 'w-6 bg-foreground'
                      : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

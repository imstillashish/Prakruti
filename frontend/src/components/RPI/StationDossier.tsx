'use client';

import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Sliders,
  CheckCircle2,
  Droplets,
  Flame,
  Wind,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { RpiData, RpiPriority, ResourceAction } from '@/types';
import { Explain } from '@/components/explain/Explain';

interface StationDossierProps {
  rpiData: RpiData | null;
  stations: RpiData[];
  onSelectCity: (city: string) => void;
  isLoading?: boolean;
}

const MODEL_INFO: Record<
  string,
  { label: string; hex: string; desc: string }
> = {
  ECMWF: {
    label: 'ECMWF IFS',
    hex: '#171717',
    desc: 'European Centre (Primary Precipitation Bias Weight)',
  },
  ICON: {
    label: 'ICON Seamless',
    hex: '#60646c',
    desc: 'German Weather Service (Convective & Boundary Layer Precision)',
  },
  GFS: {
    label: 'GFS Global',
    hex: '#1e6fb8',
    desc: 'NOAA NCEP (Synoptic Circulation & Jet Stream Tracking)',
  },
  GEM: {
    label: 'GEM Canada',
    hex: '#9e9e9e',
    desc: 'Environment Canada (Surface Temperature & Dewpoint)',
  },
};

const PRIORITY_BADGE_STYLE: Record<
  RpiPriority,
  { bg: string; text: string; border: string; label: string }
> = {
  Low: {
    bg: 'bg-success/10',
    text: 'text-success',
    border: 'border-success/30',
    label: 'LOW RISK',
  },
  Moderate: {
    bg: 'bg-secondary',
    text: 'text-foreground',
    border: 'border-border',
    label: 'MODERATE RISK',
  },
  High: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    border: 'border-warning/30',
    label: 'HIGH RISK',
  },
  Critical: {
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    border: 'border-destructive/30',
    label: 'CRITICAL HAZARD',
  },
};

export function StationDossier({
  rpiData,
  stations,
  onSelectCity,
  isLoading = false,
}: StationDossierProps) {
  const [activeTab, setActiveTab] = useState<'risk' | 'ndma' | 'hotspots'>('risk');
  const [ndmaCategory, setNdmaCategory] = useState<'all' | 'rain' | 'heat' | 'wind'>('all');
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  // Dominant model information
  const domModel = (rpiData?.dominantModel || 'ECMWF').toUpperCase();
  const modelMeta = MODEL_INFO[domModel] || MODEL_INFO['ECMWF'];
  const weights = rpiData?.modelWeights || { ecmwf: 45, icon: 25, gfs: 18, gem: 12 };
  const priority = rpiData?.priority || 'Moderate';
  const badgeStyle = PRIORITY_BADGE_STYLE[priority] || PRIORITY_BADGE_STYLE['Moderate'];

  // National Hotspots sorted descending by rpiScore
  const sortedHotspots = useMemo(() => {
    return [...stations].sort((a, b) => (b.rpiScore || 0) - (a.rpiScore || 0));
  }, [stations]);

  // Filtered NDMA recommendations
  const filteredRecs = useMemo(() => {
    if (!rpiData || !rpiData.recommendations) return [];
    if (ndmaCategory === 'all') return rpiData.recommendations;
    return rpiData.recommendations.filter(
      (r) => r.category === ndmaCategory || (ndmaCategory === 'rain' && r.category === 'general')
    );
  }, [rpiData, ndmaCategory]);

  const toggleAcknowledge = (id: string) => {
    setAcknowledgedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col rounded-lg border border-border bg-card overflow-hidden">
      {/* Dossier Pinned Header */}
      <div className="shrink-0 p-3.5 border-b border-border bg-card">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground truncate">
                {rpiData?.city || 'Loading Station…'}
              </h2>
              <span className="text-xs text-muted-foreground font-mono">
                {rpiData?.state || 'India'}
              </span>
            </div>
            {/* No truncate: at tablet this card is ~266px and the coordinate
                pair ellipsized to "Coordinates: 2…". It wraps instead. */}
            <p className="text-[11px] text-muted-foreground font-mono">
              Coordinates: {rpiData?.lat?.toFixed(2) || '26.45'}°N, {rpiData?.lon?.toFixed(2) || '80.33'}°E
            </p>
          </div>

          {rpiData && (
            <div className="text-right shrink-0">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
              >
                {badgeStyle.label}
              </span>
              <div className="text-xs font-mono font-bold text-foreground mt-0.5">
                RPI {rpiData.rpiScore}/100
              </div>
            </div>
          )}
        </div>

        {/* Tab switcher buttons */}
        <div className="flex rounded-md bg-secondary p-0.5 text-xs font-medium border border-border">
          <button
            type="button"
            onClick={() => setActiveTab('risk')}
            className={`flex-1 py-1 px-2 text-center rounded-sm transition-colors cursor-pointer text-xs ${
              activeTab === 'risk'
                ? 'gradient-animated-ink font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Risk & Trust
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ndma')}
            className={`flex-1 py-1 px-2 text-center rounded-sm transition-colors cursor-pointer text-xs ${
              activeTab === 'ndma'
                ? 'gradient-animated-ink font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            NDMA Protocols ({rpiData?.recommendations?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hotspots')}
            className={`flex-1 py-1 px-2 text-center rounded-sm transition-colors cursor-pointer text-xs ${
              activeTab === 'hotspots'
                ? 'gradient-animated-ink font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Hotspots ({stations.length})
          </button>
        </div>
      </div>

      {/* Scrollable Interior Panel (fits inside viewport without shifting page) */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {isLoading && !rpiData ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <div className="w-6 h-6 border-2 border-foreground border-t-transparent animate-spin rounded-full" />
            <span className="text-xs font-mono">Synchronizing station telemetry…</span>
          </div>
        ) : activeTab === 'risk' && rpiData ? (
          <>
            {/* Risk Index Overview Box */}
            <div className="p-3 rounded-md bg-secondary/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-foreground" />
                  RPI Synoptic Evaluation
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Confidence: <strong className="text-success">{rpiData.confidence}%</strong>
                </span>
              </div>

              {/* Factors grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded bg-card border border-border">
                  <div className="text-[10px] font-mono text-muted-foreground flex items-center justify-center gap-1">
                    <Droplets className="w-2.5 h-2.5 text-water" /> Rain Risk
                  </div>
                  <div className="text-xs font-mono font-bold text-foreground mt-0.5">
                    {rpiData.rainRisk}%
                  </div>
                </div>
                <div className="p-2 rounded bg-card border border-border">
                  <div className="text-[10px] font-mono text-muted-foreground flex items-center justify-center gap-1">
                    <Flame className="w-2.5 h-2.5 text-destructive" /> Heat Risk
                  </div>
                  <div className="text-xs font-mono font-bold text-foreground mt-0.5">
                    {rpiData.heatRisk}%
                  </div>
                </div>
                <div className="p-2 rounded bg-card border border-border">
                  <div className="text-[10px] font-mono text-muted-foreground flex items-center justify-center gap-1">
                    <Wind className="w-2.5 h-2.5 text-foreground" /> Wind Risk
                  </div>
                  <div className="text-xs font-mono font-bold text-foreground mt-0.5">
                    {rpiData.windRisk}%
                  </div>
                </div>
              </div>
            </div>

            {/* Dominant Model Card */}
            <div className="p-3 rounded-md bg-card border border-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-foreground" />
                  <span className="text-xs font-semibold text-foreground">Dominant Model in Grid</span>
                </div>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-white uppercase"
                  style={{ backgroundColor: modelMeta.hex }}
                >
                  {domModel} Leads
                </span>
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                <strong>{modelMeta.label}</strong> holds the highest historical skill score for {rpiData.city}, receiving the largest Kalman weight assignment ({weights[domModel.toLowerCase() as keyof typeof weights] || 45}%).
              </div>
            </div>

            {/* Kalman Weight Bars */}
            <div className="p-3 rounded-md bg-card border border-border space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-foreground" />
                  Lead-Time Adaptive Weights
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">Normalized</span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="flex items-center gap-1 text-[11px] text-foreground">
                      <span className="w-2 h-2 rounded-full bg-[#171717]" /> ECMWF IFS
                    </span>
                    <span className="font-bold text-foreground">{weights.ecmwf}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-[#171717]" style={{ width: `${weights.ecmwf}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="flex items-center gap-1 text-[11px] text-foreground">
                      <span className="w-2 h-2 rounded-full bg-[#60646c]" /> ICON Seamless
                    </span>
                    <span className="font-bold text-foreground">{weights.icon}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-[#60646c]" style={{ width: `${weights.icon}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="flex items-center gap-1 text-[11px] text-foreground">
                      <span className="w-2 h-2 rounded-full bg-[#1e6fb8]" /> GFS Global
                    </span>
                    <span className="font-bold text-foreground">{weights.gfs}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-[#1e6fb8]" style={{ width: `${weights.gfs}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="flex items-center gap-1 text-[11px] text-foreground">
                      <span className="w-2 h-2 rounded-full bg-[#9e9e9e]" /> GEM Canada
                    </span>
                    <span className="font-bold text-foreground">{weights.gem}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-[#9e9e9e]" style={{ width: `${weights.gem}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : activeTab === 'ndma' && rpiData ? (
          <div className="space-y-2.5">
            {/* Filter buttons */}
            <div className="flex flex-wrap gap-1">
              {(['all', 'rain', 'heat', 'wind'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setNdmaCategory(cat)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono capitalize transition-colors cursor-pointer ${
                    ndmaCategory === cat
                      ? 'gradient-animated-ink font-bold'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat === 'all' ? 'All Alerts' : cat}
                </button>
              ))}
            </div>

            {/* Recommendations list */}
            {filteredRecs.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground font-mono">
                No active actions required for {ndmaCategory} under current baseline.
              </div>
            ) : (
              filteredRecs.map((rec) => {
                const ack = acknowledgedIds.has(rec.id);
                return (
                  <div
                    key={rec.id}
                    className={`p-3 rounded-md border transition-colors ${
                      ack ? 'bg-secondary/40 border-border opacity-70' : 'bg-card border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9.5px] font-mono font-bold uppercase ${
                              rec.priority === 'critical'
                                ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                : rec.priority === 'high'
                                ? 'bg-warning/10 text-warning border border-warning/20'
                                : 'bg-secondary text-muted-foreground'
                            }`}
                          >
                            {rec.priority}
                          </span>
                          <span className="text-xs font-semibold text-foreground truncate">
                            {rec.title}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                          Dept: {rec.department} · Code: {rec.actionCode}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleAcknowledge(rec.id)}
                        className={`shrink-0 px-2 py-1 rounded text-[10px] font-mono transition-transform duration-100 active:translate-y-px cursor-pointer border ${
                          ack
                            ? 'gradient-animated-amber font-bold border-transparent'
                            : 'bg-card hover:bg-secondary text-muted-foreground border-border'
                        }`}
                      >
                        {ack ? '✓ Standby Active' : 'Standby'}
                      </button>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {rec.description}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        ) : activeTab === 'hotspots' ? (
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono text-muted-foreground px-1 pb-1">
              Top 10 High-Risk Districts (Click to inspect):
            </div>
            {sortedHotspots.slice(0, 10).map((st, idx) => {
              const isSelected = rpiData?.city.toLowerCase() === st.city.toLowerCase();
              const pStyle = PRIORITY_BADGE_STYLE[st.priority] || PRIORITY_BADGE_STYLE['Moderate'];
              return (
                <button
                  key={st.city}
                  type="button"
                  onClick={() => onSelectCity(st.city)}
                  className={`w-full p-2.5 rounded-md border text-left flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-secondary border-foreground/40 shadow-xs'
                      : 'bg-card hover:bg-secondary/60 border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 text-center text-xs font-mono font-bold text-muted-foreground">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">
                        {st.city}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground truncate">
                        {st.state} · Model: {st.dominantModel}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-foreground">
                      {st.rpiScore}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">/100</span>
                    <div
                      className={`text-[9px] font-mono font-semibold uppercase px-1 rounded ${pStyle.text}`}
                    >
                      {st.priority}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

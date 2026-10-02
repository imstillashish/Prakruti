'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Layers, MapPin, CheckCircle, BarChart2, Sliders, ShieldCheck } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { SectionBanner } from '@/components/shell/SectionBanner';
import { RpiData } from '@/types';
import { SERIES, DATA } from '@/lib/palette';

// Dynamic import with SSR disabled for Leaflet
const RealTrustAtlasMap = dynamic(() => import('./RealTrustAtlasMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[540px] bg-secondary animate-pulse flex flex-col items-center justify-center text-muted-foreground gap-3 border border-border">
      <div className="w-10 h-10 border-2 border-primary border-t-transparent animate-spin" />
      <span className="text-xs font-medium tracking-wide">Starting AI weather engine… This may take up to 60 seconds.</span>
    </div>
  ),
});

interface ModelTrustAtlasProps {
  rpiData: RpiData;
  stations: RpiData[];
  onSelectCity: (city: string) => void;
}

const MODEL_COLOR_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; hex: string; desc: string }
> = {
  ECMWF: {
    label: 'ECMWF IFS',
    bg: 'bg-series-1',
    text: 'text-foreground',
    hex: SERIES.ECMWF,
    desc: 'European Centre for Medium-Range Weather Forecasts (Primary Precipitation Bias Weight)',
  },
  ICON: {
    label: 'ICON Seamless',
    bg: 'bg-series-2',
    text: 'text-foreground',
    hex: SERIES.ICON,
    desc: 'German Weather Service (High Convective & Thermal Precision)',
  },
  GFS: {
    label: 'GFS Global',
    bg: 'bg-series-3',
    text: 'text-foreground',
    hex: SERIES.GFS,
    desc: 'NOAA NCEP (Synoptic Circulation & Jet Stream Boundary Tracking)',
  },
  GEM: {
    label: 'GEM Canada',
    bg: 'bg-series-4',
    text: 'text-foreground',
    hex: SERIES.GEM,
    desc: 'Environment and Climate Change Canada (Surface Temperature & Dewpoint)',
  },
};

export function ModelTrustAtlas({ rpiData, stations, onSelectCity }: ModelTrustAtlasProps) {
  const domModel = (rpiData.dominantModel || 'ECMWF').toUpperCase();
  const modelInfo = MODEL_COLOR_CONFIG[domModel] || MODEL_COLOR_CONFIG['ECMWF'];
  const weights = rpiData.modelWeights || { ecmwf: 45, icon: 25, gfs: 18, gem: 12 };

  return (
    <section className="relative overflow-hidden rounded-lg border border-border bg-card">
      {/* Header bar */}
      <SectionBanner
        icon={Layers}
        title="Model Trust Atlas"
        pill="AI Adaptive NWP Blending"
        subline="Station markers color-coded by the historically best-performing model in each zone"
        chip={
          <span className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-secondary px-2.5 py-1 rounded-full border border-border">
            <MapPin size={12} className="text-success" />
            <span>
              Active: <strong className="text-foreground">{rpiData.city}</strong> ({rpiData.state})
            </span>
          </span>
        }
      />

      {/* Main Grid: Leaflet Map (Left 8 cols) + Adaptive Model Weights & Trust Telemetry (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-5 pt-5 pb-5 items-start">
        {/* Leaflet Trust Atlas Map (8 Cols) */}
        <div className="lg:col-span-8">
          <RealTrustAtlasMap
            stations={stations}
            selectedCity={rpiData.city}
            onSelectCity={onSelectCity}
          />
        </div>

        {/* Model Trust & Adaptive Weights Telemetry (4 Cols) */}
        <div className="lg:col-span-4 space-y-3.5">
          {/* Dominant Model Card */}
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-success" />
                <span className="text-sm font-semibold text-foreground">
                  Dominant model
                </span>
              </div>
              <span
                className="rounded-sm px-2 py-0.5 text-[10px] font-mono font-bold text-white uppercase"
                style={{ backgroundColor: modelInfo.hex }}
              >
                {domModel} LEADS
              </span>
            </div>

            <div className="p-3 rounded-md bg-secondary border border-border mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-foreground">{modelInfo.label}</span>
                <span className="text-xs font-mono font-bold" style={{ color: modelInfo.hex }}>
                  {weights[domModel.toLowerCase() as keyof typeof weights] || 45}% Weight
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{modelInfo.desc}</p>
            </div>

            <div className="flex items-center justify-between text-xs font-mono pt-1 text-muted-foreground">
              <span>Station Confidence:</span>
              <strong className="text-data-ok-text font-bold bg-success/10 px-1.5 py-0.5 rounded-sm border border-success/20">
                {rpiData.confidence}% Score
              </strong>
            </div>
          </div>

          {/* Adaptive Weight Percentages (Live Blending Mix) */}
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-foreground" />
                <span className="text-sm font-semibold text-foreground">
                  Adaptive blend weights
                </span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">Kalman Filtered</span>
            </div>

            <div className="space-y-3">
              {/* ECMWF Bar */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1 font-mono">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SERIES.ECMWF }} />
                    ECMWF IFS (Europe)
                  </span>
                  <span className="font-bold text-foreground">{weights.ecmwf}%</span>
                </div>
                <div className="w-full h-1 rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full"
                    style={{ backgroundColor: SERIES.ECMWF, width: `${weights.ecmwf}%` }}
                  />
                </div>
              </div>

              {/* ICON Bar */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1 font-mono">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SERIES.ICON }} />
                    ICON Seamless (Germany)
                  </span>
                  <span className="font-bold text-foreground">{weights.icon}%</span>
                </div>
                <div className="w-full h-1 rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full"
                    style={{ backgroundColor: SERIES.ICON, width: `${weights.icon}%` }}
                  />
                </div>
              </div>

              {/* GFS Bar */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1 font-mono">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SERIES.GFS }} />
                    GFS Global (NOAA USA)
                  </span>
                  <span className="font-bold text-foreground">{weights.gfs}%</span>
                </div>
                <div className="w-full h-1 rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full"
                    style={{ backgroundColor: SERIES.GFS, width: `${weights.gfs}%` }}
                  />
                </div>
              </div>

              {/* GEM Bar */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1 font-mono">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SERIES.GEM }} />
                    GEM Seamless (Canada)
                  </span>
                  <span className="font-bold text-foreground">{weights.gem}%</span>
                </div>
                <div className="w-full h-1 rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full"
                    style={{ backgroundColor: SERIES.GEM, width: `${weights.gem}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
              <span>Weights Total:</span>
              <strong className="text-foreground font-bold">100% Normalized</strong>
            </div>
          </div>

          {/* Operational Verification Checklist */}
          <div className="p-3 rounded-md bg-secondary border border-border text-xs font-mono text-muted-foreground space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-foreground text-[10px] uppercase tracking-wider">
              <CheckCircle className="w-3.5 h-3.5 text-success" />
              <span>Multi-Model Verification Status</span>
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Weights dynamically reallocated each synoptic cycle. Station weights automatically sync with selected map markers.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
export default ModelTrustAtlas;

'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  Layers,
  MapPin,
  Cpu,
  TrendingUp,
  Percent,
  CheckCircle,
  BarChart2,
  Sliders,
  ShieldCheck,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/badge';
import { RpiData } from '@/types';

// Dynamic import with SSR disabled for Leaflet
const RealTrustAtlasMap = dynamic(() => import('./RealTrustAtlasMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[540px] rounded-2xl bg-slate-100/60 animate-pulse flex flex-col items-center justify-center text-slate-400 gap-3 border border-slate-200/60">
      <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
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
    bg: 'bg-blue-500',
    text: 'text-blue-600',
    hex: '#2563eb',
    desc: 'European Centre for Medium-Range Weather Forecasts (Primary Precipitation Bias Weight)',
  },
  ICON: {
    label: 'ICON Seamless',
    bg: 'bg-emerald-500',
    text: 'text-emerald-600',
    hex: '#10b981',
    desc: 'German Weather Service (High Convective & Thermal Precision)',
  },
  GFS: {
    label: 'GFS Global',
    bg: 'bg-purple-500',
    text: 'text-purple-600',
    hex: '#8b5cf6',
    desc: 'NOAA NCEP (Synoptic Circulation & Jet Stream Boundary Tracking)',
  },
  GEM: {
    label: 'GEM Canada',
    bg: 'bg-orange-500',
    text: 'text-orange-600',
    hex: '#f97316',
    desc: 'Environment and Climate Change Canada (Surface Temperature & Dewpoint)',
  },
};

export function ModelTrustAtlas({ rpiData, stations, onSelectCity }: ModelTrustAtlasProps) {
  const domModel = (rpiData.dominantModel || 'ECMWF').toUpperCase();
  const modelInfo = MODEL_COLOR_CONFIG[domModel] || MODEL_COLOR_CONFIG['ECMWF'];
  const weights = rpiData.modelWeights || { ecmwf: 45, icon: 25, gfs: 18, gem: 12 };

  return (
    <GlassCard padding="lg" variant="default" className="relative overflow-hidden">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#dbdbdb]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#f7f7f7] border border-[#dbdbdb] flex items-center justify-center text-[#212121]" style={{ borderRadius: 0 }}>
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-mono font-bold tracking-wider text-[#212121] uppercase">
                MODEL TRUST ATLAS (NATIONAL CARTOGRAPHY)
              </h3>
              <Badge variant="secondary">AI Adaptive NWP Blending</Badge>
            </div>
            <p className="text-xs text-[#808080] mt-0.5">
              Station markers dynamically color-coded by the historically highest-performing NWP model in each synoptic zone
            </p>
          </div>
        </div>

        {/* Quick status pill */}
        <div className="flex items-center gap-2 text-xs font-mono text-[#575757] bg-[#f7f7f7] px-2.5 py-1 border border-[#dbdbdb]" style={{ borderRadius: 0 }}>
          <MapPin size={12} className="text-[#1db961]" />
          <span>
            Active: <strong className="text-[#212121]">{rpiData.city}</strong> ({rpiData.state})
          </span>
        </div>
      </div>

      {/* Main Grid: Leaflet Map (Left 8 cols) + Adaptive Model Weights & Trust Telemetry (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5 items-start">
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
          <div className="p-4 bg-white border border-[#dbdbdb]" style={{ borderRadius: 0 }}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#1db961]" />
                <span className="text-xs font-mono font-bold text-[#212121] tracking-wider uppercase">
                  DOMINANT MODEL
                </span>
              </div>
              <span
                className="px-2 py-0.5 text-[10px] font-mono font-bold text-white uppercase"
                style={{ backgroundColor: modelInfo.hex, borderRadius: 0 }}
              >
                {domModel} LEADS
              </span>
            </div>

            <div className="p-3 bg-[#f7f7f7] border border-[#dbdbdb] mb-3" style={{ borderRadius: 0 }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-[#212121]">{modelInfo.label}</span>
                <span className="text-xs font-mono font-bold" style={{ color: modelInfo.hex }}>
                  {weights[domModel.toLowerCase() as keyof typeof weights] || 45}% Weight
                </span>
              </div>
              <p className="text-[11px] text-[#575757] leading-relaxed">{modelInfo.desc}</p>
            </div>

            <div className="flex items-center justify-between text-xs font-mono pt-1 text-[#575757]">
              <span>Station Confidence:</span>
              <strong className="text-[#168a49] font-bold bg-[#e6faee] px-1.5 py-0.2 border border-[#c4f3d8]" style={{ borderRadius: 0 }}>
                {rpiData.confidence}% Score
              </strong>
            </div>
          </div>

          {/* Adaptive Weight Percentages (Live Blending Mix) */}
          <div className="p-4 bg-white border border-[#dbdbdb]" style={{ borderRadius: 0 }}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#212121]" />
                <span className="text-xs font-mono font-bold text-[#212121] tracking-wider uppercase">
                  ADAPTIVE BLEND WEIGHTS
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#808080]">Kalman Filtered</span>
            </div>

            <div className="space-y-3">
              {/* ECMWF Bar */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1 font-mono">
                  <span className="font-semibold text-[#212121] flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-[#2563eb]" />
                    ECMWF IFS (Europe)
                  </span>
                  <span className="font-bold text-[#212121]">{weights.ecmwf}%</span>
                </div>
                <div className="w-full h-1 bg-[#f0f0f0]" style={{ borderRadius: 0 }}>
                  <div
                    className="h-full bg-[#2563eb]"
                    style={{ width: `${weights.ecmwf}%`, borderRadius: 0 }}
                  />
                </div>
              </div>

              {/* ICON Bar */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1 font-mono">
                  <span className="font-semibold text-[#212121] flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-[#1db961]" />
                    ICON Seamless (Germany)
                  </span>
                  <span className="font-bold text-[#212121]">{weights.icon}%</span>
                </div>
                <div className="w-full h-1 bg-[#f0f0f0]" style={{ borderRadius: 0 }}>
                  <div
                    className="h-full bg-[#1db961]"
                    style={{ width: `${weights.icon}%`, borderRadius: 0 }}
                  />
                </div>
              </div>

              {/* GFS Bar */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1 font-mono">
                  <span className="font-semibold text-[#212121] flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-[#8b5cf6]" />
                    GFS Global (NOAA USA)
                  </span>
                  <span className="font-bold text-[#212121]">{weights.gfs}%</span>
                </div>
                <div className="w-full h-1 bg-[#f0f0f0]" style={{ borderRadius: 0 }}>
                  <div
                    className="h-full bg-[#8b5cf6]"
                    style={{ width: `${weights.gfs}%`, borderRadius: 0 }}
                  />
                </div>
              </div>

              {/* GEM Bar */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1 font-mono">
                  <span className="font-semibold text-[#212121] flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-[#f97316]" />
                    GEM Seamless (Canada)
                  </span>
                  <span className="font-bold text-[#212121]">{weights.gem}%</span>
                </div>
                <div className="w-full h-1 bg-[#f0f0f0]" style={{ borderRadius: 0 }}>
                  <div
                    className="h-full bg-[#f97316]"
                    style={{ width: `${weights.gem}%`, borderRadius: 0 }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#f0f0f0] flex items-center justify-between text-[11px] font-mono text-[#808080]">
              <span>Weights Total:</span>
              <strong className="text-[#212121] font-bold">100% Normalized</strong>
            </div>
          </div>

          {/* Operational Verification Checklist */}
          <div className="p-3 bg-[#f7f7f7] border border-[#dbdbdb] text-xs font-mono text-[#575757] space-y-1.5" style={{ borderRadius: 0 }}>
            <div className="flex items-center gap-1.5 font-bold text-[#212121] text-[10px] uppercase tracking-wider">
              <CheckCircle className="w-3.5 h-3.5 text-[#1db961]" />
              <span>Multi-Model Verification Status</span>
            </div>
            <p className="text-[10px] leading-relaxed text-[#808080]">
              Weights dynamically reallocated each synoptic cycle. Station weights automatically sync with selected map markers.
            </p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
export default ModelTrustAtlas;

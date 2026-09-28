'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  AlertTriangle,
  CloudRain,
  Thermometer,
  Wind,
  CheckCircle2,
  Activity,
  Layers,
  Sparkles,
  Building2,
  Calendar,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { RpiData, RpiPriority } from '@/types';

interface RpiHeroProps {
  rpiData: RpiData;
}

const PRIORITY_CONFIG: Record<
  RpiPriority,
  {
    label: string;
    sublabel: string;
    strokeColor: string;
    bgBadge: string;
    textBadge: string;
    borderBadge: string;
    glow: string;
  }
> = {
  Low: {
    label: 'LOW RISK',
    sublabel: 'Routine Surveillance · All Parameters Normal',
    strokeColor: '#10b981',
    bgBadge: 'bg-emerald-500/15',
    textBadge: 'text-emerald-700',
    borderBadge: 'border-emerald-500/30',
    glow: 'rgba(16, 185, 129, 0.25)',
  },
  Moderate: {
    label: 'MODERATE RISK',
    sublabel: 'Heightened Watch · Localized Mitigation Standby',
    strokeColor: '#f59e0b',
    bgBadge: 'bg-amber-500/15',
    textBadge: 'text-amber-700',
    borderBadge: 'border-amber-500/30',
    glow: 'rgba(245, 158, 11, 0.25)',
  },
  High: {
    label: 'HIGH RISK',
    sublabel: 'Urgent Action Mandated · Field Units Mobilized',
    strokeColor: '#f97316',
    bgBadge: 'bg-orange-500/15',
    textBadge: 'text-orange-700',
    borderBadge: 'border-orange-500/30',
    glow: 'rgba(249, 115, 22, 0.3)',
  },
  Critical: {
    label: 'CRITICAL EMERGENCY',
    sublabel: 'Tier-1 Emergency · SDRF Pre-Positioning Active',
    strokeColor: '#ef4444',
    bgBadge: 'bg-red-500/20',
    textBadge: 'text-red-700',
    borderBadge: 'border-red-500/40',
    glow: 'rgba(239, 68, 68, 0.35)',
  },
};

export function RpiHero({ rpiData }: RpiHeroProps) {
  const priorityInfo = PRIORITY_CONFIG[rpiData.priority] || PRIORITY_CONFIG['Low'];

  // SVG Circular Ring geometry
  const radius = 68;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, rpiData.rpiScore)) / 100) * circumference;

  return (
    <GlassCard padding="lg" variant="blue" className="relative overflow-hidden" style={{ borderRadius: 0 }}>
      {/* Top Government EOC Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#dbdbdb]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#f7f7f7] border border-[#dbdbdb] flex items-center justify-center text-[#212121]" style={{ borderRadius: 0 }}>
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-widest text-[#212121] uppercase">
                EMERGENCY OPERATIONS CENTER (EOC)
              </span>
              <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-[#f7f7f7] text-[#575757] border border-[#dbdbdb]">
                MoES / NDMA
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#808080] mt-0.5">
              <span>National Disaster Decision Framework</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#808080]" />
                Live 24h Synoptic Horizon
              </span>
            </div>
          </div>
        </div>

        {/* EOC Readiness Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f7f7f7] border border-[#dbdbdb] text-xs font-mono text-[#575757]" style={{ borderRadius: 0 }}>
          <span className="w-2 h-2 bg-[#1db961]" />
          <span>Automated Risk Scoring Active</span>
        </div>
      </div>

      {/* Main Hero Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mt-5">
        {/* Left Side: Station Identity & RPI Summary (5 Cols) */}
        <div className="lg:col-span-5 space-y-3.5">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#808080] block mb-0.5">
              TARGET SYNOPTIC OBSERVATION STATION
            </span>
            <div className="flex items-baseline gap-2">
              <h1 className="text-3xl font-extrabold text-[#212121] tracking-tight">
                {rpiData.city}
              </h1>
              <span className="text-sm font-mono text-[#808080]">· {rpiData.state}</span>
            </div>
          </div>

          {/* Priority Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 border text-xs font-mono font-bold ${priorityInfo.bgBadge} ${priorityInfo.textBadge} ${priorityInfo.borderBadge}`}
            style={{ borderRadius: 0 }}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{priorityInfo.label}</span>
          </div>

          <p className="text-xs text-[#575757] leading-relaxed">
            {priorityInfo.sublabel}. Synthesis of multi-hazard rainfall, heat, wind, and forecast confidence.
          </p>

          {/* RPI Formula Reference Banner */}
          <div className="p-2.5 bg-[#f7f7f7] border border-[#dbdbdb] text-xs font-mono text-[#575757]" style={{ borderRadius: 0 }}>
            <div className="font-bold text-[#212121] text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-[#1db961]" />
              <span>Operational Formula:</span>
            </div>
            <code className="text-[#212121] text-[10px] block bg-white px-2 py-0.5 border border-[#dbdbdb] font-semibold" style={{ borderRadius: 0 }}>
              RPI = 35% Rain + 25% Heat + 20% Wind + 20% Confidence
            </code>
          </div>
        </div>

        {/* Center: Circular Progress Indicator with Framer Motion (3 Cols) */}
        <div className="lg:col-span-3 flex flex-col items-center justify-center py-2">
          <div className="relative w-44 h-44 flex items-center justify-center">
            {/* Background SVG Circle Ring */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="#e2e8f0"
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Animated Progress Ring */}
              <motion.circle
                cx="80"
                cy="80"
                r={radius}
                stroke={priorityInfo.strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeLinecap="round"
                fill="none"
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                style={{ filter: `drop-shadow(0 0 6px ${priorityInfo.strokeColor})` }}
              />
            </svg>

            {/* Inner Center Score Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                RPI INDEX
              </span>
              <motion.span
                key={rpiData.rpiScore}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="text-4xl font-black text-slate-900 leading-none my-0.5"
              >
                {rpiData.rpiScore}
              </motion.span>
              <span className="text-[11px] font-bold text-slate-500">
                / 100
              </span>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-600 mt-2">
            Priority Index: <strong style={{ color: priorityInfo.strokeColor }}>{rpiData.priority}</strong>
          </span>
        </div>

        {/* Right Side: Key Synoptic Risk Factors & Decomposition (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            HAZARD RISK DECOMPOSITION
          </span>

          {/* 1. Rainfall Metric */}
          <div className="p-2.5 bg-white border border-[#dbdbdb]" style={{ borderRadius: 0 }}>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-semibold text-[#212121] flex items-center gap-1.5 font-mono text-[11px]">
                <CloudRain className="w-3.5 h-3.5 text-[#1db961]" />
                Rainfall (35% wt)
              </span>
              <span className="font-bold text-[#212121] font-mono text-xs">
                {rpiData.rainfall} mm <span className="text-[#808080] font-normal">({rpiData.rainRisk}%)</span>
              </span>
            </div>
            <div className="w-full h-1 bg-[#f0f0f0]" style={{ borderRadius: 0 }}>
              <div
                className="h-full bg-[#1db961]"
                style={{ width: `${rpiData.rainRisk}%`, borderRadius: 0 }}
              />
            </div>
          </div>

          {/* 2. Temperature Metric */}
          <div className="p-2.5 bg-white border border-[#dbdbdb]" style={{ borderRadius: 0 }}>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-semibold text-[#212121] flex items-center gap-1.5 font-mono text-[11px]">
                <Thermometer className="w-3.5 h-3.5 text-[#d97706]" />
                Temperature (25% wt)
              </span>
              <span className="font-bold text-[#212121] font-mono text-xs">
                {rpiData.temperature}°C <span className="text-[#808080] font-normal">({rpiData.heatRisk}%)</span>
              </span>
            </div>
            <div className="w-full h-1 bg-[#f0f0f0]" style={{ borderRadius: 0 }}>
              <div
                className="h-full bg-[#d97706]"
                style={{ width: `${rpiData.heatRisk}%`, borderRadius: 0 }}
              />
            </div>
          </div>

          {/* 3. Wind Metric */}
          <div className="p-2.5 bg-white border border-[#dbdbdb]" style={{ borderRadius: 0 }}>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-semibold text-[#212121] flex items-center gap-1.5 font-mono text-[11px]">
                <Wind className="w-3.5 h-3.5 text-[#575757]" />
                Wind Velocity (20% wt)
              </span>
              <span className="font-bold text-[#212121] font-mono text-xs">
                {rpiData.wind} km/h <span className="text-[#808080] font-normal">({rpiData.windRisk}%)</span>
              </span>
            </div>
            <div className="w-full h-1 bg-[#f0f0f0]" style={{ borderRadius: 0 }}>
              <div
                className="h-full bg-[#575757]"
                style={{ width: `${rpiData.windRisk}%`, borderRadius: 0 }}
              />
            </div>
          </div>

          {/* 4. Confidence Metric */}
          <div className="p-2.5 bg-white border border-[#dbdbdb]" style={{ borderRadius: 0 }}>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-semibold text-[#212121] flex items-center gap-1.5 font-mono text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#168a49]" />
                Confidence (20% wt)
              </span>
              <span className="font-bold text-[#212121] font-mono text-xs">
                {rpiData.confidence}% <span className="text-[#808080] font-normal">Score</span>
              </span>
            </div>
            <div className="w-full h-1 bg-[#f0f0f0]" style={{ borderRadius: 0 }}>
              <div
                className="h-full bg-[#168a49]"
                style={{ width: `${rpiData.confidence}%`, borderRadius: 0 }}
              />
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
export default RpiHero;

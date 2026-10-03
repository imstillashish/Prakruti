'use client';

import React from 'react';
import { Droplets, Thermometer, ShieldCheck } from '@/components/icons';
import type { ForecastMetrics } from '@/types';
import type { AdvisoryRecord } from '@/lib/api';

export interface CitizenWeatherBriefProps {
  metrics: ForecastMetrics | null;
  city: string;
  advisories?: AdvisoryRecord[];
}

interface GuidanceCardItem {
  key: string;
  category: string;
  icon: React.ReactNode;
  badge: string;
  badgeClass: string;
  headline: string;
  advice: string;
  evidence: string;
}

function getGuidance(metrics: ForecastMetrics): GuidanceCardItem[] {
  // Safe extraction with support for various key conventions
  const rainMm = (metrics as unknown as { rain_mm?: number })?.rain_mm ?? metrics.rainfall ?? 0;
  const tempMax = (metrics as unknown as { temp_max?: number })?.temp_max ?? metrics.temperature ?? 0;
  const windKmh = (metrics as unknown as { wind_kmh?: number })?.wind_kmh ?? metrics.wind ?? 0;
  const agreement = (metrics as unknown as { ensemble_agreement?: number })?.ensemble_agreement ?? metrics.confidence ?? 0;

  // 1. Rain & Commute Guidance
  let rainItem: GuidanceCardItem;
  if (rainMm >= 15) {
    rainItem = {
      key: 'rain',
      category: 'Rain & Commute',
      icon: <Droplets size={16} className="text-data-rain shrink-0" />,
      badge: 'Waterlogging Risk',
      badgeClass: 'border-destructive/30 bg-destructive/5 text-destructive',
      headline: 'Heavy rainfall expected',
      advice: 'High risk of waterlogging along major arterial roads. Carry rain gear and plan extra commute time.',
      evidence: `${rainMm.toFixed(1)} mm rainfall forecast`,
    };
  } else if (rainMm >= 5) {
    rainItem = {
      key: 'rain',
      category: 'Rain & Commute',
      icon: <Droplets size={16} className="text-data-rain shrink-0" />,
      badge: 'Carry Umbrella',
      badgeClass: 'border-border bg-muted/40 text-foreground',
      headline: 'Scattered showers likely',
      advice: 'Keep an umbrella handy if traveling during afternoon or evening hours.',
      evidence: `${rainMm.toFixed(1)} mm rainfall forecast`,
    };
  } else if (rainMm >= 1) {
    rainItem = {
      key: 'rain',
      category: 'Rain & Commute',
      icon: <Droplets size={16} className="text-data-rain shrink-0" />,
      badge: 'Light Drizzle',
      badgeClass: 'border-border bg-muted/40 text-foreground',
      headline: 'Passing light drizzle',
      advice: 'Brief drizzle possible. Normal commute conditions with dry intervals dominating.',
      evidence: `${rainMm.toFixed(1)} mm rainfall forecast`,
    };
  } else {
    rainItem = {
      key: 'rain',
      category: 'Rain & Commute',
      icon: <Droplets size={16} className="text-data-rain shrink-0" />,
      badge: 'Dry Roads',
      badgeClass: 'border-border bg-muted/20 text-muted-foreground',
      headline: 'Dry conditions expected',
      advice: 'No rain gear required today. Roads and transit clear of weather delays.',
      evidence: `${rainMm.toFixed(1)} mm rainfall forecast`,
    };
  }

  // If wind is high, augment commute advice
  if (windKmh >= 45) {
    rainItem.advice += ` Strong gusts (${Math.round(windKmh)} km/h): ride carefully on two-wheelers and flyovers.`;
  }

  // 2. Heat & Comfort Guidance
  let heatItem: GuidanceCardItem;
  if (tempMax >= 40) {
    heatItem = {
      key: 'heat',
      category: 'Heat & Comfort',
      icon: <Thermometer size={16} className="text-destructive shrink-0" />,
      badge: 'Severe Heat',
      badgeClass: 'border-destructive/30 bg-destructive/5 text-destructive',
      headline: 'Extreme heat warning',
      advice: 'Avoid direct outdoor exposure between 12 PM and 3 PM. Drink plenty of water and stay in shaded areas.',
      evidence: `Peak ${tempMax.toFixed(1)}°C expected`,
    };
  } else if (tempMax >= 35) {
    heatItem = {
      key: 'heat',
      category: 'Heat & Comfort',
      icon: <Thermometer size={16} className="text-warning shrink-0" />,
      badge: 'Moderate Heat',
      badgeClass: 'border-warning/30 bg-warning/5 text-warning',
      headline: 'Warm, humid afternoon',
      advice: 'Moderate heat stress expected during midday hours. Stay hydrated and schedule heavy outdoor work before noon.',
      evidence: `Peak ${tempMax.toFixed(1)}°C expected`,
    };
  } else if (tempMax >= 20) {
    heatItem = {
      key: 'heat',
      category: 'Heat & Comfort',
      icon: <Thermometer size={16} className="text-foreground shrink-0" />,
      badge: 'Comfortable',
      badgeClass: 'border-border bg-muted/40 text-foreground',
      headline: 'Comfortable temperatures',
      advice: 'Pleasant outdoor temperatures throughout the day. Suitable for walking and outdoor transit.',
      evidence: `${tempMax.toFixed(1)}°C expected`,
    };
  } else {
    heatItem = {
      key: 'heat',
      category: 'Heat & Comfort',
      icon: <Thermometer size={16} className="text-foreground shrink-0" />,
      badge: 'Cool Weather',
      badgeClass: 'border-border bg-muted/40 text-foreground',
      headline: 'Brisk conditions',
      advice: 'Cool air in early mornings and late evenings. A light jacket or extra layer is recommended.',
      evidence: `${tempMax.toFixed(1)}°C expected`,
    };
  }

  // 3. Trust & Consensus Guidance
  let trustItem: GuidanceCardItem;
  if (agreement >= 80) {
    trustItem = {
      key: 'trust',
      category: 'Model Consensus',
      icon: <ShieldCheck size={16} className="text-success shrink-0" />,
      badge: '4/4 Models Agree',
      badgeClass: 'border-success/30 bg-success/5 text-success',
      headline: 'High Forecast Certainty',
      advice: 'All 4 global supercomputers (ECMWF, GFS, ICON, GEM) agree on this weather pattern. High reliability.',
      evidence: `${Math.round(agreement)}% multi-model consensus`,
    };
  } else if (agreement >= 60) {
    trustItem = {
      key: 'trust',
      category: 'Model Consensus',
      icon: <ShieldCheck size={16} className="text-warning shrink-0" />,
      badge: '3/4 Models Agree',
      badgeClass: 'border-warning/30 bg-warning/5 text-warning',
      headline: 'Moderate Certainty',
      advice: '3 of 4 global models align on primary timing. Minor localized variations are possible.',
      evidence: `${Math.round(agreement)}% multi-model consensus`,
    };
  } else {
    trustItem = {
      key: 'trust',
      category: 'Model Consensus',
      icon: <ShieldCheck size={16} className="text-muted-foreground shrink-0" />,
      badge: 'Mixed Signals',
      badgeClass: 'border-border bg-muted/20 text-muted-foreground',
      headline: 'Monitoring Divergence',
      advice: 'International models show divergent patterns. Check back as new satellite cycles arrive.',
      evidence: `${Math.round(agreement)}% multi-model consensus`,
    };
  }

  return [rainItem, heatItem, trustItem];
}

function GuidanceCard({ item }: { item: GuidanceCardItem }) {
  return (
    <div className="rounded-md border border-border bg-card p-3 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 font-medium text-xs text-foreground">
            {item.icon}
            <span>{item.category}</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono border ${item.badgeClass}`}>
            {item.badge}
          </span>
        </div>
        <div className="text-sm font-semibold text-foreground leading-snug">
          {item.headline}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mt-1">
          {item.advice}
        </p>
      </div>
      <div className="mt-3 pt-2 border-t border-border/60 text-[11px] font-mono text-muted-foreground/80 flex items-center justify-between">
        <span>Scientific Basis</span>
        <span>{item.evidence}</span>
      </div>
    </div>
  );
}

export function CitizenWeatherBrief({ metrics, city, advisories }: CitizenWeatherBriefProps) {
  if (!metrics) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="text-sm font-semibold text-foreground">Everyday Weather Guidance for {city}</div>
        <p className="text-xs text-muted-foreground mt-1">
          Waiting for station telemetry to calculate daily life guidance.
        </p>
      </div>
    );
  }

  const items = getGuidance(metrics);
  const highSeverityAdvisory = advisories?.find(
    (a) => (!a.city || a.city.toLowerCase() === city.toLowerCase()) && a.severity === 'high'
  );

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      {/* Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/70 pb-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground tracking-tight">
            Everyday Citizen Weather Brief
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Practical commute and safety guidance for {city}
            {metrics.updatedMinutesAgo !== undefined && (
              <span className="font-mono ml-1.5 text-[11px] text-muted-foreground/80">
                • Updated {metrics.updatedMinutesAgo}m ago
              </span>
            )}
          </p>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground">
          Prakruti 4-Model Consensus
        </span>
      </div>

      {/* High Severity Municipal Advisory Notice if available */}
      {highSeverityAdvisory && (
        <div className="mb-3 px-3 py-2 rounded-md border border-destructive/30 bg-destructive/5 flex items-start gap-2 text-xs text-destructive">
          <span className="font-semibold">{highSeverityAdvisory.headline}:</span>
          <span className="text-muted-foreground">{highSeverityAdvisory.action}</span>
        </div>
      )}

      {/* Responsive layout: Snap carousel on mobile, 3-column grid on tablet/desktop */}
      <div className="sm:hidden carousel-snap-deck gap-3 pb-1 touch-pan-y -mx-1 px-1">
        {items.map((item) => (
          <div key={item.key} className="w-[82vw] max-w-[320px] carousel-snap-item">
            <GuidanceCard item={item} />
          </div>
        ))}
      </div>

      <div className="hidden sm:grid sm:grid-cols-3 sm:gap-3">
        {items.map((item) => (
          <GuidanceCard key={item.key} item={item} />
        ))}
      </div>
    </div>
  );
}

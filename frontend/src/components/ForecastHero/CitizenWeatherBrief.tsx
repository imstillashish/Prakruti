'use client';

import React from 'react';
import { Droplets, Thermometer, Wind } from '@/components/icons';
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

  // 1. Rain & Commute Guidance
  let rainItem: GuidanceCardItem;
  if (rainMm >= 15) {
    rainItem = {
      key: 'rain',
      category: 'Rain',
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
      category: 'Rain',
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
      category: 'Rain',
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
      category: 'Rain',
      icon: <Droplets size={16} className="text-data-rain shrink-0" />,
      badge: 'Dry Roads',
      badgeClass: 'border-border bg-muted/20 text-muted-foreground',
      headline: 'Dry conditions expected',
      advice: 'No rain gear required today. Roads and transit clear of weather delays.',
      evidence: `${rainMm.toFixed(1)} mm rainfall forecast`,
    };
  }

  // 2. Heat & Comfort Guidance
  let heatItem: GuidanceCardItem;
  if (tempMax >= 40) {
    heatItem = {
      key: 'heat',
      category: 'Heat',
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
      category: 'Heat',
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
      category: 'Heat',
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
      category: 'Heat',
      icon: <Thermometer size={16} className="text-foreground shrink-0" />,
      badge: 'Cool Weather',
      badgeClass: 'border-border bg-muted/40 text-foreground',
      headline: 'Brisk conditions',
      advice: 'Cool air in early mornings and late evenings. A light jacket or extra layer is recommended.',
      evidence: `${tempMax.toFixed(1)}°C expected`,
    };
  }

  // 3. Wind & Outdoor Safety Guidance
  let windItem: GuidanceCardItem;
  if (windKmh >= 45) {
    windItem = {
      key: 'wind',
      category: 'Wind',
      icon: <Wind size={16} className="text-destructive shrink-0" />,
      badge: 'High Gusts',
      badgeClass: 'border-destructive/30 bg-destructive/5 text-destructive',
      headline: 'Strong surface gusts',
      advice: 'Take caution on two-wheelers and elevated roads. Secure loose materials and outdoor fixtures.',
      evidence: `Peak ${Math.round(windKmh)} km/h gusts forecast`,
    };
  } else if (windKmh >= 25) {
    windItem = {
      key: 'wind',
      category: 'Wind',
      icon: <Wind size={16} className="text-warning shrink-0" />,
      badge: 'Brisk Breeze',
      badgeClass: 'border-warning/30 bg-warning/5 text-warning',
      headline: 'Brisk surface breeze',
      advice: 'Noticeable wind in open corridors. Normal transit; monitor conditions for dust drift in dry areas.',
      evidence: `${Math.round(windKmh)} km/h wind speed forecast`,
    };
  } else {
    windItem = {
      key: 'wind',
      category: 'Wind',
      icon: <Wind size={16} className="text-muted-foreground shrink-0" />,
      badge: 'Calm Air',
      badgeClass: 'border-border bg-muted/20 text-muted-foreground',
      headline: 'Gentle air movement',
      advice: 'Calm surface wind throughout the forecast window. Unrestricted outdoor activities and transit.',
      evidence: `${Math.round(windKmh)} km/h wind speed forecast`,
    };
  }

  return [rainItem, heatItem, windItem];
}

function GuidanceCard({ item }: { item: GuidanceCardItem }) {
  return (
    <div className="rounded-md border border-border bg-card p-3 flex flex-col justify-between sm:rounded-none sm:border-0 sm:bg-transparent sm:px-4 sm:py-0 sm:first:pl-0 sm:last:pr-0">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 font-medium text-xs text-foreground">
            {item.icon}
            <span>{item.category}</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[12px] font-mono border ${item.badgeClass}`}>
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
      <div className="mt-3 pt-2 border-t border-border/60 text-[12px] font-mono flex items-center justify-between">
        <span className="text-muted-foreground">Measured</span>
        <span className="font-medium text-foreground">{item.evidence}</span>
      </div>
    </div>
  );
}

export function CitizenWeatherBrief({ metrics, city, advisories }: CitizenWeatherBriefProps) {
  if (!metrics) {
    return (
      <div className="border-t border-border p-4">
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
    <div className="border-t border-border p-4">
      {/* Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/70 pb-2 mb-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground tracking-tight">
            What to do about it
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Commute, heat and outdoor guidance for {city}
            {metrics.updatedMinutesAgo != null && (
              <span className="font-mono ml-1.5 text-[12px] text-muted-foreground/80">
                • Updated {metrics.updatedMinutesAgo}m ago
              </span>
            )}
          </p>
        </div>
        <span className="text-[12px] font-mono text-muted-foreground">

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

      {/* Desktop: three hairline-separated columns — a fourth card around each
          one nested it inside the brief's own card and boxed every group. */}
      <div className="hidden sm:grid sm:grid-cols-3 sm:divide-x sm:divide-border">
        {items.map((item) => (
          <GuidanceCard key={item.key} item={item} />
        ))}
      </div>
    </div>
  );
}

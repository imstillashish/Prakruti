'use client';
import { useState, useEffect, useRef } from 'react';
import { CloudRain, Thermometer, Wind, RefreshCw, ShieldCheck, Umbrella, Car, Sun, AlertTriangle, ChevronRight, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Explain } from '@/components/explain/Explain';
import { WhyForecastModal } from '@/components/WhyForecast';
import { getForecastMetrics, MOCK_FORECAST, getMetadata, formatLastUpdated } from '@/lib/api';
import type { ForecastMetrics } from '@/types';

function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(0);

  useEffect(() => {
    const start = ref.current;
    const end = value;
    const duration = 600;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const current = start + (end - start) * ease;
      setDisplay(parseFloat(current.toFixed(decimals)));
      if (t < 1) requestAnimationFrame(tick);
      else ref.current = end;
    };
    requestAnimationFrame(tick);
  }, [value, decimals]);

  return <span>{display.toFixed(decimals)}</span>;
}

interface ForecastHeroProps {
  selectedCity?: string | null;
}

export function ForecastHero({ selectedCity = 'Kanpur' }: ForecastHeroProps) {
  const city = selectedCity || 'Kanpur';
  const [whyOpen, setWhyOpen] = useState(false);
  const [forecast, setForecast] = useState<ForecastMetrics>(MOCK_FORECAST);
  const [lastUpdated, setLastUpdated] = useState<string>('2026-09-26T23:45:12');
  const [isLoading, setIsLoading] = useState(true);


  const lastUpdatedDisplay = formatLastUpdated(lastUpdated);

  // Layperson-Friendly Synthesis
  const isHeavyRain = forecast.rainfall >= 15;
  const isLightRain = forecast.rainfall > 0 && forecast.rainfall < 15;
  const isHeatwave = forecast.temperature >= 38;
  const isHighWind = forecast.wind >= 30;

  let directSummary = "Clear and pleasant weather. Good conditions for outdoor plans and travel.";
  let badgeLabel = "Mild & Clear";
  let badgeColor = "bg-secondary text-foreground border-border";
  let gearAdvice = "No rain protection needed today.";
  let commuteAdvice = "Normal travel conditions on all major transit routes.";
  let outdoorAdvice = "Ideal conditions for open-air tasks and transport.";

  if (isHeavyRain) {
    directSummary = `Heavy rain expected (~${forecast.rainfall} mm). Waterlogging and transport delays likely.`;
    badgeLabel = "Heavy Downpour";
    badgeColor = "bg-destructive/10 text-destructive border-destructive/20";
    gearAdvice = "Carry an umbrella and waterproof footwear.";
    commuteAdvice = "Expect delays and waterlogging on low-lying roads.";
    outdoorAdvice = "Postpone non-essential field or outdoor activities.";
  } else if (isLightRain) {
    directSummary = `Scattered light showers expected (~${forecast.rainfall} mm). Roads may be damp.`;
    badgeLabel = "Light Showers";
    badgeColor = "bg-water/10 text-[#155a92] border-water/20";
    gearAdvice = "Keep a compact umbrella handy.";
    commuteAdvice = "Minor traffic slowing due to wet road surfaces.";
    outdoorAdvice = "Outdoor work possible with brief shower interruptions.";
  } else if (isHeatwave) {
    directSummary = `Extreme heat today (${forecast.temperature}°C). High heat index during midday.`;
    badgeLabel = "Heat Alert";
    badgeColor = "bg-destructive/10 text-destructive border-destructive/20";
    gearAdvice = "Wear light cotton clothing and sun protection.";
    commuteAdvice = "AC transit recommended between 12 PM and 4 PM.";
    outdoorAdvice = "Avoid heavy outdoor exertion during peak afternoon heat.";
  } else if (isHighWind) {
    directSummary = `Gusty winds up to ${forecast.wind} km/h. Secure loose outdoor objects.`;
    badgeLabel = "Squally Wind";
    badgeColor = "bg-destructive/10 text-destructive border-destructive/20";
    gearAdvice = "Wind-resistant outerwear advised.";
    commuteAdvice = "Exercise extra caution when cycling or driving two-wheelers.";
    outdoorAdvice = "Secure awnings, lightweight tarps, and loose rooftop items.";
  }

  return (
    <>
      {/* Hero band: sky-blue atmospheric wash — hero only (DESIGN.md v3) */}
      <div className="hero-sky mb-6 rounded-xl border border-border p-2 sm:p-3">
        <div className="rounded-lg border border-border bg-card shadow-none">
        {/* Top Header: City & Immediate Human Answer */}
        <div className="p-4 sm:p-6 border-b border-border rounded-t-lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Station: {city}
                </span>
                <span className="text-border">|</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide border ${badgeColor}`}
                >
                  {badgeLabel}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
                {directSummary}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time consensus synthesized from ECMWF, GFS, ICON, and GEM numerical models.
              </p>
            </div>

            {/* Quick Scientific Evidence Trigger */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWhyOpen(true)}
              className="text-foreground text-xs"
            >
              <Activity size={14} />
              Inspect Model Evidence
            </Button>
          </div>
        </div>

        {/* 4 Core Metrics: High-Contrast, Big Numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border border-b border-border">
          {/* Temperature */}
          <div className="p-4 sm:p-5 bg-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Air Temperature</span>
              <Thermometer size={16} className="text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-3xl font-semibold text-foreground tracking-tight tabular-nums">
                <AnimatedNumber value={forecast.temperature} decimals={1} />
              </span>
              <span className="text-sm font-medium text-muted-foreground">°C</span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
              Uncertainty: <span className="font-semibold text-foreground">±{forecast.temperatureUncertainty} °C</span>
              <Explain term="uncertainty" />
            </div>
          </div>

          {/* Rainfall — the page's one oversized readout */}
          <div className="p-4 sm:p-5 bg-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Precipitation</span>
              <CloudRain size={16} className="text-water" />
            </div>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-5xl sm:text-6xl font-semibold text-foreground tracking-tight tabular-nums">
                <AnimatedNumber value={forecast.rainfall} decimals={0} />
              </span>
              <span className="text-sm font-medium text-muted-foreground">mm</span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
              Uncertainty: <span className="font-semibold text-foreground">±{forecast.rainfallUncertainty} mm</span>
              <Explain term="uncertainty" />
            </div>
          </div>

          {/* Wind Speed */}
          <div className="p-4 sm:p-5 bg-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Wind (10m)</span>
              <Wind size={16} className="text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
                <AnimatedNumber value={forecast.wind} decimals={0} />
              </span>
              <span className="text-sm font-medium text-muted-foreground">km/h</span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
              Uncertainty: <span className="font-semibold text-foreground">±{forecast.windUncertainty} km/h</span>
              <Explain term="uncertainty" />
            </div>
          </div>

          {/* Confidence Score */}
          <div className="p-4 sm:p-5 bg-muted rounded-br-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Blend Reliability
                <Explain term="confidence" />
              </span>
              <ShieldCheck size={16} className="text-success" />
            </div>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
                <AnimatedNumber value={forecast.confidence} decimals={0} />
              </span>
              <span className="text-sm font-medium text-success">%</span>
            </div>
            <div className="mt-2 text-[11px] font-mono text-muted-foreground">
              {forecast.dominantModel ? `Dominant: ${forecast.dominantModel}` : 'Multi-Model Consensus'}
            </div>
          </div>
        </div>

        {/* Layperson Daily Guidance: 3 Practical Action Rungs */}
        <div className="p-4 sm:p-6 bg-muted rounded-b-lg">
          <div className="mb-3">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Practical Daily Guidance for {city}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">What to do about it</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Gear */}
            <div className="rounded-md border border-border bg-card p-3 flex items-start gap-2.5">
              <Umbrella size={16} className="text-water shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground">Personal Gear</div>
                <div className="text-muted-foreground mt-0.5 leading-relaxed">{gearAdvice}</div>
              </div>
            </div>

            {/* Commute */}
            <div className="rounded-md border border-border bg-card p-3 flex items-start gap-2.5">
              <Car size={16} className="text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground">Transit &amp; Travel</div>
                <div className="text-muted-foreground mt-0.5 leading-relaxed">{commuteAdvice}</div>
              </div>
            </div>

            {/* Outdoors */}
            <div className="rounded-md border border-border bg-card p-3 flex items-start gap-2.5">
              <Sun size={16} className="text-warning shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground">Work &amp; Outdoors</div>
                <div className="text-muted-foreground mt-0.5 leading-relaxed">{outdoorAdvice}</div>
              </div>
            </div>
          </div>

          {/* Bottom Telemetry Timestamp */}
          <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-muted-foreground">
            <div className="flex items-center gap-2">
              <RefreshCw size={12} className="text-success" />
              <span>Cycle: {lastUpdatedDisplay}</span>
            </div>
            <div>
              Ground reference: ERA5 Synoptic Reanalysis (MoES/NCMRWF)
            </div>
          </div>
        </div>
        </div>
      </div>

      <WhyForecastModal open={whyOpen} onClose={() => setWhyOpen(false)} selectedCity={city} />
    </>
  );
}

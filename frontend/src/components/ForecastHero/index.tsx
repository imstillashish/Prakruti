'use client';
import { useState, useEffect, useRef } from 'react';
import { CloudRain, Thermometer, Wind, RefreshCw, ShieldCheck, Umbrella, Car, Sun, AlertTriangle, ChevronRight, Activity } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
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
  let badgeColor = "bg-[#f2fcf7] text-[#12723c] border-[#95eebc]";
  let gearAdvice = "No rain protection needed today.";
  let commuteAdvice = "Normal travel conditions on all major transit routes.";
  let outdoorAdvice = "Ideal conditions for open-air tasks and transport.";

  if (isHeavyRain) {
    directSummary = `Heavy rain expected (~${forecast.rainfall} mm). Waterlogging and transport delays likely.`;
    badgeLabel = "Heavy Downpour";
    badgeColor = "bg-[#fbf5f4] text-[#80332d] border-[#cf746e]";
    gearAdvice = "Carry an umbrella and waterproof footwear.";
    commuteAdvice = "Expect delays and waterlogging on low-lying roads.";
    outdoorAdvice = "Postpone non-essential field or outdoor activities.";
  } else if (isLightRain) {
    directSummary = `Scattered light showers expected (~${forecast.rainfall} mm). Roads may be damp.`;
    badgeLabel = "Light Showers";
    badgeColor = "bg-[#f2fcf7] text-[#14522f] border-[#95eebc]";
    gearAdvice = "Keep a compact umbrella handy.";
    commuteAdvice = "Minor traffic slowing due to wet road surfaces.";
    outdoorAdvice = "Outdoor work possible with brief shower interruptions.";
  } else if (isHeatwave) {
    directSummary = `Extreme heat today (${forecast.temperature}°C). High heat index during midday.`;
    badgeLabel = "Heat Alert";
    badgeColor = "bg-[#fbf5f4] text-[#9e3f38] border-[#dfa8a5]";
    gearAdvice = "Wear light cotton clothing and sun protection.";
    commuteAdvice = "AC transit recommended between 12 PM and 4 PM.";
    outdoorAdvice = "Avoid heavy outdoor exertion during peak afternoon heat.";
  } else if (isHighWind) {
    directSummary = `Gusty winds up to ${forecast.wind} km/h. Secure loose outdoor objects.`;
    badgeLabel = "Squally Wind";
    badgeColor = "bg-[#fbf5f4] text-[#9e3f38] border-[#dfa8a5]";
    gearAdvice = "Wind-resistant outerwear advised.";
    commuteAdvice = "Exercise extra caution when cycling or driving two-wheelers.";
    outdoorAdvice = "Secure awnings, lightweight tarps, and loose rooftop items.";
  }

  return (
    <>
      <div
        className="glass-card mb-6"
        style={{
          borderRadius: 0,
          border: '1px solid #dbdbdb',
          background: '#ffffff',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Top Header: City & Immediate Human Answer */}
        <div className="p-4 sm:p-6 border-b border-[#dbdbdb]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 font-mono text-xs">
                <span className="font-bold text-[#168a49] tracking-wider uppercase">
                  Station: {city}
                </span>
                <span className="text-[#dbdbdb]">|</span>
                <span
                  style={{ borderRadius: 0 }}
                  className={`px-2 py-0.5 text-[11px] font-medium border ${badgeColor}`}
                >
                  {badgeLabel}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#212121] tracking-tight font-display">
                {directSummary}
              </h1>
              <p className="text-xs text-[#575757] mt-1">
                Real-time consensus synthesized from ECMWF, GFS, ICON, and GEM numerical models.
              </p>
            </div>

            {/* Quick Scientific Evidence Trigger */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWhyOpen(true)}
              className="text-[#212121] hover:bg-[#f7f7f7] border-[#dbdbdb] text-xs font-mono"
            >
              <Activity size={14} className="text-[#1db961]" />
              Inspect Model Evidence
            </Button>
          </div>
        </div>

        {/* 4 Core Metrics: Sharp, High-Contrast, Big Numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#dbdbdb] border-b border-[#dbdbdb]">
          {/* Temperature */}
          <div className="p-4 sm:p-5 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#575757]">Air Temperature</span>
              <Thermometer size={16} className="text-[#c0554d]" />
            </div>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-3xl font-bold text-[#212121] tracking-tight tabular-nums">
                <AnimatedNumber value={forecast.temperature} decimals={1} />
              </span>
              <span className="text-sm font-semibold text-[#808080]">°C</span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-[11px] font-mono text-[#808080]">
              Uncertainty: <span className="font-semibold text-[#333333]">±{forecast.temperatureUncertainty} °C</span>
              <Explain term="uncertainty" />
            </div>
          </div>

          {/* Rainfall — the page's one oversized readout */}
          <div className="p-4 sm:p-5 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#575757]">Precipitation</span>
              <CloudRain size={16} className="text-[#0369a1]" />
            </div>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-5xl sm:text-6xl font-bold text-[#212121] tracking-tight tabular-nums">
                <AnimatedNumber value={forecast.rainfall} decimals={0} />
              </span>
              <span className="text-sm font-semibold text-[#808080]">mm</span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-[11px] font-mono text-[#808080]">
              Uncertainty: <span className="font-semibold text-[#333333]">±{forecast.rainfallUncertainty} mm</span>
              <Explain term="uncertainty" />
            </div>
          </div>

          {/* Wind Speed */}
          <div className="p-4 sm:p-5 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#575757]">Wind (10m)</span>
              <Wind size={16} className="text-[#575757]" />
            </div>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-3xl sm:text-4xl font-bold text-[#212121] tracking-tight">
                <AnimatedNumber value={forecast.wind} decimals={0} />
              </span>
              <span className="text-sm font-semibold text-[#808080]">km/h</span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-[11px] font-mono text-[#808080]">
              Uncertainty: <span className="font-semibold text-[#333333]">±{forecast.windUncertainty} km/h</span>
              <Explain term="uncertainty" />
            </div>
          </div>

          {/* Confidence Score */}
          <div className="p-4 sm:p-5 bg-[#f7f7f7]">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-[#575757]">
                Blend Reliability
                <Explain term="confidence" />
              </span>
              <ShieldCheck size={16} className="text-[#168a49]" />
            </div>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-3xl sm:text-4xl font-bold text-[#14522f] tracking-tight">
                <AnimatedNumber value={forecast.confidence} decimals={0} />
              </span>
              <span className="text-sm font-semibold text-[#168a49]">%</span>
            </div>
            <div className="mt-2 text-[11px] font-mono text-[#168a49]">
              {forecast.dominantModel ? `Dominant: ${forecast.dominantModel}` : 'Multi-Model Consensus'}
            </div>
          </div>
        </div>

        {/* Layperson Daily Guidance: 3 Practical Action Rungs */}
        <div className="p-4 sm:p-6 bg-[#fcfcfc]">
          <div className="mb-3">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[#575757]">
              Practical Daily Guidance for {city}
            </h2>
            <p className="text-[11px] text-[#808080] mt-0.5">What to do about it</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Gear */}
            <div
              className="p-3 bg-white border border-[#dbdbdb] flex items-start gap-2.5"
              style={{ borderRadius: 0 }}
            >
              <Umbrella size={16} className="text-[#1db961] shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-[#212121]">Personal Gear</div>
                <div className="text-[#575757] mt-0.5 leading-relaxed">{gearAdvice}</div>
              </div>
            </div>

            {/* Commute */}
            <div
              className="p-3 bg-white border border-[#dbdbdb] flex items-start gap-2.5"
              style={{ borderRadius: 0 }}
            >
              <Car size={16} className="text-[#575757] shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-[#212121]">Transit &amp; Travel</div>
                <div className="text-[#575757] mt-0.5 leading-relaxed">{commuteAdvice}</div>
              </div>
            </div>

            {/* Outdoors */}
            <div
              className="p-3 bg-white border border-[#dbdbdb] flex items-start gap-2.5"
              style={{ borderRadius: 0 }}
            >
              <Sun size={16} className="text-[#f59e0b] shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-[#212121]">Work &amp; Outdoors</div>
                <div className="text-[#575757] mt-0.5 leading-relaxed">{outdoorAdvice}</div>
              </div>
            </div>
          </div>

          {/* Bottom Telemetry Timestamp */}
          <div className="mt-4 pt-3 border-t border-[#f0f0f0] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#808080]">
            <div className="flex items-center gap-2">
              <RefreshCw size={12} className="text-[#1db961]" />
              <span>Cycle: {lastUpdatedDisplay}</span>
            </div>
            <div>
              Ground reference: ERA5 Synoptic Reanalysis (MoES/NCMRWF)
            </div>
          </div>
        </div>
      </div>

      <WhyForecastModal open={whyOpen} onClose={() => setWhyOpen(false)} selectedCity={city} />
    </>
  );
}

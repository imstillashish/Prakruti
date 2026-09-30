'use client';
import { useState, useEffect, useRef } from 'react';
import { CloudRain, Thermometer, Wind, RefreshCw, ShieldCheck, Umbrella, Car, Sun, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ShaderButton } from '@/components/ui/ShaderButton';
import { Explain } from '@/components/explain/Explain';
import { WhyForecastModal } from '@/components/WhyForecast';
import { MOCK_FORECAST, getMetadata, getTimelineData, formatLastUpdated } from '@/lib/api';
import { monotonePath, EASE, usePrefersReducedMotion } from '@/components/spectrumui/charts/chart-engine';
import type { ForecastMetrics, TimelinePoint } from '@/types';

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

/* Scrubbable sparkline over the 72h window — the stat-cards pattern
   from the spectrum set, fed by real timeline data. */
function MetricSpark({
  series,
  timeLabels,
  color,
  unit,
  decimals = 0,
}: {
  series: number[];
  timeLabels: string[];
  color: string;
  unit: string;
  decimals?: number;
}) {
  const reduce = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const ro = new ResizeObserver(([entry]) =>
      setBox({ w: entry.contentRect.width, h: entry.contentRect.height }),
    );
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const n = series.length;
  const geom = (() => {
    if (n < 2 || box.w <= 0 || box.h <= 0) return null;
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of series) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    const span = hi - lo || 1;
    const points = series.map((v, i) => ({
      x: 2 + (i / (n - 1)) * (box.w - 4),
      y: 4 + (1 - (v - lo) / span) * (box.h - 8),
    }));
    return { points, line: monotonePath(points) };
  })();

  const onMove = (clientX: number) => {
    const node = ref.current;
    if (!node || n < 2) return;
    const b = node.getBoundingClientRect();
    const t = (clientX - b.left) / Math.max(1, b.width);
    setHover(Math.max(0, Math.min(n - 1, Math.round(t * (n - 1)))));
  };

  const scrub = hover != null && geom ? geom.points[hover] : null;

  return (
    <div>
      <div
        ref={ref}
        className="relative h-11 w-full cursor-crosshair touch-pan-y select-none"
        tabIndex={0}
        role="img"
        aria-label={`${timeLabels[0]} to ${timeLabels[n - 1]} trend`}
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerDown={(e) => onMove(e.clientX)}
        onPointerLeave={() => setHover(null)}
        onBlur={() => setHover(null)}
      >
        {geom ? (
          <svg width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`} className="block h-full w-full overflow-visible" aria-hidden>
            <path d={geom.line} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" opacity={0.9}
              style={reduce ? undefined : { strokeDasharray: 1, pathLength: 1, animation: `spectrum-mc-draw 700ms ${EASE} 200ms both` } as React.CSSProperties} />
            <line x1={geom.points[0].x} y1={0} x2={geom.points[0].x} y2={box.h} stroke="var(--hairline-strong, #dcdee0)" strokeWidth={1} strokeDasharray="2 3" />
            {scrub ? (
              <circle cx={scrub.x} cy={scrub.y} r={3.5} fill="white" stroke={color} strokeWidth={2} />
            ) : null}
          </svg>
        ) : null}
      </div>
      <div className="mt-1 h-4 text-[11px] font-mono text-muted-foreground">
        {hover != null && scrub ? (
          <span className="text-foreground">
            {timeLabels[hover]}: {series[hover].toFixed(decimals)} {unit}
          </span>
        ) : (
          <span>72h trend · scrub to inspect</span>
        )}
      </div>
    </div>
  );
}

interface MetricCellProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  decimals: number;
  unit: string;
  uncertainty?: number;
  series: number[];
  timeLabels: string[];
  color: string;
  big?: boolean;
  tone?: 'plain' | 'water' | 'success';
  explain?: 'uncertainty' | 'confidence';
  dominantModel?: string | null;
}

function MetricCell({
  label,
  icon,
  value,
  decimals,
  unit,
  uncertainty,
  series,
  timeLabels,
  color,
  big = false,
  tone = 'plain',
  explain = 'uncertainty',
  dominantModel,
}: MetricCellProps) {
  const n = series.length;
  const diff = n >= 2 ? series[n - 1] - series[0] : 0;
  const verb =
    Math.abs(diff) < (tone === 'water' ? 0.5 : 0.6)
      ? 'steady'
      : diff > 0
      ? label === 'Air Temperature'
        ? 'warming'
        : label === 'Wind (10m)'
        ? 'strengthening'
        : label === 'Blend Reliability'
        ? 'holding firm'
        : 'building'
      : label === 'Air Temperature'
      ? 'cooling'
      : 'easing';
  const caption = `${verb.charAt(0).toUpperCase()}${verb.slice(1)} over the next 72h`;

  return (
    <div className="p-4 sm:p-5 bg-card min-w-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-1 font-mono">
        <span className={`${big ? 'text-5xl sm:text-6xl' : 'text-3xl sm:text-4xl'} font-semibold text-foreground tracking-tight tabular-nums`}>
          <AnimatedNumber value={value} decimals={decimals} />
        </span>
        <span className={`text-sm font-medium ${tone === 'success' ? 'text-success' : 'text-muted-foreground'}`}>{unit}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
        {explain === 'confidence' ? (
          <>
            {dominantModel ? `Dominant: ${dominantModel}` : 'Multi-Model Consensus'}
            <Explain term="confidence" />
          </>
        ) : (
          <>
            Uncertainty: <span className="font-semibold text-foreground">±{uncertainty} {unit}</span>
            <Explain term={explain} />
          </>
        )}
      </div>
      <div className="mt-2">
        <MetricSpark series={series} timeLabels={timeLabels} color={color} unit={unit} decimals={decimals} />
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{caption}</div>
    </div>
  );
}

interface ForecastHeroProps {
  selectedCity?: string | null;
}

export function ForecastHero({ selectedCity = 'Kanpur' }: ForecastHeroProps) {
  const city = selectedCity || 'Kanpur';
  const [whyOpen, setWhyOpen] = useState(false);
  const [forecast, setForecast] = useState<ForecastMetrics>(MOCK_FORECAST);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('2026-09-26T23:45:12');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getMetadata()
      .then((data) => {
        if (mounted && data && data.last_updated) setLastUpdated(data.last_updated);
      })
      .catch(() => {});
    getTimelineData(city)
      .then((points) => {
        if (mounted && points.length >= 2) setTimeline(points);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [city]);

  const lastUpdatedDisplay = formatLastUpdated(lastUpdated);

  // Layperson-Friendly Synthesis
  const isHeavyRain = forecast.rainfall >= 15;
  const isLightRain = forecast.rainfall > 0 && forecast.rainfall < 15;
  const isHeatwave = forecast.temperature >= 38;
  const isHighWind = forecast.wind >= 30;

  let directSummary = 'Clear and pleasant weather. Good conditions for outdoor plans and travel.';
  let badgeLabel = 'Mild & Clear';
  let badgeColor = 'text-muted-foreground';
  let gearAdvice = 'No rain protection needed today.';
  let commuteAdvice = 'Normal travel conditions on all major transit routes.';
  let outdoorAdvice = 'Ideal conditions for open-air tasks and transport.';

  if (isHeavyRain) {
    directSummary = `Heavy rain expected (~${forecast.rainfall} mm). Waterlogging and transport delays likely.`;
    badgeLabel = 'Heavy Downpour';
    badgeColor = 'text-destructive';
    gearAdvice = 'Carry an umbrella and waterproof footwear.';
    commuteAdvice = 'Expect delays and waterlogging on low-lying roads.';
    outdoorAdvice = 'Postpone non-essential field or outdoor activities.';
  } else if (isLightRain) {
    directSummary = `Scattered light showers expected (~${forecast.rainfall} mm). Roads may be damp.`;
    badgeLabel = 'Light Showers';
    badgeColor = 'text-[#155a92]';
    gearAdvice = 'Keep a compact umbrella handy.';
    commuteAdvice = 'Minor traffic slowing due to wet road surfaces.';
    outdoorAdvice = 'Outdoor work possible with brief shower interruptions.';
  } else if (isHeatwave) {
    directSummary = `Extreme heat today (${forecast.temperature}°C). High heat index during midday.`;
    badgeLabel = 'Heat Alert';
    badgeColor = 'text-destructive';
    gearAdvice = 'Wear light cotton clothing and sun protection.';
    commuteAdvice = 'AC transit recommended between 12 PM and 4 PM.';
    outdoorAdvice = 'Avoid heavy outdoor exertion during peak afternoon heat.';
  } else if (isHighWind) {
    directSummary = `Gusty winds up to ${forecast.wind} km/h. Secure loose outdoor objects.`;
    badgeLabel = 'Squally Wind';
    badgeColor = 'text-destructive';
    gearAdvice = 'Wind-resistant outerwear advised.';
    commuteAdvice = 'Exercise extra caution when cycling or driving two-wheelers.';
    outdoorAdvice = 'Secure awnings, lightweight tarps, and loose rooftop items.';
  }

  const timeLabels = timeline.length >= 2 ? timeline.map((p) => p.time) : ['NOW', '+6h', '+12h', '+24h', '+48h', '+72h'];
  const rainSeries = timeline.length >= 2 ? timeline.map((p) => p.rainfall) : [forecast.rainfall, forecast.rainfall];
  const tempSeries = timeline.length >= 2 ? timeline.map((p) => p.temperature) : [forecast.temperature, forecast.temperature];
  const windSeries = timeline.length >= 2 ? timeline.map((p) => p.wind) : [forecast.wind, forecast.wind];
  const confSeries = timeline.length >= 2 ? timeline.map((p) => p.confidence) : [forecast.confidence, forecast.confidence];

  return (
    <>
      {/* Hero band: sky-blue atmospheric wash — hero only (DESIGN.md v3) */}
      <div className="hero-sky mb-6 rounded-xl border border-border p-2 sm:p-3">
        <div className="rounded-lg border border-border bg-card shadow-none">
          <div className="grid grid-cols-1 xl:grid-cols-12">
            {/* Left: the plain-language answer */}
            <div className="xl:col-span-5 p-4 sm:p-6 border-b xl:border-b-0 xl:border-r border-border flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Station: {city}
                </span>
                <span className="text-border">|</span>
                <span className={`text-[11px] font-semibold uppercase tracking-wide ${badgeColor}`}>
                  {badgeLabel}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-semibold text-foreground tracking-tight leading-[1.15]">
                {directSummary}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Real-time consensus synthesized from ECMWF, GFS, ICON, and GEM numerical models.
              </p>

              <div className="mt-auto pt-5 space-y-2.5">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  What to do about it
                </h2>
                <div className="rounded-md border border-border bg-card p-3 flex items-start gap-2.5">
                  <Umbrella size={17} className="shrink-0 mt-0.5 text-water" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">Personal Gear</div>
                    <div className="text-xs text-muted-foreground leading-relaxed">{gearAdvice}</div>
                  </div>
                </div>
                <div className="rounded-md border border-border bg-card p-3 flex items-start gap-2.5">
                  <Car size={17} className="shrink-0 mt-0.5 text-foreground" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">Transit &amp; Travel</div>
                    <div className="text-xs text-muted-foreground leading-relaxed">{commuteAdvice}</div>
                  </div>
                </div>
                <div className="rounded-md border border-border bg-card p-3 flex items-start gap-2.5">
                  <Sun size={17} className="shrink-0 mt-0.5 text-warning" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">Work &amp; Outdoors</div>
                    <div className="text-xs text-muted-foreground leading-relaxed">{outdoorAdvice}</div>
                  </div>
                </div>
                <ShaderButton onClick={() => setWhyOpen(true)} className="h-8 px-3 text-xs">
                  <Activity size={14} />
                  Inspect Model Evidence
                </ShaderButton>
              </div>
            </div>

            {/* Right: the 4-metric readout composite */}
            <div className="xl:col-span-7 grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-border">
              <MetricCell
                label="Air Temperature"
                icon={<Thermometer size={16} className="text-muted-foreground" />}
                value={forecast.temperature}
                decimals={1}
                unit="°C"
                uncertainty={forecast.temperatureUncertainty}
                series={tempSeries}
                timeLabels={timeLabels}
                color="#171717"
              />
              <MetricCell
                label="Precipitation"
                icon={<CloudRain size={16} className="text-water" />}
                value={forecast.rainfall}
                decimals={0}
                unit="mm"
                uncertainty={forecast.rainfallUncertainty}
                series={rainSeries}
                timeLabels={timeLabels}
                color="#1e6fb8"
                big
                tone="water"
              />
              <MetricCell
                label="Wind (10m)"
                icon={<Wind size={16} className="text-muted-foreground" />}
                value={forecast.wind}
                decimals={0}
                unit="km/h"
                uncertainty={forecast.windUncertainty}
                series={windSeries}
                timeLabels={timeLabels}
                color="#60646c"
              />
              <MetricCell
                label="Blend Reliability"
                icon={<ShieldCheck size={16} className="text-success" />}
                value={forecast.confidence}
                decimals={0}
                unit="%"
                series={confSeries}
                timeLabels={timeLabels}
                color="#16a34a"
                tone="success"
                explain="confidence"
                dominantModel={forecast.dominantModel}
              />
            </div>
          </div>

          {/* Bottom Telemetry Timestamp */}
          <div className="border-t border-border px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-muted-foreground">
            <div className="flex items-center gap-2">
              <RefreshCw size={12} className="text-success" />
              <span>Cycle: {lastUpdatedDisplay}</span>
            </div>
            <div>Ground reference: ERA5 Synoptic Reanalysis (MoES/NCMRWF)</div>
          </div>
        </div>
      </div>

      <WhyForecastModal open={whyOpen} onClose={() => setWhyOpen(false)} selectedCity={city} />
    </>
  );
}

'use client';
import { useState, useEffect, useRef } from 'react';
import { CloudRain, Thermometer, Wind, RefreshCw, ShieldCheck, Umbrella, Car, Sun, Activity, Droplet, HeartPulse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ShaderButton } from '@/components/ui/ShaderButton';
import { Explain } from '@/components/explain/Explain';
import { WhyForecastModal } from '@/components/WhyForecast';
import { MOCK_FORECAST, getAdvisories, getDecision, getForecastMetrics, getMetadata, getTimelineData, formatLastUpdated } from '@/lib/api';
import type { AdvisoryRecord, DecisionPayload } from '@/lib/api';
import { monotonePath, EASE, usePrefersReducedMotion } from '@/components/spectrumui/charts/chart-engine';
import type { ForecastMetrics, TimelinePoint } from '@/types';

function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  // rAF is throttled to zero in background tabs/webviews — setTimeout still
  // fires there, so the count-up can't stall at 0.
  const [display, setDisplay] = useState(value);
  const ref = useRef(value);

  useEffect(() => {
    const start = ref.current;
    const end = value;
    if (start === end) return;
    const duration = 600;
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(parseFloat((start + (end - start) * ease).toFixed(decimals)));
      if (t < 1) setTimeout(tick, 16);
      else ref.current = end;
    };
    tick();
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
  band?: { p10: number; p90: number };
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
  band,
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
    <div className="p-4 sm:p-5 bg-card min-w-0 h-full flex flex-col">
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
        ) : band ? (
          <>
            P10–P90: <span className="font-semibold text-foreground">{band.p10.toFixed(1)}–{band.p90.toFixed(1)} {unit}</span>
            <Explain term={explain} />
          </>
        ) : (
          <>
            Calibrated band pending…
            <Explain term={explain} />
          </>
        )}
      </div>
      {/* Phone hides the sparkline: the interactive 72h chart right below the hero
          carries the same trend; two stacked renderings doubled the scroll.
          sm:mt-auto anchors it to the cell floor so a stretched row is used
          rather than trailed by dead space. */}
      <div className="mt-2 sm:mt-auto hidden sm:block">
        <MetricSpark series={series} timeLabels={timeLabels} color={color} unit={unit} decimals={decimals} />
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{caption}</div>
    </div>
  );
}

/* Data-driven advice comes from the pipeline (outputs/advisories.csv via
   /api/advisories) — thresholds shared with ai/alerts.py, so the hero and
   the Alert Center can never disagree about what counts as hazardous. */
const BADGE_TONE_CLASS: Record<AdvisoryRecord['tone'], string> = {
  destructive: 'text-destructive',
  info: 'text-[#155a92]',
  muted: 'text-muted-foreground',
};

function categoryIcon(category: string) {
  switch (category) {
    case 'Personal Gear':
    case 'Rain Outlook':
      return <Umbrella size={17} className="shrink-0 mt-0.5 text-water" />;
    case 'Transit & Travel':
    case 'Two-Wheelers & Driving':
      return <Car size={17} className="shrink-0 mt-0.5 text-foreground" />;
    case 'Hydration':
      return <Droplet size={17} className="shrink-0 mt-0.5 text-water" />;
    case 'Vulnerable Groups':
      return <HeartPulse size={17} className="shrink-0 mt-0.5 text-destructive" />;
    case 'Secure Loose Objects':
      return <Wind size={17} className="shrink-0 mt-0.5 text-foreground" />;
    case 'Temperature':
      return <Thermometer size={17} className="shrink-0 mt-0.5 text-warning" />;
    default:
      return <Sun size={17} className="shrink-0 mt-0.5 text-warning" />;
  }
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
  const [advisories, setAdvisories] = useState<AdvisoryRecord[]>([]);
  const [advisoriesLoaded, setAdvisoriesLoaded] = useState(false);
  const [decision, setDecision] = useState<DecisionPayload | null>(null);

  useEffect(() => {
    let mounted = true;
    getDecision(city)
      .then((payload) => {
        if (mounted) setDecision(payload);
      })
      .catch(() => {});
    getForecastMetrics(city)
      .then((metrics) => {
        if (mounted) setForecast(metrics);
      })
      .catch(() => {});
    getAdvisories(city)
      .then((rows) => {
        if (mounted) setAdvisories([...rows].sort((a, b) => a.rank - b.rank));
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setAdvisoriesLoaded(true);
      });
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

  // Advice content — from the advisories pipeline; falls back to a calm
  // placeholder while loading or if the feed is unavailable.
  const headline = advisories[0]?.headline ?? 'Reading the latest blend…';
  const badgeLabel = advisories[0]?.badge ?? 'Standby';
  const badgeColor = advisories[0] ? BADGE_TONE_CLASS[advisories[0].tone] : 'text-muted-foreground';
  const cards = advisories.length >= 3
    ? advisories.slice(0, 3).map((a) => ({ category: a.category, action: a.action, evidence: a.evidence }))
    : [];

  // Probabilistic core: first decision record anchors the chips and bands.
  const nowRec = decision?.records?.[0];
  const agreementMeta: Record<string, { label: string; cls: string }> = {
    STRONG_AGREEMENT: { label: 'Strong agreement', cls: 'text-success border-success/30' },
    MIXED_SPLIT: { label: 'Mixed split', cls: 'text-warning border-warning/30' },
    HIGH_DISAGREEMENT_LOW_SIGNAL: { label: 'Models disagree', cls: 'text-muted-foreground border-border' },
    HIGH_TAIL_RISK_TIMING_UNCERTAIN: { label: 'High tail risk', cls: 'text-destructive border-destructive/30' },
  };
  const agreement = nowRec ? agreementMeta[nowRec.disagreement_class] : undefined;
  const probChips: string[] = [];
  if (nowRec) {
    const tp = nowRec.threshold_probabilities;
    const chip = (label: string, key: string, t: string) => {
      const p = tp?.[key]?.[t];
      if (p != null) probChips.push(`${label} · ${Math.round(p * 100)}%`);
    };
    chip('Rain ≥4 mm/h', 'rainfall', '4');
    chip('Heat ≥35 °C', 'temperature', '35');
    chip('Wind ≥25 km/h', 'wind_speed', '25');
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
                {headline}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Real-time consensus synthesized from ECMWF, GFS, ICON, and GEM numerical models.
              </p>

              {(agreement || probChips.length > 0) && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {agreement && (
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${agreement.cls}`}>
                      {agreement.label}
                    </span>
                  )}
                  {probChips.map((chip) => (
                    <span key={chip} className="inline-flex items-center rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                      {chip}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-auto pt-5 space-y-2.5">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  What to do about it
                </h2>
                {/* Phone: one advice card per view in a snap deck (~200px) instead of a
                    3-card vertical stack (~700px). Desktop keeps the stack. */}
                {cards.length > 0 ? (
                  <div className="sm:hidden carousel-snap-deck -mx-3 px-3">
                    {cards.map((card) => (
                      <div key={card.category} className="w-[86vw] max-w-[340px] shrink-0 carousel-snap-item rounded-md border border-border bg-card p-3 flex items-start gap-2.5">
                        {categoryIcon(card.category)}
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground">{card.category}</div>
                          <div className="text-xs text-muted-foreground leading-relaxed">{card.action}</div>
                          <div className="mt-1.5 text-[11px] font-mono text-muted-foreground/80">{card.evidence}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                {cards.length > 0 && (
                  <div className="hidden sm:grid sm:grid-cols-3 sm:gap-2.5">
                    {cards.map((card) => (
                      <div key={card.category} className="rounded-md border border-border bg-card p-3 flex items-start gap-2.5">
                        {categoryIcon(card.category)}
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground">{card.category}</div>
                          <div className="text-xs text-muted-foreground leading-relaxed">{card.action}</div>
                          <div className="mt-1.5 text-[11px] font-mono text-muted-foreground/80">{card.evidence}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {cards.length === 0 && [0, 1, 2].map((i) => (
                      <div key={i} className="rounded-md border border-border bg-card p-3 flex items-start gap-2.5">
                        <div className="h-4 w-4 rounded-full bg-muted shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="h-3 w-24 rounded bg-muted" />
                          <div className="h-3 w-full rounded bg-muted" />
                          <div className="h-3 w-3/4 rounded bg-muted" />
                        </div>
                      </div>
                    ))}
                {advisoriesLoaded && cards.length === 0 ? (
                  <p className="text-[11px] font-mono text-muted-foreground">Advisory feed unavailable — see Data Health.</p>
                ) : null}
                <ShaderButton onClick={() => setWhyOpen(true)} className="h-8 px-3 text-xs">
                  <Activity size={14} />
                  Inspect Model Evidence
                </ShaderButton>
              </div>
            </div>

            {/* Right: the 4-metric readout composite — 2-up on phone, divider grid on desktop */}
            <div className="xl:col-span-7 grid grid-cols-2 xl:grid-cols-2 sm:divide-x divide-border">
              <MetricCell
                label="Air Temperature"
                icon={<Thermometer size={16} className="text-muted-foreground" />}
                value={forecast.temperature}
                decimals={1}
                unit="°C"
                band={nowRec?.value?.temperature ? { p10: nowRec.value.temperature.p10, p90: nowRec.value.temperature.p90 } : undefined}
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
                band={nowRec?.value?.rainfall ? { p10: nowRec.value.rainfall.p10, p90: nowRec.value.rainfall.p90 } : undefined}
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
                band={nowRec?.value?.wind_speed ? { p10: nowRec.value.wind_speed.p10, p90: nowRec.value.wind_speed.p90 } : undefined}
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

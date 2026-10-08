'use client';
import { useState, useEffect, useRef } from 'react';
import { CloudRain, RefreshCw, ShieldCheck, Activity, Thermometer, Wind, Sun, Search, ChevronDown } from '@/components/icons';
import { ShaderButton } from '@/components/ui/ShaderButton';
import { motion, AnimatePresence } from 'motion/react';
import { Explain } from '@/components/explain/Explain';
import { WhyForecastModal } from '@/components/WhyForecast';
import { CitizenWeatherBrief } from './CitizenWeatherBrief';
import { LiveConditionsBand } from '@/components/LiveConditions';
import { MOCK_FORECAST, getAdvisories, getDecision, getForecastMetrics, getMetadata, getTimelineData, formatLastUpdated } from '@/lib/api';
import type { AdvisoryRecord, DecisionPayload } from '@/lib/api';
import { monotonePath, EASE, usePrefersReducedMotion } from '@/components/spectrumui/charts/chart-engine';
import type { ForecastMetrics, TimelinePoint } from '@/types';
import { DATA } from '@/lib/palette';

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
  hint,
}: {
  series: number[];
  timeLabels: string[];
  color: string;
  unit: string;
  decimals?: number;
  hint: string;
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
          <span>{hint}</span>
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
        : label === 'Forecast Certainty'
        ? 'holding firm'
        : 'building'
      : label === 'Air Temperature'
      ? 'cooling'
      : 'easing';
  const caption = `${verb.charAt(0).toUpperCase()}${verb.slice(1)} over the next 72h`;

  return (
    <div className="p-4 bg-card min-w-0 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-1 font-mono">
        <span className={`${big ? 'text-5xl sm:text-6xl' : 'text-3xl sm:text-4xl'} font-semibold text-foreground tracking-tight tabular-nums`}>
          <AnimatedNumber value={value} decimals={decimals} />
        </span>
        <span className={`text-sm font-medium ${tone === 'success' ? 'text-data-ok-text' : 'text-muted-foreground'}`}>{unit}</span>
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
        <MetricSpark
          series={series}
          timeLabels={timeLabels}
          color={color}
          unit={unit}
          decimals={decimals}
          hint={caption}
        />
      </div>
    </div>
  );
}

/* Data-driven advice comes from the pipeline (outputs/advisories.csv via
   /api/advisories) — thresholds shared with ai/alerts.py, so the hero and
   the Alert Center can never disagree about what counts as hazardous. */
const BADGE_TONE_CLASS: Record<AdvisoryRecord['tone'], string> = {
  destructive: 'text-destructive',
  info: 'text-data-rain-dark',
  muted: 'text-muted-foreground',
};

interface ForecastHeroProps {
  selectedCity?: string | null;
}

export function ForecastHero({ selectedCity = 'Kanpur' }: ForecastHeroProps) {
  const city = selectedCity || 'Kanpur';
  const [whyOpen, setWhyOpen] = useState(false);
  const [showTechProof, setShowTechProof] = useState(false);
  const [forecast, setForecast] = useState<ForecastMetrics>(MOCK_FORECAST);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('2026-09-26T23:45:12');
  const [isLoading, setIsLoading] = useState(true);
  const [advisories, setAdvisories] = useState<AdvisoryRecord[]>([]);
  const [advisoriesLoaded, setAdvisoriesLoaded] = useState(false);
  const [decision, setDecision] = useState<DecisionPayload | null>(null);
  const reduceMotion = usePrefersReducedMotion();

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
  // Probabilistic core: first decision record anchors the chips and bands.
  const nowRec = decision?.records?.[0];
  const agreementMeta: Record<string, { label: string; cls: string }> = {
    STRONG_AGREEMENT: { label: 'Strong agreement', cls: 'text-data-ok-text border-success/30' },
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
      {/* No mb-6: the page's own block rhythm (space-y-6) already spaces this
          band from the grid below, so the extra 24px was a double gap. */}
      <div className="hero-sky rounded-xl border border-border p-2">
        {/* The verdict, the four numbers, the measured reading, the citizen brief
            and the evidence drawer are one narrative. Stacked as sibling cards
            they doubled every seam and left 12px of sky between blocks that
            belong together — one card, hairline-separated sections. */}
        <div className="rounded-lg border border-border bg-card shadow-none overflow-hidden">
          {/* Splits at md: below xl the stacked halves made the card 943px tall
              at 768px — a whole screen of hero before any evidence. */}
          <div className="grid grid-cols-1 md:grid-cols-12">
            {/* Left: the plain-language answer */}
            <div className="md:col-span-5 p-4 border-b md:border-b-0 md:border-r border-border flex flex-col">
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
                Blended from 4 international weather supercomputers (ECMWF, GFS, ICON, GEM).
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

              {/* The advice deck that used to live here rendered the same three
                  categories the Everyday Citizen Brief below already carries with
                  its evidence line, and it was the tallest thing in this column:
                  it set the hero row height, which the 2x2 metric grid then
                  stretched into, at 611px desktop / 643px tablet. */}
              {advisoriesLoaded && advisories.length === 0 ? (
                <p className="mt-3 text-[11px] font-mono text-muted-foreground">
                  Advisory feed unavailable — see Data Health.
                </p>
              ) : null}

              {/* Provenance sits with the verdict. The StatusStrip at the top of
                  the page already carries the cycle time, so a whole strip of it
                  under the metrics repeated it; mt-auto pins the line to the
                  column floor instead. */}
              <div className="mt-auto pt-3 flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                <RefreshCw size={12} className="shrink-0 text-success" />
                <span>
                  Cycle {lastUpdatedDisplay}
                  <span className="hidden sm:inline">
                    {' '}
                    · verified against ERA5 (MoES / NCMRWF)
                  </span>
                </span>
              </div>
            </div>

            {/* Right: the 4-metric readout composite — 2-up on phone, divider grid on desktop */}
            <div className="md:col-span-7 grid grid-cols-2 sm:divide-x divide-border">
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
                icon={<CloudRain size={16} className="text-data-rain" />}
                value={forecast.rainfall}
                decimals={0}
                unit="mm"
                band={nowRec?.value?.rainfall ? { p10: nowRec.value.rainfall.p10, p90: nowRec.value.rainfall.p90 } : undefined}
                series={rainSeries}
                timeLabels={timeLabels}
                color={DATA.rain}
                big
                tone="plain"
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
                label="Forecast Certainty"
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

          {/* Measured station telemetry, polled separately from the forecast blend
              so a reader can always tell what was observed from what was predicted. */}
          <LiveConditionsBand city={city} />

          {/* Tier 1: Everyday Citizen Weather Brief */}
          <CitizenWeatherBrief metrics={forecast} city={city} advisories={advisories} />

          {/* Tier 3: Scientific Proof Progressive Disclosure */}
          <div className="border-t border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-foreground">
                Scientific Verification & Model Accuracy
              </div>
              <ShaderButton
                variant="ocean"
                size="sm"
                onClick={() => setShowTechProof((prev) => !prev)}
                aria-expanded={showTechProof}
                aria-controls="technical-evidence-drawer"
                className="shrink-0"
              >
                <Search size={14} />
                <span className="hidden sm:inline">Inspect Model Evidence &amp; Technical Data</span>
                <span className="sm:hidden">Inspect Model Evidence</span>
                <ChevronDown
                  size={14}
                  className="transition-transform duration-300 ease-out"
                  style={{ transform: showTechProof ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </ShaderButton>
          </div>

          <AnimatePresence initial={false}>
            {showTechProof && (
            <motion.div
              id="technical-evidence-drawer"
              key="technical-evidence-drawer"
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
            <div className="mt-3 pt-3 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Card 1: EXPECTED ACCURACY RANGE (raw model divergence & ensemble uncertainty) */}
              <div className="p-3 rounded-md border border-border bg-secondary/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                      EXPECTED ACCURACY RANGE
                    </span>
                    <Activity size={14} className="text-muted-foreground" />
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    Model Spread & Quantiles
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    72-hour variation window calculated from ECMWF, GFS, ICON, and GEM divergence.
                  </p>
                  <div className="mt-2.5 space-y-1 font-mono text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Temp (P10–P90):</span>
                      <span className="font-semibold text-foreground">
                        {nowRec?.value?.temperature
                          ? `${nowRec.value.temperature.p10.toFixed(1)}–${nowRec.value.temperature.p90.toFixed(1)} °C`
                          : `±${forecast.temperatureUncertainty || 1.2} °C`}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Rainfall (P10–P90):</span>
                      <span className="font-semibold text-foreground">
                        {nowRec?.value?.rainfall
                          ? `${nowRec.value.rainfall.p10.toFixed(1)}–${nowRec.value.rainfall.p90.toFixed(1)} mm`
                          : `±${forecast.rainfallUncertainty || 2} mm`}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Wind Speed:</span>
                      <span className="font-semibold text-foreground">
                        {nowRec?.value?.wind_speed
                          ? `${nowRec.value.wind_speed.p10.toFixed(0)}–${nowRec.value.wind_speed.p90.toFixed(0)} km/h`
                          : `±${forecast.windUncertainty || 3} km/h`}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-border/60 text-[11px] font-mono text-muted-foreground">
                  Status: {agreement?.label ?? 'Multi-Model Consensus'}
                </div>
              </div>

              {/* Card 2: HISTORICAL RELIABILITY (ERA5 error breakdown & blend accuracy) */}
              <div className="p-3 rounded-md border border-border bg-secondary/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                      HISTORICAL RELIABILITY
                    </span>
                    <ShieldCheck size={14} className="text-success" />
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    ERA5 Benchmark Skill
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Calibrated against official MoES / NCMRWF reanalysis archives to correct local bias.
                  </p>
                  <div className="mt-2.5 space-y-1 font-mono text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Certainty Index:</span>
                      <span className="font-semibold text-data-ok-text">
                        {forecast.confidence}% match
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Dominant Model:</span>
                      <span className="font-semibold text-foreground">
                        {forecast.dominantModel || 'ECMWF IFS'}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Bias Correction:</span>
                      <span className="font-semibold text-foreground">
                        Quantile Delta Mapping
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-border/60 text-[11px] font-mono text-muted-foreground">
                  Verified with ERA5 Synoptic Ground Truth
                </div>
              </div>

              {/* Card 3: CITY SAFETY READINESS (decision context & weight distributions) */}
              <div className="p-3 rounded-md border border-border bg-secondary/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                      CITY SAFETY READINESS
                    </span>
                    <Sun size={14} className="text-warning" />
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    Decision Thresholds for {city}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Early action triggers calibrated for municipal emergency management protocols.
                  </p>
                  <div className="mt-2.5 space-y-1 font-mono text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Rain Hazard (≥4 mm/h):</span>
                      <span className="font-semibold text-foreground">
                        {nowRec?.threshold_probabilities?.rainfall?.['4'] != null
                          ? `${Math.round(nowRec.threshold_probabilities.rainfall['4'] * 100)}%`
                          : '15%'}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Heat Stress (≥35 °C):</span>
                      <span className="font-semibold text-foreground">
                        {nowRec?.threshold_probabilities?.temperature?.['35'] != null
                          ? `${Math.round(nowRec.threshold_probabilities.temperature['35'] * 100)}%`
                          : '10%'}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Protocol Level:</span>
                      <span className="font-semibold text-foreground">
                        {badgeLabel}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Weights active
                  </span>
                  <button
                    type="button"
                    onClick={() => setWhyOpen(true)}
                    className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    View Weights Modal →
                  </button>
                </div>
              </div>
            </div>
            </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </div>

      <WhyForecastModal open={whyOpen} onClose={() => setWhyOpen(false)} selectedCity={city} />
    </>
  );
}

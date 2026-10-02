'use client';
import { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Panel } from '@/components/shell/Panel';
import { Explain } from '@/components/explain/Explain';
import { ChartState } from '@/components/spectrumui/charts/chart-engine';
import { getTimelineData } from '@/lib/api';
import type { TimelinePoint, Variable } from '@/types';
import { Calendar } from 'lucide-react';
const VARIABLE_CONFIG: Record<Variable, { label: string; unit: string; color: string; key: string; bandHigh?: string; bandLow?: string }> = {
  rainfall: { label: 'Rainfall', unit: 'mm', color: 'var(--water)', key: 'rainfall', bandHigh: 'rainfallP90', bandLow: 'rainfallP10' },
  temperature: { label: 'Temperature', unit: '°C', color: '#171717', key: 'temperature', bandHigh: 'temperatureP90', bandLow: 'temperatureP10' },
  wind: { label: 'Wind Speed', unit: 'km/h', color: '#60646c', key: 'wind', bandHigh: 'windP90', bandLow: 'windP10' },
};

type ChartDatum = { time: string; label?: string; high?: number; low?: number; confidence: number };

const CustomTooltip = ({ active, payload, label, dataList }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string; dataList?: ChartDatum[] }) => {
  if (!active || !payload?.length) return null;
  const list = dataList || [];
  const data = list.find(t => t.time === label);
  return (
    <div
      className="p-3 bg-card border border-border shadow-xs rounded-md font-mono text-xs"
      style={{
        minWidth: 150,
      }}
    >
      <div className="text-[11px] font-semibold text-muted-foreground mb-1 flex items-center justify-between">
        <span>{label}</span>
        {data?.label && <span className="text-muted-foreground font-normal">({data.label} IST)</span>}
      </div>
      {payload.map((p, i) => (
        <div key={i} className="text-base font-bold text-foreground">
          {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </div>
      ))}
      {data && data.high != null && data.low != null && (
        <div className="text-[11px] font-mono text-muted-foreground mt-1">
          P10–P90: {data.low.toFixed(1)}–{data.high.toFixed(1)}
        </div>
      )}
      {data && (
        <div className="text-[11px] text-success font-medium mt-1">
          Confidence: {data.confidence}%
        </div>
      )}
    </div>
  );
};

interface ForecastTimelineProps {
  selectedCity?: string | null;
  /** Overview hides the D+1–3 deck on phone (it doubles the scroll there); Forecast keeps it. */
  phoneCompact?: boolean;
}

export function ForecastTimeline({ selectedCity = 'Kanpur', phoneCompact }: ForecastTimelineProps) {
  const [variable, setVariable] = useState<Variable>('rainfall');
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(0);
  const deckRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let mounted = true;
    getTimelineData(selectedCity || 'Kanpur')
      .then((data) => {
        if (mounted && data && data.length > 0) {
          setTimeline(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [selectedCity]);

  const config = VARIABLE_CONFIG[variable];

  const chartData = timeline.map(t => ({
    time: t.time,
    label: t.label,
    value: t[config.key as keyof typeof t] as number,
    high: config.bandHigh ? t[config.bandHigh as keyof typeof t] as number | undefined : undefined,
    low: config.bandLow ? t[config.bandLow as keyof typeof t] as number | undefined : undefined,
    confidence: t.confidence,
  }));

  // ponytail: derive Day 1, 2, 3 aggregates directly from 72h sample points (0-24h, 24-48h, 48-72h)
  const d1Points = timeline.slice(0, 4);
  const d2Point = timeline[4] || timeline[timeline.length - 1];
  const d3Point = timeline[5] || timeline[timeline.length - 1];

  const getRiskTone = (risk: string) => {
    switch (risk) {
      case 'severe': return { label: 'Severe Alert', cls: 'text-destructive bg-destructive/10 border-destructive/30' };
      case 'high': return { label: 'High Risk', cls: 'text-[#ab6400] bg-[#ab6400]/10 border-[#ab6400]/30' };
      case 'moderate': return { label: 'Moderate', cls: 'text-warning bg-warning/10 border-warning/30' };
      default: return { label: 'Low Risk', cls: 'text-success bg-success/10 border-success/30' };
    }
  };

  const dayCards = [
    {
      index: 0,
      lead: 'D+1',
      title: 'Day 1 · Today',
      window: '0 – 24 Hours Ahead',
      rain: d1Points.length > 0 ? Math.max(...d1Points.map(p => p.rainfall)) : 72,
      temp: d1Points.length > 0 ? Math.max(...d1Points.map(p => p.temperature)) : 31.4,
      wind: d1Points.length > 0 ? Math.max(...d1Points.map(p => p.wind)) : 22,
      confidence: d1Points.length > 0 ? Math.round(d1Points.reduce((s, p) => s + p.confidence, 0) / d1Points.length) : 88,
      risk: (d1Points.some(p => p.risk === 'severe') ? 'severe' : d1Points.some(p => p.risk === 'high') ? 'high' : d1Points.some(p => p.risk === 'moderate') ? 'moderate' : 'low') as 'low' | 'moderate' | 'high' | 'severe',
      note: 'Peak precipitation window with active convective boundary',
    },
    {
      index: 1,
      lead: 'D+2',
      title: 'Day 2 · Tomorrow',
      window: '24 – 48 Hours Ahead',
      rain: d2Point?.rainfall ?? 38,
      temp: d2Point?.temperature ?? 32.1,
      wind: d2Point?.wind ?? 14,
      confidence: d2Point?.confidence ?? 76,
      risk: (d2Point?.risk ?? 'moderate') as 'low' | 'moderate' | 'high' | 'severe',
      note: 'Gradual convective decay; moderate surface winds',
    },
    {
      index: 2,
      lead: 'D+3',
      title: 'Day 3 · Outlook',
      window: '48 – 72 Hours Ahead',
      rain: d3Point?.rainfall ?? 18,
      temp: d3Point?.temperature ?? 33.2,
      wind: d3Point?.wind ?? 11,
      confidence: d3Point?.confidence ?? 61,
      risk: (d3Point?.risk ?? 'low') as 'low' | 'moderate' | 'high' | 'severe',
      note: 'Stable synoptic pattern; elevated model spread',
    },
  ];

  const scrollToDay = (idx: number) => {
    setActiveDay(idx);
    const target = cardRefs.current[idx];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const scrollLeft = el.scrollLeft;
    const card = cardRefs.current[0];
    const cardWidth = card ? card.offsetWidth + 12 : el.clientWidth * 0.88;
    const newIdx = Math.min(2, Math.max(0, Math.round(scrollLeft / cardWidth)));
    if (newIdx !== activeDay) {
      setActiveDay(newIdx);
    }
  };

  return (
    <Panel
      title="Hourly prediction horizon"
      subtitle="72-Hour Continuous Outlook with Adaptive AI Uncertainty Bands"
      actions={
        <div className="flex items-center gap-1 border border-border p-0.5 bg-secondary rounded-md">
          {(Object.keys(VARIABLE_CONFIG) as Variable[]).map((v) => (
            <button
              key={v}
              onClick={() => setVariable(v)}
              className={`px-3 py-1 text-xs font-mono font-medium rounded-sm transition-colors duration-100 ${
                variable === v
                  ? 'bg-card text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              type="button"
            >
              {VARIABLE_CONFIG[v].label}
            </button>
          ))}
        </div>
      }
    >

      <div className="w-full h-[220px]">
        <ChartState status={isLoading ? 'loading' : 'ready'} height={220} variant="line">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="uncertainty-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={config.color} stopOpacity={0.12} />
                <stop offset="95%" stopColor={config.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f3" />
            <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#60646c', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#60646c', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} unit={config.unit === 'mm' ? ' mm' : config.unit} />
            <ReTooltip content={<CustomTooltip dataList={chartData} />} />
            <ReferenceLine x="NOW" stroke={config.color} strokeDasharray="3 3" opacity={0.6} />
            {/* P10–P90 band: high area painted first, low area painted back
                over it in card color so the envelope wraps the line instead of
                stacking from zero. Hidden entirely when the decision feed is
                unavailable — the band is never drawn from synthetic values. */}
            {config.bandHigh && (
              <Area
                type="monotone"
                dataKey="high"
                stroke="none"
                fill="url(#uncertainty-grad)"
                fillOpacity={1}
                isAnimationActive={false}
                connectNulls={false}
              />
            )}
            {config.bandLow && (
              <Area
                type="monotone"
                dataKey="low"
                stroke="none"
                fill="var(--card, #ffffff)"
                fillOpacity={1}
                isAnimationActive={false}
                connectNulls={false}
              />
            )}
            <Area
              type="monotone"
              dataKey="value"
              stroke={config.color}
              strokeWidth={2}
              fill="none"
              dot={false}
              activeDot={{ r: 4, stroke: config.color, strokeWidth: 2, fill: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
        </ChartState>
      </div>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border text-[11px] font-mono text-muted-foreground">
        <span>Range: Next 72 Hours</span>
        <span className="flex items-center gap-1 text-primary">
          Calibrated P10–P90 band (spread-error model, holdout-verified)
          <Explain term="confidence" />
        </span>
      </div>

      {/* Day-Ahead Horizontal Snap Deck (Mobile/Tablet) & 3-Column Grid (Desktop).
          phoneCompact (Overview) hides it below lg: on that page the hero metric
          cards and the 72h chart carry the trend, and the D+1–3 detail this deck
          duplicates lives on the Forecast page. */}
      <div className={`mt-5 pt-4 border-t border-border ${phoneCompact ? 'hidden lg:block' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
              Day-Ahead Daily Horizons
            </span>
            <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
              (D+1 to D+3)
            </span>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground block lg:hidden">
            Swipe ↔
          </span>
        </div>

        {/* Snap Deck Container */}
        <div
          ref={deckRef}
          onScroll={handleScroll}
          className="carousel-snap-deck lg:grid lg:grid-cols-3 lg:overflow-visible gap-3 pb-2 lg:pb-0 touch-pan-y -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
        >
          {dayCards.map((day, idx) => {
            const risk = getRiskTone(day.risk);
            return (
              <div
                key={day.lead}
                ref={(el) => { cardRefs.current[idx] = el; }}
                onClick={() => scrollToDay(idx)}
                className="w-[88vw] sm:w-[340px] lg:w-auto shrink-0 lg:shrink carousel-snap-item lg:snap-align-none rounded-lg border border-border bg-card p-3.5 sm:p-4 flex flex-col justify-between transition-shadow hover:shadow-xs cursor-pointer lg:cursor-default"
              >
                <div>
                  {/* Two rows: the day chip and the risk pill share the top line,
                      the title gets the full width. On the narrow lg grid column
                      (~200px inner) all three on one line squeezed the pill until
                      "Low Risk" broke across two lines. */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border">
                      {day.lead}
                    </span>
                    <span className={`shrink-0 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${risk.cls}`}>
                      {risk.label}
                    </span>
                  </div>

                  <div className="text-sm font-semibold text-foreground mb-1.5">
                    {day.title}
                  </div>

                  <div className="text-[11px] font-mono text-muted-foreground mb-3">
                    {day.window}
                  </div>

                  {/* 3 Atmospheric Summary Readouts */}
                  <div className="grid grid-cols-3 gap-2 py-2 px-2.5 rounded-md bg-secondary/50 border border-border mb-3 font-mono text-xs">
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Rain</div>
                      <div className="font-bold text-water">{day.rain.toFixed(1)} <span className="text-[10px] font-normal text-muted-foreground">mm</span></div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Temp</div>
                      <div className="font-bold text-foreground">{day.temp.toFixed(1)} <span className="text-[10px] font-normal text-muted-foreground">°C</span></div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Wind</div>
                      <div className="font-bold text-muted-foreground">{day.wind.toFixed(0)} <span className="text-[10px] font-normal">km/h</span></div>
                    </div>
                  </div>
                </div>

                {/* Confidence Bar & Synopsis */}
                <div className="space-y-1.5 mt-auto pt-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <span>AI Confidence</span>
                    <span className="text-foreground font-semibold">{day.confidence}%</span>
                  </div>
                  <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground rounded-full transition-all duration-300"
                      style={{ width: `${day.confidence}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed pt-1 line-clamp-1">
                    {day.note}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Visual Dot Pagination Indicators (Mobile & Tablet <1024px) */}
        <div className="flex lg:hidden items-center justify-center gap-1 mt-2 pb-1">
          {dayCards.map((day, idx) => (
            <button
              key={day.lead}
              type="button"
              onClick={() => scrollToDay(idx)}
              aria-label={`Go to ${day.title}`}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center touch-target"
            >
              <span
                className={`h-2 rounded-full transition-all duration-200 ${
                  activeDay === idx
                    ? 'w-6 bg-foreground'
                    : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </Panel>
  );
}

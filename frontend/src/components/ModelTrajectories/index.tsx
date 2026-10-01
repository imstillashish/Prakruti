'use client';
import { useState, useEffect, useRef } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Panel } from '@/components/shell/Panel';
import { getModelCompare } from '@/lib/api';
import type { ModelComparePayload, ModelCompareSeries } from '@/lib/api';

type VarKey = 'temperature' | 'rainfall' | 'wind_speed';

const VAR_LABEL: Record<VarKey, { label: string; unit: string }> = {
  temperature: { label: 'Temperature', unit: '°C' },
  rainfall: { label: 'Rainfall', unit: 'mm/h' },
  wind_speed: { label: 'Wind', unit: 'km/h' },
};

const MODEL_ORDER = ['ecmwf', 'gfs', 'icon', 'gem'];
const MODEL_DISPLAY: Record<string, string> = {
  ecmwf: 'ECMWF', gfs: 'GFS', icon: 'ICON', gem: 'GEM',
};

const CLUSTER_BADGE: Record<string, string> = {
  TIGHT: 'text-success border-success/30 bg-success/5',
  MIXED: 'text-[#ab6400] border-[#ab6400]/30 bg-[#ab6400]/5',
  SPLIT: 'text-destructive border-destructive/30 bg-destructive/5',
};

interface TrajectoryRow {
  t: string;
  hour: string;
  band: [number, number] | null;
  blend: number | null;
  p10: number | null;
  p90: number | null;
  [model: string]: string | number | null | [number, number] | undefined;
}

function buildRows(series: ModelCompareSeries): { rows: TrajectoryRow[]; models: string[] } {
  const models = MODEL_ORDER.filter((m) => series.models[m]?.some((v) => v != null));
  const rows: TrajectoryRow[] = series.datetimes.map((dt, i) => {
    const p10 = series.p10[i] ?? null;
    const p90 = series.p90[i] ?? null;
    const row: TrajectoryRow = { t: dt, hour: dt.slice(11, 16), band: null, blend: series.blend_p50[i] ?? null, p10, p90 };
    if (p10 != null && p90 != null) row.band = [p10, p90];
    for (const m of models) row[m] = series.models[m]?.[i] ?? null;
    return row;
  });
  return { rows, models };
}

export function ModelTrajectories({ selectedCity = 'Kanpur' }: { selectedCity?: string }) {
  const [variable, setVariable] = useState<VarKey>('temperature');
  const [data, setData] = useState<ModelComparePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeLeadIdx, setActiveLeadIdx] = useState(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    getModelCompare(selectedCity)
      .then((payload) => {
        if (mounted) {
          setData(payload);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });
    return () => { mounted = false; };
  }, [selectedCity]);

  const varBlock = data?.variables?.[variable];
  const series = varBlock?.series ?? [];
  const cfg = VAR_LABEL[variable];
  const current = series[activeLeadIdx];

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const card = cardRefs.current[0];
    const width = card ? card.offsetWidth + 12 : el.clientWidth * 0.82;
    const idx = Math.min(series.length - 1, Math.max(0, Math.round(el.scrollLeft / width)));
    if (idx !== activeLeadIdx) setActiveLeadIdx(idx);
  };

  const outlierCount = (s: ModelCompareSeries) =>
    Object.values(s.outliers).reduce((acc, flags) => acc + flags.filter(Boolean).length, 0);

  return (
    <Panel
      title="Model trajectories vs blend"
      subtitle={`Every model's path against the blend and its P10–P90 envelope — ${cfg.label.toLowerCase()}, ${selectedCity}`}
      term="models"
      actions={
        <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-secondary border border-border">
          {(Object.keys(VAR_LABEL) as VarKey[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVariable(v)}
              className={`min-h-[32px] px-2.5 text-xs font-mono font-medium rounded-sm transition-colors duration-100 ${
                variable === v
                  ? 'bg-card text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {VAR_LABEL[v].label}
            </button>
          ))}
        </div>
      }
    >
      {isLoading && <div className="h-[220px] animate-pulse rounded-lg bg-secondary/50" />}

      {!isLoading && series.length === 0 && (
        <div className="py-10 text-center text-xs font-mono text-muted-foreground">
          Trajectory comparison unavailable — forecast pipeline has not published per-model data for this cycle.
        </div>
      )}

      {!isLoading && current && (() => {
        const { rows, models } = buildRows(current);
        const growth = varBlock?.spread_growth_per_lead;

        return (
          <div>
            {/* Desktop (>1024px): analytical multi-line chart + diagnostics strip */}
            <div className="hidden lg:block">
              <div className="flex items-center gap-3 mb-2 text-[11px] font-mono">
                <span className="text-muted-foreground">Lead day {current.lead_days} · next 24h</span>
                {growth != null && (
                  <span className="text-muted-foreground">
                    spread growth {growth >= 0 ? '+' : ''}{growth.toFixed(2)} {cfg.unit}/lead
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded-full border ${CLUSTER_BADGE[current.cluster_summary] ?? ''}`}>
                  {current.cluster_summary.replace('_', ' ')}
                </span>
                {outlierCount(current) > 0 && (
                  <span className="text-[#ab6400]">{outlierCount(current)} outlier steps</span>
                )}
              </div>
              <div className="w-full h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f3" />
                    <XAxis dataKey="hour" interval={3} tick={{ fontSize: 10, fill: '#6f6f6f', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#6f6f6f', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={44} />
                    <Tooltip
                      contentStyle={{ background: '#fff', border: '1px solid #dcdee0', borderRadius: 8, fontSize: 12, fontFamily: 'JetBrains Mono' }}
                      formatter={(v) => (typeof v === 'number' ? `${v.toFixed(1)} ${cfg.unit}` : String(v))}
                    />
                    <Area dataKey="band" stroke="none" fill="#f0f0f3" fillOpacity={0.9} />
                    {models.map((m) => (
                      <Line key={m} dataKey={m} stroke="#9e9e9e" strokeWidth={1.2} dot={false} name={MODEL_DISPLAY[m] ?? m} />
                    ))}
                    <Line dataKey="blend" stroke="#171717" strokeWidth={2.2} dot={false} name="Blend P50" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-2 pt-2.5 border-t border-border text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-foreground" />
                  <span className="text-foreground font-semibold">Blend P50</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-2 rounded-sm bg-[#f0f0f3] border border-border" />
                  <span className="text-muted-foreground">P10–P90 envelope</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-[#9e9e9e]" />
                  <span className="text-muted-foreground">Raw models</span>
                </div>
              </div>
            </div>

            {/* Mobile & tablet (<1024px): swipeable lead-day deck */}
            <div className="block lg:hidden">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                  {cfg.label} · swipe lead days ↔
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">Day {current.lead_days}/3</span>
              </div>
              <div
                onScroll={handleScroll}
                className="carousel-snap-deck gap-3 pb-2 touch-pan-y -mx-4 px-4 sm:-mx-6 sm:px-6"
              >
                {series.map((s, idx) => {
                  const built = buildRows(s);
                  return (
                    <div
                      key={s.lead_days}
                      ref={(el) => { cardRefs.current[idx] = el; }}
                      className="w-[82vw] sm:w-[340px] shrink-0 carousel-snap-item rounded-lg border bg-card border-border p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-semibold text-foreground">Day {s.lead_days}</span>
                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${CLUSTER_BADGE[s.cluster_summary] ?? ''}`}>
                          {s.cluster_summary.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="h-[88px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={built.rows} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                            <Area dataKey="band" stroke="none" fill="#f0f0f3" fillOpacity={0.9} />
                            {built.models.map((m) => (
                              <Line key={m} dataKey={m} stroke="#9e9e9e" strokeWidth={1} dot={false} />
                            ))}
                            <Line dataKey="blend" stroke="#171717" strokeWidth={2} dot={false} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-3 space-y-1.5 text-xs font-mono">
                        {built.models.map((m) => {
                          const flags = s.outliers[m] ?? [];
                          const flagged = flags.filter(Boolean).length;
                          return (
                            <div key={m} className="flex items-center justify-between">
                              <span className="text-muted-foreground">{MODEL_DISPLAY[m] ?? m}</span>
                              <span className="flex items-center gap-2">
                                {flagged > 0 && <span className="text-[10px] text-[#ab6400]">{flagged} outlier</span>}
                                <span className="text-foreground font-semibold">
                                  {(s.models[m]?.[0] ?? 0).toFixed(1)} {cfg.unit}
                                </span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-1 mt-2 pb-1">
                {series.map((s, idx) => (
                  <button
                    key={s.lead_days}
                    type="button"
                    aria-label={`View lead day ${s.lead_days}`}
                    onClick={() => {
                      setActiveLeadIdx(idx);
                      cardRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                    }}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center touch-target"
                  >
                    <span className={`h-2 rounded-full transition-all duration-200 ${activeLeadIdx === idx ? 'w-6 bg-foreground' : 'w-2 bg-muted-foreground/30'}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </Panel>
  );
}

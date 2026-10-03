'use client';
import { useState } from 'react';
import type { LeaderboardRow } from '@/lib/api';
import type { LeaderboardMeasure } from './types';
import { SERIES } from '@/lib/palette';
import type { ModelName } from '@/lib/palette';
import { ModelEmblem } from '@/components/common/ModelEmblem';
import { ModelSourceCard, SourceToggle } from './ModelSourceCard';

interface RankingTableProps {
  rows: LeaderboardRow[];
  measure: LeaderboardMeasure;
  unit: string;
  geo: string;
  variable: string;
  windowDays?: number | 'full' | null;
  threshold?: number | null;
  leadDays?: number | null;
}

const METHOD_LABELS: Record<string, string> = {
  weighted_blend: 'Prakruti Blend',
  equal_avg: 'Equal Average',
  persistence: 'Persistence (lag-24h)',
  ecmwf: 'ECMWF IFS',
  gfs: 'NOAA GFS',
  icon: 'DWD ICON',
  gem: 'CMC GEM',
};

export function RankingTable({
  rows,
  measure,
  unit,
  geo,
  variable,
  windowDays,
  threshold,
  leadDays,
}: RankingTableProps) {
  const [openRow, setOpenRow] = useState<string | null>(null);

  if (!rows || rows.length === 0) {
    const isExtreme = measure === 'extreme';
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground font-mono">
        {isExtreme
          ? 'No scorecard published for this context — nothing crossed the threshold in the window.'
          : 'No scorecard published for this context.'}
      </div>
    );
  }

  const metricName = measure === 'extreme' ? 'CSI' : 'MAE';
  const metricDirection = measure === 'extreme' ? 'higher is better' : 'lower is better';
  const colSpan = measure === 'extreme' ? 8 : 7;

  const lowSampleCount = rows.filter((r) => r.low_sample === 1).length;

  return (
    <div className="space-y-4">
      {/* Mobile Card Reflow (<640px) */}
      <div className="block sm:hidden space-y-3">
        {rows.map((row) => {
          const rowKey = `${row.board}-${row.geo}-${row.variable}-${row.method}`;
          const mKey = row.method.toUpperCase();
          const seriesColor = SERIES[mKey as ModelName] || (row.tier === 'blend' ? '#0d74ce' : '#64748b');
          const ciDiff =
            row.ci_high !== null && row.ci_low !== null
              ? ((row.ci_high - row.ci_low) / 2).toFixed(2)
              : null;

          return (
            <div
              key={`${row.board}-${row.geo}-${row.variable}-${row.method}`}
              className={`rounded-lg border p-4 shadow-2xs space-y-2.5 ${
                row.tier === 'blend' ? 'border-primary/40 bg-primary/[0.02]' : 'border-border bg-card'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-foreground">
                    #{row.rank}
                  </span>
                  {row.rank_low !== null && row.rank_high !== null && (
                    <span className="text-[11px] font-mono text-muted-foreground">
                      ({row.rank_low}↔{row.rank_high})
                    </span>
                  )}
                  <ModelEmblem method={row.method} size={16} />
                  <span
                    className="w-3 h-1.5 rounded-xs border border-border/60 shadow-2xs shrink-0"
                    style={{ backgroundColor: seriesColor }}
                  />
                  <span className="font-medium text-sm text-foreground">
                    {METHOD_LABELS[row.method] || row.method}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {row.tier === 'blend' && (
                    <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded-xs bg-primary/10 text-primary border border-primary/20">
                      ours
                    </span>
                  )}
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-xs bg-muted text-muted-foreground border border-border">
                    {row.tier}
                  </span>
                  {row.low_sample === 1 && (
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-xs border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      low n
                    </span>
                  )}
                </div>
              </div>

              {/* Primary Score */}
              <div className="flex items-baseline justify-between border-t border-border/40 pt-2 font-mono">
                <span className="text-xs text-muted-foreground">{metricName} ({metricDirection})</span>
                <div className="text-sm font-semibold text-foreground">
                  {row.value.toFixed(2)} {unit}
                  {ciDiff !== null && <span className="text-muted-foreground text-xs font-normal"> ±{ciDiff}</span>}
                </div>
              </div>

              {/* Secondary Decomposed Metrics */}
              <div className="grid grid-cols-3 gap-2 border-t border-border/40 pt-2 text-xs font-mono">
                {measure === 'extreme' ? (
                  <>
                    <div>
                      <span className="text-muted-foreground text-[10px] block">POD</span>
                      <span>{row.pod !== null ? row.pod.toFixed(2) : '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] block">FAR</span>
                      <span>{row.far !== null ? row.far.toFixed(2) : '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] block">Events</span>
                      <span>{row.cases?.toLocaleString() ?? '—'}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-muted-foreground text-[10px] block">RMSE</span>
                      <span>{row.rmse !== null ? `${row.rmse.toFixed(2)} ${unit}` : '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] block">Bias</span>
                      <span>{row.bias !== null ? `${row.bias.toFixed(2)} ${unit}` : '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] block">Pairs</span>
                      <span>{row.n.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>

              <SourceToggle
                block
                open={openRow === rowKey}
                onToggle={() => setOpenRow(openRow === rowKey ? null : rowKey)}
              />
              {openRow === rowKey && (
                <ModelSourceCard
                  method={row.method}
                  label={METHOD_LABELS[row.method] || row.method}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop & Tablet Table (sm:) */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border border-border bg-card shadow-2xs">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/40 font-mono text-xs text-muted-foreground">
              <th className="py-2.5 px-4 w-16">Rank</th>
              <th className="py-2.5 px-4">Method</th>
              <th className="py-2.5 px-4">{metricName} ({unit})</th>
              <th className="py-2.5 px-4 w-32">95% CI Whisker</th>
              {measure === 'extreme' ? (
                <>
                  <th className="py-2.5 px-4 text-right">POD</th>
                  <th className="py-2.5 px-4 text-right">FAR</th>
                  <th className="py-2.5 px-4 text-right">ETS</th>
                  <th className="py-2.5 px-4 text-right">Events</th>
                </>
              ) : (
                <>
                  <th className="py-2.5 px-4 text-right">RMSE ({unit})</th>
                  <th className="py-2.5 px-4 text-right">Bias ({unit})</th>
                  <th className="py-2.5 px-4 text-right">Pairs (n)</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((row) => {
              const rowKey = `${row.board}-${row.geo}-${row.variable}-${row.method}`;
              const mKey = row.method.toUpperCase();
              const seriesColor = SERIES[mKey as ModelName] || (row.tier === 'blend' ? '#0d74ce' : '#64748b');
              const ciDiff =
                row.ci_high !== null && row.ci_low !== null
                  ? ((row.ci_high - row.ci_low) / 2).toFixed(2)
                  : null;

              // CI Whisker geometry
              let whiskerPos = 50;
              if (row.ci_high !== null && row.ci_low !== null && row.ci_high > row.ci_low) {
                whiskerPos = Math.max(
                  0,
                  Math.min(100, ((row.value - row.ci_low) / (row.ci_high - row.ci_low)) * 100)
                );
              }

              return (
                <>
                <tr
                  key={`${row.board}-${row.geo}-${row.variable}-${row.method}`}
                  className={`transition-colors hover:bg-muted/20 ${
                    row.tier === 'blend' ? 'bg-primary/[0.03]' : ''
                  }`}
                >
                  {/* Rank Cell */}
                  <td className="py-3 px-4 font-mono">
                    <div className="font-semibold text-foreground">#{row.rank}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {row.rank_low !== null && row.rank_high !== null
                        ? `${row.rank_low} ↔ ${row.rank_high}`
                        : '—'}
                    </div>
                  </td>

                  {/* Method Cell */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <ModelEmblem method={row.method} size={16} />
                      <span
                        className="w-3 h-1.5 rounded-xs border border-border/60 shadow-2xs shrink-0"
                        style={{ backgroundColor: seriesColor }}
                      />
                      <span className="font-medium text-foreground">
                        {METHOD_LABELS[row.method] || row.method}
                      </span>
                      {row.tier === 'blend' && (
                        <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded-xs bg-primary/10 text-primary border border-primary/20">
                          ours
                        </span>
                      )}
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-xs bg-muted text-muted-foreground border border-border">
                        {row.tier}
                      </span>
                      {row.low_sample === 1 && (
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-xs border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          low n
                        </span>
                      )}
                      <SourceToggle
                        open={openRow === rowKey}
                        onToggle={() => setOpenRow(openRow === rowKey ? null : rowKey)}
                      />
                    </div>
                  </td>

                  {/* Score Cell */}
                  <td className="py-3 px-4 font-mono">
                    <span className="font-semibold text-foreground">{row.value.toFixed(2)}</span>
                    {ciDiff !== null ? (
                      <span className="text-muted-foreground text-xs font-normal"> ±{ciDiff}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs"> —</span>
                    )}
                  </td>

                  {/* CI Whisker */}
                  <td className="py-3 px-4">
                    {row.ci_high !== null && row.ci_low !== null ? (
                      <div className="relative w-24 h-4 flex items-center">
                        {/* Span line */}
                        <div className="absolute w-full h-[1px] bg-border" />
                        {/* Left bracket */}
                        <div className="absolute left-0 h-2 w-[1px] bg-muted-foreground/60" />
                        {/* Right bracket */}
                        <div className="absolute right-0 h-2 w-[1px] bg-muted-foreground/60" />
                        {/* Value marker */}
                        <div
                          className="absolute h-3 w-[2px] bg-foreground"
                          style={{ left: `${whiskerPos}%` }}
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground font-mono">—</span>
                    )}
                  </td>

                  {/* Decomposed Columns */}
                  {measure === 'extreme' ? (
                    <>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                        {row.pod !== null ? row.pod.toFixed(2) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                        {row.far !== null ? row.far.toFixed(2) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                        {row.ets !== null ? row.ets.toFixed(2) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-foreground">
                        {row.cases?.toLocaleString() ?? '—'}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                        {row.rmse !== null ? row.rmse.toFixed(2) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                        {row.bias !== null ? row.bias.toFixed(2) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-foreground">
                        {row.n.toLocaleString()}
                      </td>
                    </>
                  )}
                </tr>
                {openRow === rowKey && (
                  <tr className="bg-muted/20">
                    <td colSpan={colSpan} className="px-4 pb-4 pt-1">
                      <ModelSourceCard
                        method={row.method}
                        label={METHOD_LABELS[row.method] || row.method}
                      />
                    </td>
                  </tr>
                )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Disclosures & Metadata Footer */}
      <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground space-y-1 font-mono">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-1.5">
          <span>
            Ranked by {metricName} ({metricDirection}) · {variable} · {geo === 'IN' ? 'All India' : geo} ·{' '}
            {windowDays === 'full' || !windowDays ? 'Full window' : `${windowDays} days`}
            {threshold !== null && threshold !== undefined && ` · threshold ≥ ${threshold} ${unit}`}
            {leadDays !== null && leadDays !== undefined && ` · lead day ${leadDays}`}
          </span>
          <span>{rows.length} methods evaluated</span>
        </div>
        <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
          <span>no composite index — constituents only (PRD §10.5.A)</span>
          <span>Unconditioned dimensions: weather_regime, season, geographic_unit</span>
        </div>
        <div className="text-[11px] text-muted-foreground/80">
          Confidence intervals (95%) and rank ranges published for national aggregate only.
          {lowSampleCount > 0 && ` ${lowSampleCount} method(s) flagged with low sample size.`}
        </div>
      </div>
    </div>
  );
}

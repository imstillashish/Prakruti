'use client';
import { Fragment, useEffect, useState } from 'react';
import type { LeaderboardRow, ModelCard } from '@/lib/api';
import { getModelLeaderboard } from '@/lib/api';
import { SERIES } from '@/lib/palette';
import type { ModelName } from '@/lib/palette';
import type { LeaderboardCategory } from './types';
import { ModelEmblem } from '@/components/common/ModelEmblem';
import { ModelSourceCard, SourceToggle } from './ModelSourceCard';

interface PodiumMatrixProps {
  onSelectCategory: (category: LeaderboardCategory) => void;
  cards?: Record<string, ModelCard> | null;
}

interface MethodMatrixRow {
  method: string;
  tier: string;
  firsts: number;
  summedRank: number;
  cells: Record<
    string,
    {
      rank: number;
      rank_low: number | null;
      rank_high: number | null;
      mae: number;
      ci_low: number | null;
      ci_high: number | null;
    }
  >;
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

const VARIABLES = [
  { key: 'temperature', label: 'Temperature', unit: '°C' },
  { key: 'rainfall', label: 'Rainfall', unit: 'mm/h' },
  { key: 'wind_speed', label: 'Wind Speed', unit: 'km/h' },
];

export function PodiumMatrix({ onSelectCategory, cards }: PodiumMatrixProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [matrix, setMatrix] = useState<MethodMatrixRow[]>([]);
  const [openRow, setOpenRow] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      getModelLeaderboard({ board: 'accuracy', variable: 'temperature', geo: 'IN', window: 'full' }),
      getModelLeaderboard({ board: 'accuracy', variable: 'rainfall', geo: 'IN', window: 'full' }),
      getModelLeaderboard({ board: 'accuracy', variable: 'wind_speed', geo: 'IN', window: 'full' }),
    ])
      .then(([tempData, rainData, windData]) => {
        if (!active) return;
        if (!tempData || !rainData || !windData) {
          setError(true);
          setLoading(false);
          return;
        }

        const map: Record<string, MethodMatrixRow> = {};

        const processRows = (rows: LeaderboardRow[], varKey: string) => {
          rows.forEach((r) => {
            if (!map[r.method]) {
              map[r.method] = {
                method: r.method,
                tier: r.tier,
                firsts: 0,
                summedRank: 0,
                cells: {},
              };
            }
            if (r.rank === 1) map[r.method].firsts += 1;
            map[r.method].summedRank += r.rank;
            map[r.method].cells[varKey] = {
              rank: r.rank,
              rank_low: r.rank_low,
              rank_high: r.rank_high,
              mae: r.value,
              ci_low: r.ci_low,
              ci_high: r.ci_high,
            };
          });
        };

        processRows(tempData.rows, 'temperature');
        processRows(rainData.rows, 'rainfall');
        processRows(windData.rows, 'wind_speed');

        const sorted = Object.values(map).sort((a, b) => {
          if (b.firsts !== a.firsts) return b.firsts - a.firsts;
          return a.summedRank - b.summedRank;
        });

        setMatrix(sorted);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center text-sm font-mono text-muted-foreground animate-pulse">
        Loading scorecard…
      </div>
    );
  }

  if (error || matrix.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm font-mono text-muted-foreground">
        Leaderboard unavailable — run ai/benchmark.py to publish outputs/leaderboard.csv.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-2xs">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/40 font-mono text-xs text-muted-foreground">
              <th className="py-2.5 px-4">Method</th>
              <th className="py-2.5 px-4 text-center w-24">1st Places</th>
              <th className="py-2.5 px-4 text-center w-28">Summed Rank</th>
              {VARIABLES.map((v) => (
                <th
                  key={v.key}
                  className="py-2.5 px-4 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() =>
                    onSelectCategory(
                      v.key === 'wind_speed'
                        ? 'wind'
                        : (v.key as 'temperature' | 'rainfall')
                    )
                  }
                  title={`View full ${v.label} scorecard`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{v.label}</span>
                    <span className="text-[10px] text-muted-foreground/70 font-normal">
                      ({v.unit})
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {matrix.map((row) => {
              const mKey = row.method.toUpperCase();
              const seriesColor =
                SERIES[mKey as ModelName] ||
                (row.tier === 'blend' ? '#0d74ce' : '#64748b');

              return (
                <Fragment key={row.method}>
                <tr
                  className={`transition-colors hover:bg-muted/20 ${
                    row.tier === 'blend' ? 'bg-primary/[0.03]' : ''
                  }`}
                >
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
                      <SourceToggle
                        open={openRow === row.method}
                        onToggle={() => setOpenRow(openRow === row.method ? null : row.method)}
                      />
                    </div>
                  </td>

                  {/* 1st Places */}
                  <td className="py-3 px-4 text-center font-mono font-semibold text-foreground">
                    {row.firsts > 0 ? (
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-xs bg-success/10 text-data-ok-text border border-success/20 text-xs">
                        {row.firsts}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">0</span>
                    )}
                  </td>

                  {/* Summed Rank */}
                  <td className="py-3 px-4 text-center font-mono text-xs text-muted-foreground">
                    {row.summedRank}
                  </td>

                  {/* Variable Columns */}
                  {VARIABLES.map((v) => {
                    const cell = row.cells[v.key];
                    if (!cell) {
                      return (
                        <td key={v.key} className="py-3 px-4 font-mono text-xs text-muted-foreground">
                          —
                        </td>
                      );
                    }

                    return (
                      <td
                        key={v.key}
                        onClick={() =>
                          onSelectCategory(
                            v.key === 'wind_speed'
                              ? 'wind'
                              : (v.key as 'temperature' | 'rainfall')
                          )
                        }
                        className="py-3 px-4 font-mono cursor-pointer hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-1.5 py-0.5 rounded-xs ${
                              cell.rank === 1
                                ? 'bg-success/15 text-data-ok-text border border-success/20'
                                : cell.rank === 2
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'bg-muted text-muted-foreground border border-border'
                            }`}
                          >
                            #{cell.rank}
                          </span>
                          <div>
                            <div className="font-semibold text-foreground text-xs">
                              {cell.mae.toFixed(2)}
                            </div>
                            {cell.rank_low !== null && cell.rank_high !== null && (
                              <div className="text-[10px] text-muted-foreground">
                                {cell.rank_low}↔{cell.rank_high}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
                {openRow === row.method && (
                  <tr className="bg-muted/20">
                    <td colSpan={3 + VARIABLES.length} className="px-4 pb-4 pt-1">
                      <ModelSourceCard
                        method={row.method}
                        label={METHOD_LABELS[row.method] || row.method}
                        card={cards?.[row.method]}
                      />
                    </td>
                  </tr>
                )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground font-mono space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            Sorted by 1st-place finishes (desc), then summed rank across all 3 variables (asc).
          </span>
          <span>Full window · All India</span>
        </div>
        <div className="text-[11px] text-muted-foreground/80">
          Each cell shows the rank and mean absolute error (MAE) evaluated against station observations. Click any column or cell to inspect its full scorecard.
        </div>
      </div>
    </div>
  );
}

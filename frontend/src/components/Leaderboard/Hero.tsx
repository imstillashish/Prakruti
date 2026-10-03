'use client';
import { useEffect, useState } from 'react';
import type { LeaderboardMeta, CycleState } from '@/lib/api';
import { getCycleState } from '@/lib/api';
import { Check, Clock, AlertTriangle } from '@/components/icons';

interface HeroProps {
  meta: LeaderboardMeta | null;
}

export function Hero({ meta }: HeroProps) {
  const [cycle, setCycle] = useState<CycleState | null>(null);
  const [cycleError, setCycleError] = useState(false);

  useEffect(() => {
    let active = true;
    getCycleState()
      .then((data) => {
        if (!active) return;
        if (data) {
          setCycle(data);
          setCycleError(false);
        } else {
          setCycleError(true);
        }
      })
      .catch(() => {
        if (active) setCycleError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const models = ['ecmwf', 'gfs', 'icon', 'gem'];

  return (
    <header className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-b from-sky-500/10 via-background to-background p-3 sm:p-6 md:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Left: Editorial Heading & Context */}
        <div className="lg:col-span-8 space-y-3 sm:space-y-4">
          <div className="hidden sm:inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-foreground/70 uppercase">
            Model benchmark · verified against observations
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-foreground">
            Ranked against the weather that actually happened
          </h1>
          <p className="hidden sm:block max-w-2xl text-sm md:text-base text-muted-foreground leading-relaxed">
            Every rank is scored against station observations — stratified by variable, window and lead, never blended into one number.
          </p>

          {/* Stat chips row */}
          {meta ? (
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs font-mono text-foreground/80">
              <span className="rounded-md border border-border bg-card px-2.5 py-1 shadow-2xs">
                {meta.window?.start ?? '—'} → {meta.window?.end ?? '—'}
              </span>
              <span className="rounded-md border border-border bg-card px-2.5 py-1 shadow-2xs">
                {meta.stations_scored ?? 45} stations
              </span>
              <span className="rounded-md border border-border bg-card px-2.5 py-1 shadow-2xs">
                {meta.row_count?.toLocaleString() ?? '—'} scorecard rows
              </span>
              <span className="rounded-md border border-border bg-card px-2.5 py-1 shadow-2xs">
                {meta.methods_ranked ?? 7} methods
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs font-mono text-muted-foreground">
              <span className="rounded-md border border-border bg-card px-2.5 py-1">Loading scorecard…</span>
            </div>
          )}
        </div>

        {/* Right: Live Cycle Rail */}
        <div className="lg:col-span-4 w-full">
          <div className="rounded-lg border border-border/80 bg-card/80 p-2 backdrop-blur-xs shadow-2xs space-y-3 sm:p-4">
            {cycleError ? (
              <div className="text-xs text-muted-foreground font-mono">
                Cycle state unavailable — run the forecast pipeline
              </div>
            ) : cycle ? (
              <>
                <div className="flex items-center justify-between text-xs font-mono text-foreground/90 border-b border-border/60 pb-2">
                  <span>Cycle {cycle.cycle_id}</span>
                  <span className="text-muted-foreground">
                    {cycle.source_completeness?.available ?? 0}/{cycle.source_completeness?.expected ?? 4} sources
                  </span>
                </div>
                {/* Per-model receipt rows are a desktop detail; the phone hero keeps
                    the "4/4 sources" summary line only. */}
                <div className="hidden sm:block space-y-2">
                  {models.map((modelKey) => {
                    const info = cycle.models?.[modelKey];
                    const isReceived = info?.status === 'received' || (info?.rows && info.rows > 0);
                    const isStale = info?.status === 'stale';

                    return (
                      <div
                        key={modelKey}
                        className="flex items-center justify-between text-xs font-mono"
                      >
                        <span className="uppercase font-semibold text-foreground/80">{modelKey}</span>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          {isReceived ? (
                            <>
                              <Check size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>received · {info?.rows?.toLocaleString() ?? 0} rows</span>
                            </>
                          ) : isStale ? (
                            <>
                              <Clock size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>stale — previous cycle</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={14} className="text-destructive shrink-0" />
                              <span>missing</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {cycle.source_completeness?.fallback && (
                  <div className="pt-1 text-[11px] font-mono text-amber-600 dark:text-amber-400 border-t border-border/60">
                    fallback blending in effect
                  </div>
                )}
              </>
            ) : (
              <div className="text-xs text-muted-foreground font-mono animate-pulse">
                Loading cycle rail…
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

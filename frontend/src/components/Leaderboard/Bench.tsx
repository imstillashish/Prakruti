'use client';
import type { LeaderboardPayload, LeaderboardMeta } from '@/lib/api';
import type { LeaderboardState, LeaderboardMeasure } from './types';
import { CATEGORY_VARIABLE, VARIABLE_UNIT } from './types';
import { RankingTable } from './RankingTable';
import { ParetoView } from './ParetoView';
import { PodiumMatrix } from './PodiumMatrix';

interface BenchProps {
  state: LeaderboardState;
  onChange: (patch: Partial<LeaderboardState>) => void;
  payload: LeaderboardPayload | null;
  isLoading: boolean;
  isError: boolean;
  cities: Array<{ city: string }>;
  meta: LeaderboardMeta | null;
}

export function Bench({
  state,
  onChange,
  payload,
  isLoading,
  isError,
  cities,
  meta,
}: BenchProps) {
  const isOverall = state.category === 'overall';
  const activeVariable = isOverall ? 'rainfall' : CATEGORY_VARIABLE[state.category as 'temperature' | 'rainfall' | 'wind'];
  const unit = VARIABLE_UNIT[activeVariable] || '';

  // Published windows from meta or fallback
  const publishedWindows = meta?.windows_published || [7, 14, 30];

  // Primary operational thresholds
  const thresholdOptions =
    activeVariable === 'rainfall'
      ? [4, 8]
      : activeVariable === 'temperature'
      ? [33, 37]
      : [24, 32];

  const leadOptions = [1, 2, 3];

  return (
    <div id="leaderboard-bench" className="space-y-5">
      {/* Bench Controls Strip */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left Controls: Geography & Window */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Geography Select */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="geo-select"
                className="text-xs font-mono text-muted-foreground whitespace-nowrap"
              >
                Scope:
              </label>
              <select
                id="geo-select"
                value={state.geo}
                onChange={(e) => onChange({ geo: e.target.value })}
                className="h-9 min-h-[44px] sm:min-h-0 rounded-md border border-border bg-background px-3 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="IN">All India (National Pool)</option>
                {cities.map((c) => (
                  <option key={c.city} value={c.city}>
                    {c.city}
                  </option>
                ))}
              </select>
            </div>

            {/* Window Tabs (Disabled in Pareto view) */}
            <div className="flex items-center gap-1.5 border-l border-border/60 pl-3">
              <span className="text-xs font-mono text-muted-foreground hidden sm:inline">
                Window:
              </span>
              {state.view === 'pareto' ? (
                <span className="text-xs font-mono text-muted-foreground px-2 py-1 rounded-md bg-muted/40 border border-border">
                  Full window
                </span>
              ) : (
                <div className="flex items-center rounded-md border border-border bg-muted/30 p-0.5">
                  <button
                    type="button"
                    onClick={() => onChange({ window: 'full' })}
                    className={`h-8 min-h-[44px] sm:min-h-0 px-2.5 rounded-sm text-xs font-mono transition-all cursor-pointer ${
                      state.window === 'full'
                        ? 'gradient-animated-ocean text-white shadow-2xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Full
                  </button>
                  {publishedWindows.map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => onChange({ window: days })}
                      className={`h-8 min-h-[44px] sm:min-h-0 px-2.5 rounded-sm text-xs font-mono transition-all cursor-pointer ${
                        state.window === days
                          ? 'gradient-animated-ocean text-white shadow-2xs font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Controls: View Switch & Measure Switch (Variable category only) */}
          {!isOverall && (
            <div className="flex flex-wrap items-center gap-3">
              {/* View as: Ranking | Pareto */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-muted-foreground hidden sm:inline">
                  View:
                </span>
                <div className="flex items-center rounded-md border border-border bg-muted/30 p-0.5">
                  <button
                    type="button"
                    onClick={() => onChange({ view: 'ranking' })}
                    className={`h-8 min-h-[44px] sm:min-h-0 px-3 rounded-sm text-xs font-mono transition-all cursor-pointer ${
                      state.view === 'ranking'
                        ? 'gradient-animated-ocean text-white shadow-2xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Ranking
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ view: 'pareto' })}
                    className={`h-8 min-h-[44px] sm:min-h-0 px-3 rounded-sm text-xs font-mono transition-all cursor-pointer ${
                      state.view === 'pareto'
                        ? 'gradient-animated-ocean text-white shadow-2xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Pareto
                  </button>
                </div>
              </div>

              {/* Measure Switch (Ranking View only) */}
              {state.view === 'ranking' && (
                <div className="flex items-center gap-1.5 border-l border-border/60 pl-3">
                  <span className="text-xs font-mono text-muted-foreground hidden sm:inline">
                    Measure:
                  </span>
                  <div className="flex items-center rounded-md border border-border bg-muted/30 p-0.5">
                    {(['accuracy', 'extreme', 'lead'] as LeaderboardMeasure[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => onChange({ measure: m })}
                        className={`h-8 min-h-[44px] sm:min-h-0 px-2.5 rounded-sm text-xs font-mono capitalize transition-all cursor-pointer ${
                          state.measure === m
                            ? 'gradient-animated-ocean text-white shadow-2xs font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {m === 'extreme' ? 'Extremes' : m === 'lead' ? 'Lead time' : 'Accuracy'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Secondary Context Row: Threshold / Lead Days Chips */}
        {!isOverall && state.view === 'ranking' && (state.measure === 'extreme' || state.measure === 'lead') && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40 text-xs font-mono">
            <span className="text-muted-foreground">
              {state.measure === 'extreme' ? 'Operational threshold:' : 'Forecast lead time:'}
            </span>
            {state.measure === 'extreme' &&
              thresholdOptions.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onChange({ threshold: t })}
                  className={`h-7 min-h-[44px] sm:min-h-0 px-2.5 rounded-md border transition-all cursor-pointer ${
                    state.threshold === t
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  ≥ {t} {unit}
                </button>
              ))}

            {state.measure === 'lead' &&
              leadOptions.map((ld) => (
                <button
                  key={ld}
                  type="button"
                  onClick={() => onChange({ lead: ld })}
                  className={`h-7 min-h-[44px] sm:min-h-0 px-2.5 rounded-md border transition-all cursor-pointer ${
                    state.lead === ld
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Day {ld} (D+{ld})
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Main Bench View Rendering */}
      {isOverall ? (
        <PodiumMatrix onSelectCategory={(cat) => onChange({ category: cat })} />
      ) : isLoading ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center text-sm font-mono text-muted-foreground animate-pulse">
          Loading scorecard…
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm font-mono text-muted-foreground">
          Leaderboard unavailable — run ai/benchmark.py to publish outputs/leaderboard.csv.
        </div>
      ) : state.view === 'pareto' ? (
        <ParetoView
          points={payload?.pareto || []}
          threshold={state.threshold}
          unit={unit}
        />
      ) : (
        <RankingTable
          rows={payload?.rows || []}
          measure={state.measure}
          unit={unit}
          geo={state.geo}
          variable={activeVariable}
          windowDays={state.window}
          threshold={state.threshold}
          leadDays={state.lead}
        />
      )}
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import type { LeaderboardMeta, LeaderboardRow } from '@/lib/api';
import { getModelLeaderboard } from '@/lib/api';
import { SERIES } from '@/lib/palette';
import type { ModelName } from '@/lib/palette';
import type { LeaderboardCategory, LeaderboardState } from './types';
import { CATEGORY_VARIABLE, VARIABLE_UNIT } from './types';
import { Award, ArrowRight, Activity, AlertTriangle, ChevronDown, Clock } from '@/components/icons';
import { ModelEmblem } from '@/components/common/ModelEmblem';

// Inline board rows wait as their own shape — skeleton rows the height of the
// data rows, not a text box asking the user to read while they wait.
function BoardSkeleton() {
  return (
    <div className="space-y-2 py-1" aria-hidden>
      {[38, 62, 50].map((w) => (
        <div key={w} className="flex items-center justify-between">
          <div className="skeleton-sheen h-3 rounded-xs bg-secondary" style={{ width: `${w}%` }} />
          <div className="skeleton-sheen h-3 w-10 rounded-xs bg-secondary" />
        </div>
      ))}
    </div>
  );
}

interface SignalLeadersProps {
  category: LeaderboardCategory;
  meta: LeaderboardMeta | null;
  onSelectContext: (patch: Partial<LeaderboardState>) => void;
}

const METHOD_LABELS: Record<string, string> = {
  weighted_blend: 'Prakruti Blend',
  equal_avg: 'Equal Average',
  persistence: 'Persistence',
  ecmwf: 'ECMWF IFS',
  gfs: 'NOAA GFS',
  icon: 'DWD ICON',
  gem: 'CMC GEM',
};

const EXTREME_PHRASES: Record<string, string> = {
  rainfall: 'heavy rain',
  temperature: 'heat extremes',
  wind_speed: 'high winds',
};

export function SignalLeaders({ category, meta, onSelectContext }: SignalLeadersProps) {
  const [showAllMobile, setShowAllMobile] = useState(false);
  const [phoneShow, setPhoneShow] = useState(false);
  const [extremeBoard, setExtremeBoard] = useState<LeaderboardRow[]>([]);
  const [leadBoard, setLeadBoard] = useState<LeaderboardRow[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(false);

  const activeVariable =
    category === 'overall' ? 'rainfall' : CATEGORY_VARIABLE[category];
  const unit = VARIABLE_UNIT[activeVariable] || '';

  // Filter signals based on category
  const allSignals = meta?.signals ?? [];
  let displaySignals = [];

  if (category === 'overall') {
    // Overall -> 3 blend_gain cards + rainfall best_extreme
    const blendGains = allSignals.filter((s) => s.id === 'blend_gain');
    const rainExtreme = allSignals.find(
      (s) => s.id === 'best_extreme' && s.variable === 'rainfall'
    );
    displaySignals = [...blendGains, ...(rainExtreme ? [rainExtreme] : [])];
  } else {
    // Variable category -> lowest_error, best_extreme, best_lead, blend_gain for this variable
    displaySignals = allSignals.filter((s) => s.variable === activeVariable);
  }

  // Fetch data for the two named boards when not overall
  useEffect(() => {
    if (category === 'overall') return;

    let active = true;

    const primaryThresh = meta?.primary_thresholds?.[activeVariable] ?? (activeVariable === 'rainfall' ? 8 : activeVariable === 'temperature' ? 37 : 32);

    Promise.all([
      getModelLeaderboard({
        board: 'extreme',
        variable: activeVariable,
        geo: 'IN',
        threshold: primaryThresh,
      }),
      getModelLeaderboard({
        board: 'lead',
        variable: activeVariable,
        geo: 'IN',
        lead_days: 3,
      }),
    ])
      .then(([extData, leadData]) => {
        if (!active) return;
        if (extData) setExtremeBoard(extData.rows.slice(0, 5));
        if (leadData) setLeadBoard(leadData.rows.slice(0, 5));
        setBoardsLoading(false);
      })
      .catch(() => {
        if (active) setBoardsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [category, activeVariable, meta]);

  if (!displaySignals || displaySignals.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 pt-3 border-t border-border/60 sm:space-y-6 sm:pt-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Signal Leaders & Key Findings
        </h2>
        <p className="hidden sm:block text-xs text-muted-foreground font-mono">
          Precomputed operational highlights across observation-stratified benchmarks.
        </p>
      </div>

      {/* Phone folds the whole block behind one row — the category view has to hold
          the 3.0-viewport scroll budget, and the bench above already carries the ranks. */}
      <button
        type="button"
        onClick={() => setPhoneShow(!phoneShow)}
        aria-expanded={phoneShow}
        className="sm:hidden w-full min-h-[44px] flex items-center justify-between gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-mono text-primary cursor-pointer shadow-2xs hover:bg-muted/30"
      >
        <span>
          {phoneShow
            ? 'Hide signals & findings'
            : `Signals & findings · ${displaySignals.length}`}
        </span>
        <ChevronDown
          size={13}
          className={`shrink-0 transition-transform motion-reduce:transition-none ${phoneShow ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Statement Cards Grid */}
      <div
        className={`${phoneShow ? 'grid' : 'hidden'} grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:grid`}
      >
        {displaySignals.map((sig, idx) => {
          const leaderName = METHOD_LABELS[sig.leader] || sig.leader;
          const beatenName = sig.beaten ? METHOD_LABELS[sig.beaten] || sig.beaten : '';
          const ciDiff =
            sig.ci_high !== null && sig.ci_low !== null
              ? ((sig.ci_high - sig.ci_low) / 2).toFixed(2)
              : null;
          const ciStr = ciDiff !== null ? ` ±${ciDiff}` : '';

          let sentence = '';
          let icon = <Award size={18} className="text-primary shrink-0" />;

          if (sig.id === 'lowest_error') {
            sentence = `${leaderName} has the lowest average error — MAE ${sig.value.toFixed(2)} ${unit}${ciStr}`;
            icon = <Activity size={18} className="text-success shrink-0" />;
          } else if (sig.id === 'best_extreme') {
            const phrase = EXTREME_PHRASES[sig.variable] || 'extremes';
            sentence = `${leaderName} catches ${phrase} best — CSI ${sig.value.toFixed(2)}${ciStr} across ${sig.cases ?? 0} events`;
            icon = <AlertTriangle size={18} className="text-warning shrink-0" />;
          } else if (sig.id === 'best_lead') {
            sentence = `${leaderName} holds up best at day 3 — MAE ${sig.value.toFixed(2)} ${unit}${ciStr}`;
            icon = <Clock size={18} className="text-primary shrink-0" />;
          } else if (sig.id === 'blend_gain') {
            // delta_pct is published in percent points, not a ratio.
            const pct = sig.delta_pct !== null ? Math.abs(sig.delta_pct).toFixed(1) : '0';
            const isPositive = (sig.delta_pct ?? 0) >= 0;
            if (isPositive) {
              sentence = `The Prakruti blend cuts ${beatenName}'s error by ${pct}%`;
            } else {
              sentence = `The Prakruti blend trails ${beatenName} by ${pct}%`;
            }
            icon = <Award size={18} className="text-primary shrink-0" />;
          }

          // Context click handler to scroll up and update bench
          const handleClick = () => {
            const targetCategory =
              sig.variable === 'wind_speed'
                ? 'wind'
                : (sig.variable as LeaderboardCategory);

            onSelectContext({
              category: targetCategory,
              measure: sig.measure,
              threshold: sig.threshold,
              lead: sig.lead_days,
            });

            // Smooth scroll to bench element
            const el = document.getElementById('leaderboard-bench');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          };

          return (
            <div
              key={`${sig.id}-${sig.variable}`}
              onClick={handleClick}
              className={`rounded-lg border border-border bg-card p-4 shadow-2xs hover:border-border/80 transition-all cursor-pointer flex-col justify-between space-y-3 group ${
                idx >= 2 && !showAllMobile ? 'hidden sm:flex' : 'flex'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="p-1.5 rounded-md bg-muted/60 text-foreground border border-border/40">
                    {icon}
                  </span>
                  <ModelEmblem method={sig.leader} size={22} />
                </div>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-xs bg-muted text-muted-foreground border border-border">
                  {sig.variable}
                </span>
              </div>
              <p className="text-sm font-medium text-foreground leading-snug">
                {sentence}
              </p>
              <div className="flex items-center gap-1 text-[11px] font-mono text-primary group-hover:underline pt-2 border-t border-border/40">
                <span>Inspect in scorecard</span>
                <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Show More Toggle */}
      {displaySignals.length > 2 && (
        <button
          type="button"
          onClick={() => setShowAllMobile(!showAllMobile)}
          className="sm:hidden w-full h-10 min-h-[44px] flex items-center justify-center gap-1.5 rounded-md border border-border bg-card text-xs font-mono text-primary cursor-pointer shadow-2xs hover:bg-muted/30"
        >
          <span>{showAllMobile ? 'Show fewer signals' : `View all ${displaySignals.length} signals`}</span>
        </button>
      )}

      {/* Two Named Signal Boards (Variable category only) */}
      {category !== 'overall' && (
        <div
          className={`${phoneShow ? 'grid' : 'hidden'} grid-cols-1 md:grid-cols-2 gap-6 pt-2 sm:grid`}
        >
          {/* Extreme Detection Board */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div>
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
                  Extreme Detection (CSI)
                </h3>
                <p className="text-[11px] text-muted-foreground font-mono">
                  Operational threshold ≥ {meta?.primary_thresholds?.[activeVariable]} {unit} · All India
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onSelectContext({
                    measure: 'extreme',
                    threshold: meta?.primary_thresholds?.[activeVariable],
                  });
                  document.getElementById('leaderboard-bench')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-xs font-mono text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View full ranking</span>
                <ArrowRight size={12} />
              </button>
            </div>

            {boardsLoading ? (
              <BoardSkeleton />
            ) : extremeBoard.length > 0 ? (
              <div className="space-y-2">
                {extremeBoard.map((row) => {
                  const mKey = row.method.toUpperCase();
                  const seriesColor =
                    SERIES[mKey as ModelName] ||
                    (row.tier === 'blend' ? '#0d74ce' : '#64748b');

                  return (
                    <div
                      key={row.method}
                      className="flex items-center justify-between text-xs font-mono p-2 rounded-md bg-muted/20"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold w-5">#{row.rank}</span>
                        <span
                          className="w-3 h-1.5 rounded-xs border border-border/60 shadow-2xs shrink-0"
                          style={{ backgroundColor: seriesColor }}
                        />
                        <span className="font-medium text-foreground">
                          {METHOD_LABELS[row.method] || row.method}
                        </span>
                      </div>
                      <div className="font-semibold text-foreground">
                        {row.value.toFixed(3)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs font-mono text-muted-foreground py-4 text-center">
                No extreme detection records published for this threshold.
              </div>
            )}
          </div>

          {/* At Range — Day 3 Board */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div>
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
                  At Range — Day 3 (MAE)
                </h3>
                <p className="text-[11px] text-muted-foreground font-mono">
                  72-hour lead time accuracy · lower is better
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onSelectContext({
                    measure: 'lead',
                    lead: 3,
                  });
                  document.getElementById('leaderboard-bench')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-xs font-mono text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View full ranking</span>
                <ArrowRight size={12} />
              </button>
            </div>

            {boardsLoading ? (
              <BoardSkeleton />
            ) : leadBoard.length > 0 ? (
              <div className="space-y-2">
                {leadBoard.map((row) => {
                  const mKey = row.method.toUpperCase();
                  const seriesColor =
                    SERIES[mKey as ModelName] ||
                    (row.tier === 'blend' ? '#0d74ce' : '#64748b');

                  return (
                    <div
                      key={row.method}
                      className="flex items-center justify-between text-xs font-mono p-2 rounded-md bg-muted/20"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold w-5">#{row.rank}</span>
                        <span
                          className="w-3 h-1.5 rounded-xs border border-border/60 shadow-2xs shrink-0"
                          style={{ backgroundColor: seriesColor }}
                        />
                        <span className="font-medium text-foreground">
                          {METHOD_LABELS[row.method] || row.method}
                        </span>
                      </div>
                      <div className="font-semibold text-foreground">
                        {row.value.toFixed(2)} {unit}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs font-mono text-muted-foreground py-4 text-center">
                No day-3 lead scores published for this variable.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

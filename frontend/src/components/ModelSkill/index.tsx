'use client';
import { useState, useEffect, useMemo } from 'react';
import { Panel } from '@/components/shell/Panel';
import { Award } from '@/components/icons';
import { ModelEmblem } from '@/components/common/ModelEmblem';
import { LoadingState } from '@/components/ui/LoadingState';
import { getModelLeaderboard } from '@/lib/api';
import type { LeaderboardRow } from '@/lib/api';
import { SERIES } from '@/lib/palette';
import type { ModelName } from '@/lib/palette';

type Period = '7 Days' | '30 Days' | '61 Days';

/**
 * The methods shown, in the order the leaderboard publishes them. The keys are
 * leaderboard method ids — the panel reads its numbers from the same scored
 * table the Rankings page shows, so the two can never disagree.
 */
const MODELS = [
  { key: 'ecmwf', label: 'ECMWF IFS (0.25°)' },
  { key: 'weighted_blend', label: 'Hybrid AI-NWP Blend' },
  { key: 'equal_avg', label: 'Ensemble Mean' },
  { key: 'gfs', label: 'GFS Seamless' },
  { key: 'icon', label: 'ICON Seamless' },
  { key: 'jma', label: 'JMA GSM' },
  { key: 'ukmo', label: 'UK Met Office' },
  { key: 'persistence', label: "Yesterday's weather" },
] as const;

type ModelKey = (typeof MODELS)[number]['key'];

const PERIOD_WINDOW: Record<Period, number | undefined> = {
  '7 Days': 7,
  '30 Days': 30,
  '61 Days': undefined,
};

export type SkillFinding = {
  blendMae: number;
  bestModel: string;
  bestModelMae: number;
  /** True when the blend beats every single model on this window. */
  blendWins: boolean;
};

export function ModelSkillPanel({
  collapsibleOnPhone,
  collapsibleOnTablet,
  onFinding,
}: {
  collapsibleOnPhone?: boolean;
  collapsibleOnTablet?: boolean;
  /** Reports the headline finding so the page can state it from the data. */
  onFinding?: (finding: SkillFinding) => void;
}) {
  const [period, setPeriod] = useState<Period>('7 Days');
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setFailed(false);
    getModelLeaderboard({ board: 'accuracy', variable: 'temperature', geo: 'IN' })
      .then((data) => {
        if (!mounted) return;
        setRows(data?.rows ?? []);
        setIsLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setFailed(true);
        setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  /**
   * The scored table carries one row per method per window. The window that
   * matches the selected period is used; the full-window row (no
   * `window_days`) backs the 61-day period.
   */
  const scoped = useMemo(() => {
    const window = PERIOD_WINDOW[period];
    return rows.filter((r) =>
      r.metric === 'mae'
        ? window === undefined
          ? r.window_days === null
          : r.window_days === window
        : false,
    );
  }, [rows, period]);

  const tableRows = useMemo(() => {
    const byMethod = new Map(scoped.map((r) => [r.method, r]));
    return MODELS.map((m) => {
      const row = byMethod.get(m.key);
      return {
        ...m,
        rmse: row?.value ?? null,
        rank: row?.rank ?? null,
        n: row?.n ?? null,
        color:
          SERIES[m.key as ModelName] ||
          (row?.tier === 'blend' ? '#0d74ce' : row?.tier === 'baseline' ? '#64748b' : '#94a3b8'),
      };
    })
      .filter((m) => m.rmse !== null)
      .sort((a, b) => (a.rmse as number) - (b.rmse as number));
  }, [scoped]);

  const blend = tableRows.find((m) => m.key === 'weighted_blend');
  const bestModel = tableRows.find((m) => m.key !== 'weighted_blend' && m.key !== 'persistence');

  // Report the finding once the scored rows are in. The page header states the
  // headline from this, so the sentence can never drift from the table below it.
  useEffect(() => {
    if (!onFinding || !blend || !bestModel) return;
    if (blend.rmse == null || bestModel.rmse == null) return;
    onFinding({
      blendMae: blend.rmse,
      bestModel: bestModel.label,
      bestModelMae: bestModel.rmse,
      blendWins: blend.rmse < bestModel.rmse,
    });
  }, [onFinding, blend, bestModel]);

  return (
    <Panel
      title="Average miss per model"
      subtitle="How far each model was from what actually happened — smaller is better"
      term="skillScore"
      collapsibleOnPhone={collapsibleOnPhone}
      collapsibleOnTablet={collapsibleOnTablet}
      actions={
        <div className="flex items-center gap-1 border border-border p-0.5 bg-secondary rounded-md">
          {(['7 Days', '30 Days', '61 Days'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`relative px-2.5 py-1.5 min-h-[44px] sm:min-h-[36px] flex items-center text-xs font-mono rounded-sm transition-colors duration-100 touch-manipulation after:absolute after:-inset-y-1 after:inset-x-0 after:content-[''] ${
                period === p
                  ? 'bg-card text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              type="button"
            >
              {p}
            </button>
          ))}
        </div>
      }
    >
      <div className="space-y-1.5 font-mono">
        {isLoading && (
          <LoadingState label="Loading skill scores" rows={3} className="border-0 bg-transparent" />
        )}
        {!isLoading && failed && (
          <div className="py-8 text-center text-xs font-mono text-muted-foreground">
            Skill scores unavailable — the engine has not published verification for this window.
          </div>
        )}
        {!isLoading && !failed && tableRows.length === 0 && (
          <div className="py-8 text-center text-xs font-mono text-muted-foreground">
            Skill scores unavailable — the engine has not published verification for this window.
          </div>
        )}
        {!isLoading &&
          tableRows.map((m, i) => (
            <div
              key={m.key}
              className={`flex items-center gap-2.5 p-2.5 rounded-md border transition-colors ${
                i === 0
                  ? 'bg-secondary border-border'
                  : 'bg-card border-border hover:bg-secondary'
              }`}
            >
              <ModelEmblem method={m.key} size={16} />
              <span
                className="w-3 h-1.5 rounded-xs border border-border/60 shadow-2xs shrink-0"
                style={{ backgroundColor: m.color }}
              />
              <span className={`text-xs flex-1 ${i === 0 ? 'font-bold text-foreground' : 'text-foreground'}`}>
                {m.label}
              </span>
              {i === 0 && (
                <span className="flex items-center gap-1 rounded-md text-[11.5px] font-semibold text-data-ok-text bg-card px-2 py-0.5 border border-border">
                  <Award size={10} /> Best
                </span>
              )}
              <span className="text-xs font-bold text-foreground">{(m.rmse as number).toFixed(2)}</span>
              <span className="text-[12px] text-muted-foreground w-14 text-right">MAE °C</span>
            </div>
          ))}
      </div>

      {blend?.rmse != null && bestModel?.rmse != null && (
        <div className="mt-3.5 p-3 rounded-md bg-card border border-border text-xs font-mono text-muted-foreground">
          {blend.rmse < bestModel.rmse ? (
            <>
              Blend MAE {blend.rmse.toFixed(2)} vs best single model {bestModel.rmse.toFixed(2)} —{' '}
              {Math.round((1 - blend.rmse / bestModel.rmse) * 100)}% lower error.
            </>
          ) : (
            <>
              Blend MAE {blend.rmse.toFixed(2)} vs best single model {bestModel.rmse.toFixed(2)} — the
              blend is {Math.round((blend.rmse / bestModel.rmse - 1) * 100)}% worse here, so the single
              model leads on this window.
            </>
          )}
        </div>
      )}
    </Panel>
  );
}

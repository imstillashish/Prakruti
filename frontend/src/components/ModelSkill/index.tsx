'use client';
import { useState, useEffect } from 'react';
import { Panel } from '@/components/shell/Panel';
import { Award } from '@/components/icons';
import { ModelEmblem } from '@/components/common/ModelEmblem';
import { getSkillMetricsData, MOCK_SKILL_METRICS } from '@/lib/api';
import type { SkillMetric } from '@/types';
import { SERIES } from '@/lib/palette';

type Period = 'Today' | '7 Days' | '30 Days' | 'Season';

const MODELS = [
  { key: 'blended', label: 'Hybrid AI-NWP Blend', color: SERIES.ECMWF },
  { key: 'ai', label: 'AI Residual Model', color: SERIES.ICON },
  { key: 'nwpA', label: 'ECMWF IFS (0.25°)', color: SERIES.ECMWF },
  { key: 'nwpB', label: 'GFS Seamless', color: SERIES.GFS },
  { key: 'ensemble', label: 'Ensemble Mean', color: SERIES.GEM },
] as const;

export function ModelSkillPanel({ collapsibleOnPhone, collapsibleOnTablet }: { collapsibleOnPhone?: boolean; collapsibleOnTablet?: boolean }) {
  const [period, setPeriod] = useState<Period>('Today');
  const [metrics, setMetrics] = useState<SkillMetric[]>(MOCK_SKILL_METRICS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getSkillMetricsData()
      .then((data) => {
        if (mounted && data && data.length > 0) {
          setMetrics(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const data = metrics.find(m => m.period.toLowerCase().includes(period.toLowerCase())) || metrics[0];

  const tableRows = MODELS.map(m => ({
    ...m,
    rmse: data[m.key as keyof typeof data] as number,
  })).sort((a, b) => a.rmse - b.rmse);

  return (
    <Panel
      title="Model skill score"
      subtitle="Average miss against ground truth, per model — lower is better"
      term="skillScore"
      collapsibleOnPhone={collapsibleOnPhone}
      collapsibleOnTablet={collapsibleOnTablet}
      actions={
        <div className="flex items-center gap-1 border border-border p-0.5 bg-secondary rounded-md">
          {(['Today', '7 Days', '30 Days', 'Season'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`relative px-2.5 py-1.5 min-h-[36px] flex items-center text-xs font-mono rounded-sm transition-colors duration-100 touch-manipulation after:absolute after:-inset-y-1 after:inset-x-0 after:content-[''] ${
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
        {tableRows.map((m, i) => (
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
              <span
                className="flex items-center gap-1 rounded-md text-[10px] font-semibold text-data-ok-text bg-card px-2 py-0.5 border border-border"
              >
                <Award size={10} /> Top Skill
              </span>
            )}
            <span className="text-xs font-bold text-foreground">{m.rmse.toFixed(1)}</span>
            <span className="text-[11px] text-muted-foreground w-14 text-right">RMSE mm</span>
          </div>
        ))}
      </div>

      <div
        className="mt-3.5 p-3 rounded-md bg-card border border-border text-xs font-mono text-muted-foreground"
      >
        Hybrid AI blend reduces error by <span className="font-bold text-data-ok-text">~18.2%</span> relative to any isolated NWP model run.
      </div>
    </Panel>
  );
}

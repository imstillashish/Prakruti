'use client';
import { useState, useEffect } from 'react';
import { ModelSkillPanel } from '@/components/ModelSkill';
import { ModelVerification } from '@/components/ModelVerification';
import { ModelCalibration } from '@/components/ModelCalibration';
import { PerformanceMatrix3D } from '@/components/PerformanceMatrix3D';
import { Panel } from '@/components/shell/Panel';
import { PageHeader } from '@/components/shell/PageHeader';
import { BarChart3 } from 'lucide-react';
import { getSkillMetricsData, MOCK_SKILL_METRICS } from '@/lib/api';
import type { SkillMetric } from '@/types';

export function ModelPerformancePage() {
  const [metrics, setMetrics] = useState<SkillMetric[]>(MOCK_SKILL_METRICS);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

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
        if (mounted) {
          setIsError(true);
          setIsLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Model Performance & Skill"
        sub="How our blended forecast stacks up against the raw models, verified against past weather."
      />

      {/* Equal-weight summaries pair up: stacked they were 666px of one-card rows.
          The history table carries six columns, so it pairs at lg, not at tablet. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <ModelSkillPanel />

        <Panel
          title="Historical skill scores (RMSE mm)"
          subtitle="Validation results by period — the blend column is ours"
          term="skillScore"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left pb-2 font-semibold uppercase tracking-[0.08em] text-[11px]">Period</th>
                  <th className="text-right pb-2 font-semibold uppercase tracking-[0.08em] text-[11px] text-success">Blended (Ours)</th>
                  <th className="text-right pb-2 font-semibold uppercase tracking-[0.08em] text-[11px]">AI Model</th>
                  <th className="text-right pb-2 font-semibold uppercase tracking-[0.08em] text-[11px]">ECMWF IFS</th>
                  <th className="text-right pb-2 font-semibold uppercase tracking-[0.08em] text-[11px]">GFS</th>
                  <th className="text-right pb-2 font-semibold uppercase tracking-[0.08em] text-[11px]">Ensemble</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {metrics.map((row) => (
                  <tr key={row.period} className="text-foreground hover:bg-secondary">
                    <td className="py-2.5 font-semibold text-foreground">{row.period}</td>
                    <td className="py-2.5 text-right font-bold text-success bg-success/10 px-2 rounded-sm">{row.blended}</td>
                    <td className="py-2.5 text-right text-muted-foreground px-2">{row.ai}</td>
                    <td className="py-2.5 text-right text-muted-foreground px-2">{row.nwpA}</td>
                    <td className="py-2.5 text-right text-muted-foreground px-2">{row.nwpB}</td>
                    <td className="py-2.5 text-right text-muted-foreground px-2">{row.ensemble}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground mt-3">
            Evaluated against 61-day ERA5 reanalysis dataset. Lower RMSE indicates superior accuracy.
          </p>
        </Panel>
      </div>

      {/* F-02.C: historical truth verification, F-02.B: raw vs calibrated diagnostics.
          Side by side from xl: each is tall, and 737 + 920 stacked was 1657px. */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <ModelVerification />
        <ModelCalibration />
      </div>

      {/* 3D Performance Matrix — supplementary to the flat calibration table above,
          so it collapses below desktop where it is the tallest panel on the page. */}
      <PerformanceMatrix3D />
    </div>
  );
}

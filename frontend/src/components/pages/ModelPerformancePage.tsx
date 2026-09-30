'use client';
import { useState, useEffect } from 'react';
import { ModelSkillPanel } from '@/components/ModelSkill';
import { PerformanceMatrix3D } from '@/components/PerformanceMatrix3D';
import { Panel } from '@/components/shell/Panel';
import { Explain } from '@/components/explain/Explain';
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
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 flex items-center justify-center bg-secondary text-foreground border border-border">
          <BarChart3 size={18} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Model Performance &amp; Skill</h1>
          <p className="text-xs text-muted-foreground">Historical validation against ERA5 reanalysis across lead times and stations</p>
        </div>
      </div>

      <ModelSkillPanel />

      {/* 3D Performance Matrix */}
      <PerformanceMatrix3D />

      {/* Historical skill summary */}
      <Panel
        title="Historical skill scores (RMSE mm)"
        subtitle="Validation results by period — the blend column is ours"
        term="skillScore"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-[#dbdbdb] text-[#808080]">
                <th className="text-left pb-2 font-bold uppercase">Period</th>
                <th className="text-right pb-2 font-bold text-[#168a49] uppercase">Blended (Ours)</th>
                <th className="text-right pb-2 font-bold uppercase">AI Model</th>
                <th className="text-right pb-2 font-bold uppercase">ECMWF IFS</th>
                <th className="text-right pb-2 font-bold uppercase">GFS</th>
                <th className="text-right pb-2 font-bold uppercase">Ensemble</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0]">
              {metrics.map((row) => (
                <tr key={row.period} className="text-[#333333] hover:bg-[#f7f7f7]">
                  <td className="py-2.5 font-bold text-[#212121]">{row.period}</td>
                  <td className="py-2.5 text-right font-bold text-[#168a49] bg-[#e6faee] px-2">{row.blended}</td>
                  <td className="py-2.5 text-right text-[#575757] px-2">{row.ai}</td>
                  <td className="py-2.5 text-right text-[#575757] px-2">{row.nwpA}</td>
                  <td className="py-2.5 text-right text-[#575757] px-2">{row.nwpB}</td>
                  <td className="py-2.5 text-right text-[#575757] px-2">{row.ensemble}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] font-mono text-[#808080] mt-3">
          Evaluated against 61-day ERA5 reanalysis dataset. Lower RMSE indicates superior accuracy.
        </p>
      </Panel>
    </div>
  );
}

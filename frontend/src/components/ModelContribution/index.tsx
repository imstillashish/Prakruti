'use client';
import { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { Panel } from '@/components/shell/Panel';
import { Explain } from '@/components/explain/Explain';
import { ChartState } from '@/components/spectrumui/charts/chart-engine';
import { getModelWeightsData, MOCK_MODEL_WEIGHTS } from '@/lib/api';
import type { ModelWeight } from '@/types';

interface ModelContributionProps {
  selectedCity?: string | null;
}

export function ModelContribution({ selectedCity = 'Kanpur' }: ModelContributionProps) {
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);
  const [weights, setWeights] = useState<ModelWeight[]>(MOCK_MODEL_WEIGHTS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getModelWeightsData(selectedCity || 'Kanpur', 'temperature')
      .then((data) => {
        if (mounted && data && data.length > 0) {
          setWeights(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [selectedCity]);

  const total = weights.reduce((s, w) => s + w.weight, 0);

  return (
    <Panel
      title="Model contribution"
      subtitle="How much say each model has in your city's answer"
      term="weight"
      actions={
        <span className="flex items-center gap-1.5 text-xs text-primary font-mono font-semibold">
          <TrendingUp size={13} />
          Dynamic
        </span>
      }
    >

      {/* Stacked bar with pill edges */}
      <ChartState status={isLoading ? 'loading' : 'ready'} height={220} variant="bars">
        <div
          className="h-2.5 overflow-hidden flex mb-4 border border-border rounded-full bg-secondary"
          role="img"
          aria-label="Model weight distribution"
        >
          {weights.map((w) => (
            <div
              key={w.id}
              style={{
                width: `${(w.weight / total) * 100}%`,
                background: w.color,
                opacity: hoveredModel && hoveredModel !== w.id ? 0.35 : 1,
              }}
            />
          ))}
        </div>

        {/* Individual model rows */}
        <div className="space-y-2.5 font-mono">
          {weights.map((w) => (
            <div
              key={w.id}
              className="group"
              onMouseEnter={() => setHoveredModel(w.id)}
              onMouseLeave={() => setHoveredModel(null)}
            >
              <div className="flex items-center justify-between mb-1 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: w.color }}
                  />
                  <span className="text-foreground font-medium">{w.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    RMSE {w.rmse}
                    <Explain term="rmse" />
                  </span>
                  <span className="font-bold text-foreground">{w.weight}%</span>
                </div>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-secondary border border-border"
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${w.weight}%`,
                    background: w.color,
                    opacity: hoveredModel && hoveredModel !== w.id ? 0.35 : 1,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </ChartState>

      {/* NCMRWF note */}
      <div
        className="mt-4 p-3 bg-secondary border border-border rounded-md text-xs font-sans text-foreground"
      >
        <span className="font-bold">Inverse-RMSE Layer 1:</span> Weights dynamically favor models with the lowest localized prediction error over historical 61-day verification windows.
      </div>
    </Panel>
  );
}

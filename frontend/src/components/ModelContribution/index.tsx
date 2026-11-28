'use client';
import { useState, useEffect } from 'react';
import { Activity } from '@/components/icons';
import { Panel } from '@/components/shell/Panel';
import { Explain } from '@/components/explain/Explain';
import { ChartState } from '@/components/spectrumui/charts/chart-engine';
import { ModelEmblem } from '@/components/common/ModelEmblem';
import { getModelWeightsData } from '@/lib/api';
import type { ModelWeight } from '@/types';

interface ModelContributionProps {
  selectedCity?: string | null;
  collapsibleOnPhone?: boolean;
  collapsibleOnTablet?: boolean;
}

export function ModelContribution({ selectedCity = 'Kanpur', collapsibleOnPhone, collapsibleOnTablet }: ModelContributionProps) {
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);
  const [weights, setWeights] = useState<ModelWeight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getModelWeightsData(selectedCity || 'Kanpur', 'temperature')
      .then((data) => {
        if (mounted) {
          setWeights(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setWeights([]);
          setIsLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [selectedCity]);

  const total = weights.reduce((s, w) => s + w.weight, 0);

  return (
    <Panel
      title="Who is doing the work"
      subtitle="How much each model counts for in your city's answer"
      term="weight"
      collapsibleOnPhone={collapsibleOnPhone}
      collapsibleOnTablet={collapsibleOnTablet}
      actions={
        <span className="flex items-center gap-1.5 text-xs text-primary font-mono font-semibold">
          <Activity size={13} />
          Dynamic
        </span>
      }
    >

      {/* Stacked bar with pill edges */}
      <ChartState
        status={isLoading ? 'loading' : weights.length === 0 ? 'empty' : 'ready'}
        height={220}
        variant="bars"
        empty={{ title: 'Model weights unavailable', description: 'The engine has not published weights for this cycle.' }}
      >
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
                <div className="flex items-center gap-1.5">
                  <ModelEmblem method={w.id || w.name} size={16} />
                  <span
                    className="w-3 h-1.5 rounded-xs border border-border/60 shadow-2xs shrink-0"
                    style={{ backgroundColor: w.color }}
                  />
                  <span className="text-foreground font-medium">{w.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                    {w.rmse != null ? (
                      <>RMSE {w.rmse}<Explain term="rmse" /></>
                    ) : (
                      <>RMSE —</>
                    )}
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
        <span className="font-medium">How weights are set:</span> a model that has been wrong about
        this district lately gets a smaller share of the answer. The score comes from the last 61 days
        of verified forecasts, not from how famous the model is.
      </div>
    </Panel>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { TrendingUp, Info } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
    <GlassCard padding="md" variant="default">
      <div className="flex items-center justify-between mb-4 border-b border-[#dbdbdb] pb-3 font-mono">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider text-[#212121] uppercase">
              MODEL CONTRIBUTION
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info size={13} className="text-[#808080] cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="font-mono text-[11px] max-w-60">
                <p className="font-bold">Weights adapt according to:</p>
                {['Region', 'Season', 'Lead Time', 'Historical Skill', 'Weather Regime'].map(f => (
                  <div key={f} className="text-muted-foreground flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-[#1db961]" />{f}
                  </div>
                ))}
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-[11px] text-[#808080] mt-0.5 font-sans">Inverse-RMSE adaptive blending weights</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#168a49] font-mono font-semibold">
          <TrendingUp size={13} />
          Dynamic
        </div>
      </div>

      {/* Stacked bar with sharp edges */}
      <div
        className="h-2.5 overflow-hidden flex mb-4 border border-[#dbdbdb]"
        style={{ borderRadius: 0 }}
        role="img"
        aria-label="Model weight distribution"
      >
        {weights.map((w) => (
          <div
            key={w.id}
            style={{
              width: `${(w.weight / total) * 100}%`,
              background: w.color,
              borderRadius: 0,
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
                  className="w-2 h-2 flex-shrink-0"
                  style={{ background: w.color, borderRadius: 0 }}
                />
                <span className="text-[#333333] font-medium">{w.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#808080]">RMSE {w.rmse}</span>
                <span className="font-bold text-[#212121]">{w.weight}%</span>
              </div>
            </div>
            <div
              className="h-1.5 overflow-hidden bg-[#f0f0f0] border border-[#dbdbdb]"
              style={{ borderRadius: 0 }}
            >
              <div
                className="h-full"
                style={{
                  width: `${w.weight}%`,
                  background: w.color,
                  borderRadius: 0,
                  opacity: hoveredModel && hoveredModel !== w.id ? 0.35 : 1,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* NCMRWF note */}
      <div
        className="mt-4 p-3 bg-[#f2fcf7] border border-[#95eebc] text-xs font-sans text-[#14522f]"
        style={{ borderRadius: 0 }}
      >
        <span className="font-bold">Inverse-RMSE Layer 1:</span> Weights dynamically favor models with the lowest localized prediction error over historical 61-day verification windows.
      </div>
    </GlassCard>
  );
}

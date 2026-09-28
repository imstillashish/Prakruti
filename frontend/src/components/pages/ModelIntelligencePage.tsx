'use client';
import { useState, useEffect } from 'react';
import { ModelContribution } from '@/components/ModelContribution';
import { ModelComparison } from '@/components/ModelComparison';
import { ModelSkillPanel } from '@/components/ModelSkill';
import { GlassCard } from '@/components/ui/GlassCard';
import { getWeights, MOCK_REGION_DOMINANCE } from '@/lib/api';
import type { RegionModelDominance } from '@/types';
import { MapPin, BrainCircuit } from 'lucide-react';

export function ModelIntelligencePage() {
  const [dominance, setDominance] = useState<RegionModelDominance[]>(MOCK_REGION_DOMINANCE);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let mounted = true;
    getWeights()
      .then((records) => {
        if (mounted && records && records.length > 0) {
          // Live model weights successfully fetched
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
        <div className="w-8 h-8 flex items-center justify-center bg-[#f7f7f7] text-[#212121] border border-[#dbdbdb]" style={{ borderRadius: 0 }}>
          <BrainCircuit size={18} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[#212121]">Model Intelligence</h1>
          <p className="text-xs text-[#808080]">Dynamic multi-model weighting logic, spatial dominance, and comparative skill metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModelContribution />
        <ModelComparison />
      </div>

      {/* Regional dominance */}
      <GlassCard padding="md">
        <h2 className="text-xs font-mono font-bold tracking-widest text-[#212121] uppercase mb-4">
          REGIONAL MODEL DOMINANCE
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {dominance.map((r) => (
            <div
              key={r.region}
              className="p-3 bg-white border border-[#dbdbdb]"
              style={{ borderRadius: 0 }}
            >
              <div className="flex items-center gap-1.5 text-xs text-[#808080] mb-1 font-mono">
                <MapPin size={11} className="text-[#1db961]" />
                {r.region}
              </div>
              <div className="text-sm font-bold text-[#212121]">{r.dominantModel}</div>
              <div className="text-xs font-mono text-[#168a49] mt-1 font-semibold">{r.confidence}% confidence</div>
            </div>
          ))}
        </div>
      </GlassCard>

      <ModelSkillPanel />
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { ModelContribution } from '@/components/ModelContribution';
import { ModelComparison } from '@/components/ModelComparison';
import { ModelSkillPanel } from '@/components/ModelSkill';
import { Panel } from '@/components/shell/Panel';
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
        <div className="w-9 h-9 rounded-md flex items-center justify-center bg-secondary text-foreground border border-border">
          <BrainCircuit size={18} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Model Intelligence</h1>
          <p className="text-xs text-muted-foreground">Which forecast model is most accurate for your city, and by how much.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModelContribution />
        <ModelComparison />
      </div>

      {/* Regional dominance */}
      <Panel
        title="Regional model dominance"
        subtitle="Which model leads where across India"
        term="weight"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {dominance.map((r) => (
            <div key={r.region} className="p-3 rounded-md bg-card border border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 font-mono">
                <MapPin size={11} className="text-water" />
                {r.region}
              </div>
              <div className="text-sm font-semibold text-foreground">{r.dominantModel}</div>
              <div className="text-xs font-mono text-foreground mt-1 font-semibold">{r.confidence}% confidence</div>
            </div>
          ))}
        </div>
      </Panel>

      <ModelSkillPanel />
    </div>
  );
}

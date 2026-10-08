'use client';
import { useState, useEffect } from 'react';
import { ModelContribution } from '@/components/ModelContribution';
import { ModelComparison } from '@/components/ModelComparison';
import { ModelTrajectories } from '@/components/ModelTrajectories';
import { ModelSkillPanel } from '@/components/ModelSkill';
import { Panel } from '@/components/shell/Panel';
import { PageHeader } from '@/components/shell/PageHeader';
import { getWeights, MOCK_REGION_DOMINANCE } from '@/lib/api';
import type { RegionModelDominance } from '@/types';
import { ArrowRight, MapPin, Sparkles } from '@/components/icons';
export function ModelIntelligencePage() {
  const [dominance, setDominance] = useState<RegionModelDominance[]>(MOCK_REGION_DOMINANCE);

  // Warm the weights endpoint so the API is alive by the time the user
  // reaches a panel that needs live data; MOCK dominance is the placeholder
  // until then, so the page never waits behind a shell.
  useEffect(() => {
    getWeights().catch(() => {});
  }, []);
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Sparkles}
        title="Model Intelligence"
        sub="Which forecast model is most accurate for your city, and by how much."
      />

      {/* The one thing here a competitor cannot screenshot: the blend is open at
          the write path. It sits at the top of the page because "any model can
          join" is the claim the six-model table below is evidence for. */}
      <Panel
        title="Bring your own model"
        subtitle="Any forecast model can earn a seat in the blend — and be told what that seat is worth"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-[64ch] text-sm leading-relaxed text-muted-foreground">
            POST a foreign model's hourly rows and Prakruti verifies it against observed weather
            before it is admitted: RMSE and skill per variable, the weight inverse-RMSE weighting
            would hand it, and what including it does to the blend's own error — all in the
            response to that one request. Six models are blended today; a seventh is one call away.
          </p>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <code className="rounded-md border border-border bg-secondary/40 px-2 py-1 font-mono text-[11px] text-foreground">
              POST /api/models/&#123;model_id&#125;/forecasts
            </code>
            <button
              type="button"
              data-nav="byom"
              className="gradient-animated-ocean flex h-11 items-center gap-2 rounded-md px-4 text-sm font-semibold shadow-[0_8px_24px_rgba(13,116,206,0.18)] transition-transform active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Post a model
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </Panel>

      {/* Contribution (327px) and skill (386px) are the two short cards, so
          they pair evenly; the consensus card runs full width below — inside
          a half-width column its chip grid wrapped and stretched the row to
          628px, stranding ~300px of white beside the shorter card. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <ModelContribution collapsibleOnPhone />
        <ModelSkillPanel collapsibleOnPhone />
      </div>

      <ModelComparison collapsibleOnPhone />

      <ModelTrajectories />

      {/* Regional dominance */}
      <Panel
        title="Regional model dominance"
        subtitle="Which model leads where across India"
        term="weight"
        collapsibleOnPhone
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {dominance.map((r) => (
            <div key={r.region} className="p-3 rounded-md bg-card border border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 font-mono">
                <MapPin size={11} className="text-data-rain" />
                {r.region}
              </div>
              <div className="text-sm font-semibold text-foreground">{r.dominantModel}</div>
              <div className="text-xs font-mono text-foreground mt-1 font-semibold">{r.confidence}% confidence</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

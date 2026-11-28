'use client';
import { useState, useEffect } from 'react';
import { ModelContribution } from '@/components/ModelContribution';
import { ModelComparison } from '@/components/ModelComparison';
import { ModelTrajectories } from '@/components/ModelTrajectories';
import { ModelSkillPanel } from '@/components/ModelSkill';
import { Panel } from '@/components/shell/Panel';
import { PageHeader } from '@/components/shell/PageHeader';
import { Answer, More } from '@/components/plain/Plain';
import { getWeights, getCityForecastsData, CITY_TO_STATE } from '@/lib/api';
import type { RegionModelDominance } from '@/types';
import { ArrowRight, MapPin, Sparkles } from '@/components/icons';
export function ModelIntelligencePage() {
  // Dominant model per region, derived live from the published weights and the
  // station list; an empty grid is the loading/degraded state.
  const [dominance, setDominance] = useState<RegionModelDominance[]>([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([getWeights(undefined, 'temperature', 1), getCityForecastsData()])
      .then(([weights, cities]) => {
        if (!mounted || !weights.length || !cities.length) return;
        // Highest-weight temperature model per city, then majority winner per region.
        const domPerCity: Record<string, { model: string; confidence: number }> = {};
        for (const w of weights) {
          const key = (w.city || '').toLowerCase();
          if (!key) continue;
          if (!domPerCity[key] || w.weight > domPerCity[key].confidence) {
            domPerCity[key] = { model: w.model.toUpperCase(), confidence: w.weight };
          }
        }
        const byRegion: Record<string, Record<string, number>> = {};
        for (const c of cities) {
          const region = CITY_TO_STATE[c.city];
          const dom = domPerCity[c.city.toLowerCase()];
          if (!region || !dom) continue;
          byRegion[region] = byRegion[region] || {};
          byRegion[region][dom.model] = (byRegion[region][dom.model] || 0) + 1;
        }
        const out: RegionModelDominance[] = Object.entries(byRegion).map(([region, counts]) => {
          const [modelId, citiesLed] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
          const total = Object.values(counts).reduce((s, n) => s + n, 0);
          return {
            region,
            dominantModel: modelId,
            modelId: modelId.toLowerCase(),
            confidence: Math.round((citiesLed / total) * 100),
          };
        });
        setDominance(out);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);
  return (
    <div className="space-y-8">
      <PageHeader
        icon={Sparkles}
        title="Which model"
        answer="No single forecast source is best everywhere. The blend uses the one that has been right about your district lately."
        sub="Weights below are what each model earned in the last verification cycle."
      />


      {/* The one thing here a competitor cannot screenshot: the blend is open at
          the write path. It sits at the top of the page because "any model can
          join" is the claim the six-model table below is evidence for. */}
      <More label="Add a model of your own">
      <Panel
        title="Bring your own model"
        subtitle="Any forecast model can earn a seat in the blend — and be told what that seat is worth"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-[64ch] text-sm leading-relaxed text-muted-foreground">
            POST a foreign model&apos;s hourly rows and Prakruti verifies it against observed weather
            before it is admitted: RMSE and skill per variable, the weight inverse-RMSE weighting
            would hand it, and what including it does to the blend&apos;s own error — all in the
            response to that one request. Six models are blended today; a seventh is one call away.
          </p>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <code className="rounded-md border border-border bg-secondary/40 px-2 py-1 font-mono text-[12px] text-foreground">
              POST /api/models/&#123;model_id&#125;/forecasts
            </code>
            <button
              type="button"
              data-nav="byom"
              className="gradient-animated-ocean flex h-11 items-center gap-2 rounded-md px-4 text-sm font-semibold transition-transform active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Post a model
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </Panel>
      </More>

      {/* The answer on this page is the weight split, so it leads. The three
          views that explain it — comparison, trajectories, regional map — are
          one disclosure each: on a tablet the four stacked panels measured
          3.7 viewport-heights, past the 3.0 budget. */}
      <ModelContribution />

      <More label="How the models compare here">
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
          <ModelSkillPanel />
          <ModelComparison />
        </div>
      </More>

      <More label="How each model's forecast moved over time">
        <ModelTrajectories />
      </More>

      {/* Regional dominance */}
      <More label="Which model leads, by region">
      <Panel
        title="Which model leads where"
        subtitle="Across India, last cycle"
        term="weight"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {dominance.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-muted-foreground sm:col-span-2 lg:col-span-3">
              Regional dominance unavailable — the engine has not published weights for this cycle.
            </div>
          ) : dominance.map((r) => (
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
      </More>
    </div>
  );
}

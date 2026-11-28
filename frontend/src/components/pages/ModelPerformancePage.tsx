'use client';
import { useState } from 'react';
import { ModelSkillPanel } from '@/components/ModelSkill';
import type { SkillFinding } from '@/components/ModelSkill';
import { ModelVerification } from '@/components/ModelVerification';
import { ModelCalibration } from '@/components/ModelCalibration';
import { PerformanceMatrix3D } from '@/components/PerformanceMatrix3D';
import { PageHeader } from '@/components/shell/PageHeader';
import { More, Prose } from '@/components/plain/Plain';
import { BarChart3 } from '@/components/icons';

export function ModelPerformancePage() {
  const [finding, setFinding] = useState<SkillFinding | null>(null);

  // The headline states what the scored table shows. It was a fixed sentence
  // claiming the blend beats every model, which the leaderboard contradicts.
  const answer = !finding
    ? 'Every model is scored against the same measured hours.'
    : finding.blendWins
      ? `The blend's average miss is ${finding.blendMae.toFixed(2)}°C — lower than any single model's ${finding.bestModelMae.toFixed(2)}°C.`
      : `The blend's average miss is ${finding.blendMae.toFixed(2)}°C. ${finding.bestModel} alone is closer, at ${finding.bestModelMae.toFixed(2)}°C.`;

  return (
    <div className="space-y-8">
      <PageHeader
        icon={BarChart3}
        title="Accuracy"
        answer={answer}
        sub="Scored against reanalysis for the same hours, on the same districts."
      />

      <ModelSkillPanel onFinding={setFinding} />

      <More label="How the score is measured">
        <Prose>
          <p>
            Every model&rsquo;s forecast is stored, then compared with what the reanalysis says actually
            happened at the same hour. The difference is the error. A model that is consistently wrong in
            the same direction gets no credit for being close on average — the score punishes bias as
            well as spread.
          </p>
          <p className="mt-3">
            The blend is scored the same way, on the same hours, from the same held-out record. No model
            sees the verification data before it is scored.
          </p>
        </Prose>
      </More>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <ModelVerification />
        <ModelCalibration />
      </div>

      <More label="Read the per-district matrix" defaultOpen={false}>
        <PerformanceMatrix3D />
      </More>
    </div>
  );
}

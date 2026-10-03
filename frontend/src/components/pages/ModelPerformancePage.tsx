'use client';
import { ModelSkillPanel } from '@/components/ModelSkill';
import { ModelVerification } from '@/components/ModelVerification';
import { ModelCalibration } from '@/components/ModelCalibration';
import { PerformanceMatrix3D } from '@/components/PerformanceMatrix3D';
import { PageHeader } from '@/components/shell/PageHeader';
import { BarChart3 } from '@/components/icons';

export function ModelPerformancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Model Performance & Skill"
        sub="How our blended forecast stacks up against the raw models, verified against past weather."
      />

      {/* Rail columns: skill + verification on the left, calibration on the right.
          Leaderboard has been promoted to its own dedicated Arena page. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <ModelSkillPanel />
          <ModelVerification />
        </div>

        <div className="space-y-6">
          <ModelCalibration />
        </div>
      </div>

      {/* 3D Performance Matrix — supplementary to the flat calibration table above,
          so it collapses below desktop where it is the tallest panel on the page. */}
      <PerformanceMatrix3D />
    </div>
  );
}

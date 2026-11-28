'use client';
import { DataHealthPanel } from '@/components/DataHealth';
import { PageHeader } from '@/components/shell/PageHeader';
import { Answer, More, Prose } from '@/components/plain/Plain';
import { Activity } from '@/components/icons';

export function DataHealthPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        icon={Activity}
        title="Data health"
        answer="The forecast is only as fresh as the last data that arrived."
        sub="Anything marked late or missing is excluded from the blend rather than filled in."
      />


      <DataHealthPanel />

      <More label="What the engine checks, and when">
        <Prose>
          <p>
            Four cycles a day, at 00, 06, 12 and 18 UTC. Each cycle pulls the latest run from every
            model, verifies yesterday&rsquo;s forecast against the ERA5 reanalysis, and recalculates how
            much weight each model has earned for each district and variable.
          </p>
          <p className="mt-3">
            Verification is against reanalysis, not against another forecast — the engine is scored on
            what the weather actually did. That record is what the accuracy page draws its error bars
            from, and what makes the weights move.
          </p>
          <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-border pt-4 sm:grid-cols-3">
            {[
              { k: 'Cycles', v: '4 per day, 00 / 06 / 12 / 18 UTC' },
              { k: 'Ground truth', v: 'ERA5 reanalysis, via Open-Meteo' },
              { k: 'Weights', v: 'Recalculated every cycle, per district' },
            ].map((row) => (
              <div key={row.k}>
                <dt className="text-[11.5px] text-muted-foreground">{row.k}</dt>
                <dd className="mt-0.5 text-[13px] text-foreground">{row.v}</dd>
              </div>
            ))}
          </dl>
        </Prose>
      </More>
    </div>
  );
}
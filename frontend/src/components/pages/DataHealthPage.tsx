'use client';
import { DataHealthPanel } from '@/components/DataHealth';
import { Panel } from '@/components/shell/Panel';
import { PageHeader } from '@/components/shell/PageHeader';
import { Activity } from '@/components/icons';
import { ENGINE_STATUS } from '@/lib/api';

export function DataHealthPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Activity}
        title="Data & Model Health"
        sub="Is the data flowing, and is the engine telling the truth about it."
      />

      <DataHealthPanel />

      <Panel
        title="Operational pipeline status"
        subtitle="When the forecast engine runs and what it checks itself against"
        term="era5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Forecast Cycles', value: '4 / day (00, 06, 12, 18 UTC)' },
            { label: 'Reanalysis Ground Truth', value: 'ERA5 (ECMWF) via Open-Meteo' },
            { label: 'Weight Recalculation', value: 'Dynamic per cycle' },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-md bg-card border border-border">
              <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
              <div className="text-xs font-semibold text-foreground">{item.value}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

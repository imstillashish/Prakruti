'use client';
import { DataHealthPanel } from '@/components/DataHealth';
import { Panel } from '@/components/shell/Panel';
import { Activity, Server } from 'lucide-react';
import { ENGINE_STATUS } from '@/lib/api';

export function DataHealthPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 flex items-center justify-center bg-secondary text-foreground border border-border">
          <Activity size={18} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Data &amp; Model Health</h1>
          <p className="text-xs text-muted-foreground">Ingest pipeline latency, station coverage, and automated synchronization schedules</p>
        </div>
      </div>

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
            <div key={item.label} className="p-3 bg-card border border-border">
              <div className="text-xs font-mono text-muted-foreground mb-1">{item.label}</div>
              <div className="text-xs font-bold text-foreground">{item.value}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

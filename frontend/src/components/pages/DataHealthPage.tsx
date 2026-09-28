'use client';
import { DataHealthPanel } from '@/components/DataHealth';
import { GlassCard } from '@/components/ui/GlassCard';
import { Activity, Server } from 'lucide-react';
import { ENGINE_STATUS } from '@/lib/api';

export function DataHealthPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 flex items-center justify-center bg-[#f7f7f7] text-[#212121] border border-[#dbdbdb]" style={{ borderRadius: 0 }}>
          <Activity size={18} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[#212121]">Data &amp; Model Health</h1>
          <p className="text-xs text-[#808080]">Ingest pipeline latency, station coverage, and automated synchronization schedules</p>
        </div>
      </div>

      <DataHealthPanel />

      <GlassCard padding="md">
        <div className="flex items-center gap-2 mb-4">
          <Server size={14} className="text-[#808080]" />
          <h2 className="text-xs font-mono font-bold tracking-widest text-[#212121] uppercase">
            OPERATIONAL PIPELINE STATUS
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Forecast Cycles', value: '4 / day (00, 06, 12, 18 UTC)' },
            { label: 'Reanalysis Ground Truth', value: 'ERA5 (ECMWF) via Open-Meteo' },
            { label: 'Weight Recalculation', value: 'Dynamic per cycle' },
          ].map((item) => (
            <div
              key={item.label}
              className="p-3 bg-white border border-[#dbdbdb]"
              style={{ borderRadius: 0 }}
            >
              <div className="text-xs font-mono text-[#808080] mb-1">{item.label}</div>
              <div className="text-xs font-bold text-[#212121]">{item.value}</div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

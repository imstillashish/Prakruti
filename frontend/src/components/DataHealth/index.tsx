'use client';
import { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertTriangle, X } from '@/components/icons';
import type { IconComponent } from '@/components/icons';
import { Panel } from '@/components/shell/Panel';
import { Badge } from '@/components/ui/badge';
import { getCycleState, type CycleState } from '@/lib/api';
import { DataSource } from '@/types';

const STATUS_CONFIG: Record<DataSource['status'], { icon: IconComponent; color: string; label: string; badge: 'default' | 'warning' | 'destructive' }> = {
  healthy: { icon: CheckCircle, color: '#16a34a', label: 'Nominal', badge: 'default' },
  delayed: { icon: AlertTriangle, color: '#ab6400', label: 'Delayed', badge: 'warning' },
  unavailable: { icon: X, color: '#b42318', label: 'Offline', badge: 'destructive' },
};

export function DataHealthPanel({ collapsibleOnPhone, collapsibleOnTablet }: { collapsibleOnPhone?: boolean; collapsibleOnTablet?: boolean }) {
  // Live per-model ingestion state from the engine's own cycle report; the
  // empty list is the honest loading/degraded state, never a stand-in feed.
  const [sources, setSources] = useState<DataSource[]>([]);
  const [cycle, setCycle] = useState<CycleState | null>(null);

  useEffect(() => {
    let mounted = true;
    getCycleState().then((state) => {
      if (!mounted) return;
      setCycle(state);
      if (state) {
        setSources(state.expected_models.map((id) => {
          const status = state.missing_models.includes(id) ? 'unavailable' : 'healthy';
          return {
            id,
            name: id.toUpperCase(),
            status,
            lastUpdated: status === 'healthy' ? 'received this cycle' : 'not received',
            latencyMs: state.models[id]?.rows ?? 0,
          };
        }));
      }
    });
    return () => { mounted = false; };
  }, []);

  const healthyCount = sources.filter(s => s.status === 'healthy').length;

  return (
    <Panel
      title="Is the data arriving"
      subtitle={sources.length ? `${healthyCount}/${sources.length} feeds operational` : 'Awaiting engine cycle'}
      collapsibleOnPhone={collapsibleOnPhone}
      collapsibleOnTablet={collapsibleOnTablet}
      actions={
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border bg-secondary text-foreground border-border">
          {cycle?.stale ? 'Stale cycle' : sources.length ? 'Nominal' : 'Waiting'}
        </span>
      }
    >

      <div className="space-y-1.5 font-mono">
        {sources.map((s) => {
          const cfg = STATUS_CONFIG[s.status];
          const Icon = cfg.icon;

          return (
            <div
              key={s.id}
              className="flex items-center justify-between p-2.5 rounded-md bg-card border border-border hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-2">
                <Icon size={14} style={{ color: cfg.color, flexShrink: 0 }} />
                <span className="text-xs font-bold text-foreground">{s.name}</span>
                <Badge variant={cfg.badge}>{cfg.label}</Badge>
              </div>

              <div className="text-right">
                <div className="text-xs font-semibold text-foreground">
                  {s.latencyMs > 0 ? `${s.latencyMs.toLocaleString()} rows` : '—'}
                </div>
                <div className="text-[11.5px] text-muted-foreground flex items-center gap-1 justify-end">
                  <Clock size={10} />
                  <span>{s.lastUpdated}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="mt-3.5 p-3 rounded-md bg-card border border-border text-xs font-mono text-muted-foreground"
      >
        <div className="flex items-center justify-between text-[12px]">
          <span>Cycle ID</span>
          <span className="text-data-ok-text font-bold">{cycle?.cycle_id ?? '—'}</span>
        </div>
      </div>
    </Panel>
  );
}

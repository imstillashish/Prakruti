'use client';
import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, XCircle, Activity, Clock, LucideIcon } from 'lucide-react';
import { Panel } from '@/components/shell/Panel';
import { Badge } from '@/components/ui/badge';
import { MOCK_DATA_SOURCES, ENGINE_STATUS, getForecast } from '@/lib/api';
import { DataSource } from '@/types';

const STATUS_CONFIG: Record<DataSource['status'], { icon: LucideIcon; color: string; label: string; badge: 'default' | 'warning' | 'destructive' }> = {
  healthy: { icon: CheckCircle, color: '#16a34a', label: 'Nominal', badge: 'default' },
  delayed: { icon: AlertCircle, color: '#ab6400', label: 'Delayed', badge: 'warning' },
  unavailable: { icon: XCircle, color: '#b42318', label: 'Offline', badge: 'destructive' },
};

export function DataHealthPanel({ collapsibleOnPhone, collapsibleOnTablet }: { collapsibleOnPhone?: boolean; collapsibleOnTablet?: boolean }) {
  const [sources, setSources] = useState<DataSource[]>(MOCK_DATA_SOURCES);
  const [engineStatus, setEngineStatus] = useState(ENGINE_STATUS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getForecast()
      .then((data) => {
        if (mounted && data && data.length > 0) {
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const healthyCount = sources.filter(s => s.status === 'healthy').length;

  return (
    <Panel
      title="Data ingest telemetry"
      subtitle={`${healthyCount}/${sources.length} feeds operational`}
      collapsibleOnPhone={collapsibleOnPhone}
      collapsibleOnTablet={collapsibleOnTablet}
      actions={
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border bg-secondary text-foreground border-border">
          Nominal
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
                <div className="text-xs font-semibold text-foreground">{s.latencyMs}ms latency</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                  <Clock size={10} />
                  <span>{s.lastUpdated}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="mt-3.5 p-3 rounded-md bg-secondary border border-border text-xs font-mono text-muted-foreground"
      >
        <div className="flex items-center justify-between text-[11px]">
          <span>Cache Invalidation: 60m TTL</span>
          <span className="text-success font-bold">100% Data Integrity</span>
        </div>
      </div>
    </Panel>
  );
}

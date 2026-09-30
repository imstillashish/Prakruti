'use client';
import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, XCircle, Activity, Clock, LucideIcon } from 'lucide-react';
import { Panel } from '@/components/shell/Panel';
import { Badge } from '@/components/ui/badge';
import { MOCK_DATA_SOURCES, ENGINE_STATUS, getForecast } from '@/lib/api';
import { DataSource } from '@/types';

const STATUS_CONFIG: Record<DataSource['status'], { icon: LucideIcon; color: string; label: string; badge: 'default' | 'warning' | 'destructive' }> = {
  healthy: { icon: CheckCircle, color: '#168a49', label: 'Nominal', badge: 'default' },
  delayed: { icon: AlertCircle, color: '#f59e0b', label: 'Delayed', badge: 'warning' },
  unavailable: { icon: XCircle, color: '#b4544a', label: 'Offline', badge: 'destructive' },
};

export function DataHealthPanel() {
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
      actions={
        <span className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold border bg-accent text-accent-foreground border-primary/30">
          <span className="w-1.5 h-1.5 bg-primary status-pulse" />
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
              className="flex items-center justify-between p-2.5 bg-white border border-[#dbdbdb] hover:bg-[#f7f7f7] transition-colors"
              style={{ borderRadius: 0 }}
            >
              <div className="flex items-center gap-2">
                <Icon size={14} style={{ color: cfg.color, flexShrink: 0 }} />
                <span className="text-xs font-bold text-[#212121]">{s.name}</span>
                <Badge variant={cfg.badge}>{cfg.label}</Badge>
              </div>

              <div className="text-right">
                <div className="text-xs font-semibold text-[#333333]">{s.latencyMs}ms latency</div>
                <div className="text-[10px] text-[#808080] flex items-center gap-1 justify-end">
                  <Clock size={10} />
                  <span>{s.lastUpdated}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="mt-3.5 p-3 bg-[#f7f7f7] border border-[#dbdbdb] text-xs font-mono text-[#575757]"
        style={{ borderRadius: 0 }}
      >
        <div className="flex items-center justify-between text-[11px]">
          <span>Cache Invalidation: 60m TTL</span>
          <span className="text-[#168a49] font-bold">100% Data Integrity</span>
        </div>
      </div>
    </Panel>
  );
}

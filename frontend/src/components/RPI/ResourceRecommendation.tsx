'use client';
import { useState } from 'react';
import { Flame, CheckCircle2, Send, Info, CloudRain, Wind, Building } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ShaderButton } from '@/components/ui/ShaderButton';
import { Badge } from '@/components/ui/badge';
import { SectionBanner } from '@/components/shell/SectionBanner';
import { ResourceAction, RpiData } from '@/types';

interface ResourceRecommendationProps {
  rpiData: RpiData;
}

const CATEGORY_TABS = [
  { id: 'all', label: 'All Protocols' },
  { id: 'rain', label: 'Flood & Rain' },
  { id: 'heat', label: 'Heat Action Plan' },
  { id: 'wind', label: 'Wind & Infrastructure' },
];

export function ResourceRecommendation({ rpiData }: ResourceRecommendationProps) {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [dispatchedIds, setDispatchedIds] = useState<Set<string>>(new Set());

  const filteredRecs = rpiData.recommendations.filter(
    (r) => activeTab === 'all' || r.category === activeTab || (activeTab === 'rain' && r.category === 'general')
  );

  const handleDispatch = (id: string) => {
    setDispatchedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'rain':
        return <CloudRain className="w-3.5 h-3.5 text-data-rain shrink-0" />;
      case 'heat':
        return <Flame className="w-3.5 h-3.5 text-destructive shrink-0" />;
      case 'wind':
        return <Wind className="w-3.5 h-3.5 text-foreground shrink-0" />;
      default:
        return <Building className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
    }
  };

  const priorityVariant = (priority: string): 'destructive' | 'warning' | 'secondary' | 'success' => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'warning';
      case 'medium':
        return 'secondary';
      default:
        return 'success';
    }
  };

  const statusDotClass = (rec: ResourceAction, dispatched: boolean) => {
    if (dispatched) return 'bg-success';
    switch (rec.priority) {
      case 'critical':
        return 'bg-destructive';
      case 'high':
        return 'bg-warning';
      case 'medium':
        return 'bg-muted-foreground';
      default:
        return 'bg-success';
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header bar */}
      <SectionBanner
        icon={Building}
        title="Resource Recommendation Engine"
        pill="Govt EOC Active"
        subline={
          <>
            Standing operating procedures triggered by live risk indicators for{' '}
            <span className="font-semibold text-foreground">{rpiData.city}</span>. Tap a row for details.
          </>
        }
        chip={
          <div className="flex flex-wrap items-center gap-1 p-0.5 rounded-md bg-secondary border border-border">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1 rounded-sm text-xs transition-colors ${
                  activeTab === tab.id
                    ? 'bg-card text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Trigger rule condition banner */}
      <div className="px-5 py-2.5 bg-secondary border-b border-border flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Info className="w-3.5 h-3.5 text-success shrink-0" />
          <span>
            <strong className="text-foreground font-bold">Active Risk Drivers:</strong>{' '}
            Rain <strong className="text-foreground">{rpiData.rainfall} mm</strong> ({rpiData.rainRisk}%) · Temp{' '}
            <strong className="text-foreground">{rpiData.temperature}°C</strong> ({rpiData.heatRisk}%) · Wind{' '}
            <strong className="text-foreground">{rpiData.wind} km/h</strong> ({rpiData.windRisk}%)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Mobilized:</span>
          <span className="font-bold text-data-ok-text bg-success/10 px-1.5 py-0.5 rounded-sm border border-success/20 text-[11px]">
            {dispatchedIds.size} / {rpiData.recommendations.length} Orders
          </span>
        </div>
      </div>

      {/* Expandable task rows */}
      <ul className="divide-y divide-border">
        {filteredRecs.map((rec) => {
          const dispatched = dispatchedIds.has(rec.id);
          const open = openId === rec.id;
          return (
            <li key={rec.id}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : rec.id)}
                className="flex w-full items-center gap-2.5 px-5 py-3 text-left transition-colors duration-150 hover:bg-secondary/50"
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass(rec, dispatched)}`} />
                <span className="shrink-0">{getCategoryIcon(rec.category)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-foreground">
                    {rec.title}
                  </span>
                </span>
                <span className="hidden lg:block shrink-0 font-mono text-[10.5px] tabular-nums text-muted-foreground">
                  {rec.actionCode} · {rec.department}
                </span>
                <Badge variant={priorityVariant(rec.priority)}>{rec.priority.toUpperCase()}</Badge>
              </button>

              {open && (
                <div className="px-5 pb-4 pl-[46px]">
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                    {rec.description}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-3">
                    <ShaderButton
                      type="button"
                      onClick={() => handleDispatch(rec.id)}
                      className="h-8 px-3 text-xs"
                    >
                      {dispatched ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Order Mobilized</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Dispatch Resource</span>
                        </>
                      )}
                    </ShaderButton>
                    <span className="lg:hidden text-[11px] font-mono text-muted-foreground">
                      {rec.actionCode} · {rec.department}
                    </span>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
export default ResourceRecommendation;

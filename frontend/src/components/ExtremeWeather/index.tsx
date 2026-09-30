'use client';
import { useState, useEffect } from 'react';
import { AlertTriangle, CloudRain, Thermometer, Wind, ChevronRight, ShieldAlert, LucideIcon } from 'lucide-react';
import { Panel } from '@/components/shell/Panel';
import { Badge } from '@/components/ui/badge';
import { getExtremeEventsData, MOCK_EXTREME_EVENTS } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ExtremeEvent } from '@/types';

const EVENT_ICONS: Record<ExtremeEvent['type'], LucideIcon> = {
  heavy_rainfall: CloudRain,
  heatwave: Thermometer,
  high_wind: Wind,
  cyclone: AlertTriangle,
  cold_wave: Thermometer,
};

const SEVERITY_STYLES: Record<
  ExtremeEvent['severity'],
  {
    badge: 'destructive' | 'warning' | 'success';
    color: string;
    borderClass: string;
    bgClass: string;
  }
> = {
  alert: {
    badge: 'destructive',
    color: '#b42318',
    borderClass: 'border-destructive/30',
    bgClass: 'ambient-gradient-destructive',
  },
  warning: {
    badge: 'warning',
    color: '#ab6400',
    borderClass: 'border-warning/30',
    bgClass: 'ambient-gradient-warning',
  },
  watch: {
    badge: 'success',
    color: '#16a34a',
    borderClass: 'border-success/30',
    bgClass: 'ambient-gradient-success',
  },
};

function ProbabilityArc({ value, color }: { value: number; color: string }) {
  const r = 24;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="relative flex items-center justify-center shrink-0 font-mono">
      <svg width="60" height="60" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r={r} fill="none" strokeWidth="4" stroke="#dcdee0" />
        <circle
          cx="30" cy="30" r={r} fill="none" strokeWidth="4"
          stroke={color} strokeLinecap="square"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 30 30)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="30" y="30" textAnchor="middle" dominantBaseline="central" fill={color} fontSize="12" fontWeight="700">
          {value}%
        </text>
      </svg>
    </div>
  );
}

interface ExtremeWeatherPanelProps {
  selectedCity?: string | null;
}

export function ExtremeWeatherPanel({ selectedCity = 'Kanpur' }: ExtremeWeatherPanelProps) {
  const [events, setEvents] = useState<ExtremeEvent[]>(MOCK_EXTREME_EVENTS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getExtremeEventsData(selectedCity || 'Kanpur')
      .then((data) => {
        if (mounted && data && data.length > 0) {
          setEvents(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [selectedCity]);

  return (
    <Panel
      title="Early warning advisory"
      subtitle="IMD Probabilistic Risk Thresholds"
      term="rpi"
      className="flex flex-col justify-between h-full"
      actions={<Badge variant="warning">Active Bulletins</Badge>}
    >
      <div>

        <div className="space-y-2.5">
          {events.map((event, idx) => {
            const Icon = EVENT_ICONS[event.type];
            const style = SEVERITY_STYLES[event.severity];
            const color = style.color;

            return (
              <div
                key={`${event.type}-${event.window}-${idx}`}
                className={cn(
                  'w-full text-left p-3 transition-colors border rounded-md',
                  style.borderClass,
                  style.bgClass
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Probability meter */}
                  <ProbabilityArc value={event.probability} color={color} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={14} style={{ color, flexShrink: 0 }} />
                      <span className="text-xs font-bold text-foreground">{event.label}</span>
                      <Badge variant={style.badge}>{event.severity.toUpperCase()}</Badge>
                    </div>
                    <div className="text-[11px] font-mono font-semibold text-muted-foreground mb-0.5">{event.window}</div>
                    <div className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{event.description}</div>
                    <div className="text-[10px] font-mono text-muted-foreground mt-1">
                      Ensemble Agreement: <span className="font-bold text-foreground">{event.confidence}%</span>
                    </div>
                  </div>

                  <ChevronRight size={14} className="text-border shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border mt-3 pt-2 text-[11px] font-mono text-muted-foreground text-center">
        Calibrated to IMD &amp; NDMA disaster threshold criteria
      </div>
    </Panel>
  );
}

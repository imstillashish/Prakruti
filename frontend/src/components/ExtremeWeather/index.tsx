'use client';
import { useState, useEffect } from 'react';
import { AlertTriangle, CloudRain, Thermometer, Wind, ChevronRight, ShieldAlert, LucideIcon } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { getExtremeEventsData, MOCK_EXTREME_EVENTS } from '@/lib/api';
import type { ExtremeEvent } from '@/types';

const EVENT_ICONS: Record<ExtremeEvent['type'], LucideIcon> = {
  heavy_rainfall: CloudRain,
  heatwave: Thermometer,
  high_wind: Wind,
  cyclone: AlertTriangle,
  cold_wave: Thermometer,
};

const SEVERITY_STYLES: Record<ExtremeEvent['severity'], { badge: 'danger' | 'warning' | 'info'; border: string; bg: string }> = {
  alert: { badge: 'danger', border: '#cf746e', bg: '#fbf5f4' },
  warning: { badge: 'warning', border: '#dfa8a5', bg: '#fbf5f4' },
  watch: { badge: 'info', border: '#95eebc', bg: '#f2fcf7' },
};

function ProbabilityArc({ value, color }: { value: number; color: string }) {
  const r = 24;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="relative flex items-center justify-center shrink-0 font-mono">
      <svg width="60" height="60" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r={r} fill="none" strokeWidth="4" stroke="#dbdbdb" />
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
    <GlassCard padding="md" variant="default" className="flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-[#dbdbdb] pb-3 font-mono">
          <div className="flex items-center gap-2">
            <ShieldAlert size={14} className="text-[#b4544a]" />
            <div>
              <span className="text-xs font-bold tracking-wider text-[#212121] uppercase">
                EARLY WARNING ADVISORY
              </span>
              <p className="text-[11px] text-[#808080] mt-0.5 font-sans">IMD Probabilistic Risk Thresholds</p>
            </div>
          </div>
          <Badge variant="warning">Active Bulletins</Badge>
        </div>

        <div className="space-y-2.5">
          {events.map((event, idx) => {
            const Icon = EVENT_ICONS[event.type];
            const style = SEVERITY_STYLES[event.severity];
            const color = event.severity === 'alert' ? '#b4544a' : event.severity === 'warning' ? '#f59e0b' : '#1db961';

            return (
              <div
                key={`${event.type}-${event.window}-${idx}`}
                className="w-full text-left p-3 transition-colors border"
                style={{
                  background: style.bg,
                  borderColor: style.border,
                  borderRadius: 0,
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Probability meter */}
                  <ProbabilityArc value={event.probability} color={color} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={14} style={{ color, flexShrink: 0 }} />
                      <span className="text-xs font-bold text-[#212121]">{event.label}</span>
                      <Badge variant={style.badge}>{event.severity.toUpperCase()}</Badge>
                    </div>
                    <div className="text-[11px] font-mono font-semibold text-[#575757] mb-0.5">{event.window}</div>
                    <div className="text-[11px] text-[#575757] leading-snug line-clamp-2">{event.description}</div>
                    <div className="text-[10px] font-mono text-[#808080] mt-1">
                      Ensemble Agreement: <span className="font-bold text-[#212121]">{event.confidence}%</span>
                    </div>
                  </div>

                  <ChevronRight size={14} className="text-[#c2c2c2] shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-[#f0f0f0] mt-3 pt-2 text-[11px] font-mono text-[#808080] text-center">
        Calibrated to IMD &amp; NDMA disaster threshold criteria
      </div>
    </GlassCard>
  );
}

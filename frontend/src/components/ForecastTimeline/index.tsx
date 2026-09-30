'use client';
import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Panel } from '@/components/shell/Panel';
import { Explain } from '@/components/explain/Explain';
import { ChartState } from '@/components/spectrumui/charts/chart-engine';
import { getTimelineData, MOCK_TIMELINE } from '@/lib/api';
import type { TimelinePoint, Variable } from '@/types';
import { Calendar } from 'lucide-react';

const VARIABLE_CONFIG: Record<Variable, { label: string; unit: string; color: string; key: string; uncertaintyHigh?: string; uncertaintyLow?: string }> = {
  rainfall: { label: 'Rainfall', unit: 'mm', color: 'var(--water)', key: 'rainfall', uncertaintyHigh: 'rainfallUncertaintyHigh', uncertaintyLow: 'rainfallUncertaintyLow' },
  temperature: { label: 'Temperature', unit: '°C', color: '#171717', key: 'temperature' },
  wind: { label: 'Wind Speed', unit: 'km/h', color: '#60646c', key: 'wind' },
};

const CustomTooltip = ({ active, payload, label, dataList }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string; dataList?: TimelinePoint[] }) => {
  if (!active || !payload?.length) return null;
  const list = dataList || MOCK_TIMELINE;
  const data = list.find(t => t.time === label);
  return (
    <div
      className="p-3 bg-card border border-border shadow-xs rounded-md font-mono text-xs"
      style={{
        minWidth: 150,
      }}
    >
      <div className="text-[11px] font-semibold text-muted-foreground mb-1 flex items-center justify-between">
        <span>{label}</span>
        {data?.label && <span className="text-muted-foreground font-normal">({data.label} IST)</span>}
      </div>
      {payload.map((p, i) => (
        <div key={i} className="text-base font-bold text-foreground">
          {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </div>
      ))}
      {data && (
        <div className="text-[11px] text-success font-medium mt-1">
          Confidence: {data.confidence}%
        </div>
      )}
    </div>
  );
};

interface ForecastTimelineProps {
  selectedCity?: string | null;
}

export function ForecastTimeline({ selectedCity = 'Kanpur' }: ForecastTimelineProps) {
  const [variable, setVariable] = useState<Variable>('rainfall');
  const [timeline, setTimeline] = useState<TimelinePoint[]>(MOCK_TIMELINE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getTimelineData(selectedCity || 'Kanpur')
      .then((data) => {
        if (mounted && data && data.length > 0) {
          setTimeline(data);
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

  const config = VARIABLE_CONFIG[variable];

  const chartData = timeline.map(t => ({
    time: t.time,
    label: t.label,
    value: t[config.key as keyof typeof t] as number,
    high: config.uncertaintyHigh ? t[config.uncertaintyHigh as keyof typeof t] as number : undefined,
    low: config.uncertaintyLow ? t[config.uncertaintyLow as keyof typeof t] as number : undefined,
    confidence: t.confidence,
  }));

  return (
    <Panel
      title="Hourly prediction horizon"
      subtitle="72-Hour Continuous Outlook with Adaptive AI Uncertainty Bands"
      actions={
        <div className="flex items-center gap-1 border border-border p-0.5 bg-secondary rounded-md">
          {(Object.keys(VARIABLE_CONFIG) as Variable[]).map((v) => (
            <button
              key={v}
              onClick={() => setVariable(v)}
              className={`px-3 py-1 text-xs font-mono font-medium rounded-sm transition-colors duration-100 ${
                variable === v
                  ? 'bg-card text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              type="button"
            >
              {VARIABLE_CONFIG[v].label}
            </button>
          ))}
        </div>
      }
    >

      <div className="w-full h-[220px]">
        <ChartState status={isLoading ? 'loading' : 'ready'} height={220} variant="line">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id={`grad-${variable}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={config.color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={config.color} stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="uncertainty-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={config.color} stopOpacity={0.12} />
                <stop offset="95%" stopColor={config.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f3" />
            <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#60646c', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#60646c', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} unit={config.unit === 'mm' ? ' mm' : config.unit} />
            <ReTooltip content={<CustomTooltip />} />
            <ReferenceLine x="NOW" stroke={config.color} strokeDasharray="3 3" opacity={0.6} />
            {config.uncertaintyHigh && (
              <Area
                type="monotone"
                dataKey="high"
                stroke="none"
                fill="url(#uncertainty-grad)"
                fillOpacity={1}
                isAnimationActive={false}
              />
            )}
            <Area
              type="monotone"
              dataKey="value"
              stroke={config.color}
              strokeWidth={2}
              fill={`url(#grad-${variable})`}
              dot={false}
              activeDot={{ r: 4, stroke: config.color, strokeWidth: 2, fill: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
        </ChartState>
      </div>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border text-[11px] font-mono text-muted-foreground">
        <span>Range: Next 72 Hours</span>
        <span className="flex items-center gap-1 text-primary">
          Uncertainty Envelope: 95% Gaussian Confidence Interval
          <Explain term="confidence" />
        </span>
      </div>
    </Panel>
  );
}

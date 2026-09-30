'use client';
import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Panel } from '@/components/shell/Panel';
import { getModelComparisonData, MOCK_MODEL_COMPARISON } from '@/lib/api';
import type { ModelComparison as ModelComparisonType, Variable } from '@/types';
import { BarChart3 } from 'lucide-react';

const VARIABLE_CONFIG: Record<Variable, { label: string; unit: string; color: string }> = {
  rainfall: { label: 'Rainfall', unit: 'mm', color: '#1e6fb8' },
  temperature: { label: 'Temperature', unit: '°C', color: '#ab6400' },
  wind: { label: 'Wind', unit: 'km/h', color: '#60646c' },
};

interface ModelComparisonProps {
  selectedCity?: string | null;
}

export function ModelComparison({ selectedCity = 'Kanpur' }: ModelComparisonProps) {
  const [variable, setVariable] = useState<Variable>('rainfall');
  const [comparison, setComparison] = useState<ModelComparisonType[]>(MOCK_MODEL_COMPARISON);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getModelComparisonData(selectedCity || 'Kanpur')
      .then((data) => {
        if (mounted && data && data.length > 0) {
          setComparison(data);
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

  const chartData = comparison.map(m => ({
    model: m.model,
    value: m[variable],
    isBlended: m.isBlended,
  }));

  return (
    <Panel
      title="Model consensus"
      subtitle="24h spread between models — closer bars mean better agreement"
      term="models"
      className="flex flex-col justify-between h-full"
      actions={
        <div className="flex items-center gap-1 border border-border p-0.5 bg-secondary">
          {(Object.keys(VARIABLE_CONFIG) as Variable[]).map((v) => (
            <button
              key={v}
              onClick={() => setVariable(v)}
              className={`px-2.5 py-1 text-xs font-mono font-medium transition-colors duration-100 ${
                variable === v
                  ? 'bg-secondary text-secondary-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card'
              }`}
              type="button"
            >
              {VARIABLE_CONFIG[v].label}
            </button>
          ))}
        </div>
      }
    >
      <div>

        {/* Bar Chart with Sharp Columns */}
        <div className="w-full h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="model" tick={{ fontSize: 10, fill: '#6f6f6f', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6f6f6f', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(219,219,219,0.3)' }}
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #dcdee0',
                  borderRadius: 8,
                  boxShadow: 'var(--shadow-md)',
                  fontSize: 12,
                  fontFamily: 'JetBrains Mono',
                }}
                formatter={(v: unknown) => [`${v} ${config.unit}`, config.label]}
              />
              <Bar dataKey="value" radius={[0, 0, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.isBlended ? '#171717' : '#9e9e9e'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-border text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-foreground" />
            <span className="text-foreground font-semibold">Hybrid AI Blend</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#9e9e9e]" />
            <span className="text-[#6f6f6f]">Raw NWP Forecasts</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

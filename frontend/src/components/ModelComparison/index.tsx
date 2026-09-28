'use client';
import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { getModelComparisonData, MOCK_MODEL_COMPARISON } from '@/lib/api';
import type { ModelComparison as ModelComparisonType, Variable } from '@/types';
import { BarChart3 } from 'lucide-react';

const VARIABLE_CONFIG: Record<Variable, { label: string; unit: string; color: string }> = {
  rainfall: { label: 'Rainfall', unit: 'mm', color: '#1db961' },
  temperature: { label: 'Temperature', unit: '°C', color: '#ea580c' },
  wind: { label: 'Wind', unit: 'km/h', color: '#575757' },
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
    <GlassCard padding="md" variant="default" className="flex flex-col justify-between h-full">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-[#dbdbdb] pb-3">
          <div>
            <div className="flex items-center gap-2 font-mono">
              <BarChart3 size={14} className="text-[#1db961]" />
              <span className="text-xs font-bold tracking-wider text-[#212121] uppercase">
                MODEL CONSENSUS
              </span>
            </div>
            <p className="text-xs text-[#808080] mt-0.5">24h {config.label} ({config.unit}) Model Variance</p>
          </div>

          {/* Sharp Selector Buttons */}
          <div className="flex items-center gap-1 border border-[#dbdbdb] p-0.5 bg-[#f7f7f7]" style={{ borderRadius: 0 }}>
            {(Object.keys(VARIABLE_CONFIG) as Variable[]).map((v) => (
              <button
                key={v}
                onClick={() => setVariable(v)}
                style={{ borderRadius: 0 }}
                className={`px-2.5 py-1 text-xs font-mono font-medium transition-colors ${
                  variable === v
                    ? 'bg-[#1db961] text-white font-semibold'
                    : 'text-[#575757] hover:text-[#212121] hover:bg-white'
                }`}
                type="button"
              >
                {VARIABLE_CONFIG[v].label}
              </button>
            ))}
          </div>
        </div>

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
                  border: '1px solid #dbdbdb',
                  borderRadius: 0,
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
                    fill={d.isBlended ? '#1db961' : '#9e9e9e'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-[#f0f0f0] text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#1db961]" style={{ borderRadius: 0 }} />
            <span className="text-[#212121] font-semibold">Hybrid AI Blend</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#9e9e9e]" style={{ borderRadius: 0 }} />
            <span className="text-[#6f6f6f]">Raw NWP Forecasts</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

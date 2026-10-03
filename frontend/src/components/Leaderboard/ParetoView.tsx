'use client';
import { useState } from 'react';
import type { ParetoPoint } from '@/lib/api';
import { SERIES } from '@/lib/palette';
import type { ModelName } from '@/lib/palette';
import { ModelEmblem } from '@/components/common/ModelEmblem';

interface ParetoViewProps {
  points: ParetoPoint[];
  threshold?: number | null;
  unit: string;
}

const METHOD_LABELS: Record<string, string> = {
  weighted_blend: 'Prakruti Blend',
  equal_avg: 'Equal Average',
  ecmwf: 'ECMWF IFS',
  gfs: 'NOAA GFS',
  icon: 'DWD ICON',
  gem: 'CMC GEM',
};

export function ParetoView({ points, threshold, unit }: ParetoViewProps) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  // Filter points for the active threshold if provided, else use the primary/first threshold
  const activeThreshold =
    threshold !== undefined && threshold !== null
      ? threshold
      : points[0]?.threshold;

  const currentPoints = points.filter(
    (p) => activeThreshold === undefined || Math.abs(p.threshold - activeThreshold) < 1e-4
  );

  if (!currentPoints || currentPoints.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm font-mono text-muted-foreground">
        No Pareto data available for threshold {activeThreshold ?? '—'} {unit}.
      </div>
    );
  }

  // Frontier points sorted by MAE ascending
  const frontierPoints = currentPoints
    .filter((p) => p.frontier === 1)
    .sort((a, b) => a.mae - b.mae);

  // Compute SVG viewBox dimensions and scales
  const svgWidth = 560;
  const svgHeight = 360;
  const padLeft = 60;
  const padRight = 40;
  const padTop = 30;
  const padBottom = 50;

  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const maes = currentPoints.map((p) => p.mae);
  const csis = currentPoints.map((p) => p.csi);

  const minMae = Math.max(0, Math.min(...maes) * 0.9);
  const maxMae = Math.max(...maes) * 1.1;

  const minCsi = Math.max(0, Math.min(...csis) * 0.8);
  const maxCsi = Math.min(1.0, Math.max(...csis) * 1.15 || 1.0);

  const scaleX = (val: number) =>
    padLeft + ((val - minMae) / (maxMae - minMae || 1)) * plotWidth;

  // y-axis: higher CSI is higher up (smaller y in SVG)
  const scaleY = (val: number) =>
    padTop + plotHeight - ((val - minCsi) / (maxCsi - minCsi || 1)) * plotHeight;

  // Generate SVG path for frontier line (drawn in ink/foreground)
  const frontierPathD =
    frontierPoints.length > 1
      ? frontierPoints
          .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(pt.mae).toFixed(1)} ${scaleY(pt.csi).toFixed(1)}`)
          .join(' ')
      : '';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: SVG Scatter & Frontier Plot */}
        <div className="lg:col-span-7 rounded-lg border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs font-mono border-b border-border/60 pb-2">
            <span className="font-semibold text-foreground">
              Trade-off Frontier: Accuracy (MAE) ↔ Detection (CSI)
            </span>
            <span className="text-muted-foreground">
              Threshold ≥ {activeThreshold} {unit} · Full window
            </span>
          </div>

          <div className="relative w-full aspect-[14/9] sm:aspect-[16/10] overflow-hidden">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-full select-none text-xs font-mono"
            >
              {/* Grid Lines */}
              <line
                x1={padLeft}
                y1={padTop + plotHeight}
                x2={padLeft + plotWidth}
                y2={padTop + plotHeight}
                stroke="currentColor"
                className="text-border"
                strokeWidth={1}
              />
              <line
                x1={padLeft}
                y1={padTop}
                x2={padLeft}
                y2={padTop + plotHeight}
                stroke="currentColor"
                className="text-border"
                strokeWidth={1}
              />

              {/* Frontier Line in Foreground/Ink */}
              {frontierPathD && (
                <path
                  d={frontierPathD}
                  fill="none"
                  stroke="currentColor"
                  className="text-foreground stroke-2 stroke-dasharray-[3,3]"
                  strokeDasharray="4 3"
                />
              )}

              {/* Points */}
              {currentPoints.map((pt) => {
                const cx = scaleX(pt.mae);
                const cy = scaleY(pt.csi);
                const isSelected = selectedMethod === pt.method;
                const isFrontier = pt.frontier === 1;

                return (
                  <g
                    key={pt.method}
                    className="cursor-pointer transition-transform duration-150"
                    onClick={() => setSelectedMethod(pt.method)}
                  >
                    {/* Selection ring */}
                    {isSelected && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={9}
                        fill="none"
                        stroke="#0d74ce"
                        strokeWidth={2}
                      />
                    )}

                    {/* Point Circle */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isFrontier ? 6 : 5}
                      data-frontier={pt.frontier === 1 ? '1' : '0'}
                      fill={isFrontier ? 'currentColor' : 'var(--color-card, #ffffff)'}
                      stroke="currentColor"
                      strokeWidth={2}
                      className="text-foreground transition-all hover:scale-125"
                    />

                    {/* Direct Text Label */}
                    <text
                      x={cx + 8}
                      y={cy - 6}
                      fill="currentColor"
                      className="text-[11px] font-mono font-medium text-foreground"
                    >
                      {pt.method.toUpperCase()}
                      {isFrontier ? '*' : ''}
                    </text>
                  </g>
                );
              })}

              {/* Axis Labels */}
              <text
                x={padLeft + plotWidth / 2}
                y={svgHeight - 12}
                textAnchor="middle"
                className="fill-muted-foreground text-xs font-mono"
              >
                Accuracy: MAE ({unit}) → (lower error is better)
              </text>
              <text
                x={16}
                y={padTop + plotHeight / 2}
                textAnchor="middle"
                transform={`rotate(-90 16 ${padTop + plotHeight / 2})`}
                className="fill-muted-foreground text-xs font-mono"
              >
                Detection: CSI (0–1) → (higher is better)
              </text>
            </svg>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1 border-t border-border/40">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-foreground shrink-0" />
                Frontier optimal (*)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs border-2 border-foreground bg-card shrink-0" />
                Dominated
              </span>
            </div>
            <span>Frontier connects non-dominated methods</span>
          </div>
        </div>

        {/* Right: Optimal Models List & Disclosures */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
                Pareto Frontier Models ({frontierPoints.length})
              </h3>
              <span className="text-[11px] font-mono text-muted-foreground">
                No method beats them on both axes
              </span>
            </div>

            <div className="space-y-2">
              {frontierPoints.map((pt) => {
                const mKey = pt.method.toUpperCase();
                const seriesColor =
                  SERIES[mKey as ModelName] ||
                  (pt.tier === 'blend' ? '#0d74ce' : '#64748b');
                const isSelected = selectedMethod === pt.method;

                return (
                  <div
                    key={pt.method}
                    data-pareto-optimal="1"
                    onClick={() => setSelectedMethod(pt.method)}
                    className={`rounded-md border p-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary ring-1 ring-primary bg-primary/[0.04]'
                        : 'border-border bg-muted/20 hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ModelEmblem method={pt.method} size={16} />
                        <span
                          className="w-3 h-1.5 rounded-xs border border-border/60 shadow-2xs shrink-0"
                          style={{ backgroundColor: seriesColor }}
                        />
                        <span className="font-medium text-sm text-foreground">
                          {METHOD_LABELS[pt.method] || pt.method}
                        </span>
                        {pt.tier === 'blend' && (
                          <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded-xs bg-primary/10 text-primary border border-primary/20">
                            ours
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Frontier
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/40 font-mono text-xs">
                      <div>
                        <span className="text-muted-foreground text-[10px] block">MAE (lower better)</span>
                        <span className="font-semibold text-foreground">
                          {pt.mae.toFixed(2)} {unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[10px] block">CSI (higher better)</span>
                        <span className="font-semibold text-foreground">
                          {pt.csi.toFixed(3)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground font-mono space-y-1">
            <div className="font-semibold text-foreground/80">Pareto Dominance Principle:</div>
            <div>
              Method A dominates B if A has lower or equal MAE and higher or equal CSI, with strict improvement on at least one axis.
            </div>
            <div className="text-[11px] pt-1 border-t border-border/40">
              Evaluated over 6 operational methods. Persistence is excluded because it does not evaluate categorical extremes.
            </div>
          </div>
        </div>
      </div>

      {/* Accessible Hidden Mirror Table for Screen Readers */}
      <table className="sr-only" aria-label="Pareto analysis data table">
        <thead>
          <tr>
            <th>Method</th>
            <th>MAE ({unit})</th>
            <th>CSI</th>
            <th>Optimal</th>
          </tr>
        </thead>
        <tbody>
          {currentPoints.map((pt) => (
            <tr key={pt.method}>
              <td>{pt.method}</td>
              <td>{pt.mae}</td>
              <td>{pt.csi}</td>
              <td>{pt.frontier === 1 ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

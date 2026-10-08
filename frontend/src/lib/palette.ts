/**
 * Color System v4 Single Source of Truth for JS/Canvas/SVG Consumers
 *
 * recharts SVG props (stroke, fill) and Leaflet divIcon HTML cannot resolve
 * CSS variables dynamically. This module provides the exact JS bindings
 * matching frontend/src/app/globals.css tokens.
 */

export type ModelName = 'ECMWF' | 'ICON' | 'GFS' | 'GEM' | 'JMA' | 'UKMO';

export const ACCENT = {
  base: '#0d74ce',
  hover: '#0b63b0',
  pressed: '#0a5594',
  soft: '#ecf4fc',
} as const;

export const DATA = {
  rain: '#0e7490',
  rainDark: '#155e75',
  rainLight: '#67e8f9',
  wind: '#475569',
  tempCool: '#fbbf24',
  tempMid: '#f97316',
  tempHot: '#dc2626',
  ok: '#16a34a',
  okText: '#15803d',
  watch: '#ab6400',
  hazard: '#b42318',
} as const;

export const SERIES: Record<ModelName, string> = {
  ECMWF: '#171717',
  ICON: '#4f46e5',
  GFS: '#c2410c',
  GEM: '#be185d',
  JMA: '#7e22ce',
  UKMO: '#0f766e',
};

export const SERIES_ORDER: readonly ModelName[] = ['ECMWF', 'ICON', 'GFS', 'GEM', 'JMA', 'UKMO'] as const;

/**
 * Gradient colorway deep bases (spec 2026-10-02 §3.2). The opaque fill a label
 * is measured against; the animated ramp rides over it.
 */
export const COLORWAY_DEEP = {
  ocean: '#0d74ce',
  emerald: '#047857',
  amber: '#b45309',
  neutral: '#1f242d',
  destructive: '#b42318',
  rain: '#0e7490',
} as const;

/**
 * Animated-CTA fills (DESIGN.md v4 §12). WebGL uniforms take literal stops, so
 * they live here alongside the other JS-only bindings. Every stop clears 4.5:1
 * with white: the label reads the lit mesh, and the previous highlight stops
 * (#cfe7ff 1.27:1) put it far under AA wherever the light caught them.
 */
export const SHADER_FILL = {
  ocean: ['#084b86', '#0a5faa', ACCENT.base],
  emerald: ['#034f39', '#036348', '#047857'],
  amber: ['#6b3105', '#8f4207', '#b45309'],
  neutral: ['#111827', '#1f2937', '#374151'],
  destructive: ['#7f1d1d', '#991b1b', '#b42318'],
  rain: ['#164e63', '#155e75', '#0e7490'],
} as const;

export function seriesColor(model: string): string {
  const m = model.toUpperCase();
  if (m in SERIES) return SERIES[m as ModelName];
  return SERIES.ECMWF;
}

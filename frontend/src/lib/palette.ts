/**
 * Color System v4 Single Source of Truth for JS/Canvas/SVG Consumers
 *
 * recharts SVG props (stroke, fill) and Leaflet divIcon HTML cannot resolve
 * CSS variables dynamically. This module provides the exact JS bindings
 * matching frontend/src/app/globals.css tokens.
 */

export type ModelName = 'ECMWF' | 'ICON' | 'GFS' | 'GEM';

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
};

export const SERIES_ORDER: readonly ModelName[] = ['ECMWF', 'ICON', 'GFS', 'GEM'] as const;

/**
 * Animated-CTA fills (DESIGN.md v4 §12). WebGL uniforms take literal stops,
 * so they live here alongside the other JS-only bindings — first stop mirrors
 * the matching token, the rest are the gradient's depth and highlight.
 */
export const SHADER_FILL = {
  ocean: [ACCENT.base, '#1e6fb8', '#cfe7ff'],
  emerald: [DATA.ok, '#059669', '#bbf7d0'],
  amber: [DATA.watch, '#d97706', '#fde68a'],
} as const;

export function seriesColor(model: string): string {
  const m = model.toUpperCase();
  if (m === 'ICON') return SERIES.ICON;
  if (m === 'GFS') return SERIES.GFS;
  if (m === 'GEM') return SERIES.GEM;
  return SERIES.ECMWF;
}

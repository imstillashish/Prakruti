/**
 * Hand-drawn animated icons, vendored from ItsHover (Apache-2.0 — credited in
 * the README's Acknowledgments). Re-exported under the names the app already
 * uses, so a call site only changes its import path:
 *
 *   import { MapPin } from 'lucide-react';   // before
 *   import { MapPin } from '@/components/icons';   // after
 *
 * Props match lucide's (`size`, `strokeWidth`, `color`, `className`), so the
 * JSX at every call site stays untouched. Each icon animates on hover via
 * `motion/react` and sits still otherwise.
 */
export { default as ArrowRight } from './arrow-narrow-right-icon';
export { default as Activity } from './chart-line-icon';
export { default as AlertTriangle } from './triangle-alert-icon';
export { default as Award } from './trophy-icon';
export { default as BarChart2 } from './chart-histogram-icon';
export { default as BarChart3 } from './chart-bar-icon';
export { default as Bell } from './filled-bell-icon';
export { default as BrainCircuit } from './brain-circuit-icon';
export { default as Check } from './simple-checked-icon';
export { default as CheckCircle } from './filled-checked-icon';
export { default as CheckCircle2 } from './checked-icon';
export { default as ChevronDown } from './down-chevron';
export { default as ChevronRight } from './right-chevron';
export { default as Clock } from './clock-icon';
export { default as CloudRain } from './cloud-3-icon';
export { default as Code2 } from './code-xml-icon';
export { default as Copy } from './copy-icon';
export { default as Cpu } from './cpu-icon';
export { default as ExternalLink } from './external-link-icon';
export { default as Flame } from './flame-icon';
export { default as Gauge } from './gauge-icon';
export { default as Globe2 } from './globe-icon';
export { default as HeartPulse } from './scan-heart-icon';
export { default as Info } from './info-circle-icon';
export { default as Layers } from './layers-icon';
export { default as LayoutDashboard } from './layout-dashboard-icon';
export { default as Lock } from './lock-icon';
export { default as MapPin } from './map-pin-icon';
export { default as Play } from './player-icon';
export { default as RefreshCw } from './refresh-icon';
export { default as RotateCcw } from './refresh-icon';
export { default as Satellite } from './satellite-dish-icon';
export { default as Search } from './magnifier-icon';
export { default as Send } from './send-icon';
export { default as ShieldCheck } from './shield-check';
export { default as Sliders } from './sliders-horizontal-icon';
export { default as Sparkles } from './sparkles-icon';
export { default as Terminal } from './terminal-icon';
export { default as X } from './x-icon';

import type { ComponentType, CSSProperties } from 'react';

export type { AnimatedIconHandle, AnimatedIconProps } from './types';

/** The props both icon sets accept, and all a call site ever passes. */
export type IconProps = {
  className?: string;
  size?: number | string;
  strokeWidth?: number;
  color?: string;
  style?: CSSProperties;
};

/**
 * Stands in for lucide's `LucideIcon` in props and lookup tables. Typed by
 * props rather than one concrete component, because these icons take a ref of
 * `AnimatedIconHandle` while lucide's take `SVGSVGElement` — the two are not
 * interchangeable, but a slot holding either one only needs the props above.
 */
export type IconComponent = ComponentType<IconProps>;

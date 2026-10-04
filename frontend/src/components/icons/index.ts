/**
 * Hand-drawn animated icons, vendored from ItsHover (Apache-2.0 — credited in
 * the README's Acknowledgments). Re-exported under the names the app already
 * uses, so a call site only changes its import path:
 *
 *   import { MapPin } from 'lucide-react';   // before
 *   import { MapPin } from '@/components/icons';   // after
 *
 * Props match lucide's (`size`, `strokeWidth`, `color`, `className`), so the
 * JSX at every call site stays untouched. Each icon animates on hover of the
 * control, heading or row it belongs to — not only when the pointer finds the
 * glyph itself — and sits still otherwise. See `hover-host.tsx`.
 */
import { AnimatedIcon } from './hover-host';
import ArrowRightIcon from './arrow-narrow-right-icon';
import ChartLineIcon from './chart-line-icon';
import TriangleAlertIcon from './triangle-alert-icon';
import TrophyIcon from './trophy-icon';
import ChartHistogramIcon from './chart-histogram-icon';
import ChartBarIcon from './chart-bar-icon';
import FilledBellIcon from './filled-bell-icon';
import BrainCircuitIcon from './brain-circuit-icon';
import SimpleCheckedIcon from './simple-checked-icon';
import FilledCheckedIcon from './filled-checked-icon';
import CheckedIcon from './checked-icon';
import DownChevronIcon from './down-chevron';
import LeftChevronIcon from './left-chevron';
import RightChevronIcon from './right-chevron';
import UpChevronIcon from './up-chevron';
import ClockIcon from './clock-icon';
import Cloud2Icon from './cloud-2-icon';
import CodeXmlIcon from './code-xml-icon';
import CopyIcon from './copy-icon';
import CpuIcon from './cpu-icon';
import DropletIcon from './droplet-icon';
import ExternalLinkIcon from './external-link-icon';
import FlameIcon from './flame-icon';
import GaugeIcon from './gauge-icon';
import GlobeIcon from './globe-icon';
import ScanHeartIcon from './scan-heart-icon';
import BuildingIcon from './building-icon';
import InfoCircleIcon from './info-circle-icon';
import LayersIcon from './layers-icon';
import LayoutDashboardIcon from './layout-dashboard-icon';
import LayoutSidebarCollapseIcon from './layout-sidebar-collapse-icon';
import LockIcon from './lock-icon';
import MapPinIcon from './map-pin-icon';
import PlayerIcon from './player-icon';
import PointerIcon from './pointer-icon';
import RefreshIcon from './refresh-icon';
import SatelliteDishIcon from './satellite-dish-icon';
import MagnifierIcon from './magnifier-icon';
import SendIcon from './send-icon';
import ShieldCheckIcon from './shield-check';
import SlidersHorizontalIcon from './sliders-horizontal-icon';
import SparklesIcon from './sparkles-icon';
import SunIcon from './sun-icon';
import TerminalIcon from './terminal-icon';
import ThermometerIcon from './thermometer-icon';
import TruckIcon from './truck-icon';
import UsersIcon from './users-icon';
import WindIcon from './wind-icon';
import XIcon from './x-icon';
import ZoomInIcon from './zoom-in-icon';
import ZoomOutIcon from './zoom-out-icon';

export const ArrowRight = AnimatedIcon(ArrowRightIcon);
export const Activity = AnimatedIcon(ChartLineIcon);
export const AlertTriangle = AnimatedIcon(TriangleAlertIcon);
export const AlertOctagon = AnimatedIcon(TriangleAlertIcon);
export const Award = AnimatedIcon(TrophyIcon);
export const BarChart2 = AnimatedIcon(ChartHistogramIcon);
export const BarChart3 = AnimatedIcon(ChartBarIcon);
export const Bell = AnimatedIcon(FilledBellIcon);
export const BrainCircuit = AnimatedIcon(BrainCircuitIcon);
export const Check = AnimatedIcon(SimpleCheckedIcon);
export const CheckCircle = AnimatedIcon(FilledCheckedIcon);
export const CheckCircle2 = AnimatedIcon(CheckedIcon);
export const ChevronDown = AnimatedIcon(DownChevronIcon);
export const ChevronLeft = AnimatedIcon(LeftChevronIcon);
export const ChevronRight = AnimatedIcon(RightChevronIcon);
export const ChevronUp = AnimatedIcon(UpChevronIcon);
export const Clock = AnimatedIcon(ClockIcon);
export const CloudRain = AnimatedIcon(Cloud2Icon);
export const Code2 = AnimatedIcon(CodeXmlIcon);
export const Copy = AnimatedIcon(CopyIcon);
export const Cpu = AnimatedIcon(CpuIcon);
export const Droplet = AnimatedIcon(DropletIcon);
export const Droplets = AnimatedIcon(DropletIcon);
export const ExternalLink = AnimatedIcon(ExternalLinkIcon);
export const Flame = AnimatedIcon(FlameIcon);
export const Gauge = AnimatedIcon(GaugeIcon);
export const Globe2 = AnimatedIcon(GlobeIcon);
export const HeartPulse = AnimatedIcon(ScanHeartIcon);
export const Building = AnimatedIcon(BuildingIcon);
export const Info = AnimatedIcon(InfoCircleIcon);
export const Layers = AnimatedIcon(LayersIcon);
export const LayoutDashboard = AnimatedIcon(LayoutDashboardIcon);
export const LayoutSidebarCollapse = AnimatedIcon(LayoutSidebarCollapseIcon);
export const Sidebar = AnimatedIcon(LayoutSidebarCollapseIcon);
export const PanelLeftClose = AnimatedIcon(LayoutSidebarCollapseIcon);
export const Lock = AnimatedIcon(LockIcon);
export const MapPin = AnimatedIcon(MapPinIcon);
export const Play = AnimatedIcon(PlayerIcon);
export const Pointer = AnimatedIcon(PointerIcon);
export const RefreshCw = AnimatedIcon(RefreshIcon);
export const RotateCcw = AnimatedIcon(RefreshIcon);
export const Satellite = AnimatedIcon(SatelliteDishIcon);
export const Search = AnimatedIcon(MagnifierIcon);
export const Send = AnimatedIcon(SendIcon);
export const ShieldCheck = AnimatedIcon(ShieldCheckIcon);
export const Sliders = AnimatedIcon(SlidersHorizontalIcon);
export const Sparkles = AnimatedIcon(SparklesIcon);
export const Sun = AnimatedIcon(SunIcon);
export const Terminal = AnimatedIcon(TerminalIcon);
export const Thermometer = AnimatedIcon(ThermometerIcon);
export const Truck = AnimatedIcon(TruckIcon);
export const Users = AnimatedIcon(UsersIcon);
export const Wind = AnimatedIcon(WindIcon);
export const X = AnimatedIcon(XIcon);
export const ZoomIn = AnimatedIcon(ZoomInIcon);
export const ZoomOut = AnimatedIcon(ZoomOutIcon);

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
 * interchangeable, and the host preserves the handle's shape.
 */
export type IconComponent = ComponentType<IconProps>;
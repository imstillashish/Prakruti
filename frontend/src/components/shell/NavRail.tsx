'use client';
import { AlertTriangle, Sparkles, CloudRain, Gauge, Globe2, HeartPulse, LayoutDashboard, Terminal, BarChart3 } from '@/components/icons';
import type { IconComponent } from '@/components/icons';
import type { NavPage } from '@/types';

export const NAV_ITEMS: { page: NavPage; label: string; subtitle: string; icon: IconComponent }[] = [
  { page: 'overview', label: 'Overview', subtitle: "Today's plain-English weather and practical daily advice", icon: LayoutDashboard },
  { page: 'forecast', label: 'Forecast', subtitle: 'Hour-by-hour rain, temperature, and wind for the next 3 days', icon: CloudRain },
  // The rail is one visual group, so it stays entirely on the animated set:
  // ItsHover has no shield-alert, siren or database glyph, so these three use
  // the closest catalogue analogue (atlas, hazard, health) rather than mixing
  // a second icon language into the list.
  { page: 'rpi', label: 'RPI & Trust Atlas', subtitle: 'City risk map and which weather model to trust in your region', icon: Globe2 },
  { page: 'model-intelligence', label: 'Model Intelligence', subtitle: 'Which supercomputer predicts your city best and by how much', icon: Sparkles },
  { page: 'extreme-weather', label: 'Extreme Weather', subtitle: 'Early alerts for cloudbursts, severe heat, and storms', icon: AlertTriangle },
  { page: 'model-performance', label: 'Performance', subtitle: 'How much error the AI blend removes compared to any single model', icon: Gauge },
  { page: 'leaderboard', label: 'Leaderboard', subtitle: 'Who forecasts best, and on what evidence', icon: BarChart3 },
  { page: 'data-health', label: 'Data Health', subtitle: 'Whether the data feeding the forecasts is fresh and complete', icon: HeartPulse },
  { page: 'api', label: 'API Explorer', subtitle: 'Live interactive test bench and OpenAPI documentation', icon: Terminal },
];

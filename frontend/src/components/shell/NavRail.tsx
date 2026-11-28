'use client';
import { AlertTriangle, Sparkles, CloudRain, Cpu, Gauge, Globe2, HeartPulse, LayoutDashboard, Terminal, BarChart3 } from '@/components/icons';
import type { IconComponent } from '@/components/icons';
import type { NavPage } from '@/types';

export type NavGroup = 'weather' | 'trust' | 'build';

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  weather: 'The weather',
  trust: 'Can you trust it',
  build: 'Build on it',
};

/**
 * Labels are the shortest true name for the question each page answers. The
 * subtitle is that question, in one line — it is what the collapsed rail shows
 * in a tooltip, so it has to stand alone without the label.
 */
export const NAV_ITEMS: {
  page: NavPage;
  label: string;
  mobileLabel: string;
  subtitle: string;
  group: NavGroup;
  icon: IconComponent;
}[] = [
  { page: 'overview', label: 'Today', mobileLabel: 'Today', subtitle: 'What the weather does today, and what to do about it', group: 'weather', icon: LayoutDashboard },
  { page: 'forecast', label: 'Forecast', mobileLabel: 'Forecast', subtitle: 'Hour by hour for the next three days', group: 'weather', icon: CloudRain },
  { page: 'extreme-weather', label: 'Alerts', mobileLabel: 'Alerts', subtitle: 'Where the weather is dangerous, and when', group: 'weather', icon: AlertTriangle },
  { page: 'rpi', label: 'Risk map', mobileLabel: 'Risk', subtitle: 'Which districts need attention first', group: 'weather', icon: Globe2 },
  { page: 'model-intelligence', label: 'Which model', mobileLabel: 'Models', subtitle: 'Which forecast source gets your city right', group: 'trust', icon: Sparkles },
  { page: 'model-performance', label: 'Accuracy', mobileLabel: 'Skill', subtitle: 'How close each model gets to what happened', group: 'trust', icon: Gauge },
  { page: 'leaderboard', label: 'Rankings', mobileLabel: 'Board', subtitle: 'Every model, scored against what actually happened', group: 'trust', icon: BarChart3 },
  { page: 'data-health', label: 'Data health', mobileLabel: 'Health', subtitle: 'Whether the forecast is running on fresh data', group: 'build', icon: HeartPulse },
  { page: 'byom', label: 'Your model', mobileLabel: 'BYOM', subtitle: 'Add a model and see what weight it earns', group: 'build', icon: Cpu },
  { page: 'api', label: 'API', mobileLabel: 'API', subtitle: 'Call the same endpoint this site calls', group: 'build', icon: Terminal },
];

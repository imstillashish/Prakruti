'use client';
import { LayoutDashboard, CloudRain, ShieldAlert, BrainCircuit, Siren, Gauge, Database, Terminal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { NavPage } from '@/types';

export const NAV_ITEMS: { page: NavPage; label: string; subtitle: string; icon: LucideIcon }[] = [
  { page: 'overview', label: 'Overview', subtitle: "Today's blended answer for your city, at a glance", icon: LayoutDashboard },
  { page: 'forecast', label: 'Forecast', subtitle: 'Hour-by-hour rain, temperature and wind for the next 72 hours', icon: CloudRain },
  { page: 'rpi', label: 'RPI & Trust Atlas', subtitle: 'Where weather risk is highest, and which model to trust there', icon: ShieldAlert },
  { page: 'model-intelligence', label: 'Model Intelligence', subtitle: 'Which forecast model is most accurate for your city, and by how much', icon: BrainCircuit },
  { page: 'extreme-weather', label: 'Extreme Weather', subtitle: 'Early warnings for heatwaves, cloudbursts and windstorms', icon: Siren },
  { page: 'model-performance', label: 'Performance', subtitle: 'How much error the AI blend removes compared to any single model', icon: Gauge },
  { page: 'data-health', label: 'Data Health', subtitle: 'Whether the data feeding the forecasts is fresh and complete', icon: Database },
  { page: 'api', label: 'API Explorer', subtitle: 'Live interactive test bench and OpenAPI documentation', icon: Terminal },
];

export type LeaderboardCategory = 'overall' | 'temperature' | 'rainfall' | 'wind';
export type LeaderboardView = 'ranking' | 'pareto';
export type LeaderboardMeasure = 'accuracy' | 'extreme' | 'lead';

export interface LeaderboardState {
  category: LeaderboardCategory;
  view: LeaderboardView;
  measure: LeaderboardMeasure;
  geo: string;
  window: number | 'full';
  lead: number | null;
  threshold: number | null;
}

export const CATEGORY_VARIABLE: Record<'temperature' | 'rainfall' | 'wind', string> = {
  temperature: 'temperature',
  rainfall: 'rainfall',
  wind: 'wind_speed',
};

export const MEASURE_BOARD: Record<LeaderboardMeasure, 'accuracy' | 'extreme' | 'lead'> = {
  accuracy: 'accuracy',
  extreme: 'extreme',
  lead: 'lead',
};

export const VARIABLE_UNIT: Record<string, string> = {
  temperature: '°C',
  rainfall: 'mm/h',
  wind_speed: 'km/h',
};

export const VARIABLE_LABEL: Record<string, string> = {
  temperature: 'Temperature',
  rainfall: 'Rainfall',
  wind_speed: 'Wind Speed',
};

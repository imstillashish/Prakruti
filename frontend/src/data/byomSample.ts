/**
 * The BYOM sample payload, in one place.
 *
 * Shared by the BYOM tab and the API Explorer entry so the two can never drift.
 * The rows are real observed hours for Kanpur from data/actual_history.csv with
 * a plausible foreign-model error signature added — a model that reproduced the
 * observations exactly would score 0.00 RMSE and flatter itself.
 *
 * Twenty-four rows is not arbitrary: the engine will not score a variable below
 * 24 rows matched to observed actuals (api/byom.py, MIN_ROWS_PER_VARIABLE), so a
 * shorter sample is accepted and stored but comes back with `scores: null`.
 */
export interface ByomSampleRow {
  city: string;
  datetime: string;
  temperature: number;
  rainfall: number;
  wind_speed: number;
}

export const BYOM_SAMPLE_ROWS: ByomSampleRow[] = [
  { city: 'Kanpur', datetime: '2026-07-30T00:00', temperature: 29.4, rainfall: 0.0, wind_speed: 12.1 },
  { city: 'Kanpur', datetime: '2026-07-30T01:00', temperature: 28.4, rainfall: 0.2, wind_speed: 10.4 },
  { city: 'Kanpur', datetime: '2026-07-30T02:00', temperature: 29.6, rainfall: 0.0, wind_speed: 10.9 },
  { city: 'Kanpur', datetime: '2026-07-30T03:00', temperature: 28.2, rainfall: 0.0, wind_speed: 9.6 },
  { city: 'Kanpur', datetime: '2026-07-30T04:00', temperature: 28.7, rainfall: 0.0, wind_speed: 10.0 },
  { city: 'Kanpur', datetime: '2026-07-30T05:00', temperature: 27.8, rainfall: 0.2, wind_speed: 9.3 },
  { city: 'Kanpur', datetime: '2026-07-30T06:00', temperature: 29.7, rainfall: 0.0, wind_speed: 10.4 },
  { city: 'Kanpur', datetime: '2026-07-30T07:00', temperature: 29.3, rainfall: 0.0, wind_speed: 13.0 },
  { city: 'Kanpur', datetime: '2026-07-30T08:00', temperature: 30.6, rainfall: 0.2, wind_speed: 15.5 },
  { city: 'Kanpur', datetime: '2026-07-30T09:00', temperature: 30.5, rainfall: 0.3, wind_speed: 13.4 },
  { city: 'Kanpur', datetime: '2026-07-30T10:00', temperature: 33.0, rainfall: 0.0, wind_speed: 14.7 },
  { city: 'Kanpur', datetime: '2026-07-30T11:00', temperature: 32.1, rainfall: 0.0, wind_speed: 16.2 },
  { city: 'Kanpur', datetime: '2026-07-30T12:00', temperature: 33.4, rainfall: 0.1, wind_speed: 16.1 },
  { city: 'Kanpur', datetime: '2026-07-30T13:00', temperature: 32.4, rainfall: 0.3, wind_speed: 16.3 },
  { city: 'Kanpur', datetime: '2026-07-30T14:00', temperature: 34.0, rainfall: 0.2, wind_speed: 18.2 },
  { city: 'Kanpur', datetime: '2026-07-30T15:00', temperature: 32.9, rainfall: 0.0, wind_speed: 18.8 },
  { city: 'Kanpur', datetime: '2026-07-30T16:00', temperature: 33.3, rainfall: 0.0, wind_speed: 18.7 },
  { city: 'Kanpur', datetime: '2026-07-30T17:00', temperature: 31.6, rainfall: 0.2, wind_speed: 16.9 },
  { city: 'Kanpur', datetime: '2026-07-30T18:00', temperature: 32.0, rainfall: 0.0, wind_speed: 14.1 },
  { city: 'Kanpur', datetime: '2026-07-30T19:00', temperature: 29.8, rainfall: 0.0, wind_speed: 15.2 },
  { city: 'Kanpur', datetime: '2026-07-30T20:00', temperature: 30.1, rainfall: 0.0, wind_speed: 15.6 },
  { city: 'Kanpur', datetime: '2026-07-30T21:00', temperature: 29.1, rainfall: 0.2, wind_speed: 15.4 },
  { city: 'Kanpur', datetime: '2026-07-30T22:00', temperature: 30.2, rainfall: 0.0, wind_speed: 14.9 },
  { city: 'Kanpur', datetime: '2026-07-30T23:00', temperature: 28.7, rainfall: 0.0, wind_speed: 18.4 },
];

export const BYOM_SAMPLE_MODEL_ID = 'my_model_v1';

export function byomSampleBody() {
  return { rows: BYOM_SAMPLE_ROWS };
}

export function byomSampleJson(): string {
  return JSON.stringify(byomSampleBody(), null, 1);
}

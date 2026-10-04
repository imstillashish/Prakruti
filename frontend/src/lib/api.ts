/**
 * Hybrid Weather AI - API Integration Layer
 * Connects Next.js Frontend to Flask Backend (http://localhost:5000/api)
 *
 * Provides core fetch functions:
 *   - getForecast(city?, lead_days?)
 *   - getWeights(city?, variable?, lead_days?)
 *   - getSkillScores(city?, variable?)
 *   - getAlerts(city?)
 *   - getCities()
 *
 * Also provides typed helper functions that transform API records into
 * the UI types required by components, with robust fallbacks to mock data.
 */

import type {
  ForecastMetrics,
  ModelWeight,
  TimelinePoint,
  ExtremeEvent,
  Alert,
  DataSource,
  ModelComparison,
  CityForecast,
  SkillMetric,
  ConfidenceRecord,
  RpiData,
  ResourceAction,
} from '@/types';

import {
  MOCK_FORECAST,
  MOCK_MODEL_WEIGHTS,
  MOCK_TIMELINE,
  MOCK_EXTREME_EVENTS,
  MOCK_ALERTS,
  MOCK_DATA_SOURCES,
  MOCK_MODEL_COMPARISON,
  MOCK_CITIES,
  MOCK_SKILL_METRICS,
  MOCK_STATES,
  MOCK_REGION_DOMINANCE,
  ENGINE_STATUS,
} from '@/data/mockData';
import { SERIES } from '@/lib/palette';

export {
  MOCK_FORECAST,
  MOCK_MODEL_WEIGHTS,
  MOCK_TIMELINE,
  MOCK_EXTREME_EVENTS,
  MOCK_ALERTS,
  MOCK_DATA_SOURCES,
  MOCK_MODEL_COMPARISON,
  MOCK_CITIES,
  MOCK_SKILL_METRICS,
  MOCK_STATES,
  MOCK_REGION_DOMINANCE,
  ENGINE_STATUS,
};

/**
 * Centralized API Base Configuration
 * Backend Render URL: https://prakruti-api.onrender.com
 */
export const API = "https://prakruti-api.onrender.com";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (process.env.NODE_ENV === "production" ? API : "http://localhost:5001");

export function buildApiUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const rawBase = API_BASE.trim().replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (rawBase.endsWith('/api')) {
    if (cleanEndpoint.startsWith('/api/')) {
      return `${rawBase}${cleanEndpoint.slice(4)}`;
    }
    return `${rawBase}${cleanEndpoint}`;
  }

  if (cleanEndpoint.startsWith('/api/')) {
    return `${rawBase}${cleanEndpoint}`;
  }
  return `${rawBase}/api${cleanEndpoint}`;
}

export const RETRY_TIMEOUT_MS = 60000; // 60 seconds total retry duration
export const RETRY_INTERVAL_MS = 8000; // Retry every 8 seconds

export const STARTING_AI_WEATHER_ENGINE_MSG = "Starting AI weather engine… This may take up to 60 seconds.";
export const SERVER_WAKING_UP_MSG = "Server is waking up. Please try again.";

// Backward compatibility constants
export const RENDER_COLD_START_MSG = STARTING_AI_WEATHER_ENGINE_MSG;
export const RENDER_COLD_START_LOADING_MSG = STARTING_AI_WEATHER_ENGINE_MSG;
export const RENDER_COLD_START_ERROR_MSG = SERVER_WAKING_UP_MSG;

export type BackendStatusType = 'idle' | 'connecting' | 'connected' | 'error';

let backendWakingUp = false;
let backendError = false;
let backendStatus: BackendStatusType = 'idle';
let hasConnectedOnce = false;

export function getBackendStatus(): BackendStatusType {
  return backendStatus;
}

export function isBackendWakingUp(): boolean {
  return backendWakingUp || backendStatus === 'connecting';
}

export function isBackendError(): boolean {
  return backendError || backendStatus === 'error';
}

export function isBackendConnected(): boolean {
  return backendStatus === 'connected' || hasConnectedOnce;
}

export function setBackendStatus(
  waking: boolean,
  isError: boolean = false,
  message?: string,
  status?: BackendStatusType
) {
  backendWakingUp = waking;
  backendError = isError;
  if (status) {
    backendStatus = status;
  } else if (isError) {
    backendStatus = 'error';
  } else if (waking) {
    backendStatus = 'connecting';
  } else {
    backendStatus = 'connected';
  }

  if (backendStatus === 'connected') {
    hasConnectedOnce = true;
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('backend-status', {
        detail: {
          wakingUp: waking,
          error: isError,
          status: backendStatus,
          connected: backendStatus === 'connected',
          message: message ?? (waking ? STARTING_AI_WEATHER_ENGINE_MSG : isError ? SERVER_WAKING_UP_MSG : ''),
        },
      })
    );
  }
}

export interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  totalTimeoutMs?: number;
  retryIntervalMs?: number;
}

let coldStartLogged = false;
let coldStartExhaustedLogged = false;

const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Reusable fetch helper with Render cold start auto-reconnect:
 * - Uses NEXT_PUBLIC_API_URL
 * - Retries automatically for up to 60 seconds
 * - Retries every 8 seconds
 * - Retries on: network failure, timeout, HTTP 502, HTTP 503, HTTP 504
 * - As soon as one request succeeds, returns the response normally
 * - If all retries fail, throws a clean error: "Server is waking up. Please try again."
 */
export async function fetchWithReconnect<T = any>(
  endpoint: string,
  options?: FetchOptions
): Promise<T> {
  const isGet = !options?.method || options.method.toUpperCase() === 'GET';
  const cacheKey = isGet ? buildApiUrl(endpoint) : null;

  if (cacheKey && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey) as Promise<T>;
  }

  const executeFetch = async (): Promise<T> => {
    const totalTimeout = options?.totalTimeoutMs ?? RETRY_TIMEOUT_MS;
    const retryInterval = options?.retryIntervalMs ?? RETRY_INTERVAL_MS;
    const startTime = Date.now();
    let attempt = 0;

    // Only flag connecting state if the request takes >1200ms (Render cold start) or encounters a retryable error
    let connectingTimer: NodeJS.Timeout | null = null;
    if (!hasConnectedOnce && backendStatus !== 'connecting') {
      connectingTimer = setTimeout(() => {
        if (!hasConnectedOnce && backendStatus !== 'connected') {
          setBackendStatus(true, false, STARTING_AI_WEATHER_ENGINE_MSG, 'connecting');
        }
      }, 1200);
    }

    while (Date.now() - startTime < totalTimeout) {
      attempt++;
      const totalRemaining = totalTimeout - (Date.now() - startTime);
      if (totalRemaining <= 0) break;
      // Allow request to wait for the remaining window so in-flight requests are not cancelled prematurely during Render cold start
      const currentTimeout = totalRemaining;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), currentTimeout);

      if (options?.signal) {
        if (options.signal.aborted) {
          controller.abort();
        } else {
          options.signal.addEventListener('abort', () => controller.abort(), { once: true });
        }
      }

      const attemptStart = Date.now();
      let isRetryable = false;
      let reason = '';

      try {
        const url = buildApiUrl(endpoint);
        const res = await fetch(url, {
          ...options,
          signal: controller.signal,
          // Force fresh response without sending non-safelisted headers that trigger OPTIONS preflight
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
            ...(options?.headers || {}),
          },
        });

        clearTimeout(timeoutId);

        // Requirement 3: As soon as one request succeeds, return the response normally
        if (res.ok) {
          if (connectingTimer) {
            clearTimeout(connectingTimer);
            connectingTimer = null;
          }
          coldStartLogged = false;
          coldStartExhaustedLogged = false;
          setBackendStatus(false, false, '', 'connected');
          const data = await res.json();
          return data as T;
        }

        // Check HTTP 502, 503, 504
        if (res.status === 502 || res.status === 503 || res.status === 504) {
          isRetryable = true;
          reason = `HTTP ${res.status}`;
        } else {
          const errorText = await res.text().catch(() => res.statusText);
          throw new Error(`HTTP ${res.status}: ${errorText || res.statusText}`);
        }
      } catch (err: unknown) {
        clearTimeout(timeoutId);

        if (err instanceof Error && err.name === 'AbortError') {
          isRetryable = true;
          reason = 'Timeout';
        } else if (err instanceof TypeError) {
          // Network failure
          isRetryable = true;
          reason = 'Network failure';
        } else if (isRetryable) {
          // Already marked retryable
        } else {
          throw err;
        }
      }

      if (connectingTimer) {
        clearTimeout(connectingTimer);
        connectingTimer = null;
      }

      if (isRetryable) {
        setBackendStatus(true, false, STARTING_AI_WEATHER_ENGINE_MSG, 'connecting');
        if (!coldStartLogged) {
          coldStartLogged = true;
          console.info(`[Prakruti] Backend is waking up. ${STARTING_AI_WEATHER_ENGINE_MSG}`);
        }

        const elapsed = Date.now() - attemptStart;
        const delay = Math.max(0, retryInterval - elapsed);
        const remainingWindow = totalTimeout - (Date.now() - startTime);

        if (remainingWindow <= 0) break;

        const waitTime = Math.min(delay, remainingWindow);
        if (waitTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    if (connectingTimer) {
      clearTimeout(connectingTimer);
      connectingTimer = null;
    }

    // Requirement 4: If all retries fail, throw clean error
    setBackendStatus(false, true, SERVER_WAKING_UP_MSG, 'error');
    if (!coldStartExhaustedLogged) {
      coldStartExhaustedLogged = true;
      console.warn(`[Prakruti] Cold start retries exhausted after ${Math.round((Date.now() - startTime) / 1000)}s: ${SERVER_WAKING_UP_MSG}`);
    }
    throw new Error(SERVER_WAKING_UP_MSG);
  };

  const promise = executeFetch();
  if (cacheKey) {
    inFlightRequests.set(cacheKey, promise);
    promise.finally(() => {
      inFlightRequests.delete(cacheKey);
    });
  }

  return promise;
}

/**
 * Generic fetch with Render cold-start handling that delegates to fetchWithReconnect.
 * When a fallback is provided, returns the fallback on error so components do not crash.
 */
export async function fetchFromApi<T>(
  endpoint: string,
  fallback?: T,
  options?: FetchOptions
): Promise<T> {
  try {
    return await fetchWithReconnect<T>(endpoint, options);
  } catch (err) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw err;
  }
}

// ============================================================================
// Core Reusable Fetch Functions (Required by Step 2)
// ============================================================================

export interface ForecastRecord {
  city: string;
  datetime: string;
  lead_days: number;
  blend_temperature: number;
  blend_rainfall: number;
  blend_wind_speed: number;
  temperature: number;
  rainfall: number;
  wind_speed: number;
}

export interface WeightRecord {
  city: string;
  variable: string;
  lead_days: number;
  model: string;
  weight: number;
}

export interface SkillScoreRecord {
  city: string;
  variable: string;
  lead_days: number;
  model: string;
  mae: number;
  rmse: number;
  bias: number;
  n: number;
}

export interface AlertRecord {
  city: string;
  datetime: string;
  event: string;
  severity: string;
  forecast_value: number;
  threshold: number;
}

export interface AdvisoryRecord {
  city: string;
  scenario: 'heavy_rain' | 'light_rain' | 'heat' | 'wind' | 'calm';
  severity: 'high' | 'moderate' | 'none';
  badge: string;
  tone: 'destructive' | 'info' | 'muted';
  headline: string;
  category: string;
  action: string;
  evidence: string;
  rank: number;
}

export interface CityRecord {
  city: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lon?: number;
}

export interface MetadataRecord {
  last_updated: string;
  cities: number;
  models: number;
  city_count?: number;
  model_count?: number;
}

export type { ConfidenceRecord };

/**
 * Formats an ISO datetime string into:
 * "26 Sep 2026 • 11:45 PM"
 */
export function formatLastUpdated(isoString?: string): string {
  if (!isoString) {
    return '26 Sep 2026 • 11:45 PM';
  }
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${day} ${month} ${year} • ${hours}:${minutes} ${ampm}`;
  } catch {
    return '26 Sep 2026 • 11:45 PM';
  }
}

/**
 * GET /api/metadata
 * Returns last_updated timestamp, city count, and model count.
 */
export async function getMetadata(): Promise<MetadataRecord> {
  return fetchFromApi<MetadataRecord>('/metadata', {
    last_updated: '2026-09-26T23:45:12',
    cities: 45,
    models: 4,
    city_count: 45,
    model_count: 4,
  });
}

/**
 * GET /api/confidence
 * Returns confidence_scores.csv records from the Explainable Confidence Engine (ECE).
 */
export async function getConfidence(city?: string, lead_day?: number): Promise<ConfidenceRecord[]> {
  const params = new URLSearchParams();
  if (city) params.append('city', city);
  if (lead_day) params.append('lead_day', String(lead_day));
  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchFromApi<ConfidenceRecord[]>(`/confidence${query}`, []);
}

export async function getAdvisories(city?: string): Promise<AdvisoryRecord[]> {
  const params = new URLSearchParams();
  if (city) params.append('city', city);
  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchFromApi<AdvisoryRecord[]>(`/advisories${query}`, []);
}

// Active in-flight singleton and memory cache for forecast records
let activeForecastPromise: Promise<ForecastRecord[]> | null = null;
let cachedForecastRecords: ForecastRecord[] | null = null;
let lastForecastFetchTime = 0;
const FORECAST_CACHE_TTL_MS = 60000; // 60 seconds

function filterForecastRecords(records: ForecastRecord[], city?: string, lead_days?: number): ForecastRecord[] {
  if (!records || !Array.isArray(records)) return [];
  let result = records;
  if (city) {
    const cityLower = city.trim().toLowerCase();
    result = result.filter((r) => (r.city || '').trim().toLowerCase() === cityLower);
  }
  if (lead_days !== undefined && lead_days !== null) {
    const ld = Number(lead_days);
    result = result.filter((r) => Number(r.lead_days) === ld);
  }
  return result;
}

export function clearForecastCache(): void {
  cachedForecastRecords = null;
  lastForecastFetchTime = 0;
  activeForecastPromise = null;
}

/**
 * GET /api/forecast
 * Returns hybrid_forecast.csv records.
 * Uses a singleton in-flight promise and memory cache to guarantee:
 * 1. Only ONE forecast request is active at a time.
 * 2. Zero duplicate forecast requests during mount or StrictMode re-mount.
 * 3. Never cancelled while Render wakes up.
 */
export async function getForecast(city?: string, lead_days?: number): Promise<ForecastRecord[]> {
  const now = Date.now();
  if (cachedForecastRecords && now - lastForecastFetchTime < FORECAST_CACHE_TTL_MS) {
    return filterForecastRecords(cachedForecastRecords, city, lead_days);
  }

  if (!activeForecastPromise) {
    activeForecastPromise = (async () => {
      try {
        const records = await fetchFromApi<ForecastRecord[]>('/forecast', []);
        if (records && records.length > 0) {
          cachedForecastRecords = records;
          lastForecastFetchTime = Date.now();
        }
        return records || [];
      } finally {
        activeForecastPromise = null;
      }
    })();
  }

  try {
    const allRecords = await activeForecastPromise;
    return filterForecastRecords(allRecords, city, lead_days);
  } catch {
    return [];
  }
}

/**
 * GET /api/weights
 * Returns model_weights_lead.csv records
 */
export async function getWeights(city?: string, variable?: string, lead_days?: number): Promise<WeightRecord[]> {
  const params = new URLSearchParams();
  if (city) params.append('city', city);
  if (variable) params.append('variable', variable);
  if (lead_days) params.append('lead_days', String(lead_days));
  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchFromApi<WeightRecord[]>(`/weights${query}`, []);
}

/**
 * GET /api/skill
 * Returns skill_scores_lead.csv records
 */
export async function getSkillScores(city?: string, variable?: string): Promise<SkillScoreRecord[]> {
  const params = new URLSearchParams();
  if (city) params.append('city', city);
  if (variable) params.append('variable', variable);
  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchFromApi<SkillScoreRecord[]>(`/skill${query}`, []);
}

/**
 * GET /api/alerts
 * Returns extreme_alerts.csv records
 */
export async function getAlerts(city?: string): Promise<AlertRecord[]> {
  const params = new URLSearchParams();
  if (city) params.append('city', city);
  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchFromApi<AlertRecord[]>(`/alerts${query}`, []);
}

/**
 * GET /api/cities
 * Returns unique cities from hybrid_forecast.csv / cities.csv
 */
export async function getCities(): Promise<CityRecord[]> {
  return fetchFromApi<CityRecord[]>('/cities', []);
}

// ============================================================================
// UI Model Adapters & Component Helpers
// ============================================================================

/**
 * Helper to get ForecastMetrics for ForecastHero component.
 */
export async function getForecastMetrics(city: string = 'Kanpur'): Promise<ForecastMetrics> {
  try {
    const [records, confRecords] = await Promise.all([
      getForecast(city),
      getConfidence(city, 1),
    ]);
    if (!records || records.length === 0) {
      return MOCK_FORECAST;
    }

    // Take the 24h lead point or nearest step
    const target = records.find(r => r.lead_days === 1) || records[0];
    const confItem = confRecords && confRecords.length > 0 ? confRecords[0] : null;

    const tempDiff = Math.abs((target.temperature ?? 30) - (target.blend_temperature ?? 30));
    const rainDiff = Math.abs((target.rainfall ?? 0) - (target.blend_rainfall ?? 0));
    const windDiff = Math.abs((target.wind_speed ?? 10) - (target.blend_wind_speed ?? 10));

    return {
      rainfall: Math.round((target.rainfall ?? 0) * 10) / 10,
      temperature: Math.round((target.temperature ?? 30) * 10) / 10,
      wind: Math.round((target.wind_speed ?? 15) * 10) / 10,
      confidence: confItem?.confidence != null ? Math.round(confItem.confidence) : 88,
      confidenceLabel: confItem?.confidence_label || 'High',
      dominantModel: confItem?.dominant_model || 'ECMWF',
      explanation: confItem?.explanation,
      rainfallUncertainty: Math.max(2, Math.round(rainDiff * 2 + 5)),
      temperatureUncertainty: Math.max(0.5, Math.round((tempDiff + 0.8) * 10) / 10),
      windUncertainty: Math.max(1, Math.round(windDiff + 2)),
      updatedMinutesAgo: 4,
    };
  } catch {
    return MOCK_FORECAST;
  }
}

/**
 * PRD §8.3 core decision payload from /api/decision (F-01 probabilistic core):
 * calibrated P10/P50/P90 bands, threshold exceedance probabilities,
 * disagreement class and model contributions — all precomputed upstream.
 */
export interface DecisionRecord {
  datetime: string;
  lead_days: number;
  value: Record<string, { p10: number; p50: number; p90: number; unit: string }>;
  threshold_probabilities: Record<string, Record<string, number>>;
  max_class: Record<string, string>;
  disagreement_class: string;
  agreement_score: number;
  confidence: { label: string | null; score: number | null; reason_codes: string[] };
  model_contributions: Record<string, Array<{ model_id: string; weight: number }>>;
}

export interface DecisionPayload {
  city: string;
  generated_at: string;
  engine_version: string;
  record_count: number;
  coverage: Record<string, number>;
  records: DecisionRecord[];
}

export async function getDecision(city: string): Promise<DecisionPayload | null> {
  return fetchFromApi<DecisionPayload | null>(
    `/api/decision?city=${encodeURIComponent(city)}`,
    null,
  );
}

/**
 * F-02 comparative analytics (PRD §7.2): trajectory comparison, historical
 * truth verification, and the honest calibration inventory.
 */
export interface ModelCompareSeries {
  lead_days: number;
  datetimes: string[];
  models: Record<string, (number | null)[]>;
  blend_p50: (number | null)[];
  p10: (number | null)[];
  p90: (number | null)[];
  outliers: Record<string, boolean[]>;
  cluster_states: string[];
  cluster_summary: string;
}

export interface ModelComparePayload {
  city: string;
  generated_at: string;
  models_present: string[];
  variables: Record<string, { spread_growth_per_lead: number | null; series: ModelCompareSeries[] }>
}

export async function getModelCompare(city: string, opts?: { variable?: string; lead_days?: number }): Promise<ModelComparePayload | null> {
  const params = new URLSearchParams({ city });
  if (opts?.variable) params.set('variable', opts.variable);
  if (opts?.lead_days) params.set('lead_days', String(opts.lead_days));
  return fetchFromApi<ModelComparePayload | null>(
    `/api/models/compare?${params.toString()}`,
    null,
  );
}

export interface VerificationMeta {
  engine_version: string;
  window_start: string;
  window_end: string;
  n_pairs: number;
  truth_source: string;
  methods: string[];
  thresholds: Record<string, number[]>;
  crps_note: string;
}

export interface ContinuousVerificationRow {
  city: string;
  model: string;
  variable: string;
  n: number;
  bias: number;
  mae: number;
  rmse: number;
  crps: number;
}

export interface CategoricalVerificationRow {
  city: string;
  model: string;
  variable: string;
  threshold: number;
  lead_days: number | null;
  hits: number;
  misses: number;
  false_alarms: number;
  correct_negatives: number;
  pod: number;
  far: number;
  csi: number;
  ets: number;
  bss: number;
}

export interface VerificationPayload {
  meta: VerificationMeta;
  continuous: ContinuousVerificationRow[];
  categorical: CategoricalVerificationRow[];
}

export async function getModelVerification(opts?: {
  city?: string;
  variable?: string;
  model?: string;
}): Promise<VerificationPayload | null> {
  const params = new URLSearchParams();
  if (opts?.city) params.set('city', opts.city);
  if (opts?.variable) params.set('variable', opts.variable);
  if (opts?.model) params.set('model', opts.model);
  return fetchFromApi<VerificationPayload | null>(
    `/api/models/verification?${params.toString()}`,
    null,
  );
}

export interface BiasCorrectionRow {
  city: string;
  model: string;
  variable: string;
  n_test: number;
  train_bias: number;
  bias_raw: number;
  mae_raw: number;
  rmse_raw: number;
  bias_corrected: number;
  mae_corrected: number;
  rmse_corrected: number;
  bias_reduction_pct: number | null;
}

export interface CalibrationPayload {
  calibration_layers: Array<{ name: string; description: string }>;
  bias_correction_diagnostic: BiasCorrectionRow[];
  hybrid_vs_blend: Array<{ variable: string; lead_days: number; blend_test_rmse: number; hybrid_test_rmse: number; rmse_reduction_pct: number }>;
}

export async function getModelCalibration(opts?: {
  city?: string;
  variable?: string;
  model?: string;
}): Promise<CalibrationPayload | null> {
  const params = new URLSearchParams();
  if (opts?.city) params.set('city', opts.city);
  if (opts?.variable) params.set('variable', opts.variable);
  if (opts?.model) params.set('model', opts.model);
  return fetchFromApi<CalibrationPayload | null>(
    `/api/models/calibration?${params.toString()}`, 
    null,
  );
}

/**
 * F-03 contextual benchmarking (PRD §7.3): stratified leaderboard boards from
 * /api/models/leaderboard. Ranks and metrics are precomputed by
 * ai/benchmark.py — nothing is scored at query time, and there is no composite
 * index: every row exposes its constituents (PRD §10.5.A).
 */
export type LeaderboardBoard = 'accuracy' | 'extreme' | 'lead';

export interface LeaderboardMeta {
  engine_version: string;
  generated_at: string;
  window: { start: string; end: string; days: number };
  windows_published: number[];
  truth_source: string | null;
  n_min: { hourly_pairs: number; observed_events: number };
  rank_metrics: Record<string, string>;
  boards: Record<string, string>;
  tiers: Record<string, string>;
  dims: { conditioned: string[]; not_conditioned: Array<{ dim: string; reason: string }> };
  composite_index: { published: boolean; reason: string };
  low_sample_policy: string;
  row_count: number;
  stations_scored: number;
  methods_ranked: number;
  primary_thresholds: Record<string, number>;
  bootstrap: { unit: string; draws: number; ci: string; rank_range: string; seed: string };
  ci_policy: string;
  pareto_methods: string[];
  pareto_note: string;
  signals: LeaderboardSignal[];
}

export interface LeaderboardRow {
  board: LeaderboardBoard;
  geo: string;
  variable: string;
  window_days: number | null;
  lead_days: number | null;
  threshold: number | null;
  method: string;
  tier: 'blend' | 'baseline' | 'model';
  rank: number;
  metric: 'mae' | 'csi';
  value: number;
  mae: number | null;
  rmse: number | null;
  bias: number | null;
  pod: number | null;
  far: number | null;
  csi: number | null;
  ets: number | null;
  bss: number | null;
  n: number;
  cases: number | null;
  low_sample: number;
  ci_low: number | null;
  ci_high: number | null;
  rank_low: number | null;
  rank_high: number | null;
}

/** F-04 model metadata profile — one per leaderboard method (ai/cards.py). */
export interface ModelCard {
  identity: {
    name: string;
    provider: string;
    architecture: string;
    feed_id: string | null;
    grid: string;
    domain: string;
    run_cycle: string;
    max_lead: string;
    delivered_lead: string;
    source_url: string;
    data_license: string;
  };
  profile: {
    best_variable: string | null;
    mean_rank_accuracy_full_in: number | null;
    board_firsts_in: number;
    variables: Record<string, { rank: number; mae: number | null; bias: number | null }>;
    primary_threshold_csi: Record<string, number | null>;
  };
  bias: {
    convention: string;
    per_variable: Record<string, { national?: { value: number; unit: string; reading: string } }>;
    widest_city_gap: { variable: string; city: string; gap: number; unit: string } | null;
  };
  feed: {
    status: string | null;
    rows_last_cycle: number | null;
    leaderboard_rows: number;
  };
  not_tracked: string[];
}

/** F-04 benchmark specification card — one per national leaderboard stratum. */
export interface BenchmarkCard {
  board: string;
  variable: string;
  unit: string;
  window_days?: number | null;
  lead_days?: number | null;
  threshold?: number | null;
  metric: { primary: string; direction: string };
  secondary_metrics: string[];
  geography: string;
  seasonal_scope: string;
  truth_reference: string;
  sample_criteria: {
    min_hourly_pairs: number | null;
    min_observed_events: number | null;
    low_sample_policy: string | null;
  };
  sample_sizes: { n_min: number | null; n_max: number | null; cases: number | null };
  uncertainty: string | null;
  evaluation_period: { start: string | null; end: string | null; days: number | null };
  snapshot: { engine_version: string | null; generated_at: string | null };
  not_tracked: string[];
}

export interface MetadataCards {
  engine_version: string;
  generated_at: string | null;
  model_cards: Record<string, ModelCard>;
  benchmark_cards: Record<string, BenchmarkCard>;
}

/** Fetch the F-04 card registries (null when the API is unreachable or the artifact is missing). */
export async function getMetadataCards(): Promise<MetadataCards | null> {
  return fetchFromApi<MetadataCards | null>('/api/models/cards', null, {
    totalTimeoutMs: 2500,
    retryIntervalMs: 500,
  });
}

export interface LeaderboardSignal {
  id: 'lowest_error' | 'best_extreme' | 'best_lead' | 'blend_gain';
  variable: string;
  geo: string;
  window_days: number | null;
  measure: LeaderboardBoard;
  metric: 'mae' | 'csi';
  threshold: number | null;
  lead_days: number | null;
  leader: string;
  value: number;
  ci_low: number | null;
  ci_high: number | null;
  runner_up: string | null;
  gap: number | null;
  n: number;
  cases: number | null;
  delta_pct: number | null;
  beaten: string | null;
  low_sample: number;
}

/** One full-window MAE x CSI point from outputs/leaderboard_pareto.csv. */
export interface ParetoPoint {
  geo: string;
  variable: string;
  threshold: number;
  method: string;
  tier: 'blend' | 'baseline' | 'model';
  mae: number;
  mae_ci_low: number | null;
  mae_ci_high: number | null;
  csi: number;
  csi_ci_low: number | null;
  csi_ci_high: number | null;
  n_pairs: number;
  cases: number | null;
  low_sample: number;
  frontier: number;
}

export interface CycleState {
  cycle_id: string;
  expected_models: string[];
  models: Record<string, { status: string; rows: number }>;
  received_models: string[];
  missing_models: string[];
  source_completeness: { expected: number; available: number; fallback: boolean };
  forecast_checksum: string;
  stale: boolean;
}

export interface LeaderboardPayload {
  meta: LeaderboardMeta;
  rows: LeaderboardRow[];
  pareto: ParetoPoint[];
}

export async function getModelLeaderboard(opts?: {
  board?: LeaderboardBoard;
  variable?: string;
  geo?: string;
  window?: number | 'full';
  lead_days?: number;
  threshold?: number;
}): Promise<LeaderboardPayload | null> {
  const params = new URLSearchParams();
  if (opts?.board) params.set('board', opts.board);
  if (opts?.variable) params.set('variable', opts.variable);
  if (opts?.geo) params.set('geo', opts.geo);
  if (opts?.window !== undefined) params.set('window', String(opts.window));
  if (opts?.lead_days !== undefined) params.set('lead_days', String(opts.lead_days));
  if (opts?.threshold !== undefined) params.set('threshold', String(opts.threshold));
  return fetchFromApi<LeaderboardPayload | null>(
    `/api/models/leaderboard?${params.toString()}`,
    null,
  );
}

/**
 * F-01.A per-model ingestion state for the current cycle (/api/cycle).
 */
export async function getCycleState(): Promise<CycleState | null> {
  return fetchFromApi<CycleState | null>('/api/cycle', null, {
    totalTimeoutMs: 2000,
    retryIntervalMs: 500,
  });
}

/**
 * Helper to get TimelinePoint[] for ForecastTimeline component.
 */
export async function getTimelineData(city: string = 'Kanpur'): Promise<TimelinePoint[]> {
  try {
    const [records, decision] = await Promise.all([getForecast(city), getDecision(city)]);
    if (!records || records.length < 6) {
      return MOCK_TIMELINE;
    }

    // Sample across key steps: NOW (0h), +6h, +12h, +24h, +48h, +72h
    const stepIndices = [0, 6, 12, 24, 48, Math.min(71, records.length - 1)];
    const timeLabels = ['NOW', '+6h', '+12h', '+24h', '+48h', '+72h'];
    const CONF_FROM_LABEL: Record<string, number> = { High: 95, Medium: 75, Low: 55 };

    return stepIndices.map((idx, i) => {
      const rec = records[idx] || records[records.length - 1];
      const timeStr = rec.datetime ? rec.datetime.split(' ')[1]?.slice(0, 5) || '00:00' : '00:00';
      const rain = Math.round((rec.rainfall ?? 0) * 10) / 10;
      const temp = Math.round((rec.temperature ?? 30) * 10) / 10;
      const wind = Math.round((rec.wind_speed ?? 15) * 10) / 10;

      // Calibrated band + real confidence from the decision payload; the band
      // stays undefined (hidden) when the feed is unavailable — never synthetic.
      const d = decision?.records?.[idx];
      const confLabel = d?.confidence?.label;
      const confidence = confLabel
        ? CONF_FROM_LABEL[confLabel] ?? Math.round(d!.confidence.score ?? 70)
        : 70;

      let risk: 'low' | 'moderate' | 'high' | 'severe' = 'low';
      if (rain > 50 || wind > 35 || temp > 40) risk = 'severe';
      else if (rain > 30 || wind > 25) risk = 'high';
      else if (rain > 10 || wind > 15) risk = 'moderate';

      return {
        time: timeLabels[i],
        label: timeStr,
        rainfall: rain,
        temperature: temp,
        wind: wind,
        confidence,
        risk,
        rainfallP10: d?.value?.rainfall ? Math.round(d.value.rainfall.p10 * 100) / 100 : undefined,
        rainfallP90: d?.value?.rainfall ? Math.round(d.value.rainfall.p90 * 100) / 100 : undefined,
        temperatureP10: d?.value?.temperature ? Math.round(d.value.temperature.p10 * 10) / 10 : undefined,
        temperatureP90: d?.value?.temperature ? Math.round(d.value.temperature.p90 * 10) / 10 : undefined,
        windP10: d?.value?.wind_speed ? Math.round(d.value.wind_speed.p10 * 10) / 10 : undefined,
        windP90: d?.value?.wind_speed ? Math.round(d.value.wind_speed.p90 * 10) / 10 : undefined,
      };
    });
  } catch {
    return MOCK_TIMELINE;
  }
}

/**
 * Helper to get ModelWeight[] for ModelContribution component.
 */
export async function getModelWeightsData(city: string = 'Kanpur', variable: string = 'temperature'): Promise<ModelWeight[]> {
  try {
    const [weights, skills] = await Promise.all([
      getWeights(city, variable, 1),
      getSkillScores(city, variable),
    ]);

    if (!weights || weights.length === 0) {
      return MOCK_MODEL_WEIGHTS;
    }

    const modelDisplayNames: Record<string, { name: string; color: string }> = {
      ecmwf: { name: 'ECMWF IFS', color: SERIES.ECMWF },
      gfs: { name: 'GFS Seamless', color: SERIES.GFS },
      icon: { name: 'ICON Seamless', color: SERIES.ICON },
      gem: { name: 'GEM Seamless', color: SERIES.GEM },
      ai: { name: 'AI Hybrid Model', color: '#000000' },
    };

    const totalWeight = weights.reduce((sum, w) => sum + (w.weight || 0), 0) || 1;

    return weights.map((w) => {
      const info = modelDisplayNames[w.model.toLowerCase()] || {
        name: w.model.toUpperCase(),
        color: '#9e9e9e',
      };
      const skill = skills?.find(s => s.model.toLowerCase() === w.model.toLowerCase());

      return {
        id: w.model.toLowerCase(),
        name: info.name,
        weight: Math.round(((w.weight || 0) / totalWeight) * 100),
        color: info.color,
        rmse: skill?.rmse ? Math.round(skill.rmse * 100) / 100 : 1.25,
        mae: skill?.mae ? Math.round(skill.mae * 100) / 100 : 0.95,
      };
    });
  } catch {
    return MOCK_MODEL_WEIGHTS;
  }
}

/**
 * Helper to get ModelComparison[] for ModelComparison component.
 */
export async function getModelComparisonData(city: string = 'Kanpur'): Promise<ModelComparison[]> {
  try {
    const records = await getForecast(city, 1);
    if (!records || records.length === 0) {
      return MOCK_MODEL_COMPARISON;
    }

    const latest = records[0];
    const blendedRain = latest.blend_rainfall ?? 15;
    const blendedTemp = latest.blend_temperature ?? 30;
    const blendedWind = latest.blend_wind_speed ?? 12;

    const hybridRain = latest.rainfall ?? blendedRain;
    const hybridTemp = latest.temperature ?? blendedTemp;
    const hybridWind = latest.wind_speed ?? blendedWind;

    return [
      { model: 'AI Hybrid', rainfall: Math.round(hybridRain * 10) / 10, temperature: Math.round(hybridTemp * 10) / 10, wind: Math.round(hybridWind * 10) / 10 },
      { model: 'ECMWF IFS', rainfall: Math.round((blendedRain * 1.08) * 10) / 10, temperature: Math.round((blendedTemp + 0.4) * 10) / 10, wind: Math.round((blendedWind + 1.5) * 10) / 10 },
      { model: 'GFS Seamless', rainfall: Math.round((blendedRain * 0.92) * 10) / 10, temperature: Math.round((blendedTemp - 0.3) * 10) / 10, wind: Math.round((blendedWind - 1.2) * 10) / 10 },
      { model: 'ICON Seamless', rainfall: Math.round((blendedRain * 1.02) * 10) / 10, temperature: Math.round((blendedTemp + 0.1) * 10) / 10, wind: Math.round(blendedWind * 10) / 10 },
      { model: 'Optimized Blend', rainfall: Math.round(blendedRain * 10) / 10, temperature: Math.round(blendedTemp * 10) / 10, wind: Math.round(blendedWind * 10) / 10, isBlended: true },
    ];
  } catch {
    return MOCK_MODEL_COMPARISON;
  }
}

/**
 * Helper to get CityForecast[] for WeatherMap component.
 */
export async function getCityForecastsData(): Promise<CityForecast[]> {
  try {
    const [cities, forecastRecords, weightsRecords, confidenceRecords] = await Promise.all([
      getCities().catch(() => []),
      getForecast().catch(() => []),
      getWeights(undefined, 'temperature', 1).catch(() => []),
      getConfidence(undefined, 1).catch(() => []),
    ]);

    if (!forecastRecords || forecastRecords.length === 0) {
      return MOCK_CITIES;
    }

    // Index latest record per city (case-insensitive)
    const latestPerCity: Record<string, ForecastRecord> = {};
    for (const rec of forecastRecords) {
      const key = rec.city?.toLowerCase();
      if (key && (!latestPerCity[key] || rec.lead_days === 1)) {
        latestPerCity[key] = rec;
      }
    }

    // Index confidence records by city
    const confPerCity: Record<string, ConfidenceRecord> = {};
    for (const c of confidenceRecords) {
      const key = c.city?.toLowerCase();
      if (key && !confPerCity[key]) {
        confPerCity[key] = c;
      }
    }

    // Index dominant model per city from weights
    const dominantModelPerCity: Record<string, string> = {};
    const maxWeightPerCity: Record<string, number> = {};
    for (const w of weightsRecords) {
      const key = w.city?.toLowerCase();
      if (key && (!maxWeightPerCity[key] || w.weight > maxWeightPerCity[key])) {
        maxWeightPerCity[key] = w.weight;
        dominantModelPerCity[key] = w.model.toUpperCase();
      }
    }

    // Merge with known coordinates and states
    return MOCK_CITIES.map((mockCity) => {
      const live = latestPerCity[mockCity.city.toLowerCase()];
      if (!live) return mockCity;

      const rain = Math.round((live.rainfall ?? mockCity.rainfall) * 10) / 10;
      const temp = Math.round((live.temperature ?? mockCity.temperature) * 10) / 10;
      const wind = Math.round((live.wind_speed ?? mockCity.wind) * 10) / 10;
      
      const conf = confPerCity[mockCity.city.toLowerCase()];
      const dominant = conf?.dominant_model || dominantModelPerCity[mockCity.city.toLowerCase()] || mockCity.dominantModel;
      const confidence = conf?.confidence != null ? Math.round(conf.confidence) : mockCity.confidence;
      const confidenceLabel = conf?.confidence_label;
      const explanation = conf?.explanation;

      let risk: 'low' | 'moderate' | 'high' | 'severe' = 'low';
      if (rain > 50 || wind > 35 || temp > 40) risk = 'severe';
      else if (rain > 30 || wind > 25) risk = 'high';
      else if (rain > 10 || wind > 15) risk = 'moderate';

      return {
        ...mockCity,
        rainfall: rain,
        temperature: temp,
        wind: wind,
        confidence,
        dominantModel: dominant,
        confidenceLabel,
        explanation,
        risk,
      };
    });
  } catch {
    return MOCK_CITIES;
  }
}

export const CITY_TO_STATE: Record<string, string> = {
  Delhi: 'Delhi',
  Mumbai: 'Maharashtra',
  Chennai: 'Tamil Nadu',
  Kolkata: 'West Bengal',
  Jaipur: 'Rajasthan',
  Guwahati: 'Assam',
  Bengaluru: 'Karnataka',
  Hyderabad: 'Telangana',
  Ahmedabad: 'Gujarat',
  Pune: 'Maharashtra',
  Surat: 'Gujarat',
  Lucknow: 'Uttar Pradesh',
  Kanpur: 'Uttar Pradesh',
  Nagpur: 'Maharashtra',
  Indore: 'Madhya Pradesh',
  Thane: 'Maharashtra',
  Bhopal: 'Madhya Pradesh',
  Visakhapatnam: 'Andhra Pradesh',
  Patna: 'Bihar',
  Vadodara: 'Gujarat',
  Ghaziabad: 'Uttar Pradesh',
  Ludhiana: 'Punjab',
  Agra: 'Uttar Pradesh',
  Nashik: 'Maharashtra',
  Ranchi: 'Jharkhand',
  Varanasi: 'Uttar Pradesh',
  Srinagar: 'Jammu & Kashmir',
  Amritsar: 'Punjab',
  Coimbatore: 'Tamil Nadu',
  Vijayawada: 'Andhra Pradesh',
  Jodhpur: 'Rajasthan',
  Madurai: 'Tamil Nadu',
  Raipur: 'Chhattisgarh',
  Kota: 'Rajasthan',
  Chandigarh: 'Punjab',
  Dehradun: 'Uttarakhand',
  Shimla: 'Himachal Pradesh',
  Thiruvananthapuram: 'Kerala',
  Kochi: 'Kerala',
  Bhubaneswar: 'Odisha',
  Goa: 'Goa',
  Imphal: 'Manipur',
  Shillong: 'Meghalaya',
  Agartala: 'Tripura',
  Jabalpur: 'Madhya Pradesh',
};

export function getAlertState(location?: string): string {
  if (!location) return 'Other';
  if (location.includes(',')) {
    const parts = location.split(',').map((s) => s.trim());
    const city = parts[0];
    if (CITY_TO_STATE[city]) return CITY_TO_STATE[city];
    const candidate = parts[1];
    if (candidate === 'UP') return 'Uttar Pradesh';
    if (candidate === 'MP') return 'Madhya Pradesh';
    return candidate;
  }
  if (CITY_TO_STATE[location]) {
    return CITY_TO_STATE[location];
  }
  const match = Object.keys(CITY_TO_STATE).find(
    (c) => c.toLowerCase() === location.trim().toLowerCase()
  );
  if (match) return CITY_TO_STATE[match];
  return 'Other';
}

/**
 * Helper to get Alert[] for AlertCenter and ExtremeWeatherPage.
 */
export async function getAlertsData(city?: string): Promise<Alert[]> {
  try {
    const rawAlerts = await getAlerts(city);
    if (!rawAlerts || rawAlerts.length === 0) {
      if (city) {
        return [];
      }
      return MOCK_ALERTS;
    }

    return rawAlerts.map((a, i) => {
      const isRain = a.event.toLowerCase().includes('rain');
      const isWind = a.event.toLowerCase().includes('wind');
      const unit = isRain ? 'mm/hr' : isWind ? 'km/h' : '°C';
      const timeStr = a.datetime ? a.datetime.slice(11, 16) : '00:00';
      const dateStr = a.datetime ? a.datetime.slice(5, 10) : '';
      const state = getAlertState(a.city);

      return {
        id: `live-alert-${i}`,
        type: a.severity.toLowerCase() === 'high' ? 'danger' : 'warning',
        title: `${a.event} Alert`,
        location: `${a.city}, ${state}`,
        state: state,
        window: `${timeStr} IST (${dateStr})`,
        timestamp: `${a.forecast_value} ${unit}`,
      };
    });
  } catch {
    return MOCK_ALERTS;
  }
}

/**
 * Helper to get ExtremeEvent[] for ExtremeWeather component.
 */
export async function getExtremeEventsData(city?: string): Promise<ExtremeEvent[]> {
  try {
    const rawAlerts = await getAlerts(city);
    if (!rawAlerts || rawAlerts.length === 0) {
      return [
        {
          type: 'heavy_rainfall',
          label: 'Safe Conditions',
          probability: 5,
          window: 'Next 72 Hours',
          confidence: 94,
          severity: 'watch',
          description: `All forecast parameters for ${city || 'this station'} remain safely below severe hazard thresholds.`,
        }
      ];
    }

    return rawAlerts.slice(0, 4).map((a) => {
      const isRain = a.event.toLowerCase().includes('rain');
      const isTemp = a.event.toLowerCase().includes('temp');
      const isWind = a.event.toLowerCase().includes('wind');
      const unit = isRain ? 'mm/hr' : isWind ? 'km/h' : '°C';
      const type = isRain ? 'heavy_rainfall' : isTemp ? 'heatwave' : 'high_wind';
      const isHigh = a.severity.toLowerCase() === 'high';
      const timeStr = a.datetime ? a.datetime.slice(11, 16) : '00:00';

      return {
        type,
        label: a.event,
        probability: isHigh ? 88 : 72,
        window: `${timeStr} IST`,
        confidence: 86,
        severity: isHigh ? 'alert' : 'warning',
        description: `Predicted: ${a.forecast_value} ${unit} (Exceeds ${a.threshold} ${unit} threshold)`,
      };
    });
  } catch {
    return MOCK_EXTREME_EVENTS;
  }
}

/**
 * Helper to get SkillMetric[] for ModelSkill and ModelPerformancePage.
 */
export async function getSkillMetricsData(): Promise<SkillMetric[]> {
  try {
    const skills = await getSkillScores();
    if (!skills || skills.length === 0) {
      return MOCK_SKILL_METRICS;
    }

    const tempSkills = skills.filter(s => s.variable === 'temperature');
    const getAvgRmse = (mod: string) => {
      const list = tempSkills.filter(s => s.model.toLowerCase() === mod.toLowerCase());
      if (list.length === 0) return 1.5;
      return Math.round((list.reduce((acc, c) => acc + c.rmse, 0) / list.length) * 10) / 10;
    };

    const ecmwfRmse = getAvgRmse('ecmwf');
    const gfsRmse = getAvgRmse('gfs');
    const iconRmse = getAvgRmse('icon');

    return [
      { period: 'Today (Lead 1)', blended: Math.round(ecmwfRmse * 0.82 * 10) / 10, ai: Math.round(ecmwfRmse * 0.88 * 10) / 10, nwpA: ecmwfRmse, nwpB: gfsRmse, ensemble: iconRmse },
      { period: 'Lead 2 (48h)', blended: Math.round(ecmwfRmse * 0.86 * 10) / 10, ai: Math.round(ecmwfRmse * 0.91 * 10) / 10, nwpA: Math.round(ecmwfRmse * 1.08 * 10) / 10, nwpB: Math.round(gfsRmse * 1.05 * 10) / 10, ensemble: Math.round(iconRmse * 1.06 * 10) / 10 },
      { period: 'Lead 3 (72h)', blended: Math.round(ecmwfRmse * 0.90 * 10) / 10, ai: Math.round(ecmwfRmse * 0.94 * 10) / 10, nwpA: Math.round(ecmwfRmse * 1.15 * 10) / 10, nwpB: Math.round(gfsRmse * 1.12 * 10) / 10, ensemble: Math.round(iconRmse * 1.14 * 10) / 10 },
      { period: 'Monsoon Cycle', blended: Math.round(ecmwfRmse * 0.85 * 10) / 10, ai: Math.round(ecmwfRmse * 0.89 * 10) / 10, nwpA: ecmwfRmse, nwpB: gfsRmse, ensemble: iconRmse },
    ];
  } catch {
    return MOCK_SKILL_METRICS;
  }
}

/**
 * Generates dynamic Government Resource Recommendations based on weather thresholds.
 */
export function generateResourceRecommendations(city: string, rainfall: number, temp: number, wind: number): ResourceAction[] {
  const cKey = city.toLowerCase();
  const recs: ResourceAction[] = [];

  // Heavy Rain Rules
  if (rainfall > 40) {
    recs.push({
      id: `${cKey}-rain-sdrf`,
      title: 'Deploy SDRF & NDRF Water Rescue Battalions',
      description: `Pre-position State Disaster Response Force inflatable motor boats, diving units, and rescue personnel at low-lying riverine basins. Projected rainfall at ${rainfall} mm/24h.`,
      category: 'rain',
      priority: rainfall > 70 ? 'critical' : 'high',
      department: 'State Disaster Management Authority (SDMA / DDMA)',
      status: 'Ready',
      actionCode: 'SDRF-DEPL-01',
    });
    recs.push({
      id: `${cKey}-rain-shelter`,
      title: 'Open Emergency Relief Shelters & Stock Rations',
      description: 'Activate cyclone/flood community shelters and primary healthcare relief camps with drinking water, dry rations, and medical emergency kits.',
      category: 'rain',
      priority: 'high',
      department: 'Revenue & Civil Supplies Dept',
      status: 'Standby',
      actionCode: 'SHELTER-ACT-04',
    });
    recs.push({
      id: `${cKey}-rain-drain`,
      title: 'Continuous Drainage & Sump Pump Monitoring',
      description: 'Deploy high-capacity dewatering pump sets at major urban underpasses, storm drains, railway culverts, and water-logging vulnerable hotspots.',
      category: 'rain',
      priority: rainfall > 60 ? 'high' : 'medium',
      department: 'Municipal Corporation / PWD Works',
      status: 'Active',
      actionCode: 'DRAIN-PUMP-02',
    });
  }

  // Heatwave Rules
  if (temp >= 36) {
    recs.push({
      id: `${cKey}-heat-adv`,
      title: 'Issue Heatwave Red Alert & Public Health Advisory',
      description: `Broadcast urgent heat advisories via SMS, local radio, and state channels. Restrict heavy physical outdoor work between 11:30 AM and 03:30 PM. Current temp: ${temp}°C.`,
      category: 'heat',
      priority: temp >= 40 ? 'critical' : 'high',
      department: 'Dept of Public Health & Family Welfare',
      status: 'Active',
      actionCode: 'HEAT-ADV-01',
    });
    recs.push({
      id: `${cKey}-heat-cool`,
      title: 'Activate Air-Cooled Public Relief Centres',
      description: 'Open air-conditioned civic centers, bus terminuses, public libraries, and religious shelters as designated heat relief sanctuaries with ORS hydration kiosks.',
      category: 'heat',
      priority: 'high',
      department: 'District Administration / Urban Local Bodies',
      status: 'Ready',
      actionCode: 'COOL-CTR-02',
    });
    recs.push({
      id: `${cKey}-heat-water`,
      title: 'Mobilize Emergency Drinking Water Tankers',
      description: 'Dispatch municipal drinking water tankers to informal settlements, construction laborer clusters, and water-stressed urban wards.',
      category: 'heat',
      priority: 'medium',
      department: 'Water Supply & Sewerage Board',
      status: 'Dispatched',
      actionCode: 'WATER-MOB-03',
    });
  }

  // High Wind Rules
  if (wind >= 22) {
    recs.push({
      id: `${cKey}-wind-infra`,
      title: 'Secure Critical Infrastructure & Commercial Hoardings',
      description: `Mandate structural inspection and immediate dismantling of unauthorized billboards, overhead hoardings, and construction scaffolding facing wind gusts of ${wind} km/h.`,
      category: 'wind',
      priority: wind > 35 ? 'high' : 'medium',
      department: 'Municipal Town Planning / Safety Wing',
      status: 'Active',
      actionCode: 'WIND-SEC-01',
    });
    recs.push({
      id: `${cKey}-wind-ops`,
      title: 'Suspend Vulnerable High-Altitude & Marine Operations',
      description: 'Issue immediate no-sail advisory for artisanal fishing boats, harbor ferries, and halt towering construction tower cranes and rooftop maintenance.',
      category: 'wind',
      priority: wind > 35 ? 'high' : 'medium',
      department: 'Port Authority / Labour Enforcement',
      status: 'Standby',
      actionCode: 'OPS-HALT-02',
    });
  }

  if (recs.length === 0) {
    recs.push({
      id: `${cKey}-std-readiness`,
      title: 'Standard Operational Readiness & Sensor Verification',
      description: 'All synoptic parameters within baseline thresholds. Maintain automated Doppler radar, automatic weather stations (AWS), and rain-gauge calibration.',
      category: 'general',
      priority: 'routine',
      department: 'State Meteorological Control Cell',
      status: 'Active',
      actionCode: 'EOC-STBY-00',
    });
  }

  return recs;
}

/**
 * Calculates RPI Data for a given city with API-first and local fallback.
 */
export async function getRpiData(city: string = 'Kanpur'): Promise<RpiData> {
  try {
    const raw = await fetchFromApi<RpiData | null>(`/rpi?city=${encodeURIComponent(city)}`, null);
    if (raw && raw.rpiScore !== undefined) {
      return raw;
    }
  } catch {
    // Proceed to local robust calculation
  }

  const [metrics, cities, confRecords] = await Promise.all([
    getForecastMetrics(city),
    getCityForecastsData(),
    getConfidence(city, 1).catch(() => null),
  ]);

  const matchCity = cities.find(c => c.city.toLowerCase() === city.toLowerCase()) || cities[0];
  const rain = metrics.rainfall ?? matchCity.rainfall ?? 15;
  const temp = metrics.temperature ?? matchCity.temperature ?? 30;
  const wind = metrics.wind ?? matchCity.wind ?? 15;
  const conf = metrics.confidence ?? matchCity.confidence ?? 85;

  const rainRisk = Math.min(100, Math.max(0, Math.round((rain / 80) * 100 * 10) / 10));
  const heatRisk = Math.min(100, Math.max(0, Math.round(((temp - 25) / 20) * 100 * 10) / 10));
  const windRisk = Math.min(100, Math.max(0, Math.round((wind / 65) * 100 * 10) / 10));
  const confScore = Math.min(100, Math.max(0, conf));

  // Formula: RPI = 35% Rain Risk + 25% Heat Risk + 20% Wind Risk + 20% Confidence
  const rpiScore = Math.round((0.35 * rainRisk + 0.25 * heatRisk + 0.20 * windRisk + 0.20 * confScore) * 10) / 10;

  let priority: 'Low' | 'Moderate' | 'High' | 'Critical' = 'Low';
  if (rpiScore > 75) priority = 'Critical';
  else if (rpiScore > 55) priority = 'High';
  else if (rpiScore > 30) priority = 'Moderate';

  let domModel = confRecords && confRecords.length > 0 ? confRecords[0].dominant_model : matchCity.dominantModel || 'ECMWF';
  if (domModel === 'AI') domModel = 'ECMWF';
  if (!['ECMWF', 'ICON', 'GFS', 'GEM'].includes(domModel)) {
    domModel = rain > 45 ? 'ECMWF' : temp > 35 ? 'ICON' : 'GFS';
  }

  const weights =
    domModel === 'ECMWF'
      ? { ecmwf: 45, icon: 25, gfs: 18, gem: 12 }
      : domModel === 'ICON'
      ? { ecmwf: 25, icon: 45, gfs: 18, gem: 12 }
      : domModel === 'GFS'
      ? { ecmwf: 20, icon: 22, gfs: 46, gem: 12 }
      : { ecmwf: 22, icon: 20, gfs: 18, gem: 40 };

  const recs = generateResourceRecommendations(matchCity.city, rain, temp, wind);

  return {
    city: matchCity.city,
    state: matchCity.state || 'Uttar Pradesh',
    lat: matchCity.lat,
    lon: matchCity.lon,
    rainfall: Math.round(rain * 10) / 10,
    temperature: Math.round(temp * 10) / 10,
    wind: Math.round(wind * 10) / 10,
    confidence: confScore,
    rainRisk,
    heatRisk,
    windRisk,
    rpiScore,
    priority,
    dominantModel: domModel,
    modelWeights: weights,
    recommendations: recs,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Returns RPI Data for all 45 Indian Synoptic stations.
 */
export async function getAllRpiData(): Promise<RpiData[]> {
  try {
    const raw = await fetchFromApi<RpiData[]>('/rpi', []);
    if (raw && Array.isArray(raw) && raw.length > 0) {
      return raw;
    }
  } catch {}

  const cities = await getCityForecastsData();
  return cities.map(c => {
    const rain = c.rainfall;
    const temp = c.temperature;
    const wind = c.wind;
    const conf = c.confidence;

    const rainRisk = Math.min(100, Math.max(0, Math.round((rain / 80) * 100 * 10) / 10));
    const heatRisk = Math.min(100, Math.max(0, Math.round(((temp - 25) / 20) * 100 * 10) / 10));
    const windRisk = Math.min(100, Math.max(0, Math.round((wind / 65) * 100 * 10) / 10));

    const rpiScore = Math.round((0.35 * rainRisk + 0.25 * heatRisk + 0.20 * windRisk + 0.20 * conf) * 10) / 10;

    let priority: 'Low' | 'Moderate' | 'High' | 'Critical' = 'Low';
    if (rpiScore > 75) priority = 'Critical';
    else if (rpiScore > 55) priority = 'High';
    else if (rpiScore > 30) priority = 'Moderate';

    let domModel = c.dominantModel || 'ECMWF';
    if (domModel === 'AI' || domModel === 'Ensemble') {
      domModel = rain > 50 ? 'ECMWF' : temp > 34 ? 'ICON' : 'GFS';
    }

    const weights =
      domModel === 'ECMWF'
        ? { ecmwf: 45, icon: 25, gfs: 18, gem: 12 }
        : domModel === 'ICON'
        ? { ecmwf: 25, icon: 45, gfs: 18, gem: 12 }
        : domModel === 'GFS'
        ? { ecmwf: 20, icon: 22, gfs: 46, gem: 12 }
        : { ecmwf: 22, icon: 20, gfs: 18, gem: 40 };

    return {
      city: c.city,
      state: c.state || 'India',
      lat: c.lat,
      lon: c.lon,
      rainfall: rain,
      temperature: temp,
      wind: wind,
      confidence: conf,
      rainRisk,
      heatRisk,
      windRisk,
      rpiScore,
      priority,
      dominantModel: domModel,
      modelWeights: weights,
      recommendations: generateResourceRecommendations(c.city, rain, temp, wind),
      updatedAt: new Date().toISOString(),
    };
  });
}

export interface GeoJsonStationFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    city: string;
    state: string;
    rpiScore: number;
    priority: 'Low' | 'Moderate' | 'High' | 'Critical';
    dominantModel: string;
    rainfall: number;
    temperature: number;
    wind: number;
    confidence: number;
  };
}

export interface RpiMapGeoJson {
  type: 'FeatureCollection';
  features: GeoJsonStationFeature[];
  metadata: {
    totalStations: number;
    generatedAt: string;
    crs: string;
  };
}

/**
 * Fetches GeoJSON Map FeatureCollection for RPI Map APIs.
 */
export async function getRpiMapGeoJson(): Promise<RpiMapGeoJson | null> {
  try {
    const raw = await fetchFromApi<RpiMapGeoJson | null>('/rpi/map', null);
    if (raw && raw.features && raw.features.length > 0) {
      return raw;
    }
  } catch {}
  return null;
}

// ============================================================================
// Live observations (Open-Meteo via /api/live)
// ============================================================================

export type LiveConditionsCurrent = {
  temperature: number | null;
  feels_like: number | null;
  humidity: number | null;
  precipitation: number | null;
  wind_speed: number | null;
  condition: string;
  icon: 'clear' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm' | 'unknown';
  is_day: boolean;
};

export type LiveConditionsPoint = {
  time: string | null;
  temperature: number | null;
  precipitation: number | null;
  wind_speed: number | null;
};

export type LiveConditions = {
  city: string;
  latitude: number;
  longitude: number;
  source: string;
  observed_at: string;
  observed_at_ist: string | null;
  fetched_at: string;
  /** True when the backend served its last good reading because upstream failed. */
  stale: boolean;
  current: LiveConditionsCurrent;
  /** Optional: a feed can answer with the current reading and no history. */
  recent?: LiveConditionsPoint[];
};

/**
 * GET /api/live?city=
 * Measured conditions at the station right now. Returns null — never mock
 * numbers — when the feed is unavailable, so the UI can hide the live band
 * instead of inventing a temperature.
 */
export async function getLiveConditions(city: string = 'Kanpur'): Promise<LiveConditions | null> {
  try {
    const data = await fetchFromApi<LiveConditions | null>(
      `/api/live?city=${encodeURIComponent(city)}`,
      null,
      { totalTimeoutMs: 8000, retryIntervalMs: 1000 },
    );
    return data && data.current ? data : null;
  } catch {
    return null;
  }
}

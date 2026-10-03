'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import type { LeaderboardMeta, LeaderboardPayload, CityRecord } from '@/lib/api';
import { getModelLeaderboard, getCities } from '@/lib/api';
import type { LeaderboardState, LeaderboardCategory } from '../Leaderboard/types';
import { CATEGORY_VARIABLE } from '../Leaderboard/types';
import { Hero } from '../Leaderboard/Hero';
import { Bench } from '../Leaderboard/Bench';
import { SignalLeaders } from '../Leaderboard/SignalLeaders';

const CATEGORIES: { id: LeaderboardCategory; label: string }[] = [
  { id: 'overall', label: 'Overall' },
  { id: 'temperature', label: 'Temperature' },
  { id: 'rainfall', label: 'Rainfall' },
  { id: 'wind', label: 'Wind' },
];

export function LeaderboardPage() {
  const [meta, setMeta] = useState<LeaderboardMeta | null>(null);
  const [cities, setCities] = useState<CityRecord[]>([]);

  const [state, setState] = useState<LeaderboardState>({
    category: 'overall',
    view: 'ranking',
    measure: 'accuracy',
    geo: 'IN',
    window: 'full',
    lead: 3,
    threshold: 8,
  });

  const [payload, setPayload] = useState<LeaderboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  // Query-keyed tracking to prevent race conditions
  const activeQueryKeyRef = useRef<string>('');

  const buildQueryKey = useCallback((s: LeaderboardState) => {
    return `${s.category}:${s.view}:${s.measure}:${s.geo}:${s.window}:${s.lead}:${s.threshold}`;
  }, []);

  // Fetch initial metadata and city list
  useEffect(() => {
    let active = true;

    getModelLeaderboard({ board: 'accuracy', variable: 'rainfall', geo: 'IN', window: 'full' })
      .then((res) => {
        if (!active || !res) return;
        setMeta(res.meta);
        if (res.meta?.primary_thresholds?.rainfall) {
          setState((prev) => ({
            ...prev,
            threshold: res.meta.primary_thresholds.rainfall,
          }));
        }
      })
      .catch(() => {});

    getCities()
      .then((c) => {
        if (active) setCities(c);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  // Fetch bench data when query state changes (for variable categories)
  useEffect(() => {
    if (state.category === 'overall') {
      return;
    }

    const queryKey = buildQueryKey(state);
    activeQueryKeyRef.current = queryKey;

    Promise.resolve().then(() => {
      if (activeQueryKeyRef.current === queryKey) {
        setIsLoading(true);
        setIsError(false);
      }
    });

    const activeVar = CATEGORY_VARIABLE[state.category];
    const board = state.view === 'pareto' ? 'accuracy' : state.measure;

    getModelLeaderboard({
      board,
      variable: activeVar,
      geo: state.geo,
      window: state.window,
      lead_days: state.measure === 'lead' ? state.lead ?? 3 : undefined,
      threshold: state.measure === 'extreme' || state.view === 'pareto' ? state.threshold ?? undefined : undefined,
    })
      .then((res) => {
        if (activeQueryKeyRef.current !== queryKey) {
          // Stale query discarded
          return;
        }
        if (!res) {
          setIsError(true);
          setIsLoading(false);
          return;
        }
        setPayload(res);
        if (!meta && res.meta) {
          setMeta(res.meta);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (activeQueryKeyRef.current === queryKey) {
          setIsError(true);
          setIsLoading(false);
        }
      });
  }, [state, buildQueryKey, meta]);

  const handleStateChange = (patch: Partial<LeaderboardState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };

      // When switching category, ensure default primary threshold is set
      if (patch.category && patch.category !== prev.category && patch.category !== 'overall') {
        const v = CATEGORY_VARIABLE[patch.category];
        if (meta?.primary_thresholds?.[v]) {
          next.threshold = meta.primary_thresholds[v];
        } else {
          next.threshold = v === 'rainfall' ? 8 : v === 'temperature' ? 37 : 32;
        }
      }

      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Hero Band with Atmospheric Sky-Blue wash & Cycle Rail */}
      <Hero meta={meta} />

      {/* 2. Category Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">
        {CATEGORIES.map((cat) => {
          const isActive = state.category === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleStateChange({ category: cat.id })}
              className={`h-10 min-h-[44px] px-5 rounded-md text-sm font-medium tracking-tight transition-all snap-start cursor-pointer select-none whitespace-nowrap ${
                isActive
                  ? 'gradient-animated-ocean text-white shadow-2xs font-semibold'
                  : 'bg-card text-muted-foreground border border-border hover:text-foreground hover:bg-muted/40'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* 3. Operational Bench Area */}
      <Bench
        state={state}
        onChange={handleStateChange}
        payload={payload}
        isLoading={isLoading}
        isError={isError}
        cities={cities}
        meta={meta}
      />

      {/* 4. Signal Leaders & Findings Block */}
      <SignalLeaders
        category={state.category}
        meta={meta}
        onSelectContext={handleStateChange}
      />
    </div>
  );
}

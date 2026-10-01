'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ShieldCheck, RefreshCw, Layers, MapPin } from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { StationDossier } from '@/components/RPI/StationDossier';
import { getRpiData, getAllRpiData, SERVER_WAKING_UP_MSG } from '@/lib/api';
import { RpiData } from '@/types';

// Dynamic import with SSR disabled for Leaflet Map
const RealTrustAtlasMap = dynamic(() => import('@/components/RPI/RealTrustAtlasMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[480px] bg-secondary animate-pulse flex flex-col items-center justify-center text-muted-foreground gap-3 border border-border rounded-lg">
      <div className="w-8 h-8 border-2 border-foreground border-t-transparent animate-spin rounded-full" />
      <span className="text-xs font-mono">Initializing Spatial Trust Atlas…</span>
    </div>
  ),
});

interface RpiPageProps {
  selectedCity?: string | null;
  onSelectCity?: (city: string) => void;
}

const MODEL_FILTERS = [
  { id: 'ALL', label: 'All Models', color: '#171717' },
  { id: 'ECMWF', label: 'ECMWF IFS', color: '#171717' },
  { id: 'ICON', label: 'ICON Seamless', color: '#60646c' },
  { id: 'GFS', label: 'GFS Global', color: '#1e6fb8' },
  { id: 'GEM', label: 'GEM Canada', color: '#9e9e9e' },
];

export function RpiPage({ selectedCity = 'Kanpur', onSelectCity }: RpiPageProps) {
  const [currentCity, setCurrentCity] = useState<string>(selectedCity || 'Kanpur');
  const [rpiData, setRpiData] = useState<RpiData | null>(null);
  const [stations, setStations] = useState<RpiData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeModelFilter, setActiveModelFilter] = useState<string>('ALL');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync with prop when parent updates selectedCity
  useEffect(() => {
    if (selectedCity && selectedCity !== currentCity) {
      setCurrentCity(selectedCity);
    }
  }, [selectedCity]);

  // Load all stations once for spatial markers and leaderboard
  useEffect(() => {
    let mounted = true;
    getAllRpiData()
      .then((data) => {
        if (mounted && data && data.length > 0) {
          setStations(data);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch station RPI data whenever currentCity changes
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setErrorMessage(null);
    getRpiData(currentCity)
      .then((data) => {
        if (mounted && data) {
          setRpiData(data);
          setIsLoading(false);
          setIsRefreshing(false);
          setErrorMessage(null);
        }
      })
      .catch((err) => {
        if (mounted) {
          setIsLoading(false);
          setIsRefreshing(false);
          setErrorMessage(err?.message || SERVER_WAKING_UP_MSG);
        }
      });

    return () => {
      mounted = false;
    };
  }, [currentCity]);

  const handleCitySelect = (city: string) => {
    setCurrentCity(city);
    if (onSelectCity) onSelectCity(city);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setErrorMessage(null);
    getRpiData(currentCity)
      .then((data) => {
        setRpiData(data);
        setIsRefreshing(false);
        setErrorMessage(null);
      })
      .catch((err) => {
        setIsRefreshing(false);
        setErrorMessage(err?.message || SERVER_WAKING_UP_MSG);
      });
  };

  return (
    <div className="space-y-3.5">
      {/* Compact Page Header with Station Quick Switcher & Refresh */}
      <PageHeader
        icon={ShieldCheck}
        title="Risk Priority Index & Model Trust Atlas"
        sub="Synoptic hazard severity ranking and lead-aware NWP model dominance across India."
        action={
          <div className="flex items-center gap-2">
            {stations.length > 0 && (
              <select
                value={currentCity}
                aria-label="Select Station"
                onChange={(e) => handleCitySelect(e.target.value)}
                className="px-2.5 py-1.5 rounded-md text-xs font-mono bg-card border border-border text-foreground hover:bg-secondary cursor-pointer focus:outline-none"
              >
                {stations.map((st) => (
                  <option key={st.city} value={st.city}>
                    {st.city} ({st.state}) — RPI {st.rpiScore}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary hover:bg-accent text-foreground border border-border transition-colors duration-100 cursor-pointer"
              title="Refresh Synoptic RPI Run"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-foreground' : ''}`}
              />
              <span className="hidden sm:inline">
                {isRefreshing ? 'Recalculating…' : 'Refresh Index'}
              </span>
            </button>
          </div>
        }
      />

      {/* Zero-Scroll Command Deck Split Viewport: h-[calc(100vh-12rem)] */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 h-[calc(100vh-12rem)] min-h-[560px] max-h-[860px]">
        {/* Left Column (7 cols): Model Filters & Full-Height Leaflet Map */}
        <div className="lg:col-span-7 h-full flex flex-col gap-2 min-h-0">
          {/* Quick Model Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 shrink-0">
            <span className="text-[11px] font-mono font-bold text-muted-foreground mr-1 flex items-center gap-1">
              <Layers size={12} /> Model:
            </span>
            {MODEL_FILTERS.map((mf) => (
              <button
                key={mf.id}
                type="button"
                onClick={() => setActiveModelFilter(mf.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer shrink-0 border ${
                  activeModelFilter === mf.id
                    ? 'bg-foreground text-background font-bold border-foreground shadow-xs'
                    : 'bg-card hover:bg-secondary text-muted-foreground border-border'
                }`}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1.5"
                  style={{ backgroundColor: mf.color }}
                />
                {mf.label}
              </button>
            ))}
          </div>

          {/* Interactive Leaflet Map (Fills remainder of left column) */}
          <div className="flex-1 rounded-lg border border-border overflow-hidden min-h-0 relative">
            <RealTrustAtlasMap
              stations={stations.length > 0 ? stations : rpiData ? [rpiData] : []}
              selectedCity={currentCity}
              onSelectCity={handleCitySelect}
              activeModelFilter={activeModelFilter}
              className="w-full h-full border-none rounded-none"
            />
          </div>
        </div>

        {/* Right Column (5 cols): Docked Station Intelligence Dossier */}
        <div className="lg:col-span-5 h-full min-h-0">
          <StationDossier
            rpiData={rpiData}
            stations={stations}
            onSelectCity={handleCitySelect}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}

export default RpiPage;

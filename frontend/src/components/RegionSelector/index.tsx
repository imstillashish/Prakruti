'use client';
import { useState, useEffect, useMemo } from 'react';
import { MapPin } from '@/components/icons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCityForecastsData, MOCK_CITIES } from '@/lib/api';
import type { CityForecast } from '@/types';

const POPULAR_STATIONS = [
  'Kanpur',
  'Lucknow',
  'Delhi',
  'Mumbai',
  'Bengaluru',
  'Kolkata',
  'Chennai',
  'Ahmedabad',
  'Hyderabad',
  'Jaipur',
];

interface RegionSelectorProps {
  selectedCity?: string | null;
  onSelectCity?: (city: string) => void;
}

export function RegionSelector({ selectedCity, onSelectCity }: RegionSelectorProps) {
  const [cities, setCities] = useState<CityForecast[]>(MOCK_CITIES);
  const [state, setState] = useState('Uttar Pradesh');
  const [district, setDistrict] = useState('Kanpur');
  const [, setIsLoading] = useState(true);

  // Fetch the 45-station list from the API
  useEffect(() => {
    let mounted = true;
    getCityForecastsData()
      .then((data) => {
        if (mounted && data && data.length > 0) {
          setCities(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const states = useMemo(() => {
    const unique = Array.from(new Set(cities.map((c) => c.state).filter(Boolean)));
    return unique.sort((a, b) => a.localeCompare(b));
  }, [cities]);

  const districts = useMemo(() => {
    const stateCities = cities
      .filter((c) => c.state.toLowerCase() === state.toLowerCase())
      .map((c) => c.city)
      .sort((a, b) => a.localeCompare(b));
    return ['All Districts', ...stateCities];
  }, [cities, state]);

  // Two-way sync: map clicks and cross-tab selections update the selectors.
  useEffect(() => {
    if (!selectedCity || cities.length === 0) return;
    const match = cities.find((c) => c.city.toLowerCase() === selectedCity.toLowerCase());
    if (match) {
      setState(match.state);
      setDistrict(match.city);
    }
  }, [selectedCity, cities]);

  const handleStateChange = (newState: string) => {
    setState(newState);
    const available = cities
      .filter((c) => c.state.toLowerCase() === newState.toLowerCase())
      .map((c) => c.city)
      .sort((a, b) => a.localeCompare(b));

    const newDistrict = available.length > 0 ? available[0] : 'All Districts';
    setDistrict(newDistrict);

    if (newDistrict !== 'All Districts' && onSelectCity) {
      onSelectCity(newDistrict);
    }
  };

  const handleDistrictChange = (newDistrict: string) => {
    setDistrict(newDistrict);
    if (newDistrict !== 'All Districts' && onSelectCity) {
      onSelectCity(newDistrict);
    } else if (onSelectCity) {
      const available = cities.filter((c) => c.state.toLowerCase() === state.toLowerCase()).map((c) => c.city);
      if (available.length > 0) {
        onSelectCity(available[0]);
      }
    }
  };

  const handleQuickStationSelect = (station: string) => {
    const match = cities.find((c) => c.city.toLowerCase() === station.toLowerCase());
    if (match) {
      setState(match.state);
      setDistrict(match.city);
    } else {
      setDistrict(station);
    }
    if (onSelectCity) {
      onSelectCity(station);
    }
  };

  return (
    <div className="mb-6 space-y-2.5">
      {/* Quick Mobile Station Ribbon (<640px) */}
      <div className="block sm:hidden">
        <div className="flex items-center justify-between mb-1.5 px-0.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Quick Stations
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">Swipe &rarr;</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none snap-x snap-mandatory touch-pan-x -mx-1 px-1">
          {POPULAR_STATIONS.map((station) => {
            const isSelected =
              (selectedCity && selectedCity.toLowerCase() === station.toLowerCase()) ||
              (!selectedCity && district && district.toLowerCase() === station.toLowerCase());
            return (
              <button
                key={station}
                type="button"
                onClick={() => handleQuickStationSelect(station)}
                className={`snap-start shrink-0 min-h-[44px] px-3.5 py-2 rounded-full text-xs font-mono transition-all flex items-center justify-center active:scale-95 ${
                  isSelected
                    ? 'gradient-animated-ink text-white font-bold shadow-xs'
                    : 'bg-card text-foreground border border-border hover:bg-secondary'
                }`}
              >
                {station}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Geographic Selectors Bar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border bg-card px-3 py-2">
        <span className="inline-flex items-center rounded-md bg-secondary px-2.5 py-1.5 text-xs font-semibold text-foreground border border-border">
          <MapPin size={13} className="mr-1.5 text-action" />
          India
        </span>

        <Select value={state} onValueChange={handleStateChange}>
          <SelectTrigger className="h-9 w-full sm:w-[220px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {states.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={district} onValueChange={handleDistrictChange}>
          <SelectTrigger className="h-9 w-full sm:w-[210px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {districts.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="ml-auto hidden md:flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
          {district === 'All Districts' ? state : district}
          <span className="text-border">·</span>
          {state}
        </span>
      </div>
    </div>
  );
}

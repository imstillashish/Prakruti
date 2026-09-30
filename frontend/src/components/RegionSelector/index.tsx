'use client';
import { useState, useEffect, useMemo } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { Panel } from '@/components/shell/Panel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCityForecastsData, MOCK_CITIES } from '@/lib/api';
import type { CityForecast } from '@/types';

interface RegionSelectorProps {
  selectedCity?: string | null;
  onSelectCity?: (city: string) => void;
}

export function RegionSelector({ selectedCity, onSelectCity }: RegionSelectorProps) {
  const [cities, setCities] = useState<CityForecast[]>(MOCK_CITIES);
  const [state, setState] = useState('Uttar Pradesh');
  const [district, setDistrict] = useState('Kanpur');
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch dynamic cities list from API
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

  // 2. Extract unique states dynamically from the 45 stations dataset
  const states = useMemo(() => {
    const unique = Array.from(new Set(cities.map((c) => c.state).filter(Boolean)));
    return unique.sort((a, b) => a.localeCompare(b));
  }, [cities]);

  // 3. Extract districts/forecast stations belonging to the selected state dynamically
  const districts = useMemo(() => {
    const stateCities = cities
      .filter((c) => c.state.toLowerCase() === state.toLowerCase())
      .map((c) => c.city)
      .sort((a, b) => a.localeCompare(b));
    return ['All Districts', ...stateCities];
  }, [cities, state]);

  // 4. Two-way synchronization: when selectedCity prop updates (e.g. from Leaflet map click)
  useEffect(() => {
    if (!selectedCity || cities.length === 0) return;
    const match = cities.find((c) => c.city.toLowerCase() === selectedCity.toLowerCase());
    if (match) {
      setState(match.state);
      setDistrict(match.city);
    }
  }, [selectedCity, cities]);

  // 5. State selection handler
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

  // 6. District / Station selection handler
  const handleDistrictChange = (newDistrict: string) => {
    setDistrict(newDistrict);
    if (newDistrict !== 'All Districts' && onSelectCity) {
      onSelectCity(newDistrict);
    } else if (newDistrict === 'All Districts' && onSelectCity) {
      const available = cities.filter((c) => c.state.toLowerCase() === state.toLowerCase()).map((c) => c.city);
      if (available.length > 0) {
        onSelectCity(available[0]);
      }
    }
  };

  return (
    <Panel
      title="Station selector"
      subtitle="Pick where you want the forecast for"
      term="station"
      actions={
        <span className="text-[10px] text-accent-foreground font-semibold px-2 py-0.5 bg-accent border border-primary/30 flex items-center gap-1">
          <Navigation size={10} /> Auto-Sync
        </span>
      }
    >
      <div className="space-y-3">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">Country</span>
          <div className="flex items-center h-10 w-full px-3 text-sm bg-secondary border border-input">
            India
          </div>
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">State / Union Territory</span>
          <Select value={state} onValueChange={handleStateChange}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {states.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block">District / Forecast Station</span>
          <Select value={district} onValueChange={handleDistrictChange}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {districts.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3.5 p-3 flex items-center justify-between font-mono bg-secondary border border-border">
        <div className="flex items-center gap-2">
          <MapPin size={13} className="text-primary" />
          <span className="text-xs text-foreground">
            <span className="font-bold text-accent-foreground">{district === 'All Districts' ? state : district}</span>
            <span className="text-muted-foreground"> · {state}</span>
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">Active Synoptic Station</span>
      </div>
    </Panel>
  );
}

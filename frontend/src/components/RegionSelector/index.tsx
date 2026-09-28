'use client';
import { useState, useEffect, useMemo } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { CustomDropdown } from '@/components/ui/CustomDropdown';
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
    <GlassCard padding="md" variant="default">
      <div className="flex items-center justify-between mb-3 border-b border-[#dbdbdb] pb-2 font-mono">
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-[#1db961]" />
          <span className="text-xs font-bold tracking-wider text-[#212121] uppercase">
            STATION SELECTOR
          </span>
        </div>
        <span
          style={{ borderRadius: 0 }}
          className="text-[10px] text-[#12723c] font-semibold px-2 py-0.5 bg-[#f2fcf7] border border-[#95eebc] flex items-center gap-1"
        >
          <Navigation size={10} /> Auto-Sync
        </span>
      </div>

      <div className="space-y-3">
        <CustomDropdown
          label="Country"
          options={['India']}
          value="India"
          onChange={() => {}}
        />

        <CustomDropdown
          label="State / Union Territory"
          options={states}
          value={state}
          onChange={handleStateChange}
        />

        <CustomDropdown
          label="District / Forecast Station"
          options={districts}
          value={district}
          onChange={handleDistrictChange}
        />
      </div>

      <div
        className="mt-3.5 p-3 flex items-center justify-between font-mono bg-[#f7f7f7] border border-[#dbdbdb]"
        style={{ borderRadius: 0 }}
      >
        <div className="flex items-center gap-2">
          <MapPin size={13} className="text-[#1db961]" />
          <span className="text-xs text-[#212121]">
            <span className="font-bold text-[#14522f]">{district === 'All Districts' ? state : district}</span>
            <span className="text-[#808080]"> · {state}</span>
          </span>
        </div>
        <span className="text-[10px] text-[#808080]">Active Synoptic Station</span>
      </div>
    </GlassCard>
  );
}

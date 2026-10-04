'use client';
import { useState, useMemo, useEffect } from 'react';
import { MapPin, ChevronDown, Check, Search } from '@/components/icons';
import { Modal } from '@/components/ui/Modal';
import { MOCK_CITIES, getCityForecastsData } from '@/lib/api';
import type { CityForecast } from '@/types';

/**
 * The phone's station switcher. It used to be the left half of the docked thumb
 * bar; that bar is gone, so the chip now sits pinned at the right edge of the
 * section strip — still in the thumb zone, and 61px of phone chrome lighter.
 */
export function PhoneStationPicker({
  selectedCity,
  onSelectCity,
}: {
  selectedCity?: string | null;
  onSelectCity?: (city: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cities, setCities] = useState<CityForecast[]>(MOCK_CITIES);

  const city = selectedCity || 'Kanpur';

  useEffect(() => {
    let mounted = true;
    getCityForecastsData()
      .then((data) => {
        if (mounted && data && data.length > 0) setCities(data);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return cities;
    const q = searchQuery.toLowerCase();
    return cities.filter(
      (c) => c.city.toLowerCase().includes(q) || c.state.toLowerCase().includes(q),
    );
  }, [cities, searchQuery]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[44px] items-center gap-1.5 rounded-md border border-border/80 bg-secondary px-3 text-xs font-semibold text-foreground transition-transform hover:bg-accent active:scale-[0.98] font-mono touch-manipulation"
        aria-label={`Select station, currently ${city}`}
      >
        <MapPin size={14} className="shrink-0 text-action" />
        <span className="truncate max-w-[68px] min-[360px]:max-w-[104px]">{city.toUpperCase()}</span>
        <ChevronDown size={13} className="shrink-0 text-muted-foreground" />
      </button>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setSearchQuery('');
        }}
        title="Select Weather Station"
        size="sm"
      >
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by city or state..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-foreground font-mono placeholder:text-muted-foreground"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1 divide-y divide-border/30">
            {filteredCities.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                No matching stations found.
              </div>
            ) : (
              filteredCities.map((item) => {
                const isSelected = item.city.toLowerCase() === city.toLowerCase();
                return (
                  <button
                    key={item.city}
                    type="button"
                    onClick={() => {
                      onSelectCity?.(item.city);
                      setOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-left rounded-md transition-colors touch-manipulation ${
                      isSelected
                        ? 'bg-secondary text-foreground font-semibold'
                        : 'hover:bg-accent text-foreground'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium">{item.city}</div>
                      <div className="text-xs text-muted-foreground">{item.state}</div>
                    </div>
                    {isSelected && <Check size={16} className="text-foreground shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}

'use client';
import { useState, useMemo, useEffect } from 'react';
import { MapPin, Bell, RotateCcw, ChevronDown, Check, Search } from '@/components/icons';
import { Modal } from '@/components/ui/Modal';
import { AlertDrawer } from '@/components/AlertCenter';
import { MOCK_CITIES, MOCK_ALERTS, getCityForecastsData } from '@/lib/api';
import type { CityForecast } from '@/types';

export interface DockedThumbBarProps {
  selectedCity?: string | null;
  onSelectCity?: (city: string) => void;
  onOpenAlerts?: () => void;
  onRefresh?: () => void;
}

export function DockedThumbBar({
  selectedCity,
  onSelectCity,
  onOpenAlerts,
  onRefresh,
}: DockedThumbBarProps) {
  const [stationModalOpen, setStationModalOpen] = useState(false);
  const [internalAlertOpen, setInternalAlertOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cities, setCities] = useState<CityForecast[]>(MOCK_CITIES);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const city = selectedCity || 'Kanpur';

  useEffect(() => {
    let mounted = true;
    getCityForecastsData()
      .then((data) => {
        if (mounted && data && data.length > 0) {
          setCities(data);
        }
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
      (c) => c.city.toLowerCase().includes(q) || c.state.toLowerCase().includes(q)
    );
  }, [cities, searchQuery]);

  const activeAlertCount = useMemo(() => {
    return MOCK_ALERTS.filter((a) => a.type === 'danger' || a.type === 'warning').length;
  }, []);

  const handleAlerts = () => {
    if (onOpenAlerts) {
      onOpenAlerts();
    } else {
      setInternalAlertOpen(true);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    onRefresh?.();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <>
      <aside
        aria-label="Mobile navigation bar"
        className="block sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
          {/* Left: Station Quick Chip & Synoptic Risk Pill */}
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => setStationModalOpen(true)}
              className="min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary hover:bg-accent border border-border/80 text-foreground font-mono text-xs font-semibold active:scale-[0.98] transition-transform touch-manipulation"
              aria-label={`Select station, currently ${city}`}
            >
              <MapPin size={14} className="text-action shrink-0" />
              <span className="truncate max-w-[80px] min-[360px]:max-w-[110px]">
                {city.toUpperCase()}
              </span>
              <ChevronDown size={13} className="text-muted-foreground shrink-0" />
            </button>

            <span className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-full bg-secondary border border-border/60 text-[10px] font-mono font-medium text-foreground whitespace-nowrap shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a] animate-pulse" />
              <span className="hidden min-[360px]:inline">LOW RISK</span>
              <span className="min-[360px]:hidden">LOW</span>
            </span>
          </div>

          {/* Right: Quick Action Buttons (>=44px touch targets) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleAlerts}
              className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-secondary active:scale-95 transition-all touch-manipulation"
              aria-label="Active weather alerts"
              title="Weather alerts"
            >
              <Bell size={18} />
              {activeAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-destructive text-[9px] font-mono font-bold text-white leading-none">
                  {activeAlertCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-secondary hover:text-[#16a34a] active:scale-95 transition-all touch-manipulation"
              aria-label="Recalculate forecast index"
              title="Refresh forecast index"
            >
              <RotateCcw
                size={17}
                className={`transition-transform duration-500 ${isRefreshing ? 'animate-spin text-[#16a34a]' : ''}`}
              />
            </button>
          </div>
        </div>
      </aside>

      {/* Station Selection Modal for mobile thumb interaction */}
      <Modal
        open={stationModalOpen}
        onClose={() => {
          setStationModalOpen(false);
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
                      setStationModalOpen(false);
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

      {/* Internal AlertDrawer fallback if onOpenAlerts was not supplied by caller */}
      {!onOpenAlerts && (
        <AlertDrawer open={internalAlertOpen} onClose={() => setInternalAlertOpen(false)} />
      )}
    </>
  );
}

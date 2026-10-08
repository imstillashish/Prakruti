'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Info, Lock, Pointer } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CityForecast } from '@/types';

// Dynamically import Leaflet with SSR disabled
const RealLeafletMap = dynamic(() => import('./RealLeafletMap'), {
  ssr: false,
  loading: () => (
    <LoadingState
      label="Loading synoptic map"
      hint="CartoDB tiles · 45 station markers"
      rows={4}
      className="h-[280px] sm:h-[360px] lg:h-[480px]"
    />
  ),
});

const LEAD_TIMES = ['6h', '12h', '24h', '48h', '72h'];

interface WeatherMapProps {
  selectedCity?: string | null;
  onSelectCity?: (city: CityForecast) => void;
  /** Stretch to the grid row height (Forecast page pairs it with a taller
      panel). Below lg the map keeps its fixed viewport heights. */
  fillHeight?: boolean;
}

export function WeatherMap({ selectedCity, onSelectCity, fillHeight }: WeatherMapProps) {
  const [leadTime, setLeadTime] = useState('24h');
  const [isMapActive, setIsMapActive] = useState(false);
  const [isTwoFingerTouch, setIsTwoFingerTouch] = useState(false);

  return (
    <section className={`rounded-lg border border-border bg-card overflow-hidden${fillHeight ? ' flex flex-col h-full' : ''}`}>
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5 px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin size={16} className="shrink-0 text-foreground" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground tracking-tight">
                Synoptic Geospatial Map
              </span>
              <Badge variant="rain">45 Stations</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Real CartoDB Topographic Grid · Live Station Telemetry</p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Lead time selector */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-secondary border border-border">
            {LEAD_TIMES.map((t) => (
              <button
                key={t}
                onClick={() => setLeadTime(t)}
                aria-pressed={leadTime === t}
                className={`relative px-4 py-2 min-h-[36px] flex items-center text-xs font-mono rounded-sm transition-colors duration-100 touch-manipulation after:absolute after:-inset-y-1 after:inset-x-0 after:content-[''] ${
                  leadTime === t
                    ? 'gradient-on-active font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                type="button"
              >
                {t}
              </button>
            ))}
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-1.5 text-muted-foreground hover:text-foreground cursor-help">
                <Info size={14} />
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-56 text-xs font-mono">
              <span className="font-bold">Cartographic Standard</span>
              <p className="text-muted-foreground mt-1 font-sans">
                Georeferenced to Survey of India &amp; CartoDB synoptic grid.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Map Body Container with Touch-Trap Protection */}
      <div className={`relative w-full overflow-hidden${fillHeight ? ' flex-1 min-h-0' : ''}`}>
        <RealLeafletMap
          leadTime={leadTime}
          selectedCity={selectedCity}
          onSelectCity={onSelectCity}
          isMapActive={isMapActive}
          fillHeight={fillHeight}
        />

        {/* Mobile & Touch Gesture Isolation Guard (Viewport < 1024px) */}
        {!isMapActive && (
          <div
            className={`lg:hidden absolute inset-0 z-[550] flex flex-col items-center justify-center bg-black/10 backdrop-blur-[1px] select-none touch-pan-y transition-opacity ${
              isTwoFingerTouch ? 'pointer-events-none' : 'pointer-events-auto'
            }`}
            onTouchStart={(e) => {
              if (e.touches.length >= 2) setIsTwoFingerTouch(true);
            }}
            onTouchMove={(e) => {
              if (e.touches.length >= 2) setIsTwoFingerTouch(true);
            }}
            onTouchEnd={(e) => {
              if (e.touches.length < 2) setIsTwoFingerTouch(false);
            }}
            onTouchCancel={() => setIsTwoFingerTouch(false)}
          >
            <button
              type="button"
              onClick={() => setIsMapActive(true)}
              className="inline-flex items-center gap-2 px-5 py-3 min-h-[44px] rounded-full bg-card/95 text-foreground border border-border shadow-lg text-xs font-semibold active:scale-95 transition-all cursor-pointer"
            >
              <Pointer size={16} className="text-action" />
              <span>Tap to interact with map</span>
            </button>
            <span className="mt-2 text-[10px] sm:text-[11px] font-mono text-muted-foreground bg-card/90 px-2.5 py-1 rounded-full border border-border shadow-xs">
              Use 2 fingers to pan/zoom · Tap to unlock
            </span>
          </div>
        )}

        {/* Floating Lock Map Button when unlocked (Viewport < 1024px) */}
        {isMapActive && (
          <div className="lg:hidden absolute top-3 right-3 z-[600]">
            <button
              type="button"
              onClick={() => setIsMapActive(false)}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-md bg-card/95 text-foreground border border-border shadow-md text-xs font-mono font-medium active:scale-95 transition-all cursor-pointer"
            >
              <Lock size={14} className="text-muted-foreground" />
              <span>Lock map (Scroll page)</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

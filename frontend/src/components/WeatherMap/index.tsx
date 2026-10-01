'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Info, Hand, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MapLayer, CityForecast } from '@/types';

// Dynamically import Leaflet with SSR disabled
const RealLeafletMap = dynamic(() => import('./RealLeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[280px] sm:h-[360px] lg:h-[480px] bg-secondary animate-pulse flex flex-col items-center justify-center text-muted-foreground gap-3 font-mono rounded-md">
      <div className="w-8 h-8 border-2 border-foreground border-t-transparent animate-spin" />
      <span className="text-xs">Initializing GIS Synoptic Cartography Grid…</span>
    </div>
  ),
});

const LAYERS: { id: MapLayer; label: string }[] = [
  { id: 'rainfall', label: 'Rainfall' },
  { id: 'temperature', label: 'Temperature' },
  { id: 'wind', label: 'Wind' },
  { id: 'extreme_risk', label: 'Extreme Risk' },
  { id: 'model_dominance', label: 'Model Dominance' },
  { id: 'confidence', label: 'Confidence' },
];

const LEAD_TIMES = ['6h', '12h', '24h', '48h', '72h'];

interface WeatherMapProps {
  selectedCity?: string | null;
  onSelectCity?: (city: CityForecast) => void;
}

export function WeatherMap({ selectedCity, onSelectCity }: WeatherMapProps) {
  const [layer, setLayer] = useState<MapLayer>('rainfall');
  const [leadTime, setLeadTime] = useState('24h');
  const [isMapActive, setIsMapActive] = useState(false);
  const [isTwoFingerTouch, setIsTwoFingerTouch] = useState(false);

  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5 px-4 sm:px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin size={16} className="shrink-0 text-foreground" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground tracking-tight">
                Synoptic Geospatial Map
              </span>
              <Badge variant="water">45 Stations</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Real CartoDB Topographic Grid · Seamless Multi-Layer Navigation</p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Lead time selector */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-secondary border border-border">
            {LEAD_TIMES.map((t) => (
              <button
                key={t}
                onClick={() => setLeadTime(t)}
                className={`px-2.5 py-1 text-xs font-mono rounded-sm transition-colors duration-100 ${
                  leadTime === t
                    ? 'bg-card text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                type="button"
              >
                {t}
              </button>
            ))}
          </div>

          {/* Layer selector */}
          <Select value={layer} onValueChange={(v) => setLayer(v as MapLayer)}>
            <SelectTrigger className="w-[140px] sm:w-[170px] h-8 text-xs font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LAYERS.map((l) => (
                <SelectItem key={l.id} value={l.id} className="text-xs font-mono">
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
      <div className="relative w-full overflow-hidden">
        <RealLeafletMap
          layer={layer}
          leadTime={leadTime}
          selectedCity={selectedCity}
          onSelectCity={onSelectCity}
          isMapActive={isMapActive}
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
              <Hand size={16} className="text-water" />
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

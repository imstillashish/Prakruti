'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Layers, ChevronDown, MapPin, Info } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import { MapLayer, CityForecast } from '@/types';

// Dynamically import Leaflet with SSR disabled
const RealLeafletMap = dynamic(() => import('./RealLeafletMap'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full h-[520px] bg-[#f7f7f7] animate-pulse flex flex-col items-center justify-center text-[#808080] gap-3 border border-[#dbdbdb] font-mono"
      style={{ borderRadius: 0 }}
    >
      <div className="w-8 h-8 border-2 border-[#1db961] border-t-transparent animate-spin" />
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
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);

  return (
    <GlassCard padding="none" variant="default" className="overflow-hidden">
      {/* Controls Bar */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-[#dbdbdb] font-mono"
      >
        <div className="flex items-center gap-2.5">
          <MapPin size={15} className="text-[#1db961]" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-[#212121] uppercase">
                SYNOPTIC GEOSPATIAL MAP
              </span>
              <Badge variant="info">45 Stations</Badge>
            </div>
            <p className="text-[11px] text-[#808080] mt-0.5 font-sans">Real CartoDB Topographic Grid · Seamless Multi-Layer Navigation</p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Lead time selector */}
          <div className="flex items-center p-0.5 bg-[#f7f7f7] border border-[#dbdbdb]" style={{ borderRadius: 0 }}>
            {LEAD_TIMES.map((t) => (
              <button
                key={t}
                onClick={() => setLeadTime(t)}
                style={{ borderRadius: 0 }}
                className={`px-2.5 py-1 text-xs font-mono transition-colors ${
                  leadTime === t
                    ? 'bg-[#1db961] text-white font-semibold'
                    : 'text-[#575757] hover:text-[#212121]'
                }`}
                type="button"
              >
                {t}
              </button>
            ))}
          </div>

          {/* Layer Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setLayerMenuOpen(!layerMenuOpen)}
              style={{ borderRadius: 0 }}
              className="flex items-center gap-2 px-3 py-1 text-xs font-mono font-medium text-[#212121] bg-white hover:bg-[#f7f7f7] border border-[#dbdbdb] shadow-xs transition-colors"
              type="button"
            >
              <Layers size={13} className="text-[#1db961]" />
              <span>{LAYERS.find((l) => l.id === layer)?.label}</span>
              <ChevronDown size={13} className={`text-[#808080] transition-transform ${layerMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {layerMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 overflow-hidden z-30 py-1 shadow-md border border-[#dbdbdb] min-w-[170px] bg-white font-mono"
                style={{ borderRadius: 0 }}
              >
                {LAYERS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      setLayer(l.id);
                      setLayerMenuOpen(false);
                    }}
                    style={{ borderRadius: 0 }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                      layer === l.id
                        ? 'bg-[#f2fcf7] text-[#14522f] font-bold border-l-2 border-[#1db961]'
                        : 'text-[#575757] hover:bg-[#f7f7f7] hover:text-[#212121]'
                    }`}
                    type="button"
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Tooltip
            content={
              <div className="p-1 max-w-[220px] text-xs font-mono">
                <span className="font-bold text-[#212121]">Cartographic Standard</span>
                <p className="text-[#575757] mt-1 font-sans">
                  Georeferenced to Survey of India &amp; CartoDB synoptic grid.
                </p>
              </div>
            }
          >
            <div className="p-1.5 text-[#808080] hover:text-[#212121] cursor-help">
              <Info size={14} />
            </div>
          </Tooltip>
        </div>
      </div>

      {/* Map Body */}
      <div className="p-2 sm:p-3 bg-[#f7f7f7]">
        <RealLeafletMap
          layer={layer}
          leadTime={leadTime}
          selectedCity={selectedCity}
          onSelectCity={onSelectCity}
        />
      </div>
    </GlassCard>
  );
}

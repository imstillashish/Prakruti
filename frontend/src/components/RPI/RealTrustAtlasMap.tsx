'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RpiData } from '@/types';
import { MAP_CONFIG, MAPBOX_ACCESS_TOKEN } from '@/lib/mapConfig';
import { getRpiMapGeoJson, RpiMapGeoJson } from '@/lib/api';
import { RotateCcw, ShieldCheck, Search } from '@/components/icons';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { SERIES, DATA } from '@/lib/palette';
interface RealTrustAtlasMapProps {
  stations: RpiData[];
  selectedCity?: string | null;
  onSelectCity?: (city: string) => void;
  className?: string;
  activeModelFilter?: string | null;
}

// Fixed base map — satellite when a Mapbox token is configured, OSM otherwise.
const BASE_TILE = MAPBOX_ACCESS_TOKEN ? 'satellite' : 'positron';

const MODEL_STYLE_MAP: Record<string, { hex: string; label: string }> = {
  ECMWF: { hex: SERIES.ECMWF, label: 'ECMWF IFS (European Centre)' },
  ICON: { hex: SERIES.ICON, label: 'ICON Seamless (DWD Germany)' },
  GFS: { hex: SERIES.GFS, label: 'GFS Global (NOAA / NCEP)' },
  GEM: { hex: SERIES.GEM, label: 'GEM Global (ECCC Canada)' },
};

export default function RealTrustAtlasMap({
  stations,
  selectedCity,
  onSelectCity,
  className,
  activeModelFilter,
}: RealTrustAtlasMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [geoJsonData, setGeoJsonData] = useState<RpiMapGeoJson | null>(null);
  const [apiConnected, setApiConnected] = useState<boolean>(false);

  // 1. Fetch GeoJSON from /api/rpi/map Map API
  useEffect(() => {
    let mounted = true;
    getRpiMapGeoJson()
      .then((data) => {
        if (mounted && data) {
          setGeoJsonData(data);
          setApiConnected(true);
        }
      })
      .catch(() => {
        if (mounted) setApiConnected(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: MAP_CONFIG.defaultCenter,
      zoom: MAP_CONFIG.defaultZoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
      maxBounds: [[6.0, 68.0], [38.0, 98.0]] as L.LatLngBoundsExpression,
      maxBoundsViscosity: 0.85,
      zoomControl: false,
      attributionControl: false,
    });

    const tileInfo = MAP_CONFIG.tiles[BASE_TILE];
    L.tileLayer(tileInfo.url, {
      maxZoom: tileInfo.maxZoom,
      tileSize: tileInfo.tileSize || 256,
      subdomains: ('subdomains' in tileInfo && tileInfo.subdomains) ? tileInfo.subdomains : 'abc',
    }).addTo(map);

    mapInstanceRef.current = map;

    const timer1 = setTimeout(() => map.invalidateSize(), 150);
    const timer2 = setTimeout(() => map.invalidateSize(), 500);

    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', onResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Combined Station Data from GeoJSON API or Props
  const displayStations: RpiData[] = useMemo(() => {
    let list: RpiData[] = stations;
    if (geoJsonData && geoJsonData.features && geoJsonData.features.length > 0) {
      list = geoJsonData.features.map((f) => ({
        city: f.properties.city,
        state: f.properties.state,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
        rpiScore: f.properties.rpiScore,
        priority: f.properties.priority,
        dominantModel: f.properties.dominantModel,
        rainfall: f.properties.rainfall,
        temperature: f.properties.temperature,
        wind: f.properties.wind,
        confidence: f.properties.confidence,
        rainRisk: Math.min(100, Math.round((f.properties.rainfall / 80) * 100)),
        heatRisk: Math.min(100, Math.max(0, Math.round(((f.properties.temperature - 25) / 20) * 100))),
        windRisk: Math.min(100, Math.round((f.properties.wind / 65) * 100)),
        modelWeights: { ecmwf: 45, icon: 25, gfs: 18, gem: 12 },
        recommendations: [],
        updatedAt: '2026-09-26T18:30:00Z',
      }));
    }
    if (activeModelFilter && activeModelFilter !== 'ALL') {
      return list.filter(
        (s: RpiData) => (s.dominantModel || 'ECMWF').toUpperCase() === activeModelFilter.toUpperCase()
      );
    }
    return list;
  }, [geoJsonData, stations, activeModelFilter]);

  // 3. Render Markers with Dominant-Model Color-Coding
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || displayStations.length === 0) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    const isDarkBg = BASE_TILE === 'satellite';

    displayStations.forEach((st) => {
      const isSelected = selectedCity?.toLowerCase() === st.city.toLowerCase();
      const dom = (st.dominantModel || 'ECMWF').toUpperCase();
      const modelStyle = MODEL_STYLE_MAP[dom] || MODEL_STYLE_MAP['ECMWF'];
      const color = modelStyle.hex;

      const markerHtml = `
        <div class="relative flex items-center justify-center group cursor-pointer" style="width: ${
          isSelected ? '44px' : '32px'
        }; height: ${isSelected ? '44px' : '32px'};">
          <!-- Pulse animation on selected or high risk -->
          <div class="absolute inset-0 rounded-full animate-ping ${
            isSelected ? 'opacity-70' : 'opacity-25'
          }" style="background-color: ${color};"></div>
          
          ${
            isSelected
              ? `<div class="absolute -inset-2 rounded-full border-2 animate-pulse shadow-lg" style="border-color: ${color};"></div>`
              : ''
          }

          <!-- Outer Core with Model Initial -->
          <div class="relative ${
            isSelected ? 'w-6 h-6 ring-4 ring-white shadow-xl' : 'w-4 h-4 ring-2 ring-white shadow-md'
          } rounded-full flex items-center justify-center transition-all duration-200" style="background-color: ${color};">
            <span class="text-[9px] font-black text-white leading-none">${dom[0]}</span>
          </div>

          <!-- Station Tag -->
          <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded text-[9.5px] font-bold shadow-xs border pointer-events-none transition-all ${
            isSelected
              ? 'bg-foreground text-white border-foreground z-30 scale-105'
              : isDarkBg
              ? 'bg-foreground/90 text-white border-foreground'
              : 'bg-popover text-popover-foreground border-border'
          }">
            <span>${st.city}</span>
            <span class="ml-1 text-[8.5px] font-semibold" style="color: ${isSelected || isDarkBg ? '#ffffff' : color};">${dom}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-model-trust-marker',
        html: markerHtml,
        iconSize: isSelected ? [44, 44] : [32, 32],
        iconAnchor: isSelected ? [22, 22] : [16, 16],
      });

      const marker = L.marker([st.lat, st.lon], { icon: customIcon }).addTo(map);

      // Station Detail Popup
      const popupHtml = `
        <div style="font-family: inherit; min-width: 195px; padding: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid #f0f0f3; padding-bottom: 4px;">
            <strong style="font-size: 13px; color: #171717; text-transform: uppercase;">${st.city}</strong>
            <span style="font-size: 10px; font-weight: 700; color: #0a5594; background: rgba(13,116,206,0.08); padding: 2px 6px; border-radius: 9999px;">${st.state}</span>
          </div>
          <div style="margin-bottom: 6px;">
            <span style="font-size: 10px; color: #60646c; display: block;">Dominant NWP Model:</span>
            <span style="font-size: 12px; font-weight: 800; color: ${color};">${dom} (${modelStyle.label.split(' ')[0]})</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 8px; font-size: 11px; background: #ffffff; padding: 6px; border-radius: 8px; border: 1px solid #f0f0f3;">
            <div><span style="color: #60646c; font-size: 9.5px; display: block;">RPI Score</span><strong style="font-size: 12px; color: #171717;">${st.rpiScore}/100</strong></div>
            <div><span style="color: #60646c; font-size: 9.5px; display: block;">Confidence</span><strong style="font-size: 12px; color: #15803d;">${st.confidence}%</strong></div>
            <div><span style="color: #60646c; font-size: 9.5px; display: block;">Rainfall</span><strong style="font-size: 11px; color: ${DATA.rain};">${st.rainfall} mm</strong></div>
            <div><span style="color: #60646c; font-size: 9.5px; display: block;">Temp</span><strong style="font-size: 11px; color: #ab6400;">${st.temperature}°C</strong></div>
          </div>
          <div style="margin-top: 6px; font-size: 9.5px; color: #60646c; text-align: center;">Click to update EOC Resource Protocols</div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        closeButton: true,
        offset: [0, -10],
      });

      marker.on('click', () => {
        map.flyTo([st.lat, st.lon], 8, { duration: 1.2 });
        if (onSelectCity) onSelectCity(st.city);
      });

      markersRef.current[st.city] = marker;
    });
  }, [displayStations, selectedCity, onSelectCity]);

  // 4. Auto Pan / Zoom to Selected City
  useEffect(() => {
    if (!selectedCity || !mapInstanceRef.current) return;
    const match = displayStations.find((s) => s.city.toLowerCase() === selectedCity.toLowerCase());
    if (match) {
      mapInstanceRef.current.flyTo([match.lat, match.lon], 8, { duration: 1.2 });
      const m = markersRef.current[match.city];
      if (m) m.openPopup();
    }
  }, [selectedCity, displayStations]);

  // Handle Search Input
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const match = displayStations.find((s) =>
      s.city.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
    if (match) {
      mapInstanceRef.current?.flyTo([match.lat, match.lon], 8, { duration: 1.2 });
      const m = markersRef.current[match.city];
      if (m) m.openPopup();
      if (onSelectCity) onSelectCity(match.city);
    }
  };

  return (
    <div className={`relative w-full overflow-hidden rounded-lg border border-border ${className || 'h-[560px]'}`}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Floating Bar: Map API Status & Station Search */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Station / District..."
            className="w-48 sm:w-56 pl-7 pr-3 py-1 rounded-md text-xs font-mono bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
          />
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </form>

        <div className="px-2 py-1 rounded-full bg-card border border-border flex items-center gap-1.5 text-[10px] font-mono font-semibold text-muted-foreground">
          <span
            className={`w-1.5 h-1.5 ${
              apiConnected ? 'bg-success' : 'bg-warning'
            }`}
          />
          <span>{MAPBOX_ACCESS_TOKEN ? 'Mapbox API (HD GL)' : 'Leaflet CartoDB'}</span>
        </div>
      </div>

      {/* Top Right Floating Controls: Zoom & Reset */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-1.5">
        {/* Zoom & Reset Buttons */}
        <div className="flex flex-col gap-0.5 rounded-md border border-border bg-card overflow-hidden">
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="w-7 h-7 text-foreground hover:bg-secondary flex items-center justify-center font-bold text-xs transition-colors cursor-pointer border-b border-border"
           
            title="Zoom In"
          >
            <ZoomIn size={13} />
          </button>
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="w-7 h-7 text-foreground hover:bg-secondary flex items-center justify-center font-bold text-xs transition-colors cursor-pointer border-b border-border"
           
            title="Zoom Out"
          >
            <ZoomOut size={13} />
          </button>
          <button
            type="button"
            onClick={() => {
              mapInstanceRef.current?.flyTo(MAP_CONFIG.defaultCenter, MAP_CONFIG.defaultZoom, { duration: 1.2 });
            }}
            className="w-7 h-7 text-foreground hover:bg-secondary flex items-center justify-center text-xs transition-colors cursor-pointer"
           
            title="Reset View"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* Bottom Floating Legend Bar */}
      <div className="absolute bottom-4 left-4 z-20 px-3 py-1.5 rounded-md bg-card border border-border flex flex-wrap items-center gap-3 text-xs font-mono">
        <div className="flex items-center gap-1.5 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
          <ShieldCheck className="w-3.5 h-3.5 text-success" />
          <span>Dominant Model:</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SERIES.ECMWF }} />
            <span className="text-foreground text-[11px]">ECMWF</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SERIES.ICON }} />
            <span className="text-foreground text-[11px]">ICON</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SERIES.GFS }} />
            <span className="text-foreground text-[11px]">GFS</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SERIES.GEM }} />
            <span className="text-foreground text-[11px]">GEM</span>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground normal-case">
          Each dot is a station, tinted by the model that forecasts it best
        </span>
      </div>
    </div>
  );
}

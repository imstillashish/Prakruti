'use client';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getCityForecastsData, MOCK_CITIES } from '@/lib/api';
import { CityForecast } from '@/types';
import { MAP_CONFIG, MAPBOX_ACCESS_TOKEN } from '@/lib/mapConfig';
import { RotateCcw, ZoomIn, ZoomOut } from '@/components/icons';
import { DATA, seriesColor } from '@/lib/palette';
interface RealLeafletMapProps {
  leadTime: string;
  selectedCity?: string | null;
  onSelectCity?: (city: CityForecast) => void;
  isMapActive?: boolean;
  fillHeight?: boolean;
}

// Fixed base map — satellite when a Mapbox token is configured, OSM otherwise.
const BASE_TILE = MAPBOX_ACCESS_TOKEN ? 'satellite' : 'osm';

export default function RealLeafletMap({
  leadTime,
  selectedCity,
  onSelectCity,
  isMapActive = false,
  fillHeight = false,
}: RealLeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const [activeHoverCity, setActiveHoverCity] = useState<CityForecast | null>(null);
  const [cities, setCities] = useState<CityForecast[]>(MOCK_CITIES);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

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
        if (mounted) {
          setIsError(true);
          setIsLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: MAP_CONFIG.defaultCenter,
      zoom: MAP_CONFIG.defaultZoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
      zoomControl: false,
      attributionControl: false,
    });

    const tileInfo = MAP_CONFIG.tiles[BASE_TILE];

    L.tileLayer(tileInfo.url, {
      maxZoom: tileInfo.maxZoom,
      tileSize: 256,
      subdomains: ('subdomains' in tileInfo && tileInfo.subdomains) ? tileInfo.subdomains : 'abc',
    }).addTo(map);

    mapInstanceRef.current = map;

    // Gesture isolation: On mobile/touch (<1024px), disable dragging unless explicitly unlocked
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
    if (!isDesktop && !isMapActive) {
      map.dragging.disable();
    }

    // Critical fix: force Leaflet to recalculate container viewport dimensions
    const timer1 = setTimeout(() => map.invalidateSize(), 100);
    const timer2 = setTimeout(() => map.invalidateSize(), 400);

    const onResize = () => {
      map.invalidateSize();
      const desktop = window.innerWidth >= 1024;
      if (desktop || isMapActive) {
        map.dragging.enable();
      } else {
        map.dragging.disable();
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', onResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync dragging state when isMapActive prop changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
    if (isDesktop || isMapActive) {
      map.dragging.enable();
    } else {
      map.dragging.disable();
    }
  }, [isMapActive]);

  // 2. Render Synoptic Weather Station Pulse Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    const isDarkBg = BASE_TILE === 'satellite';

    cities.forEach((city) => {
      const color = city.rainfall > 50 ? DATA.rainDark : DATA.rain;
      const text = `${city.rainfall} mm`;
      const isSelected = selectedCity ? city.city.toLowerCase() === selectedCity.toLowerCase() : false;

      const customIcon = L.divIcon({
        className: 'custom-weather-marker',
        html: `
          <div class="relative flex items-center justify-center group cursor-pointer" style="width: 44px; height: 44px;">
            <!-- Radar Beacon Pulse Animation -->
            <div class="absolute inset-0 rounded-full animate-ping ${isSelected ? 'opacity-70' : 'opacity-35'}" style="background-color: ${color};"></div>
            
            ${isSelected ? `<div class="absolute -inset-1.5 rounded-full border-2 border-[#0d74ce] animate-pulse shadow-md"></div>` : ''}

            <!-- Pinpoint Center Core -->
            <div class="relative ${isSelected ? 'w-5 h-5 scale-110' : 'w-4 h-4'} rounded-full border-2 border-white shadow-lg flex items-center justify-center" style="background-color: ${color};">
              <div class="${isSelected ? 'w-2 h-2' : 'w-1.5 h-1.5'} rounded-full bg-white"></div>
            </div>

            <!-- Crisp Weather Badge Label -->
            <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight shadow-md border pointer-events-none transition-all duration-200 group-hover:scale-110 ${
              isSelected
                ? 'bg-foreground text-white border-white ring-2 ring-foreground/30 z-30 scale-105'
                : isDarkBg
                ? 'bg-foreground/90 text-white border-white/20'
                : 'bg-popover text-popover-foreground border-border'
            }">
              <span>${city.city}</span>
              <span class="ml-1 opacity-80 text-[9px] font-medium" style="color: ${isSelected || isDarkBg ? '#ffffff' : '#0e7490'};">${text}</span>
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const marker = L.marker([city.lat, city.lon], { icon: customIcon }).addTo(map);

      // Station detail popup
      const popupContent = `
        <div style="font-family: inherit; min-width: 170px; padding: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid #f0f0f3; padding-bottom: 4px;">
            <span style="font-weight: 800; font-size: 13px; color: #171717; text-transform: uppercase;">${city.city}</span>
            <span style="font-size: 10px; font-weight: 700; color: #0a5594; background: rgba(13,116,206,0.08); padding: 2px 6px; border-radius: 9999px;">${city.state}</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 8px; font-size: 11px;">
            <div><span style="color: #60646c; font-size: 10px; display: block;">Rainfall</span><strong style="color: #0e7490; font-size: 12px;">${city.rainfall} mm</strong></div>
            <div><span style="color: #60646c; font-size: 10px; display: block;">Temp</span><strong style="color: #ab6400; font-size: 12px;">${city.temperature}°C</strong></div>
            <div><span style="color: #60646c; font-size: 10px; display: block;">Wind</span><strong style="color: #60646c; font-size: 12px;">${city.wind} km/h</strong></div>
            <div><span style="color: #60646c; font-size: 10px; display: block;">Reliability</span><strong style="color: #15803d; font-size: 12px;">${city.confidence}% ${city.confidenceLabel ? '(' + city.confidenceLabel + ')' : ''}</strong></div>
          </div>
          <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #f0f0f3; font-size: 10px; color: #60646c; display: flex; justify-content: space-between;">
            <span>Dominant Model:</span>
            <strong style="color: ${seriesColor(city.dominantModel)};">${city.dominantModel}</strong>
          </div>
          ${city.explanation ? `
          <div style="margin-top: 4px; font-size: 9.5px; color: #60646c; font-style: italic; background: #fafafa; padding: 4px 6px; border-radius: 6px; border: 1px solid #f0f0f3; line-height: 1.3;">
            &quot;${city.explanation}&quot;
          </div>` : ''}
        </div>
      `;
      marker.bindPopup(popupContent, {
        closeButton: true,
        offset: [0, -12],
      });

      marker.on('mouseover', () => {
        setActiveHoverCity(city);
      });

      marker.on('click', () => {
        map.flyTo([city.lat, city.lon], 9, {
          duration: 1.4,
          easeLinearity: 0.25,
        });
        setActiveHoverCity(city);
        marker.openPopup();
        if (onSelectCity) onSelectCity(city);
      });

      markersRef.current[city.city] = marker;
    });
  }, [onSelectCity, cities, selectedCity]);

  // 3. Smooth FlyTo Zoom & Open Popup when city is selected
  useEffect(() => {
    if (!selectedCity || !mapInstanceRef.current) return;
    const target = cities.find((c) => c.city.toLowerCase() === selectedCity.toLowerCase());
    if (target) {
      mapInstanceRef.current.flyTo([target.lat, target.lon], 9, {
        duration: 1.4,
        easeLinearity: 0.25,
      });
      setActiveHoverCity(target);
      const marker = markersRef.current[target.city];
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedCity, cities]);

  // Controls
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleReset = () => {
    mapInstanceRef.current?.flyTo(MAP_CONFIG.defaultCenter, MAP_CONFIG.defaultZoom, {
      duration: 1.4,
    });
    setActiveHoverCity(null);
  };

  return (
    <div
      className={
        fillHeight
          ? 'relative w-full h-[240px] sm:h-[360px] lg:h-full overflow-hidden rounded-b-lg border-t border-border'
          : 'relative w-full h-[240px] sm:h-[360px] lg:h-[480px] overflow-hidden rounded-b-lg border-t border-border'
      }
    >
      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Map Controls Bar */}
      <div className={`absolute ${isMapActive ? 'top-16 lg:top-4' : 'top-4'} right-3 lg:right-4 z-[500] flex flex-col gap-2 font-mono transition-all`}>
        {/* Zoom & Reset Controls — self-start keeps the cluster compact */}
        <div className="flex flex-col self-start bg-card p-1 shadow-md border border-border rounded-md">
          <button
            onClick={handleZoomIn}
            className="flex min-h-11 min-w-11 items-center justify-center p-1.5 hover:bg-secondary text-foreground transition-colors rounded-md"
            title="Zoom In"
            type="button"
          >
            <ZoomIn size={15} />
          </button>
          <div className="h-px bg-border" />
          <button
            onClick={handleZoomOut}
            className="flex min-h-11 min-w-11 items-center justify-center p-1.5 hover:bg-secondary text-foreground transition-colors rounded-md"
            title="Zoom Out"
            type="button"
          >
            <ZoomOut size={15} />
          </button>
          <div className="h-px bg-border" />
          <button
            onClick={handleReset}
            className="flex min-h-11 min-w-11 items-center justify-center p-1.5 hover:bg-secondary text-muted-foreground hover:text-success transition-colors rounded-md"
            title="Reset to All-India View"
            type="button"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* Floating Selected/Hovered Station Card */}
      {(() => {
        const activeCardCity = activeHoverCity || (selectedCity ? cities.find(c => c.city.toLowerCase() === selectedCity.toLowerCase()) : null) || cities[0];
        if (!activeCardCity) return null;

        return (
          <div
            className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-[500] p-2.5 sm:p-3.5 shadow-md border border-border max-w-[220px] sm:max-w-[260px] bg-card font-mono rounded-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold tracking-tight text-foreground">
                {activeCardCity.city}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border font-sans"
              >
                {activeCardCity.state}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div className="bg-secondary p-1.5 rounded-md">
                <span className="text-muted-foreground block text-[10px]">Rainfall</span>
                <span className="font-semibold text-data-rain text-sm">{activeCardCity.rainfall} mm</span>
              </div>
              <div className="bg-secondary p-1.5 rounded-md">
                <span className="text-muted-foreground block text-[10px]">Temperature</span>
                <span className="font-semibold text-foreground text-sm">{activeCardCity.temperature}°C</span>
              </div>
              <div className="hidden sm:block bg-secondary p-1.5 rounded-md">
                <span className="text-muted-foreground block text-[10px]">Wind</span>
                <span className="font-semibold text-foreground text-sm">{activeCardCity.wind} km/h</span>
              </div>
              <div className="hidden sm:block bg-secondary p-1.5 rounded-md">
                <span className="text-muted-foreground block text-[10px]">Confidence</span>
                <span className="font-semibold text-foreground text-sm">{activeCardCity.confidence}%</span>
              </div>
            </div>
            <div className="hidden sm:flex mt-2 pt-1.5 border-t border-border text-[11px] text-muted-foreground items-center justify-between">
              <span>Dominant:</span>
              <span className="font-semibold text-foreground">{activeCardCity.dominantModel}</span>
            </div>
            {activeCardCity.explanation && (
              <div className="hidden sm:block mt-1 pt-1 border-t border-border text-[10px] text-muted-foreground leading-snug">
                {activeCardCity.explanation}
              </div>
            )}
          </div>
        );
      })()}

      {/* Leaflet CSS Overrides to Prevent Tailwind `img` Reset Collisions */}
      <style jsx global>{`
        .custom-weather-marker {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-container {
          font-family: inherit !important;
          background: #ffffff !important;
        }
        /* CRITICAL: Overrides Tailwind CSS default img rules for Leaflet tiles */
        .leaflet-container img,
        .leaflet-tile-container img,
        .leaflet-tile {
          max-width: none !important;
          max-height: none !important;
          width: 256px !important;
          height: 256px !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
        }
      `}</style>
    </div>
  );
}

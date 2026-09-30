'use client';

import { useState, useEffect } from 'react';
import { Activity, Clock, Database, Layers, MapPin, RefreshCw } from 'lucide-react';
import { getMetadata, MetadataRecord } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Explain } from '@/components/explain/Explain';

function formatStatusStripDate(isoString?: string): string {
  if (!isoString) return '26 Sep 2026 • 23:45 IST';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '26 Sep 2026 • 23:45 IST';
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} • ${hours}:${minutes} IST`;
  } catch {
    return '26 Sep 2026 • 23:45 IST';
  }
}

export function StatusStrip() {
  const [metadata, setMetadata] = useState<MetadataRecord>({
    last_updated: '2026-09-26T23:45:12',
    cities: 45,
    models: 4,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [isError, setIsError] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    getMetadata()
      .then((data) => {
        if (mounted && data) {
          setMetadata(data);
          setIsWakingUp(false);
          setIsError(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setIsError(true);
          setIsWakingUp(false);
          setStatusMessage(err?.message || 'Server is waking up. Please try again.');
        }
      });

    const handleStatus = (e: Event) => {
      const customEvent = e as CustomEvent<{ wakingUp?: boolean; error?: boolean; message?: string }>;
      if (mounted && customEvent.detail) {
        setIsWakingUp(!!customEvent.detail.wakingUp);
        setIsError(!!customEvent.detail.error);
        if (customEvent.detail.message) {
          setStatusMessage(customEvent.detail.message);
        }
      }
    };

    window.addEventListener('backend-status', handleStatus);

    return () => {
      mounted = false;
      window.removeEventListener('backend-status', handleStatus);
    };
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setIsError(false);
    getMetadata()
      .then((data) => {
        if (data) {
          setMetadata(data);
          setIsError(false);
          setIsWakingUp(false);
        }
      })
      .catch((err) => {
        setIsError(true);
        setIsWakingUp(false);
        setStatusMessage(err?.message || 'Server is waking up. Please try again.');
      })
      .finally(() => {
        setTimeout(() => setIsRefreshing(false), 600);
      });
  };

  const formattedDate = formatStatusStripDate(metadata.last_updated);
  const cityCount = metadata.cities || metadata.city_count || 45;
  const modelCount = metadata.models || metadata.model_count || 4;

  return (
    <div
      className="mb-5 px-4 py-2.5 transition-all bg-white border border-border shadow-xs"
      style={{
        borderRadius: 0,
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Item 1: Operational Status */}
        <div className="flex items-center gap-3">
          {isWakingUp ? (
            <div className="flex items-center gap-2 px-2.5 py-0.5 bg-destructive/10 border-destructive/20">
              <span className="w-2.5 h-2.5 border-2 border-[#f59e0b] border-t-transparent animate-spin inline-block" />
              <span className="text-[10px] font-bold text-[#f59e0b] tracking-wider uppercase">
                Connecting
              </span>
            </div>
          ) : isError ? (
            <div className="flex items-center gap-2 px-2.5 py-0.5 bg-[#fbf5f4] border border-[#cf746e]">
              <span className="inline-block h-2 w-2 bg-[#b42318]" />
              <span className="text-[10px] font-bold text-[#b42318] tracking-wider uppercase">
                Standby
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-2.5 py-0.5 bg-secondary border-border">
              <span className="inline-block h-2 w-2 bg-success status-pulse" />
              <span className="text-[10px] font-bold text-success tracking-wider uppercase">
                Operational
              </span>
            </div>
          )}

          <span className={`text-xs font-bold ${isWakingUp ? 'text-warning' : isError ? 'text-destructive' : 'text-foreground hidden sm:inline'}`}>
            {isWakingUp
              ? 'Starting AI weather engine… This may take up to 60 seconds.'
              : isError
              ? (statusMessage || 'Server is waking up. Please try again.')
              : 'Active · Auto-Updating'}
          </span>
        </div>

        {/* Status Metrics Items */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs">
          {/* Item 2: Last Updated */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-secondary flex items-center justify-center text-foreground border-border">
              <Clock size={13} />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Last Updated
              </div>
              <Badge variant="secondary" className="font-mono">{formattedDate}</Badge>
            </div>
          </div>

          <div className="hidden md:block w-px h-7 bg-border" />

          {/* Item 3: Data Source */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-secondary flex items-center justify-center text-foreground border-border">
              <Database size={13} />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Data Source
              </div>
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <span>Live Open-Meteo</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-foreground font-semibold border border-border">
                  API
                </span>
              </div>
            </div>
          </div>

          <div className="hidden md:block w-px h-7 bg-border" />

          {/* Item 4: Models Blended */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-secondary flex items-center justify-center text-foreground border-border">
              <Layers size={13} />
            </div>
            <div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Models Blended
                <Explain term="models" />
              </div>
              <div className="font-semibold text-foreground">
                {modelCount} <span className="font-medium text-muted-foreground">(ECMWF, GFS, ICON, GEM)</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:block w-px h-7 bg-border" />

          {/* Item 5: Forecast Stations */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-secondary flex items-center justify-center text-foreground border-border">
              <MapPin size={13} />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Forecast Stations
              </div>
              <div className="font-semibold text-foreground">
                {cityCount} Cities
              </div>
            </div>
          </div>

          {/* Quick Refresh Icon */}
          <button
            type="button"
            onClick={handleManualRefresh}
            title="Refresh Status"
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-water' : ''} />
          </button>
        </div>
      </div>
    </div>
  );
}

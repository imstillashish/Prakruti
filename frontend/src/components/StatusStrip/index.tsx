'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { getMetadata, MetadataRecord } from '@/lib/api';
import { Explain } from '@/components/explain/Explain';

function formatCycle(isoString?: string): string {
  if (!isoString) return '26 Sep 2026 · 23:45 IST';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '26 Sep 2026 · 23:45 IST';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} · ${hours}:${minutes} IST`;
  } catch {
    return '26 Sep 2026 · 23:45 IST';
  }
}

function EngineChip({
  isWakingUp,
  isError,
}: {
  isWakingUp: boolean;
  isError: boolean;
}) {
  if (isWakingUp) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full border-2 border-warning border-t-transparent animate-spin" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-warning">Connecting</span>
      </span>
    );
  }
  if (isError) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-destructive" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-destructive">Standby</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-success status-pulse" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">Operational</span>
    </span>
  );
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

  const cityCount = metadata.cities || metadata.city_count || 45;
  const modelCount = metadata.models || metadata.model_count || 4;

  return (
    <div className="mb-6 border-b border-border bg-card">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 py-2.5 text-xs">
        <EngineChip isWakingUp={isWakingUp} isError={isError} />

        <span
          className={`text-xs ${
            isWakingUp ? 'text-warning' : isError ? 'text-destructive' : 'text-muted-foreground'
          }`}
        >
          {isWakingUp
            ? 'Starting the weather engine — this can take up to 60 seconds.'
            : isError
            ? statusMessage || 'Server is waking up. Please try again.'
            : null}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground font-sans">
              Stations
            </span>
            <span className="text-foreground">{cityCount}</span>
          </span>

          <span className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground font-sans">
              Models
            </span>
            <span className="text-foreground flex items-center gap-1">
              {modelCount}
              <Explain term="models" />
            </span>
          </span>

          <span className="hidden sm:flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground font-sans">
              Cycle
            </span>
            <span className="text-foreground">{formatCycle(metadata.last_updated)}</span>
          </span>

          <button
            type="button"
            onClick={handleManualRefresh}
            title="Refresh status"
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-water' : ''} />
          </button>
        </div>
      </div>
    </div>
  );
}

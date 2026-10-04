'use client';
import { useEffect, useState } from 'react';
import { Activity, Droplets, Wind, CloudRain, Thermometer } from '@/components/icons';
import { useLiveConditions, LIVE_POLL_MS } from '@/lib/useLiveConditions';
import { useNow, mmss } from '@/lib/useNow';
import { IntradayStrip } from './IntradayStrip';
import { useTweenNumber, usePrefersReducedMotion } from '@/components/spectrumui/charts/chart-engine';
import { cn } from '@/lib/utils';

/** 'now' / '42s ago' / '3m ago' — the freshness of the reading on screen. */
function agoLabel(seconds: number | null): string {
  if (seconds == null) return '—';
  if (seconds < 10) return 'now';
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function Reading({
  icon,
  label,
  value,
  unit,
  big,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  big?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-baseline gap-1.5 whitespace-nowrap', className)}>
      <span className="inline-flex translate-y-0.5">{icon}</span>
      <span className="text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground font-sans">{label}</span>
      <span className={cn('font-semibold text-foreground tabular-nums', big ? 'text-sm' : 'text-xs')}>
        {value}
      </span>
      <span className="text-[10.5px] text-muted-foreground">{unit}</span>
    </span>
  );
}

/**
 * The station's measured conditions right now, straight from Open-Meteo.
 *
 * This is deliberately separate from the forecast metrics above it: those are
 * what the blend predicts, this is what the instruments report. Renders
 * nothing when the feed is unavailable, so the dashboard never shows a
 * measured value it did not measure.
 *
 * The poller picks up a new reading without anyone touching the page. The
 * numbers themselves only move when one actually arrives — upstream publishes
 * on its own cadence, and inventing a per-second wobble would be inventing
 * data. What ticks every second is the clock around them: how long ago this
 * reading landed, and how long until the next one is due.
 */
export function LiveConditionsBand({ city }: { city: string }) {
  const { live, receivedAt, isPolling } = useLiveConditions(city);
  const reduce = usePrefersReducedMotion();
  const now = useNow(1000);

  const rawTemp = live?.current.temperature ?? null;
  const rawFeels = live?.current.feels_like ?? null;
  const rawWind = live?.current.wind_speed ?? null;
  const rawRain = live?.current.precipitation ?? null;

  // Hooks run unconditionally; the band simply does not render without data.
  const temp = useTweenNumber(rawTemp ?? 0, { enabled: !reduce && rawTemp != null });
  const feels = useTweenNumber(rawFeels ?? 0, { enabled: !reduce && rawFeels != null });
  const wind = useTweenNumber(rawWind ?? 0, { enabled: !reduce && rawWind != null });
  const rain = useTweenNumber(rawRain ?? 0, { enabled: !reduce && rawRain != null });

  // A new reading holds the band's tint for a moment, so a value that changed
  // while nobody was looking is visible as a change rather than as a number
  // that happens to be different this time.
  const [justArrived, setJustArrived] = useState(false);
  useEffect(() => {
    if (receivedAt == null) return;
    setJustArrived(true);
    const id = window.setTimeout(() => setJustArrived(false), 1400);
    return () => window.clearTimeout(id);
  }, [receivedAt]);

  if (!live) return null;

  const seconds = receivedAt ? Math.round((now - receivedAt) / 1000) : null;
  const dueIn = receivedAt ? LIVE_POLL_MS - (now - receivedAt) : null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border px-3 py-2.5 sm:px-4 transition-colors duration-500',
        justArrived && 'bg-success/[0.04]',
      )}
    >
      <div className="flex items-center gap-2">
        <Activity size={13} className="text-data-ok-text" />
        <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.08em] text-data-ok-text">
          {live.stale ? 'Last reading' : 'Measured now'}
        </span>
        <span className="text-[11px] text-muted-foreground">{live.current.condition}</span>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <Reading
          icon={<Thermometer size={12} className="text-muted-foreground" />}
          label="Temp"
          value={temp.toFixed(1)}
          unit="°C"
          big
        />
        {live.current.feels_like != null && (
          <Reading
            icon={<Thermometer size={12} className="text-muted-foreground" />}
            label="Feels"
            value={feels.toFixed(1)}
            unit="°C"
            className="hidden sm:inline-flex"
          />
        )}
        {live.current.humidity != null && (
          <Reading
            icon={<Droplets size={12} className="text-data-rain" />}
            label="RH"
            value={Math.round(live.current.humidity).toString()}
            unit="%"
          />
        )}
        <Reading
          icon={<Wind size={12} className="text-muted-foreground" />}
          label="Wind"
          value={wind.toFixed(1)}
          unit="km/h"
        />
        <Reading
          icon={<CloudRain size={12} className="text-data-rain" />}
          label="Rain"
          value={rain.toFixed(1)}
          unit="mm"
          className="hidden sm:inline-flex"
        />

        {/* Freshness rides on the readings' line. As its own full-width row the
            ml-auto above pushed it onto a new one, so the band grew a whole row
            of micro-text just to say when this reading landed. */}
        <div className="font-mono text-[10.5px] text-muted-foreground tabular-nums">
          <span className={live.stale ? 'text-warning' : undefined}>
            Observed {live.observed_at_ist ?? '—'} IST · refreshed {agoLabel(seconds)}
          </span>
          {isPolling ? (
            <span> · reading…</span>
          ) : dueIn != null && dueIn > 0 ? (
            <span> · next in {mmss(dueIn)}</span>
          ) : null}
          <span className="hidden lg:inline"> · {live.source}</span>
        </div>
      </div>

      <div className="w-full border-t border-border/60 pt-2">
        <IntradayStrip live={live} />
      </div>
    </div>
  );
}

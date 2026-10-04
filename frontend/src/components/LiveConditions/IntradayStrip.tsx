'use client';
import { useEffect, useRef, useState } from 'react';
import { monotonePath } from '@/components/spectrumui/charts/chart-engine';
import { useNow, istClock } from '@/lib/useNow';
import type { LiveConditions } from '@/lib/api';

/** A sparkline, not a chart panel. */
const H = 36;
const PAD_Y = 5;
const PAD_X = 2;
/** IST is a fixed +05:30, so the offset can be applied to the epoch directly. */
const IST_OFFSET_MS = 330 * 60_000;

/** Minutes-of-day in IST, fractional so the cursor moves inside a minute. */
function istMinutes(ms: number): number {
  const d = new Date(ms + IST_OFFSET_MS);
  return d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
}

/** 'HH:MM' -> minutes of day, or null when the feed left the slot empty. */
function clockMinutes(hhmm: string | null): number | null {
  if (!hhmm || hhmm.length < 5) return null;
  const h = Number(hhmm.slice(0, 2));
  const m = Number(hhmm.slice(3, 5));
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}

/**
 * The station's temperature over the last 12 hours, at the 15-minute steps the
 * feed publishes, with a cursor pinned to now.
 *
 * The right edge is the clock, not the last sample, so the window never quietly
 * goes stale — it slides as time passes. The final point is the station's own
 * current reading, so the closing segment is the live edge: it stretches until
 * the next 15-minute sample lands and takes its place.
 *
 * Only temperature is drawn. Rain over a dry day is a flat line at zero and
 * wind is a different scale; one honest variable reads better than three.
 */
export function IntradayStrip({ live }: { live: LiveConditions }) {
  const now = useNow(1000);
  const host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: H });

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const ro = new ResizeObserver(([entry]) =>
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height }),
    );
    ro.observe(node);
    const box = node.getBoundingClientRect();
    setSize({ w: box.width, h: box.height });
    return () => ro.disconnect();
  }, []);

  // `recent` is optional on the wire — a payload without history must cost the
  // strip, not the page.
  const recent = live.recent ?? [];
  const samples = recent
    .map((p) => ({ m: clockMinutes(p.time), v: p.temperature }))
    .filter((p): p is { m: number; v: number } => p.m != null && p.v != null);

  // The feed stamps local wall-clock times with no date, so a window that
  // crosses midnight reads as going backwards. Carrying each point into the
  // previous one's frame restores an ordered axis.
  const axis: number[] = [];
  for (const s of samples) {
    const prev = axis[axis.length - 1];
    let m = s.m;
    while (prev != null && m <= prev) m += 1440;
    axis.push(m);
  }

  const latest = live.current.temperature;
  const lastAxis = axis[axis.length - 1];
  let nowAxis = istMinutes(now);
  while (lastAxis != null && nowAxis < lastAxis) nowAxis += 1440;

  const geom = (() => {
    if (samples.length < 2 || size.w <= 0 || lastAxis == null) return null;
    const values = samples.map((s) => s.v);
    const all = latest != null ? [...values, latest] : values;
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const span = hi - lo || 1;
    const left = axis[0];

    const x = (m: number) =>
      PAD_X + ((m - left) / Math.max(1, nowAxis - left)) * (size.w - PAD_X * 2);
    const y = (v: number) => PAD_Y + (1 - (v - lo) / span) * (size.h - PAD_Y * 2);

    const points = samples.map((s, i) => ({ x: x(axis[i]), y: y(s.v) }));
    const livePoint = latest != null ? { x: x(nowAxis), y: y(latest) } : null;
    const line = monotonePath(livePoint ? [...points, livePoint] : points);
    const tail = livePoint ?? points[points.length - 1];
    const fill = `${line} L${tail.x},${size.h} L${points[0].x},${size.h} Z`;

    return { points, line, fill, livePoint, lo, hi };
  })();

  const firstClock = recent[0]?.time ?? '—';
  const lastClock = recent[recent.length - 1]?.time ?? '—';
  const nowValue = latest ?? samples[samples.length - 1]?.v ?? null;
  const delta = nowValue != null && samples.length > 1 ? nowValue - samples[0].v : null;

  if (samples.length < 2) return null;

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 font-mono text-[10.5px]">
        <span className="uppercase tracking-[0.08em] text-muted-foreground">
          Last 12h · 15-min
        </span>
        {/* Tight on a phone: the label and the clock have to share one line, and
            the clock is the part that has to stay. */}
        <span className="flex items-baseline gap-x-2 tabular-nums">
          {nowValue != null && (
            <span className="text-xs font-semibold text-foreground">{nowValue.toFixed(1)} °C</span>
          )}
          {delta != null && (
            <span className="hidden text-muted-foreground sm:inline">
              {delta >= 0 ? '+' : ''}
              {delta.toFixed(1)} in 12h
            </span>
          )}
          <span className="text-muted-foreground">now {istClock(now)} IST</span>
        </span>
      </div>

      <div
        ref={host}
        className="relative w-full"
        style={{ height: H }}
        role="img"
        aria-label={
          geom
            ? `Measured temperature from ${firstClock} to ${lastClock} IST, ranged ${geom.lo.toFixed(1)} to ${geom.hi.toFixed(1)} degrees${nowValue != null ? `, now ${nowValue.toFixed(1)}` : ''}`
            : 'Measured temperature history'
        }
      >
        {geom ? (
          <svg
            width={size.w}
            height={size.h}
            viewBox={`0 0 ${size.w} ${size.h}`}
            className="block h-full w-full overflow-visible"
            aria-hidden
          >
            <defs>
              {/* Ink, not the temperature scale: a mild afternoon is not a
                  hazard, and the scale's warm end means exactly that. */}
              <linearGradient id="intraday-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#171717" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#171717" stopOpacity={0} />
              </linearGradient>
            </defs>

            <path d={geom.fill} fill="url(#intraday-fill)" />
            <path
              d={geom.line}
              fill="none"
              stroke="#171717"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* The cursor: at the right edge because that edge is the clock. */}
            {geom.livePoint ? (
              <>
                <line
                  x1={geom.livePoint.x}
                  y1={PAD_Y - 2}
                  x2={geom.livePoint.x}
                  y2={size.h}
                  stroke="#171717"
                  strokeWidth={1.5}
                />
                <circle
                  cx={geom.livePoint.x}
                  cy={geom.livePoint.y}
                  r={3.5}
                  fill="#171717"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              </>
            ) : null}
          </svg>
        ) : null}
      </div>
    </div>
  );
}

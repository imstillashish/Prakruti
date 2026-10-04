'use client';
import { useEffect, useState } from 'react';

/**
 * Ticks a wall clock every `intervalMs`, paused while the tab is hidden.
 *
 * Per-second UI belongs in a leaf that only it re-renders. The dashboard's
 * charts are expensive to redraw, so a clock lives in its own small component
 * rather than in the state of whatever panel it appears in.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let timer: number | undefined;

    const start = () => {
      window.clearInterval(timer);
      timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    };

    const onVisibility = () => {
      if (document.hidden) {
        window.clearInterval(timer);
      } else {
        // Catch up the instant the tab is looked at again, then resume ticking.
        setNow(Date.now());
        start();
      }
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs]);

  return now;
}

/** '0:14' / '2:05' — a short countdown, for "next reading in …". */
export function mmss(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** IST is a fixed +05:30, so the offset can be applied to the epoch directly. */
const IST_CLOCK = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/** '19:05:12' in IST — the one clock format the live surfaces share. */
export function istClock(ms: number): string {
  return IST_CLOCK.format(ms);
}

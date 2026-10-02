'use client';
import { useCallback, useSyncExternalStore } from 'react';

/** Tailwind's `lg` breakpoint — the jump between the analytical and touch layouts. */
export const DESKTOP_QUERY = '(min-width: 1024px)';

/**
 * Matches `query` once the viewport is known. Returns null on the server and
 * through hydration so both renders agree, then the real value on the next pass.
 *
 * Only recharts trees need this. A chart inside a `hidden lg:block` branch (or
 * its `block lg:hidden` twin) still mounts when CSS hides it and measures 0x0 —
 * recharts warns about that, and the invisible chart also does real layout work
 * on every device. The surrounding markup stays CSS-driven.
 */
export function useMediaQuery(query: string): boolean | null {
  const subscribe = useCallback((onChange: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  const read = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, read, () => null);
}

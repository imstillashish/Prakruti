'use client';

import { AsciiReveal } from 'ascii-reveal';

/**
 * The page transition. Every section decodes into place as a single wave from
 * the top-left — the same gesture everywhere, so a nav swap reads as one event
 * rather than a cut. The component is keyed on the page in page.tsx, so a
 * remount is what starts the decode.
 *
 * Text only: cards, charts, and maps are left alone (`data-ascii="skip"` is
 * applied by the library to non-text nodes), which is why the wave is legible
 * instead of a screen-wide scramble.
 */
export function AsciiStage({ children }: { children: React.ReactNode }) {
  return (
    <AsciiReveal
      preset="decode"
      origin="top-left"
      speed={1.9}
      lazy={false}
      fallback
      aria-live="off"
    >
      {children}
    </AsciiReveal>
  );
}

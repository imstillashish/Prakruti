import type { SVGProps } from 'react';

/**
 * Static weather glyphs for the forecast strips.
 *
 * These are deliberately NOT the animated ItsHover set: those animate on
 * hover, and a row of seven hourly glyphs would each twitch when the pointer
 * crossed them. Weather icons are data marks — they hold still.
 *
 * Every glyph is a 24×24 outline so it aligns with the rest of the icon set,
 * and all of them take `currentColor` so they inherit the token colours.
 */

type GlyphProps = SVGProps<SVGSVGElement> & { size?: number };

function Frame({ size = 24, children, ...rest }: GlyphProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function SunGlyph(props: GlyphProps) {
  return (
    <Frame {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Frame>
  );
}

export function CloudGlyph(props: GlyphProps) {
  return (
    <Frame {...props}>
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </Frame>
  );
}

export function RainGlyph(props: GlyphProps) {
  return (
    <Frame {...props}>
      <path d="M17.5 16H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 0 1 0 9Z" />
      <path d="M10 19l-1 3M14 19l-1 3M18 19l-1 3" />
    </Frame>
  );
}

export function StormGlyph(props: GlyphProps) {
  return (
    <Frame {...props}>
      <path d="M17.5 15H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 0 1 0 9Z" />
      <path d="M13 13l-3 4h3l-1 4" />
    </Frame>
  );
}

export function EyeGlyph(props: GlyphProps) {
  return (
    <Frame {...props}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </Frame>
  );
}

export function FogGlyph(props: GlyphProps) {
  return (
    <Frame {...props}>
      <path d="M17.5 15H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 0 1 0 9Z" />
      <path d="M5 19h14M7 22h10" />
    </Frame>
  );
}

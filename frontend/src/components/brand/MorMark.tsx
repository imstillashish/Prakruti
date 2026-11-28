/**
 * Mor — the Prakruti brand mark. The peacock, India's rain-dancer,
 * with raindrop crest tips in the water signal colour.
 * Inline SVG so it inherits currentColor and stays crisp at any size.
 *
 * Usage: pass a `label` prop (string) for meaningful brand instances so
 * assistive technology can announce it. Decorative instances (where the
 * brand name appears nearby in text, e.g. splash/footer) omit the prop
 * and the SVG stays aria-hidden.
 */
export interface MorMarkProps {
  className?: string;
  /**
   * Accessible label for the brand mark. Omit when the mark is decorative
   * (e.g. splash/footer — brand name is visible alongside it). Required
   * for the favicon variant and any standalone brand usage.
   */
  label?: string;
}

export function MorMark({ className, label }: MorMarkProps) {
  const isMeaningful = Boolean(label);
  return (
    <svg
      viewBox="0 0 256 256"
      fill="none"
      className={className}
      role={isMeaningful ? 'img' : undefined}
      aria-hidden={!isMeaningful ? true : undefined}
      aria-label={label}
    >
      <title>{label ?? 'Prakruti brand mark — the peacock'}</title>
      <desc>
        The Prakruti peacock mark: a teal-crowned bird in profile, facing right,
        with raindrop-shaped feather tips in the water signal colour.
      </desc>

      {/* Crown — three symmetric stems with teardrop tips */}
      <g stroke="currentColor" strokeWidth="9" strokeLinecap="round" fill="none">
        <path d="M 152 74 L 152 34" />
        <path d="M 136 77 L 118 41" />
        <path d="M 168 77 L 186 41" />
      </g>
      {/* Larger teardrop tips — clearly raindrops at every size */}
      <path
        style={{ fill: 'var(--data-rain, #0e7490)' }}
        d="M 147 34 C 137 24 137 9 148 0 C 159 9 157 24 147 34 Z"
      />
      <path
        style={{ fill: 'var(--data-rain, #0e7490)' }}
        d="M 113 41 C 103 31 103 16 114 7 C 125 16 123 31 113 41 Z"
      />
      <path
        style={{ fill: 'var(--data-rain, #0e7490)' }}
        d="M 181 41 C 171 31 171 16 182 7 C 193 16 191 31 181 41 Z"
      />

      {/* Body — symmetric, clean at small sizes. The eye is a second subpath:
          evenodd knocks it out so the page background shows through, keeping it
          visible against any body colour. (A separate same-fill path is invisible.) */}
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M 96 128 C 96 94 121 72 152 72 C 183 72 208 94 208 128 C 208 150 196 166 178 174 C 186 192 186 212 180 232 L 124 232 C 118 212 118 192 126 174 C 108 166 96 150 96 128 Z M 167 121 a 14 14 0 1 0 0.01 0 Z"
      />

      {/* Tail fan — three clean feathers, symmetric */}
      <path fill="currentColor" d="M 204 118 L 242 134 L 204 152 Z" />
    </svg>
  );
}

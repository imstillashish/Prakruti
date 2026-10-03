import React from 'react';

interface ModelEmblemProps {
  method: string;
  size?: number;
  className?: string;
  title?: string;
}

type MarkId =
  | 'ecmwf'
  | 'dwd'
  | 'gfs'
  | 'gem'
  | 'weighted_blend'
  | 'equal_avg'
  | 'persistence'
  | 'unknown';

/**
 * Everything behind a method's identity: who runs it, how sharp and how fresh it is,
 * the terms its published mark is shown under, and the page it comes from. The source
 * card on the leaderboard reads this map.
 *
 * Institutional marks are the owners' published files (frontend/public/brands) used for
 * identification only — never recolored, never stretched, no endorsement implied. The only
 * derived asset is dwd-mark.png, the Bildmarke cropped out of the official DWD lockup;
 * eccc.svg is ~16:1, so rows show its flag portion through a crop window, no new art.
 */
export interface MarkProvenance {
  owner: string;
  resolution: string;
  cadence: string;
  license: string;
  source: string;
  /** Published file the mark is served from; our own tiles have none. */
  mark?: string;
  markSource?: string;
}

const MARK_PROVENANCE: Record<MarkId, MarkProvenance> = {
  ecmwf: {
    owner: 'ECMWF — European Centre for Medium-Range Weather Forecasts',
    resolution: '9 km HRES',
    cadence: '4 runs a day (00/06/12/18 UTC)',
    license: '© ECMWF — published master logo, identification only',
    source: 'https://www.ecmwf.int/en/forecasts/datasets/open-data',
    mark: 'ecmwf.png',
    markSource: 'ECMWF master logo, no strapline — climate.copernicus.eu branding page',
  },
  gfs: {
    owner: 'NOAA / NCEP — National Centers for Environmental Prediction',
    resolution: '13 km FV3',
    cadence: '4 runs a day (00/06/12/18 UTC)',
    license:
      'PD-USGov; the NOAA emblem is a registered trademark of the U.S. Department of Commerce',
    source: 'https://www.ncei.noaa.gov/products/weather-climate-models/global-forecast',
    mark: 'noaa.svg',
    markSource: 'NOAA emblem — Wikimedia Commons',
  },
  dwd: {
    owner: 'DWD — Deutscher Wetterdienst, Germany',
    resolution: '13 km Icosahedral',
    cadence: '4 runs a day (00/06/12/18 UTC)',
    license: '© Deutscher Wetterdienst — dwd.de legal notice',
    source:
      'https://www.dwd.de/EN/research/weatherforecasting/num_modelling/01_num_weather_prediction_modells/icon_description.html',
    mark: 'dwd-mark.png',
    markSource: 'DWD Wortbildmarke (dwd.de legal notice) — this file is its Bildmarke, cropped',
  },
  gem: {
    owner: 'ECCC — Environment and Climate Change Canada',
    resolution: '15 km Global',
    cadence: '2 runs a day (00/12 UTC)',
    license: 'PD Canada / PD-textlogo; trademark-protected in Canada',
    source: 'https://eccc-msc.github.io/open-data/msc-data/nwp_gdps/readme_gdps_en/',
    mark: 'eccc.svg',
    markSource:
      'ECCC bilingual signature — Wikimedia Commons; rows show its flag portion through a crop window',
  },
  weighted_blend: {
    owner: 'Prakruti — Team EXELION',
    resolution: 'Weighted blend of the four model grids, 45 cities',
    cadence: 'Rebuilt every 6 h with the rolling 72-hour window',
    license: 'Prakruti artwork — no third-party mark',
    source: 'https://github.com/imstillashish/Prakruti',
  },
  equal_avg: {
    owner: 'Prakruti — Team EXELION',
    resolution: 'Equal-weight mean of the same four grids',
    cadence: 'Rebuilt every 6 h with the rolling 72-hour window',
    license: 'Prakruti artwork — no third-party mark',
    source: 'https://github.com/imstillashish/Prakruti',
  },
  persistence: {
    owner: 'Prakruti — Team EXELION',
    resolution: 'City-level baseline, 24 h observation lag',
    cadence: 'Rebuilt every 6 h with the rolling 72-hour window',
    license: 'Prakruti artwork — no third-party mark',
    source: 'https://github.com/imstillashish/Prakruti',
  },
  unknown: {
    owner: 'Unlisted method',
    resolution: '—',
    cadence: '—',
    license: '—',
    source: 'https://github.com/imstillashish/Prakruti',
  },
};

function normalizeMethod(method: string): MarkId {
  const raw = (method || '').toLowerCase().trim();
  if (raw.includes('ecmwf') || raw === 'nwpa' || raw === 'nwp_a') return 'ecmwf';
  if (raw.includes('gfs') || raw === 'nwpb' || raw === 'nwp_b') return 'gfs';
  if (raw.includes('icon') || raw.includes('dwd')) return 'dwd';
  if (raw.includes('gem') || raw.includes('cmc') || raw.includes('eccc')) return 'gem';
  if (
    raw.includes('blend') ||
    raw.includes('hybrid') ||
    raw === 'ai' ||
    raw.includes('prakruti') ||
    raw.includes('ai residual') ||
    raw.includes('ai model')
  ) {
    return 'weighted_blend';
  }
  if (raw.includes('ensemble') || raw.includes('equal') || raw === 'ens') return 'equal_avg';
  if (raw.includes('persist')) return 'persistence';
  return 'unknown';
}

/** Null for methods outside the map — the card simply doesn't render for them. */
export function provenanceFor(method: string): MarkProvenance | null {
  const id = normalizeMethod(method);
  return id === 'unknown' ? null : MARK_PROVENANCE[id];
}

function markTitle(norm: MarkId, method: string): string {
  switch (norm) {
    case 'ecmwf':
      return 'ECMWF (European Centre for Medium-Range Weather Forecasts)';
    case 'gfs':
      return 'GFS (NOAA / NCEP Global Forecast System)';
    case 'dwd':
      return 'ICON (Deutscher Wetterdienst, Germany)';
    case 'gem':
      return 'GEM (Meteorological Service of Canada / ECCC)';
    case 'weighted_blend':
      return 'Prakruti AI Neural Hybrid Blend';
    case 'equal_avg':
      return 'Equal Average (Multi-Model Ensemble Mean)';
    case 'persistence':
      return 'Persistence (24h Observation Lag)';
    default:
      return method;
  }
}

/** Our own methods — tiles we drew ourselves. Nothing here claims to be an outside brand. */
function ownGlyph(norm: MarkId): React.ReactNode {
  switch (norm) {
    case 'weighted_blend':
      return (
        <svg viewBox="0 0 256 256" className="w-full h-full" fill="none">
          <rect width="256" height="256" rx="57.6" fill="#ffffff" />
          <g transform="translate(12.91 47.98) scale(0.681)" fill="none">
            <path
              fill="#171717"
              fillRule="evenodd"
              d="M 92 132 C 92 96 119 72 152 72 C 185 72 212 96 212 132 C 212 156 198 172 180 180 C 190 196 192 214 186 234 L 118 234 C 112 214 114 196 124 180 C 106 172 92 156 92 132 Z M 165 124 a 13 13 0 1 0 0.01 0 Z"
            />
            <path fill="#171717" d="M 206 120 L 246 136 L 206 154 Z" />
            <path
              fill="#0d74ce"
              d="M 110 48 C 98 36 98 18 111 7 C 124 18 122 36 110 48 Z"
            />
            <path
              fill="#0d74ce"
              d="M 147 42 C 135 30 135 12 148 1 C 161 12 159 30 147 42 Z"
            />
            <path
              fill="#0d74ce"
              d="M 184 48 C 172 36 172 18 185 7 C 198 18 196 36 184 48 Z"
            />
          </g>
        </svg>
      );

    case 'equal_avg':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
          <rect width="32" height="32" rx="4" fill="#4f46e5" />
          <path d="M 8 9 L 24 9" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <path
            d="M 11 14 L 21 24 M 21 14 L 11 24"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'persistence':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
          <rect width="32" height="32" rx="4" fill="#475569" />
          <path
            d="M 16 8 A 8 8 0 1 1 9.5 13.5"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path d="M 6 12 L 10 14 L 10 9" fill="#ffffff" />
          <path
            d="M 16 12 L 16 16 L 19 18"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
          <rect width="32" height="32" rx="4" fill="#94a3b8" />
          <circle cx="16" cy="16" r="6" fill="#ffffff" />
        </svg>
      );
  }
}

const INSTITUTION_SRC: Partial<Record<MarkId, string>> = {
  ecmwf: '/brands/ecmwf.png',
  dwd: '/brands/dwd-mark.png',
  gfs: '/brands/noaa.svg',
};

/**
 * ModelEmblem renders the identity mark for a forecast model or baseline method.
 * Institutional marks are the owners' real files at their native aspect; the blend,
 * equal-average and persistence tiles are Prakruti's own art.
 */
export function ModelEmblem({
  method,
  size = 16,
  className = '',
  title,
}: ModelEmblemProps) {
  const norm = normalizeMethod(method);
  const label = title || markTitle(norm, method);
  const src = INSTITUTION_SRC[norm];

  if (src) {
    return (
      <span
        className={`inline-flex items-center shrink-0 ${className}`}
        style={{ height: size }}
        title={label}
        aria-label={label}
      >
        <img src={src} alt="" style={{ height: size, width: 'auto', display: 'block' }} />
      </span>
    );
  }

  if (norm === 'gem') {
    // The published ECCC signature is ~16:1 — unreadable as an icon. Show the flag
    // portion of that same file instead of inventing a mark for the department.
    return (
      <span
        className={`inline-flex items-center overflow-hidden shrink-0 ${className}`}
        style={{ height: size, width: Math.round(size * 2.05) }}
        title={label}
        aria-label={label}
      >
        <img
          src="/brands/eccc.svg"
          alt=""
          style={{ height: size, width: 'auto', display: 'block' }}
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-xs border border-border/70 bg-card p-0.5 shadow-2xs shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size }}
      title={label}
      aria-label={label}
    >
      {ownGlyph(norm)}
    </span>
  );
}

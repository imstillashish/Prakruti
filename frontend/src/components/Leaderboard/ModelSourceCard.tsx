import type { ReactNode } from 'react';
import type { ModelCard } from '@/lib/api';
import { ModelEmblem, provenanceFor } from '@/components/common/ModelEmblem';
import { ChevronDown, Info } from '@/components/icons';

/**
 * Disclosure control for a method row: a labelled chip in the dense tables, just the
 * info glyph inside the phone cards. The hit area is expanded past the painted box
 * (DESIGN.md §9.6) instead of growing the row.
 */
export function SourceToggle({
  open,
  onToggle,
  iconOnly = false,
  label,
}: {
  open: boolean;
  onToggle: () => void;
  iconOnly?: boolean;
  label?: string;
}) {
  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`Source for ${label ?? 'this model'}`}
        title="Model source & provenance"
        className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/30 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary after:absolute after:-inset-3 after:content-['']"
      >
        <Info size={13} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="relative flex touch-manipulation items-center gap-1 rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-[10px] font-mono uppercase text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary after:absolute after:-inset-y-3 after:-inset-x-2 after:content-['']"
    >
      <span className="inline-flex items-center gap-1.5">
        <Info size={12} className="shrink-0" />
        Source
      </span>
      <ChevronDown
        size={12}
        className={`shrink-0 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
      />
    </button>
  );
}

function Field({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`flex gap-2 text-[11px] leading-snug ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="w-[104px] shrink-0 font-mono text-[10px] uppercase text-muted-foreground pt-px">
        {label}
      </dt>
      <dd className="min-w-0 text-foreground">{value}</dd>
    </div>
  );
}

const VARIABLE_LABELS: Record<string, string> = {
  temperature: 'Temp',
  rainfall: 'Rain',
  wind_speed: 'Wind',
};

function fmt(v: number | null | undefined, digits = 2): string {
  return v === null || v === undefined ? '—' : v.toFixed(digits);
}

/** The F-04 model card: identity, observed profile, bias and feed health. */
function FullModelCard({ method, label, card }: { method: string; label: string; card: ModelCard }) {
  const { identity, profile, bias, feed } = card;
  const vars = Object.keys(profile.variables);

  return (
    <div className="rounded-md border border-border/60 bg-muted/25 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <ModelEmblem method={method} size={14} />
        <span className="text-[11px] font-semibold text-foreground">{identity.name || label}</span>
        <span className="font-mono text-[10px] uppercase text-muted-foreground">model card</span>
      </div>

      <dl className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
        <Field label="Provider" value={identity.provider} />
        <Field label="Architecture" value={identity.architecture} />
        <Field label="Grid" value={identity.grid} />
        <Field label="Runs" value={identity.run_cycle} />
        <Field
          label="Lead range"
          value={`${identity.delivered_lead} · upstream ${identity.max_lead}`}
        />
        <Field
          label="License"
          value={
            <a
              href={identity.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-primary underline-offset-2 hover:underline"
            >
              {identity.data_license}
            </a>
          }
        />
      </dl>

      <div className="border-t border-border/40 pt-2">
        <p className="font-mono text-[10px] uppercase text-muted-foreground mb-1">
          Full-window national profile (rank · MAE)
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono">
          {vars.map((v) => (
            <span key={v}>
              <span className="text-muted-foreground">{VARIABLE_LABELS[v] || v}</span>{' '}
              <span className="text-foreground">
                #{profile.variables[v].rank} · {fmt(profile.variables[v].mae)}
              </span>
            </span>
          ))}
        </div>
      </div>

      {Object.keys(bias.per_variable).length > 0 && (
        <div className="border-t border-border/40 pt-2">
          <p className="font-mono text-[10px] uppercase text-muted-foreground mb-1">
            Bias ({bias.convention.split(':')[1]?.trim() || bias.convention})
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono">
            {Object.entries(bias.per_variable).map(([v, b]) =>
              b.national ? (
                <span key={v}>
                  <span className="text-muted-foreground">{VARIABLE_LABELS[v] || v}</span>{' '}
                  <span className="text-foreground">
                    {b.national.value > 0 ? '+' : ''}
                    {fmt(b.national.value, 3)} {b.national.unit}
                  </span>
                </span>
              ) : null,
            )}
            {bias.widest_city_gap && (
              <span className="text-muted-foreground">
                widest gap: {bias.widest_city_gap.city}{' '}
                {bias.widest_city_gap.gap > 0 ? '+' : ''}
                {fmt(bias.widest_city_gap.gap, 2)} {bias.widest_city_gap.unit} (
                {VARIABLE_LABELS[bias.widest_city_gap.variable] || bias.widest_city_gap.variable})
              </span>
            )}
          </div>
        </div>
      )}

      <p className="text-[10px] leading-snug text-muted-foreground border-t border-border/40 pt-2">
        Last cycle: {feed.status ?? '—'}
        {feed.rows_last_cycle !== null && ` · ${feed.rows_last_cycle.toLocaleString()} rows ingested`}
        . Not tracked: {card.not_tracked.length} fields, listed in{' '}
        <span className="font-mono">outputs/metadata_cards.json</span>.
      </p>
    </div>
  );
}

/** Compact source block: owner, resolution, cadence, license, source page. */
function CompactSourceCard({ method, label }: { method: string; label: string }) {
  const prov = provenanceFor(method);
  if (!prov) return null;

  return (
    <div className="rounded-md border border-border/60 bg-muted/25 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <ModelEmblem method={method} size={14} />
        <span className="text-[11px] font-semibold text-foreground">{label}</span>
        <span className="font-mono text-[10px] uppercase text-muted-foreground">
          model source
        </span>
      </div>

      <dl className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
        <Field label="Owner" value={prov.owner} />
        <Field label="Resolution" value={prov.resolution} />
        <Field label="Cadence" value={prov.cadence} />
        <Field label="License" value={prov.license} />
        <Field
          label="Source"
          wide
          value={
            <a
              href={prov.source}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-primary underline-offset-2 hover:underline"
            >
              {prov.source.replace(/^https?:\/\//, '')}
            </a>
          }
        />
      </dl>

      {prov.mark && prov.markSource && (
        <p className="text-[10px] leading-snug text-muted-foreground">
          Mark: <span className="font-mono">{prov.mark}</span> — {prov.markSource}. Shown for
          identification only; no endorsement implied.
        </p>
      )}
    </div>
  );
}

/**
 * The disclosure body for a method row: the full F-04 model card when the
 * cards registry is loaded, otherwise the compact source block.
 */
export function ModelSourceCard({
  method,
  label,
  card,
}: {
  method: string;
  label: string;
  card?: ModelCard | null;
}) {
  if (card) return <FullModelCard method={method} label={label} card={card} />;
  return <CompactSourceCard method={method} label={label} />;
}

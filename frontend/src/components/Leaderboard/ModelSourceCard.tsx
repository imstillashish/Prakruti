import type { ReactNode } from 'react';
import { ModelEmblem, provenanceFor } from '@/components/common/ModelEmblem';
import { ChevronDown, Info } from '@/components/icons';

/**
 * Disclosure control for a method row: a compact chip inside the dense tables,
 * a full-width 44px block inside the phone cards. The hit area of the chip is
 * expanded past its painted box (DESIGN.md §9.6) instead of growing the row.
 */
export function SourceToggle({
  open,
  onToggle,
  block = false,
}: {
  open: boolean;
  onToggle: () => void;
  block?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={`relative flex touch-manipulation items-center rounded-md border border-border/60 bg-muted/30 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        block
          ? 'w-full min-h-[44px] justify-between gap-2 px-3 py-3 text-[11px] font-mono'
          : 'gap-1 px-2 py-1 text-[10px] font-mono uppercase after:absolute after:-inset-y-2.5 after:-inset-x-2 after:content-[""]'
      }`}
    >
      <span className="inline-flex items-center gap-1.5">
        <Info size={12} className="shrink-0" />
        {block ? 'Model source & provenance' : 'Source'}
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

/** Source card: owner, resolution, cadence, license and source page for one model. */
export function ModelSourceCard({ method, label }: { method: string; label: string }) {
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

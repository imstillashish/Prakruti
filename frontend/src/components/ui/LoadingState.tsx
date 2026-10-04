'use client';
/**
 * The app's single waiting surface. Panels wait as their own shape — hairline
 * shell, mono label, skeleton rows with a sheen — rather than behind a spinner,
 * so the placeholder and the panel that replaces it read as the same object.
 * The bottom edge carries one action-ramp stepper.
 */
import { cn } from '@/lib/utils';
import { Satellite } from '@/components/icons';

const ROW_WIDTHS = ['72%', '46%', '61%', '38%', '55%'];

export function LoadingState({
  label,
  hint,
  rows = 3,
  className,
}: {
  label: string;
  hint?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('relative overflow-hidden rounded-lg border border-border bg-card', className)}
    >
      <div className="flex h-full flex-col p-4 sm:p-5">
        <div className="flex items-center gap-2.5">
          <Satellite size={16} className="shrink-0 text-action" />
          <span className="text-xs font-mono font-semibold text-foreground">{label}</span>
        </div>
        {hint ? (
          <p className="mt-1 pl-[26px] text-[11px] font-mono text-muted-foreground">{hint}</p>
        ) : null}
        <div className="mt-4 flex-1 space-y-2.5" aria-hidden>
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="skeleton-sheen h-2.5 rounded-xs bg-secondary"
              style={{ width: ROW_WIDTHS[i % ROW_WIDTHS.length] }}
            />
          ))}
        </div>
      </div>
      <span
        aria-hidden
        className="loading-sweep pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-secondary"
      >
        <span
          className="block h-full w-1/2"
          style={{
            backgroundColor: 'var(--colorway-deep-ocean)',
            backgroundImage: 'var(--colorway-ramp-ocean)',
          }}
        />
      </span>
    </div>
  );
}

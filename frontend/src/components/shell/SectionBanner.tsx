import type { IconComponent } from '@/components/icons';

/**
 * The one banner across the app: ink plate, title, caption-uppercase pill,
 * subline, and an optional status chip on the right. Every section header
 * uses this — no more per-screen plate styles.
 */
export function SectionBanner({
  icon: Icon,
  title,
  pill,
  subline,
  chip,
  className,
}: {
  icon: IconComponent;
  title: string;
  pill?: string;
  subline?: React.ReactNode;
  chip?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-x-3 gap-y-2.5 px-5 pt-4 pb-4 border-b border-border ${className ?? ''}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className="w-5 h-5 text-foreground shrink-0" strokeWidth={1.85} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h2 className="text-base font-semibold text-foreground tracking-tight">{title}</h2>
            {pill && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] bg-secondary text-muted-foreground border border-border">
                {pill}
              </span>
            )}
          </div>
          {subline && <p className="text-xs text-muted-foreground mt-0.5">{subline}</p>}
        </div>
      </div>
      {chip && <div className="shrink-0">{chip}</div>}
    </div>
  );
}

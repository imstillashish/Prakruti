import type { LucideIcon } from 'lucide-react';

/**
 * Page-level header used once at the top of every tab: ink icon plate,
 * one title scale, plain-language subline, optional action on the right.
 * Section banners inside a page use SectionBanner instead.
 */
export function PageHeader({
  icon: Icon,
  title,
  sub,
  action,
}: {
  icon: LucideIcon;
  title: string;
  sub: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-x-3 gap-y-2.5">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-9 h-9 shrink-0 rounded-md bg-secondary border border-border text-foreground flex items-center justify-center">
          <Icon className="w-4.5 h-4.5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-foreground tracking-tight leading-6">{title}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

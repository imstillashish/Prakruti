import { Explain } from '@/components/explain/Explain';

export function Panel({ title, subtitle, term, actions, children, className, bodyClassName }: {
  title: string; subtitle?: string; term?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string;
}) {
  return (
    <section className={`rounded-lg border border-border bg-card ${className ?? ''}`}>
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border px-4 py-2.5 rounded-t-lg">
        <div className="min-w-0 max-w-full flex-1 basis-52">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            {title}{term && <Explain term={term} />}
          </h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </header>
      <div className={bodyClassName ?? 'p-4'}>{children}</div>
    </section>
  );
}

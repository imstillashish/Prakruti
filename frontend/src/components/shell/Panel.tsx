import { Explain } from '@/components/explain/Explain';

export function Panel({ title, subtitle, term, children, className }: {
  title: string; subtitle?: string; term?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`border border-border bg-card ${className ?? ''}`}>
      <header className="flex items-baseline justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            {title}{term && <Explain term={term} />}
          </h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

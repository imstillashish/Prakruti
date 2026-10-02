'use client';
import { useState } from 'react';
import { ChevronDown } from '@/components/icons';
import { Explain } from '@/components/explain/Explain';
import type { GlossaryKey } from '@/components/explain/glossary';

export function Panel({ title, subtitle, term, actions, children, className, bodyClassName, collapsibleOnPhone, collapsibleOnTablet }: {
  title: string; subtitle?: string; term?: GlossaryKey; actions?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string;
  collapsibleOnPhone?: boolean;
  collapsibleOnTablet?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const collapsible = collapsibleOnPhone || collapsibleOnTablet;
  const collapsed = collapsible && !open;
  // Literal class strings on purpose — Tailwind cannot see interpolated names.
  const toggleVisibility = collapsibleOnTablet ? 'lg:hidden' : 'sm:hidden';
  const bodyVisibility = collapsibleOnTablet ? 'lg:block' : 'sm:block';

  return (
    <section className={`rounded-lg border border-border bg-card ${className ?? ''}`}>
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border px-4 py-2.5 rounded-t-lg">
        <div className="min-w-0 max-w-full flex-1 basis-52">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            {title}{term && <Explain term={term} />}
          </h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {actions}
          {collapsible && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={`Toggle ${title} details`}
              className={`${toggleVisibility} flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground active:scale-95 transition-all touch-manipulation`}
            >
              <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </header>
      <div className={`${bodyClassName ?? 'p-4'} ${collapsed ? `hidden ${bodyVisibility}` : ''}`}>{children}</div>
    </section>
  );
}

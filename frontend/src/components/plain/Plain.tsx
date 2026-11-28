// The reading system. Two ideas, applied everywhere:
//
// 1. A page opens with an ANSWER, not a dashboard. One sentence in the largest
//    type on the page says what the data means, and the evidence ships behind
//    it. `Answer` is that sentence; `More` is the door to the working.
// 2. Prose is set at a measure you can actually read. `Prose` caps itself at
//    ~68ch and steps the type up from the 10px monospace the panels default to.
//
// Nothing here animates on its own and nothing here is a card. Cards are
// containers; these are the text.

'use client';

import { useId, useState } from 'react';

export function Answer({
  children,
  detail,
}: {
  children: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <div className="max-w-[68ch]">
      <p className="text-[17px] sm:text-lg leading-[1.5] text-foreground tracking-[-0.01em] text-pretty">
        {children}
      </p>
      {detail && (
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{detail}</p>
      )}
    </div>
  );
}

export function Prose({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`max-w-[68ch] text-[13.5px] leading-[1.65] text-foreground/90 ${className ?? ''}`}>
      {children}
    </div>
  );
}

/**
 * The one disclosure shape in the app: a labelled drawer over the dense part of
 * a page. Same control on all ten screens — no per-page toggle styles.
 */
export function More({
  label = 'How this was worked out',
  children,
  defaultOpen = false,
}: {
  label?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="group flex min-h-11 items-center gap-2 text-[13px] font-medium text-foreground touch-manipulation"
      >
        <span className="inline-block h-[5px] w-[5px] rounded-full bg-foreground/40 transition-colors group-hover:bg-foreground" />
        <span>{open ? 'Hide the working' : label}</span>
        <span aria-hidden className="text-muted-foreground text-[12px]">
          {open ? '−' : '+'}
        </span>
      </button>
      {open && (
        <div id={id} className="animate-fade-in pt-4 pb-1">
          {children}
        </div>
      )}
    </section>
  );
}

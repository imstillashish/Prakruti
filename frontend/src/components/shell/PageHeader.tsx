import type { IconComponent } from '@/components/icons';

/**
 * The opening of every page. Three tiers, in this order: what the screen is,
 * the answer in one sentence, the assumption it rests on. The answer is the
 * largest text on the page — the title is a label, not the message.
 */
export function PageHeader({
  icon: Icon,
  title,
  answer,
  sub,
  action,
}: {
  icon?: IconComponent;
  title: string;
  /** The sentence a person came here to read. Set bigger than the title. */
  answer?: string;
  /** One line on what the answer is based on. */
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="min-w-0 max-w-[68ch]">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.85} />}
          <h1 className="text-[13px] font-medium text-muted-foreground">{title}</h1>
        </div>
        {answer && (
          <p className="mt-2 text-[19px] leading-[1.45] font-medium tracking-[-0.012em] text-foreground text-pretty sm:text-[21px]">
            {answer}
          </p>
        )}
        {sub && (
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{sub}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

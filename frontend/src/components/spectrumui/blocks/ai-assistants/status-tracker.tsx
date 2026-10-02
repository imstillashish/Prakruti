'use client';

import { Check } from '@/components/icons';
import { cn } from '@/lib/utils';

const KEYFRAMES = `
@keyframes su-pop { 0% { opacity: 0; transform: scale(0.85) } 100% { opacity: 1; transform: none } }
`;

export interface TrackerStage {
  id: string;
  label: string;
}

export type StatusTrackerVariant = 'Default' | 'Minimal';

export interface StatusTrackerProps {
  stages: TrackerStage[];
  activeIndex: number;
  progress?: number;
  detail?: string;
  variant?: StatusTrackerVariant;
  className?: string;
}

export function StatusTracker({
  stages,
  activeIndex,
  progress = 0,
  detail,
  variant = 'Default',
  className,
}: StatusTrackerProps) {
  const done = activeIndex >= stages.length;

  if (variant === 'Minimal') {
    const label = done ? 'Complete' : stages[activeIndex]?.label;
    const overall = done ? 1 : (activeIndex + progress) / stages.length;
    return (
      <div className={cn('flex w-full max-w-[360px] items-center gap-2.5', className)}>
        <span aria-hidden className="h-1 flex-1 overflow-hidden rounded-full bg-black/[0.07] ">
          <span
            className="block h-full rounded-full bg-foreground transition-[width] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] "
            style={{ width: `${overall * 100}%` }}
          />
        </span>
        <span className="shrink-0 text-[12px] text-muted-foreground ">{label}</span>
        <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-muted-foreground ">
          {Math.round(overall * 100)}%
        </span>
      </div>
    );
  }

  return (
    <div className={cn('w-full max-w-[440px]', className)}>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <ol className="flex items-center">
        {stages.map((stage, index) => {
          const completed = index < activeIndex || done;
          const active = index === activeIndex && !done;
          return (
            <li key={stage.id} className={cn('flex items-center', index > 0 && 'flex-1')}>
              {index > 0 && (
                <span aria-hidden className="mx-1.5 h-px flex-1 overflow-hidden bg-black/[0.08] ">
                  <span
                    className="block h-full bg-foreground transition-[width] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] "
                    style={{ width: completed ? '100%' : active ? `${progress * 100}%` : '0%' }}
                  />
                </span>
              )}
              <span className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    'grid size-5 place-items-center rounded-full border transition-colors duration-200',
                    completed
                      ? 'border-foreground bg-foreground text-white   '
                      : active
                        ? 'border-foreground text-foreground  '
                        : 'border-black/[0.12] text-transparent ',
                  )}
                >
                  {completed ? (
                    <Check className="size-3 motion-safe:animate-[su-pop_200ms_cubic-bezier(0.23,1,0.32,1)_both]" strokeWidth={3} />
                  ) : (
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        active && 'bg-current motion-safe:animate-pulse',
                      )}
                    />
                  )}
                </span>
                <span
                  className={cn(
                    'whitespace-nowrap font-mono text-[9.5px] uppercase tracking-wide',
                    active || completed
                      ? 'text-foreground '
                      : 'text-muted-foreground ',
                  )}
                >
                  {stage.label}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      {detail && (
        <p className="mt-3 text-center text-[12px] text-muted-foreground " role="status">
          {detail}
        </p>
      )}
    </div>
  );
}

export default StatusTracker;

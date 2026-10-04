'use client';
import { Info } from '@/components/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { glossary, type GlossaryKey } from './glossary';

export function Explain({ term, className }: { term: GlossaryKey; className?: string }) {
  const entry = glossary[term];
  if (!entry) {
    if (process.env.NODE_ENV === 'development') console.warn(`[Explain] missing glossary term: ${term}`);
    return null;
  }
  const trigger = (
    <button type="button" aria-label={`What is ${entry.title}?`}
      className={`relative inline-flex items-center align-middle text-muted-foreground hover:text-foreground cursor-help after:absolute after:-inset-4 after:content-[''] ${className ?? ''}`}>
      <Info size={13} strokeWidth={1.75} />
    </button>
  );
  const content = (
    <div className="max-w-64 space-y-0.5 text-left">
      <p className="text-xs font-semibold text-foreground">{entry.title}</p>
      <p className="text-xs text-muted-foreground">{entry.body}</p>
    </div>
  );
  return (
    <span className="inline-flex">
      {/* Hover tooltip on pointer devices */}
      <span className="hidden md:inline-flex">
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent className="p-2">{content}</TooltipContent>
        </Tooltip>
      </span>
      {/* Tap popover on touch screens */}
      <span className="md:hidden">
        <Popover>
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          <PopoverContent className="w-64 p-2">{content}</PopoverContent>
        </Popover>
      </span>
    </span>
  );
}

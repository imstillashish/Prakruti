'use client';
import { NAV_ITEMS } from './NavRail';
import { ChevronRight } from '@/components/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { NavPage } from '@/types';

export function NavRail({
  currentPage,
  onNavigate,
  expanded,
  onToggleExpanded,
}: {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  return (
    <>
      {/* Desktop: collapsible rail (>1024px). Collapsed it is an icon strip whose
          labels live in tooltips; expanded it has room to spell the section names
          out, which the fixed 88px rail could only fit as 10px two-line wraps.
          The width reads --rail-w, set in page.tsx, and so does the content
          gutter, so the two can never disagree. */}
      <nav
        id="desktop-sections"
        aria-label="Desktop Sections"
        className="hidden lg:flex fixed left-0 top-16 bottom-0 z-30 w-[var(--rail-w)] flex-col gap-0.5 px-2 pt-3 pb-3 border-r border-border bg-background overflow-y-auto overflow-x-hidden select-none transition-[width] duration-300 ease-out motion-reduce:transition-none"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = currentPage === item.page;
          return (
            <Tooltip key={item.page}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onNavigate(item.page)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex w-full items-center rounded-md py-2.5 transition-colors duration-100 touch-manipulation ${
                    expanded ? 'gap-3 px-3 text-left' : 'justify-center'
                  } ${
                    active
                      ? 'bg-action-soft text-action-pressed font-semibold'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <Icon size={expanded ? 18 : 20} className="shrink-0" />
                  {/* Mounted in both states so the label fades with the rail
                      instead of popping, and so it keeps naming the button for
                      screen readers while the rail is collapsed. */}
                  <span
                    className={`overflow-hidden whitespace-nowrap text-[13px] transition-opacity duration-150 motion-reduce:transition-none ${
                      expanded ? 'flex-1 opacity-100 delay-100' : 'w-0 opacity-0'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              </TooltipTrigger>
              {/* Collapsed only — an expanded item already shows its label. */}
              {!expanded && (
                <TooltipContent side="right" sideOffset={10} className="max-w-64">
                  <span className="block text-xs font-semibold">{item.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                    {item.subtitle}
                  </span>
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}

        {/* Collapse/expand, pinned to the foot of the rail. The chevron points
            the way the rail is about to move. */}
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-controls="desktop-sections"
          aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
          className={`mt-auto flex w-full items-center rounded-md py-2.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-100 touch-manipulation ${
            expanded ? 'gap-3 px-3' : 'justify-center'
          }`}
        >
          <ChevronRight
            size={16}
            className={`shrink-0 transition-transform duration-300 motion-reduce:transition-none ${
              expanded ? 'rotate-180' : ''
            }`}
          />
          <span
            className={`overflow-hidden whitespace-nowrap text-xs transition-opacity duration-150 motion-reduce:transition-none ${
              expanded ? 'opacity-100 delay-100' : 'w-0 opacity-0'
            }`}
          >
            Collapse
          </span>
        </button>
      </nav>

      {/* Tablet: compact 64px icon-only rail with 48px touch targets (640px-1024px) */}
      <nav
        aria-label="Tablet Sections"
        className="hidden sm:flex lg:hidden fixed left-0 top-16 bottom-0 z-30 w-16 flex-col items-center gap-1.5 px-2 pt-3 border-r border-border bg-background overflow-y-auto overflow-x-hidden select-none"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = currentPage === item.page;
          return (
            <button
              key={item.page}
              type="button"
              onClick={() => onNavigate(item.page)}
              title={`${item.label} — ${item.subtitle}`}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={`flex h-12 w-12 items-center justify-center rounded-md transition-colors duration-100 touch-manipulation ${
                active
                  ? 'bg-action-soft text-action-pressed'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.75} />
            </button>
          );
        })}
      </nav>

      {/* Mobile: section strip docked at the thumb zone, above the thumb command bar
          (<640px). Fixed to the viewport so section switching never needs a scroll back to top. */}
      <nav
        aria-label="Mobile Sections"
        className="sm:hidden fixed bottom-[calc(3.25rem+max(0.5rem,env(safe-area-inset-bottom,0px)))] left-0 right-0 z-30 flex overflow-x-auto gap-1 border-t border-border bg-background/95 backdrop-blur-md px-2 py-1.5 [scrollbar-width:none] [-webkit-overflow-scrolling:touch]"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = currentPage === item.page;
          return (
            <button
              key={item.page}
              type="button"
              onClick={() => onNavigate(item.page)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-shrink-0 items-center gap-1.5 min-h-[44px] px-3 py-2 text-xs rounded-md transition-colors duration-100 touch-manipulation ${
                active
                  ? 'bg-action-soft text-action-pressed font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={14} strokeWidth={active ? 2 : 1.75} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </>
  );
}

'use client';
import { useState } from 'react';
import { NAV_ITEMS } from './NavRail';
import { LayoutSidebarCollapse } from '@/components/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Fragment, type ReactNode } from 'react';
import type { NavPage } from '@/types';
import { NAV_GROUP_LABELS } from './NavRail';

export function NavRail({
  currentPage,
  onNavigate,
  expanded,
  onToggleExpanded,
  mobileTrailing,
}: {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  /** Pinned to the right edge of the phone strip — the station chip lives here
      now that the old docked thumb bar is gone. */
  mobileTrailing?: ReactNode;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const primaryMobilePages = new Set<NavPage>(['overview', 'forecast', 'extreme-weather', 'rpi']);
  const primaryItems = NAV_ITEMS.filter((item) => primaryMobilePages.has(item.page));
  const secondaryItems = NAV_ITEMS.filter((item) => !primaryMobilePages.has(item.page));

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
        {NAV_ITEMS.map((item, index) => {
          const Icon = item.icon;
          const active = currentPage === item.page;
          const groupStart = index === 0 || item.group !== NAV_ITEMS[index - 1].group;
          return (
            <Fragment key={item.page}>
              {groupStart && (
                <div className={`px-3 pb-1.5 pt-4 text-[12px] font-medium text-muted-foreground/80 ${expanded ? 'block' : 'hidden'}`}>
                  {NAV_GROUP_LABELS[item.group]}
                </div>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onNavigate(item.page)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex w-full items-center rounded-md py-2.5 transition-colors duration-100 touch-manipulation ${
                      expanded ? 'gap-3 px-3 text-left' : 'justify-center'
                    } ${
                      active
                        ? 'gradient-on-active font-semibold'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    <Icon size={expanded ? 18 : 20} className="shrink-0" />
                    <span
                      className={`overflow-hidden whitespace-nowrap text-[13px] transition-opacity duration-150 motion-reduce:transition-none ${
                        expanded ? 'flex-1 opacity-100 delay-100' : 'w-0 opacity-0'
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                </TooltipTrigger>
                {!expanded && (
                  <TooltipContent side="right" sideOffset={10} className="max-w-64">
                    <span className="block text-xs font-semibold">{item.label}</span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">
                      {item.subtitle}
                    </span>
                  </TooltipContent>
                )}
              </Tooltip>
            </Fragment>
          );
        })}

        {/* Collapse/expand, pinned to the foot of the rail. Uses ItsHover animated
            sidebar layout icon that indicates collapse/expand state with intent. */}
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-controls="desktop-sections"
          aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
          title={expanded ? 'Collapse navigation' : 'Expand navigation'}
          className={`mt-auto flex w-full items-center rounded-md py-2.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-100 touch-manipulation ${
            expanded ? 'gap-3 px-3' : 'justify-center'
          }`}
        >
          <LayoutSidebarCollapse
            size={18}
            expanded={expanded}
            className="shrink-0"
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
        {NAV_ITEMS.map((item, index) => {
          const Icon = item.icon;
          const active = currentPage === item.page;
          return (
            <Fragment key={item.page}>
              {index > 0 && (index === 4 || index === 7) && <div aria-hidden className="my-1.5 h-px w-8 bg-border" />}
              <button
                type="button"
                onClick={() => onNavigate(item.page)}
                title={`${item.label} — ${item.subtitle}`}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={`flex h-12 w-12 items-center justify-center rounded-md transition-colors duration-100 touch-manipulation ${
                  active
                    ? 'gradient-on-active'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.2 : 1.75} />
              </button>
            </Fragment>
          );
        })}
      </nav>

      {/* Mobile: the phone's one and only bottom bar (<640px), in the thumb zone.
          Sections scroll horizontally; the trailing slot stays pinned. */}
      <nav
        aria-label="Mobile Sections"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch gap-2 border-t border-border bg-background/95 backdrop-blur-md px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.page;
            return (
              <button
                key={item.page}
                type="button"
                onClick={() => { setMoreOpen(false); onNavigate(item.page); }}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[44px] flex-shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-[13px] transition-colors duration-100 touch-manipulation ${
                  active
                    ? 'gradient-on-active font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={14} strokeWidth={active ? 2 : 1.75} />
                {item.mobileLabel}
              </button>
            );
          })}
        </div>
        <div className="relative flex shrink-0 items-stretch">
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            className={`flex min-h-[44px] items-center rounded-md px-3 text-[13px] font-medium transition-colors touch-manipulation ${
              moreOpen || secondaryItems.some((item) => item.page === currentPage)
                ? 'gradient-on-active'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            More
          </button>
          {moreOpen && (
            <div role="menu" className="absolute bottom-[calc(100%+0.5rem)] right-0 w-60 rounded-lg border border-border bg-background p-2 shadow-lg">
              {(['trust', 'build'] as const).map((group) => (
                <div key={group}>
                  <p className="px-2 pb-1 pt-2 text-[12px] font-medium text-muted-foreground/80">
                    {NAV_GROUP_LABELS[group]}
                  </p>
                  {secondaryItems.filter((item) => item.group === group).map((item) => {
                    const Icon = item.icon;
                    const active = currentPage === item.page;
                    return (
                      <button
                        key={item.page}
                        type="button"
                        role="menuitem"
                        onClick={() => { setMoreOpen(false); onNavigate(item.page); }}
                        className={`flex min-h-[44px] w-full items-center gap-2 rounded-md px-2 text-left text-[13px] ${
                          active ? 'gradient-on-active font-semibold' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                      >
                        <Icon size={15} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
        {mobileTrailing ? (
          <div className="flex shrink-0 items-stretch">{mobileTrailing}</div>
        ) : null}
      </nav>
    </>
  );
}

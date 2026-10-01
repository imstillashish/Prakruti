'use client';
import { NAV_ITEMS } from './NavRail';
import type { NavPage } from '@/types';

export function NavRail({ currentPage, onNavigate }: {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
}) {
  return (
    <>
      {/* Desktop: fixed 88px left rail (>1024px) */}
      <nav
        aria-label="Desktop Sections"
        className="hidden lg:flex fixed left-0 top-16 bottom-0 z-30 w-[88px] flex-col items-center gap-0.5 px-1.5 pt-3 border-r border-border bg-background overflow-y-auto overflow-x-hidden select-none"
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
              aria-current={active ? 'page' : undefined}
              className={`flex w-full flex-col items-center gap-1.5 rounded-md py-2.5 px-1 text-center transition-colors duration-100 ${
                active
                  ? 'bg-secondary text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2 : 1.75} />
              <span className="w-full text-[10px] leading-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Tablet: compact 64px icon-only rail with 48px touch targets (640px-1024px) */}
      <nav
        aria-label="Tablet Sections"
        className="hidden md:flex lg:hidden fixed left-0 top-16 bottom-0 z-30 w-16 flex-col items-center gap-1.5 px-2 pt-3 border-r border-border bg-background overflow-y-auto overflow-x-hidden select-none"
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
                  ? 'bg-secondary text-foreground'
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
        className="md:hidden fixed bottom-[calc(3.25rem+max(0.5rem,env(safe-area-inset-bottom,0px)))] left-0 right-0 z-30 flex overflow-x-auto gap-1 border-t border-border bg-background/95 backdrop-blur-md px-2 py-1.5 [scrollbar-width:none] [-webkit-overflow-scrolling:touch]"
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
                  ? 'bg-secondary text-foreground font-semibold border border-border/60'
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

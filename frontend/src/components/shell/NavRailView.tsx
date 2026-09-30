'use client';
import { NAV_ITEMS } from './NavRail';
import type { NavPage } from '@/types';

export function NavRail({ currentPage, onNavigate }: {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
}) {
  return (
    <>
      {/* Desktop: fixed left rail */}
      <nav
        aria-label="Sections"
        className="hidden md:flex fixed left-0 top-12 bottom-0 z-30 w-14 flex-col items-center gap-1 pt-3 border-r border-border bg-background"
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
              className={`flex w-full flex-col items-center gap-1 py-2.5 text-[10px] leading-none transition-colors duration-100 border-l-2 ${
                active
                  ? 'border-primary bg-accent text-accent-foreground font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2 : 1.75} />
              <span className="max-w-[52px] truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mobile: horizontally scrollable strip under the top bar */}
      <nav
        aria-label="Sections"
        className="md:hidden sticky top-12 z-30 flex overflow-x-auto gap-1 border-b border-border bg-background px-2 py-1.5"
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
              className={`flex flex-shrink-0 items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-colors duration-100 ${
                active
                  ? 'bg-accent text-accent-foreground font-semibold'
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

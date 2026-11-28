'use client';
import { useState, useEffect } from 'react';
import { Bell, Cpu, HeartPulse } from '@/components/icons';
import { MorMark } from '@/components/brand/MorMark';
import SplitFlapText from '@/components/SplitFlapText';
import { BlendingEngineModal } from '@/components/BlendingEngine';
import { AlertDrawer } from '@/components/AlertCenter';
import { getAlertsData } from '@/lib/api';

export function TopBar({ selectedCity }: { selectedCity: string | null }) {
  const [engineOpen, setEngineOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [now, setNow] = useState('');

  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Kolkata',
        }),
      );
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // Same source the AlertDrawer reads; a numeral badge, not a bare colour dot —
  // severity must not ride on hue alone. Fetch failure leaves the count at 0
  // rather than inventing an alert state.
  useEffect(() => {
    let mounted = true;
    getAlertsData()
      .then((data) => {
        if (mounted) setAlertCount(data.length);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="h-full flex items-center justify-between gap-3 pl-3 pr-2 sm:pl-6 sm:pr-4">
        {/* Brand lockup */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {/* Mor — the peacock rain-dancer, brand mark */}
          <MorMark className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 text-foreground" label="Prakruti brand mark" />
          {/* flex (not the default block) so the board is the flex item and
              centres on the header's midline rather than a line box */}
          <div className="flex items-center">
            <SplitFlapText
              words={['PRAKRUTI', 'प्रकृति']}
              flipDuration={0.12}
              stagger={0.06}
              cycleDelay={3000}
              charset="alphanumeric"
              flipsPerChar={8}
              tileColor="#171717"
              textColor="#ffffff"
              tileRadius={4}
              gap={2}
              fontSize={16}
              loop
              padTo={8}
              aria-label="Prakruti"
            />
          </div>

          {/* Desktop-only IST clock */}
          <span aria-hidden className="hidden lg:block h-5 w-px bg-border ml-1" />
          <span className="hidden lg:flex items-center gap-1.5 text-[12px] font-mono tabular-nums text-muted-foreground whitespace-nowrap">
            {now} IST
          </span>
        </div>

        {/* Right cluster. Actions tier with width: phone keeps bell + engine as
            44px targets (data health lives in the bottom-bar More menu); tablet
            collapses engine and health into a single overflow menu; desktop gets
            every trigger as a one-tap icon. The station badge is information, so
            it stays visible at sm+ rather than hiding in a menu. */}
        <div className="flex items-center gap-1">
          {/* Blending engine: one-tap on phone and desktop, in the menu between */}
          <button
            type="button"
            onClick={() => setEngineOpen(true)}
            className="flex sm:hidden lg:inline-flex min-h-[44px] min-w-[44px] sm:min-h-0 sm:h-9 sm:w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors duration-100 touch-manipulation"
            title="Blending engine status"
            aria-label="Blending engine status"
          >
            <Cpu size={16} className="sm:w-4 sm:h-4" />
          </button>

          {/* Data health: desktop one-tap, tablet via the overflow menu */}
          <button
            type="button"
            data-nav="data-health"
            className="hidden lg:flex items-center justify-center h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors duration-100 touch-manipulation"
            aria-label="Data and model health"
            title="Data & model health"
          >
            <HeartPulse size={16} />
          </button>

          {/* Tablet overflow: engine + health without crowding the 64px-rail width */}
          <div className="relative hidden sm:block lg:hidden">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              aria-label="More controls"
              title="More controls"
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors duration-100 touch-manipulation"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <circle cx="8" cy="3" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="8" cy="13" r="1.5" />
              </svg>
            </button>
            {moreOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} aria-hidden="true" />
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-52 rounded-lg border border-border bg-popover p-1 shadow-popover"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMoreOpen(false);
                      setEngineOpen(true);
                    }}
                    className="flex min-h-[44px] w-full items-center gap-2.5 rounded-md px-3 text-left text-sm text-foreground hover:bg-secondary"
                  >
                    <Cpu size={15} className="shrink-0 text-muted-foreground" />
                    Blending Engine
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    data-nav="data-health"
                    onClick={() => setMoreOpen(false)}
                    className="flex min-h-[44px] w-full items-center gap-2.5 rounded-md px-3 text-left text-sm text-foreground hover:bg-secondary"
                  >
                    <HeartPulse size={15} className="shrink-0 text-muted-foreground" />
                    Data &amp; Model Health
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Alert bell: all viewports with >=44px touch area on mobile */}
          <button
            type="button"
            onClick={() => setAlertOpen(true)}
            className="relative flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-0 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors duration-100 touch-manipulation"
            aria-label={
              alertCount > 0 ? `Active weather alerts, ${alertCount}` : 'Active weather alerts'
            }
            title="Active weather alerts"
          >
            <Bell size={18} className="sm:w-4 sm:h-4" />
            {alertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 sm:top-0 sm:right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-white">
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </button>

          {/* Active station badge: tablet & desktop (mobile uses docked thumb bar) */}
          {selectedCity && (
            <span className="hidden sm:inline-flex items-center h-9 text-xs font-mono font-semibold tracking-wide text-foreground bg-secondary border border-border/60 rounded-md px-2.5">
              {selectedCity.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      <BlendingEngineModal open={engineOpen} onClose={() => setEngineOpen(false)} />
      <AlertDrawer open={alertOpen} onClose={() => setAlertOpen(false)} />
    </header>
  );
}

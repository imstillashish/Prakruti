'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Cpu } from '@/components/icons';
import { MorMark } from '@/components/brand/MorMark';
import SplitFlapText from '@/components/SplitFlapText';
import { BlendingEngineModal } from '@/components/BlendingEngine';
import { AlertDrawer } from '@/components/AlertCenter';

export function TopBar({ selectedCity }: { selectedCity: string | null }) {
  const [engineOpen, setEngineOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [now, setNow] = useState<string>('');

  useEffect(() => {
    const tick = () => setNow(
      new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })
    );
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="h-full flex items-center justify-between gap-3 pl-3 pr-2 sm:pl-6 sm:pr-4">
        {/* Brand lockup */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {/* Mor — the peacock rain-dancer, brand mark */}
          <MorMark className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 text-foreground" />
          {/* flex (not the default block) so the board is the flex item and
              centres on the header's midline rather than a line box */}
          <div className="flex items-center">
            {/* Brand name as a departure board: clacks between the English and
                Devanagari spellings. padTo keeps the header width constant
                while the Hindi word uses fewer, wider tiles. */}
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
          <span className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-muted-foreground whitespace-nowrap">
            {now} IST
          </span>
        </div>

        {/* Right cluster: engine status, alerts, diagnostics, station */}
        <div className="flex items-center gap-1">
          {/* v4 Palette Prototype link */}
          <Link
            href="/palette-prototype"
            className="inline-flex items-center gap-1.5 px-2.5 h-9 text-xs font-mono font-medium text-action-pressed bg-action-soft hover:bg-action-soft/80 border border-action/20 rounded-md transition-colors touch-manipulation"
            title="Inspect Color System v4 Prototype"
          >
            <span className="hidden sm:inline">v4 Palette</span>
            <span className="sm:hidden">v4</span>
          </Link>

          {/* Operational status: tablet & desktop */}
          <button
            type="button"
            onClick={() => setEngineOpen(true)}
            className="hidden sm:inline-flex items-center gap-2 px-2.5 h-9 text-xs font-mono font-medium text-data-ok-text rounded-md hover:bg-secondary transition-colors duration-100 touch-manipulation"
            title="Blending engine status"
          >
            <span>Operational</span>
          </button>

          {/* Alert bell: all viewports with >=44px touch area on mobile */}
          <button
            type="button"
            onClick={() => setAlertOpen(true)}
            className="relative flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-0 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors duration-100 touch-manipulation"
            aria-label="Active weather alerts"
            title="Active weather alerts"
          >
            <Bell size={18} className="sm:w-4 sm:h-4" />
            <span className="absolute top-2.5 right-2.5 sm:top-2 sm:right-2 h-2 w-2 sm:h-1.5 sm:w-1.5 rounded-full bg-destructive" />
          </button>

          {/* Data health shortcut: desktop & tablet */}
          <button
            type="button"
            data-nav="data-health"
            className="hidden sm:flex items-center justify-center h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors duration-100 touch-manipulation"
            aria-label="Data and model health"
            title="Data & model health"
          >
            <Cpu size={16} />
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

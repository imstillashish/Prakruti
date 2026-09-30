'use client';
import { useState, useEffect } from 'react';
import { Bell, Cpu } from 'lucide-react';
import { MorMark } from '@/components/brand/MorMark';
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
      <div className="h-full flex items-center justify-between gap-4 pl-4 pr-3 sm:pl-6">
        {/* Brand lockup */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mor — the peacock rain-dancer, brand mark */}
          <MorMark className="w-8 h-8 shrink-0 text-foreground" />
          <div className="min-w-0 leading-tight">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[17px] font-bold tracking-tight text-foreground whitespace-nowrap">
                Prakruti
              </span>
              <span className="text-[13px] font-medium text-muted-foreground whitespace-nowrap">
                प्रकृति
              </span>
            </div>
            <div className="hidden sm:block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              MoES · NCMRWF Forecast Intelligence
            </div>
          </div>
          <span aria-hidden className="hidden lg:block h-5 w-px bg-border ml-1" />
          <span className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-muted-foreground">
            {now} IST
          </span>
        </div>

        {/* Right cluster: engine status, alerts, diagnostics, station */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEngineOpen(true)}
            className="flex items-center gap-2 px-2.5 h-9 text-xs font-mono font-medium text-foreground rounded-md hover:bg-secondary transition-colors duration-100"
            title="Blending engine status"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-success status-pulse" />
            <span className="hidden sm:inline">Operational</span>
          </button>

          <button
            type="button"
            onClick={() => setAlertOpen(true)}
            className="relative flex items-center justify-center h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors duration-100"
            title="Active weather alerts"
          >
            <Bell size={16} />
            <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-destructive" />
          </button>

          <button
            type="button"
            data-nav="data-health"
            className="hidden sm:flex items-center justify-center h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors duration-100"
            title="Data & model health"
          >
            <Cpu size={16} />
          </button>

          {selectedCity && (
            <span className="hidden md:inline-flex items-center h-9 text-xs font-mono font-semibold tracking-wide text-foreground bg-secondary rounded-md px-2.5">
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

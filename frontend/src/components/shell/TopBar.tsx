'use client';
import { useState, useEffect } from 'react';
import { Bell, Cpu } from 'lucide-react';
import { BlendingEngineModal } from '@/components/BlendingEngine';
import { AlertDrawer } from '@/components/AlertCenter';

export function TopBar({ selectedCity }: { selectedCity: string | null }) {
  const [engineOpen, setEngineOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-12 bg-background border-b border-border">
      <div className="h-full flex items-center justify-between gap-3 pl-4 pr-3 sm:pl-6">
        {/* Wordmark */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-display text-sm font-bold tracking-tight text-foreground whitespace-nowrap">
            Prakruti <span className="text-[13px] font-semibold text-muted-foreground">· प्रकृति</span>
          </span>
          <span className="hidden sm:inline text-[10px] font-mono text-muted-foreground border border-border px-1.5 py-0.5">
            MoES · NCMRWF
          </span>
        </div>

        {/* Right cluster: engine status, alerts, diagnostics, station */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEngineOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1 text-xs font-mono font-medium transition-colors duration-100 bg-accent text-accent-foreground border border-border hover:border-foreground/40 rounded-md"
            title="Blending engine status"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-success status-pulse" />
            <span className="hidden sm:inline">Operational</span>
          </button>

          <button
            type="button"
            onClick={() => setAlertOpen(true)}
            className="relative p-1.5 bg-card text-muted-foreground hover:text-foreground hover:bg-accent border border-border rounded-md transition-colors duration-100"
            title="Active weather alerts"
          >
            <Bell size={15} />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-destructive" />
          </button>

          <button
            type="button"
            data-nav="data-health"
            className="p-1.5 bg-card text-muted-foreground hover:text-foreground hover:bg-accent border border-border rounded-md transition-colors duration-100"
            title="Data & model health"
          >
            <Cpu size={15} />
          </button>

          {selectedCity && (
            <span className="hidden md:inline text-xs font-mono font-semibold text-foreground border border-border bg-secondary rounded-md px-2 py-1">
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

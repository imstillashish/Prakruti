'use client';
import { useState, useEffect } from 'react';
import { Bell, Cpu } from 'lucide-react';
import { NavPage } from '@/types';
import { BlendingEngineModal } from '@/components/BlendingEngine';
import { AlertDrawer } from '@/components/AlertCenter';
import { getMetadata, formatLastUpdated } from '@/lib/api';

interface HeaderProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
}

const NAV_ITEMS: { id: NavPage; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'rpi', label: 'RPI & Trust Atlas' },
  { id: 'model-intelligence', label: 'Model Intelligence' },
  { id: 'extreme-weather', label: 'Extreme Weather' },
  { id: 'model-performance', label: 'Performance' },
  { id: 'data-health', label: 'Data Health' },
];

export function Header({ currentPage, onNavigate }: HeaderProps) {
  const [engineOpen, setEngineOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('2026-09-26T23:45:12');

  useEffect(() => {
    let mounted = true;
    getMetadata().then((data) => {
      if (mounted && data?.last_updated) {
        setLastUpdated(data.last_updated);
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const lastUpdatedDisplay = formatLastUpdated(lastUpdated);

  return (
    <>
      {/* Floating Boxed Taskbar Panel with Sharp Architectural Edges */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#dbdbdb] shadow-xs">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2">
          {/* Main Top Bar */}
          <div className="flex items-center justify-between gap-4">
            {/* Logo & Brand Identity */}
            <div className="flex items-center gap-3">
              <div
                style={{ borderRadius: 0 }}
                className="w-9 h-9 flex items-center justify-center overflow-hidden bg-white border border-[#dbdbdb] p-0.5"
              >
                <img
                  src="/logo-emblem.png"
                  alt="Prakruti Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold text-[#212121] tracking-tight font-display">
                    Prakruti <span className="text-[13px] font-bold text-[#424242]">· प्रकृति</span>
                  </span>
                  <span
                    style={{ borderRadius: 0 }}
                    className="text-[10px] px-1.5 py-0.2 bg-[#f0f0f0] text-[#424242] font-mono border border-[#dbdbdb]"
                  >
                    MoES · NCMRWF
                  </span>
                </div>
                <div className="text-[10px] text-[#808080] font-sans tracking-wide">
                  AI–NWP Multi-Model Weather Blending System
                </div>
              </div>
            </div>

            {/* Center Operational Metadata */}
            <div className="hidden lg:flex items-center gap-4 text-xs font-mono">
              <div
                style={{ borderRadius: 0 }}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f7f7f7] border border-[#dbdbdb]"
              >
                <span className="text-[#808080]">Coverage:</span>
                <span className="font-semibold text-[#212121]">45 Synoptic Stations</span>
              </div>
              <div
                style={{ borderRadius: 0 }}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f7f7f7] border border-[#dbdbdb]"
              >
                <span className="text-[#808080]">Cycle:</span>
                <span className="font-semibold text-[#212121]">{lastUpdatedDisplay}</span>
              </div>
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Blending Engine Active Trigger Button */}
              <button
                type="button"
                onClick={() => setEngineOpen(true)}
                style={{ borderRadius: 0 }}
                className="flex items-center gap-2 px-3 py-1 text-xs font-mono font-medium transition-colors bg-[#f2fcf7] text-[#12723c] border border-[#95eebc] hover:bg-[#e6faee]"
              >
                <span className="w-1.5 h-1.5 bg-[#23dc73] status-pulse" style={{ borderRadius: 0 }} />
                <span className="hidden sm:inline">Engine Active</span>
                <span className="sm:hidden">Engine</span>
              </button>

              {/* Alert Center Trigger */}
              <button
                type="button"
                onClick={() => setAlertOpen(true)}
                style={{ borderRadius: 0 }}
                className="relative p-1.5 bg-white hover:bg-[#f7f7f7] text-[#424242] border border-[#dbdbdb] transition-colors"
                title="Active Weather Alerts"
              >
                <Bell size={15} />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#b4544a]" style={{ borderRadius: 0 }} />
              </button>

              {/* System Diagnostics Trigger */}
              <button
                type="button"
                onClick={() => onNavigate('data-health')}
                style={{ borderRadius: 0 }}
                className="p-1.5 bg-white hover:bg-[#f7f7f7] text-[#424242] border border-[#dbdbdb] transition-colors"
                title="Data & Model Health"
              >
                <Cpu size={15} />
              </button>
            </div>
          </div>

          {/* Navigation Bar */}
          <nav className="flex items-center gap-1 mt-2 pt-1.5 border-t border-[#f0f0f0] overflow-x-auto no-scrollbar">
            {NAV_ITEMS.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  style={{ borderRadius: 0 }}
                  className={`flex-shrink-0 px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#1db961] text-white font-semibold'
                      : 'text-[#575757] hover:text-[#212121] hover:bg-[#f0f0f0]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <BlendingEngineModal open={engineOpen} onClose={() => setEngineOpen(false)} />
      <AlertDrawer open={alertOpen} onClose={() => setAlertOpen(false)} />
    </>
  );
}

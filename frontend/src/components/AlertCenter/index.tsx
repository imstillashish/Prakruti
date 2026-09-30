'use client';
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, AlertTriangle, Info, MapPin, RotateCcw, ShieldAlert, CheckCircle2, ChevronDown, LucideIcon } from 'lucide-react';
import { getAlertsData, MOCK_ALERTS, getAlertState } from '@/lib/api';
import type { Alert } from '@/types';

interface AlertDrawerProps {
  open: boolean;
  onClose: () => void;
}

type SeverityFilter = 'all' | 'danger' | 'warning';

const alertStyles: Record<Alert['type'], { icon: LucideIcon; dot: string; badge: string }> = {
  danger: { icon: AlertCircle, dot: 'bg-destructive', badge: 'bg-destructive/10 text-destructive border-destructive/20' },
  warning: { icon: AlertTriangle, dot: 'bg-warning', badge: 'bg-warning/10 text-warning border-warning/20' },
  info: { icon: Info, dot: 'bg-water', badge: 'bg-water/10 text-water border-water/20' },
};

export function AlertDrawer({ open, onClose }: AlertDrawerProps) {
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [selectedState, setSelectedState] = useState<string>('all');

  useEffect(() => {
    let mounted = true;
    getAlertsData()
      .then((data) => {
        if (mounted && data && data.length > 0) {
          setAlerts(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setIsError(true);
          setIsLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const redCount = useMemo(() => alerts.filter((a) => a.type === 'danger').length, [alerts]);
  const orangeCount = useMemo(() => alerts.filter((a) => a.type === 'warning').length, [alerts]);

  const uniqueStates = useMemo(() => {
    const map = new Map<string, number>();
    alerts.forEach((a) => {
      const st = a.state || getAlertState(a.location);
      if (st && st !== 'Other') {
        map.set(st, (map.get(st) || 0) + 1);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (severityFilter !== 'all' && a.type !== severityFilter) {
        return false;
      }
      if (selectedState !== 'all') {
        const st = a.state || getAlertState(a.location);
        if (st !== selectedState) {
          return false;
        }
      }
      return true;
    });
  }, [alerts, severityFilter, selectedState]);

  if (!open) return null;

  // Portal to body: the TopBar's backdrop-blur makes it the containing block
  // for fixed children, which would clip the drawer to the 64px header.
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 modal-backdrop" onClick={onClose} />
      <div
        className="relative w-full max-w-md h-full flex flex-col bg-card border-l border-border shadow-2xl rounded-lg overflow-hidden"
        style={{ animation: 'slideIn 0.25s cubic-bezier(0.16,1,0.3,1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 shrink-0 rounded-md bg-secondary border border-border text-destructive flex items-center justify-center">
              <ShieldAlert size={15} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold tracking-tight text-foreground">Alert Center</span>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                  {alerts.length} total
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                Active hazard advisories from IMD / NCMRWF bulletins
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="px-5 py-3 border-b border-border space-y-2.5">
          {/* Severity Filter Tabs */}
          <div className="flex items-center gap-1 p-0.5 rounded-md bg-secondary border border-border">
            <button
              type="button"
              onClick={() => setSeverityFilter('all')}
              className={`flex-1 py-1 px-2 rounded-sm text-xs font-mono transition-all flex items-center justify-center gap-1.5 ${
                severityFilter === 'all'
                  ? 'bg-card text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>All</span>
              <span className="text-[10px] px-1 rounded-sm bg-secondary font-mono">{alerts.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setSeverityFilter('danger')}
              className={`flex-1 py-1 px-2 rounded-sm text-xs font-mono transition-all flex items-center justify-center gap-1.5 ${
                severityFilter === 'danger'
                  ? 'bg-destructive text-white font-semibold'
                  : 'text-destructive hover:bg-destructive/10'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${severityFilter === 'danger' ? 'bg-white' : 'bg-destructive'}`} />
              <span>Red</span>
              <span className="text-[10px] px-1 rounded-sm font-mono">{redCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setSeverityFilter('warning')}
              className={`flex-1 py-1 px-2 rounded-sm text-xs font-mono transition-all flex items-center justify-center gap-1.5 ${
                severityFilter === 'warning'
                  ? 'bg-warning text-foreground font-semibold'
                  : 'text-warning hover:bg-warning/10'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${severityFilter === 'warning' ? 'bg-card' : 'bg-warning'}`} />
              <span>Orange</span>
              <span className="text-[10px] px-1 rounded-sm font-mono">{orangeCount}</span>
            </button>
          </div>

          {/* Statewise Dropdown Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-muted-foreground">
                <MapPin size={12} />
              </div>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full text-xs font-mono pl-7 pr-6 py-1.5 rounded-md bg-card border border-border text-foreground focus:outline-none focus:border-foreground cursor-pointer appearance-none"
              >
                <option value="all">All States ({alerts.length})</option>
                {uniqueStates.map(([st, count]) => (
                  <option key={st} value={st}>
                    {st} ({count})
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-muted-foreground">
                <ChevronDown size={12} />
              </div>
            </div>

            {(severityFilter !== 'all' || selectedState !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSeverityFilter('all');
                  setSelectedState('all');
                }}
                className="px-2.5 py-1.5 rounded-md border border-border bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground text-xs font-mono flex items-center gap-1 transition-colors"
                title="Reset filters"
              >
                <RotateCcw size={11} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredAlerts.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-lg bg-secondary border border-border">
              <div className="w-9 h-9 mx-auto mb-2 rounded-md bg-card border border-success/20 text-success flex items-center justify-center">
                <CheckCircle2 size={16} />
              </div>
              <h4 className="text-sm font-semibold text-foreground">No alerts right now</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                No active hazard advisories match the current filter selection.
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const isRed = alert.type === 'danger';

              return (
                <div
                  key={alert.id}
                  className={`w-full text-left p-3 rounded-md border transition-colors ${
                    isRed
                      ? 'bg-destructive/5 border-destructive/20'
                      : 'bg-warning/5 border-warning/20'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`w-2 h-2 shrink-0 mt-1 rounded-full ${isRed ? 'bg-destructive' : 'bg-warning'}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-foreground truncate">{alert.title}</div>
                        <span
                          className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full border shrink-0 ${
                            isRed
                              ? 'bg-destructive/10 text-destructive border-destructive/20'
                              : 'bg-warning/10 text-warning border-warning/20'
                          }`}
                        >
                          {isRed ? 'Red alert' : 'Orange alert'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 font-mono">
                        <MapPin size={10} className="shrink-0" />
                        <span className="truncate">{alert.location}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/70 font-mono text-[11px]">
                        <span className="text-muted-foreground">{alert.window}</span>
                        <span className="font-semibold text-foreground">{alert.timestamp}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-secondary/60">
          <p className="text-[10px] font-mono text-muted-foreground text-center">
            Multi-model blending engine · Cross-referenced with IMD/NCMRWF bulletins
          </p>
        </div>
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}      </style>
    </div>,
    document.body
  );
}

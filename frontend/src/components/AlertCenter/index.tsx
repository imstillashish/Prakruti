'use client';
import { useState, useEffect, useMemo } from 'react';
import { X, AlertCircle, AlertTriangle, Info, MapPin, RotateCcw, ShieldAlert, CheckCircle2, ChevronDown, LucideIcon } from 'lucide-react';
import { getAlertsData, MOCK_ALERTS, getAlertState } from '@/lib/api';
import type { Alert } from '@/types';

interface AlertDrawerProps {
  open: boolean;
  onClose: () => void;
}

type SeverityFilter = 'all' | 'danger' | 'warning';

const alertStyles: Record<Alert['type'], { bg: string; border: string; icon: LucideIcon; iconColor: string; dot: string }> = {
  danger: { bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.22)', icon: AlertCircle, iconColor: '#ef4444', dot: '#ef4444' },
  warning: { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.22)', icon: AlertTriangle, iconColor: '#f59e0b', dot: '#f59e0b' },
  info: { bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.22)', icon: Info, iconColor: '#3b82f6', dot: '#3b82f6' },
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 modal-backdrop" onClick={onClose} />
      <div
        className="relative w-full max-w-md h-full flex flex-col bg-white border-l border-border shadow-2xl"
        style={{
          borderRadius: 0,
          animation: 'slideIn 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#faeae8] flex items-center justify-center text-[#b4544a] border border-[#f3d9d6]">
              <ShieldAlert size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-widest text-foreground uppercase">
                  ALERT CENTER
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-white border border-border text-muted-foreground">
                  {alerts.length} Total
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Extreme Hazard Warning Registry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#ebebeb] text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border"
           
          >
            <X size={16} />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="px-5 py-3 border-b border-border bg-white space-y-2.5">
          {/* Severity Filter Tabs (Red / Orange / All) */}
          <div className="flex items-center gap-1 p-0.5 bg-secondary border border-border">
            <button
              type="button"
              onClick={() => setSeverityFilter('all')}
              className={`flex-1 py-1 px-2 text-xs font-mono transition-all flex items-center justify-center gap-1.5 ${
                severityFilter === 'all'
                  ? 'bg-white text-foreground font-bold border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
             
            >
              <span>All</span>
              <span className="text-[10px] px-1 bg-secondary font-mono">
                {alerts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSeverityFilter('danger')}
              className={`flex-1 py-1 px-2 text-xs font-mono transition-all flex items-center justify-center gap-1.5 ${
                severityFilter === 'danger'
                  ? 'bg-[#b4544a] text-white font-bold'
                  : 'text-[#b4544a] hover:bg-[#faeae8]'
              }`}
             
            >
              <span className={`w-1.5 h-1.5 ${severityFilter === 'danger' ? 'bg-white' : 'bg-[#b4544a]'}`} />
              <span>Red</span>
              <span className="text-[10px] px-1 font-mono">
                {redCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSeverityFilter('warning')}
              className={`flex-1 py-1 px-2 text-xs font-mono transition-all flex items-center justify-center gap-1.5 ${
                severityFilter === 'warning'
                  ? 'bg-[#d97706] text-white font-bold'
                  : 'text-[#d97706] hover:bg-[#fffbeb]'
              }`}
             
            >
              <span className={`w-1.5 h-1.5 ${severityFilter === 'warning' ? 'bg-white' : 'bg-[#d97706]'}`} />
              <span>Orange</span>
              <span className="text-[10px] px-1 font-mono">
                {orangeCount}
              </span>
            </button>
          </div>

          {/* Statewise Dropdown Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-muted-foreground">
                <MapPin size={12} />
              </div>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full text-xs font-mono pl-6 pr-6 py-1.5 bg-white border border-border text-foreground focus:outline-none focus:border-foreground cursor-pointer appearance-none"
               
              >
                <option value="all">All States ({alerts.length})</option>
                {uniqueStates.map(([st, count]) => (
                  <option key={st} value={st}>
                    {st} ({count})
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-muted-foreground">
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
                className="px-2 py-1.5 border border-border bg-secondary hover:bg-[#ebebeb] text-muted-foreground hover:text-foreground text-xs font-mono flex items-center gap-1 transition-colors"
               
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
            <div className="py-12 px-4 text-center bg-secondary border border-border">
              <div className="w-8 h-8 mx-auto mb-2 bg-secondary text-success flex items-center justify-center border border-[#c4f3d8]">
                <CheckCircle2 size={16} />
              </div>
              <h4 className="text-xs font-mono font-bold text-foreground">NO ALERTS FOUND</h4>
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
                  className="w-full text-left p-3 transition-colors"
                  style={{
                    borderRadius: 0,
                    background: isRed ? '#fffafa' : '#fffdfa',
                    border: isRed ? '1px solid #f3d9d6' : '1px solid #fed7aa',
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className="w-2 h-2 shrink-0 mt-1"
                      style={{ background: isRed ? '#b4544a' : '#d97706' }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-bold text-foreground truncate">{alert.title}</div>
                        <span
                          className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 border shrink-0 ${
                            isRed
                              ? 'bg-[#faeae8] text-[#b4544a] border-[#f3d9d6]'
                              : 'bg-[#fffbeb] text-[#d97706] border-[#fed7aa]'
                          }`}
                         
                        >
                          {isRed ? 'RED ALERT' : 'ORANGE ALERT'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 font-mono">
                        <MapPin size={10} className="text-muted-foreground shrink-0" />
                        <span className="truncate">{alert.location}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border font-mono text-[11px]">
                        <span className="text-muted-foreground">{alert.window}</span>
                        <span className="font-bold text-foreground bg-white px-1.5 py-0.2 border border-border">
                          {alert.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-secondary">
          <p className="text-[10px] font-mono text-muted-foreground text-center">
            Multi-model blending engine. Cross-referenced with IMD/NCMRWF bulletins.
          </p>
        </div>
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}


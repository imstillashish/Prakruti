'use client';
import { useState, useEffect, useMemo } from 'react';
import { ExtremeWeatherPanel } from '@/components/ExtremeWeather';
import { GlassCard } from '@/components/ui/GlassCard';
import { WeatherMap } from '@/components/WeatherMap';
import { AlertTriangle, ShieldAlert, MapPin, RotateCcw, CheckCircle2, ChevronDown } from 'lucide-react';
import { getAlertsData, MOCK_ALERTS, getAlertState } from '@/lib/api';
import type { Alert } from '@/types';

type SeverityFilter = 'all' | 'danger' | 'warning';

export function ExtremeWeatherPage() {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 flex items-center justify-center bg-[#fdf5e6] text-[#b4544a] border border-[#f3d9d6]" style={{ borderRadius: 0 }}>
          <ShieldAlert size={18} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[#212121]">Extreme Weather Guidance</h1>
          <p className="text-xs text-[#808080]">Real-time severe event risk, threshold breaches, and emergency advisories</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExtremeWeatherPanel />
        <WeatherMap />
      </div>

      {/* Active alerts log */}
      <GlassCard padding="md" variant="red">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#dbdbdb]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#fdf5e6] flex items-center justify-center text-[#b4544a] border border-[#f3d9d6]" style={{ borderRadius: 0 }}>
              <AlertTriangle size={14} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-mono font-bold tracking-widest text-[#212121] uppercase">
                  ACTIVE ALERT REGISTRY
                </h2>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-[#f7f7f7] border border-[#dbdbdb] text-[#575757]">
                  {filteredAlerts.length} / {alerts.length} Active
                </span>
              </div>
              <p className="text-[11px] text-[#808080]">
                Gridded hazard threshold breaches from multi-model blending
              </p>
            </div>
          </div>

          {/* Filters: Red/Orange pills + Statewise selector */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Severity Filter Tabs */}
            <div className="flex items-center gap-1 p-0.5 bg-[#f7f7f7] border border-[#dbdbdb]" style={{ borderRadius: 0 }}>
              <button
                type="button"
                onClick={() => setSeverityFilter('all')}
                className={`py-1 px-2.5 text-xs font-mono transition-all flex items-center gap-1.5 ${
                  severityFilter === 'all'
                    ? 'bg-white text-[#212121] font-bold border border-[#dbdbdb]'
                    : 'text-[#575757] hover:text-[#212121]'
                }`}
                style={{ borderRadius: 0 }}
              >
                <span>All</span>
                <span className="text-[10px] px-1 bg-[#f0f0f0] text-[#575757] font-mono">
                  {alerts.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSeverityFilter('danger')}
                className={`py-1 px-2.5 text-xs font-mono transition-all flex items-center gap-1.5 ${
                  severityFilter === 'danger'
                    ? 'bg-[#b4544a] text-white font-bold'
                    : 'text-[#b4544a] hover:bg-[#faeae8]'
                }`}
                style={{ borderRadius: 0 }}
              >
                <span className={`w-1.5 h-1.5 ${severityFilter === 'danger' ? 'bg-white' : 'bg-[#b4544a]'}`} />
                <span>Red</span>
                <span className={`text-[10px] px-1 font-mono ${
                  severityFilter === 'danger' ? 'bg-[#983e35] text-white' : 'bg-[#faeae8] text-[#b4544a]'
                }`}>
                  {redCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSeverityFilter('warning')}
                className={`py-1 px-2.5 text-xs font-mono transition-all flex items-center gap-1.5 ${
                  severityFilter === 'warning'
                    ? 'bg-[#d97706] text-white font-bold'
                    : 'text-[#d97706] hover:bg-[#fffbeb]'
                }`}
                style={{ borderRadius: 0 }}
              >
                <span className={`w-1.5 h-1.5 ${severityFilter === 'warning' ? 'bg-white' : 'bg-[#d97706]'}`} />
                <span>Orange</span>
                <span className={`text-[10px] px-1 font-mono ${
                  severityFilter === 'warning' ? 'bg-[#b45309] text-white' : 'bg-[#fffbeb] text-[#d97706]'
                }`}>
                  {orangeCount}
                </span>
              </button>
            </div>

            {/* Statewise Dropdown Filter */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-[#808080]">
                <MapPin size={12} />
              </div>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="text-xs font-mono pl-6 pr-7 py-1.5 bg-white border border-[#dbdbdb] text-[#212121] focus:outline-none focus:border-[#1db961] cursor-pointer appearance-none"
                style={{ borderRadius: 0 }}
              >
                <option value="all">All States ({alerts.length})</option>
                {uniqueStates.map(([st, count]) => (
                  <option key={st} value={st}>
                    {st} ({count})
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-[#808080]">
                <ChevronDown size={12} />
              </div>
            </div>

            {/* Reset Button */}
            {(severityFilter !== 'all' || selectedState !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSeverityFilter('all');
                  setSelectedState('all');
                }}
                className="px-2 py-1.5 border border-[#dbdbdb] bg-white hover:bg-[#f7f7f7] text-[#575757] hover:text-[#212121] text-xs font-mono flex items-center gap-1 transition-colors"
                style={{ borderRadius: 0 }}
                title="Reset filters"
              >
                <RotateCcw size={11} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Alerts list */}
        <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
          {filteredAlerts.length === 0 ? (
            <div className="py-12 px-4 text-center bg-[#f7f7f7] border border-[#dbdbdb]" style={{ borderRadius: 0 }}>
              <div className="w-9 h-9 mx-auto mb-2 bg-[#e6faee] text-[#168a49] flex items-center justify-center border border-[#c4f3d8]" style={{ borderRadius: 0 }}>
                <CheckCircle2 size={18} />
              </div>
              <h4 className="text-xs font-mono font-bold text-[#212121]">NO ACTIVE ALERTS MATCHING CRITERIA</h4>
              <p className="text-xs text-[#808080] mt-1 max-w-sm mx-auto">
                No active hazard advisories match the current filter selection.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSeverityFilter('all');
                  setSelectedState('all');
                }}
                className="mt-3 px-3 py-1 bg-[#212121] text-white text-xs font-mono hover:bg-[#333333] transition-colors"
                style={{ borderRadius: 0 }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const isRed = alert.type === 'danger';
              return (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 transition-colors"
                  style={{
                    borderRadius: 0,
                    background: isRed ? '#fffafa' : '#fffdfa',
                    border: isRed ? '1px solid #f3d9d6' : '1px solid #fed7aa',
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-2 h-2 shrink-0"
                      style={{
                        background: isRed ? '#b4544a' : '#d97706',
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#212121] truncate">{alert.title}</span>
                        <span
                          className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 border shrink-0 ${
                            isRed
                              ? 'bg-[#faeae8] text-[#b4544a] border-[#f3d9d6]'
                              : 'bg-[#fffbeb] text-[#b4544a] border-[#fed7aa]'
                          }`}
                          style={{ borderRadius: 0 }}
                        >
                          {isRed ? 'RED ALERT' : 'ORANGE ALERT'}
                        </span>
                      </div>
                      <div className="text-xs text-[#575757] flex items-center gap-1 mt-0.5">
                        <MapPin size={10} className="text-[#808080] shrink-0" />
                        <span className="truncate">{alert.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3 font-mono">
                    <div className="text-xs text-[#575757] font-semibold">{alert.window}</div>
                    <div className="text-[10px] text-[#212121] mt-0.5 bg-white px-1.5 py-0.5 border border-[#dbdbdb] inline-block" style={{ borderRadius: 0 }}>
                      {alert.timestamp}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </GlassCard>
    </div>
  );
}

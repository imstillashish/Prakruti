'use client';
import { useState, useEffect, useMemo } from 'react';
import { ExtremeWeatherPanel } from '@/components/ExtremeWeather';
import { Panel } from '@/components/shell/Panel';
import { Badge } from '@/components/ui/badge';
import { WeatherMap } from '@/components/WeatherMap';
import { ShieldAlert, MapPin, RotateCcw, CheckCircle2, ChevronDown } from 'lucide-react';
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
        <div className="w-8 h-8 flex items-center justify-center bg-destructive/10 text-destructive border border-destructive/30">
          <ShieldAlert size={18} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Extreme Weather Guidance</h1>
          <p className="text-xs text-muted-foreground">Real-time severe event risk, threshold breaches, and emergency advisories</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExtremeWeatherPanel />
        <WeatherMap />
      </div>

      {/* Active alerts log */}
      <Panel
        title="Active alert registry"
        subtitle="Gridded hazard threshold breaches from multi-model blending — red is the most severe"
        term="rpi"
        actions={
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-secondary border border-border text-muted-foreground">
            {filteredAlerts.length} / {alerts.length} Active
          </span>
        }
      >
        {/* Filters: Red/Orange pills + Statewise selector */}
        <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-border">
          {/* Severity Filter Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-secondary border border-border">
            <button
              type="button"
              onClick={() => setSeverityFilter('all')}
              className={`py-1 px-2.5 text-xs font-mono transition-colors duration-100 flex items-center gap-1.5 ${
                severityFilter === 'all'
                  ? 'bg-card text-foreground font-bold border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`
            }>
              <span>All</span>
              <span className="text-[10px] px-1 bg-secondary text-muted-foreground font-mono">
                {alerts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSeverityFilter('danger')}
              className={`py-1 px-2.5 text-xs font-mono transition-colors duration-100 flex items-center gap-1.5 ${
                severityFilter === 'danger'
                  ? 'bg-destructive text-white font-bold'
                  : 'text-destructive hover:bg-destructive/10'
              }`}
            >
              <span className={`w-1.5 h-1.5 ${severityFilter === 'danger' ? 'bg-white' : 'bg-destructive'}`} />
              <span>Red</span>
              <span className={`text-[10px] px-1 font-mono ${
                severityFilter === 'danger' ? 'bg-white/20 text-white' : 'bg-destructive/10 text-destructive'
              }`}>
                {redCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSeverityFilter('warning')}
              className={`py-1 px-2.5 text-xs font-mono transition-colors duration-100 flex items-center gap-1.5 ${
                severityFilter === 'warning'
                  ? 'bg-warning text-foreground font-bold'
                  : 'text-warning hover:bg-warning/10'
              }`}
            >
              <span className={`w-1.5 h-1.5 ${severityFilter === 'warning' ? 'bg-foreground' : 'bg-warning'}`} />
              <span>Orange</span>
              <span className={`text-[10px] px-1 font-mono ${
                severityFilter === 'warning' ? 'bg-foreground/10 text-foreground' : 'bg-warning/10 text-warning'
              }`}>
                {orangeCount}
              </span>
            </button>
          </div>

          {/* Statewise Dropdown Filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-muted-foreground">
              <MapPin size={12} />
            </div>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="text-xs font-mono pl-6 pr-7 py-1.5 bg-card border border-border text-foreground focus:outline-none focus:border-primary cursor-pointer appearance-none"
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

          {/* Reset Button */}
          {(severityFilter !== 'all' || selectedState !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSeverityFilter('all');
                setSelectedState('all');
              }}
              className="px-2 py-1.5 border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground text-xs font-mono flex items-center gap-1 transition-colors duration-100"
              title="Reset filters"
            >
              <RotateCcw size={11} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Alerts list */}
        <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
          {filteredAlerts.length === 0 ? (
            <div className="py-12 px-4 text-center bg-secondary border border-border">
              <div className="w-9 h-9 mx-auto mb-2 bg-accent text-accent-foreground flex items-center justify-center border border-primary/30">
                <CheckCircle2 size={18} />
              </div>
              <h4 className="text-xs font-mono font-bold text-foreground">NO ACTIVE ALERTS MATCHING CRITERIA</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                No active hazard advisories match the current filter selection.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSeverityFilter('all');
                  setSelectedState('all');
                }}
                className="mt-3 px-3 py-1 bg-secondary text-foreground text-xs font-mono hover:bg-accent border border-border transition-colors duration-100"
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
                        background: isRed ? '#b42318' : '#ab6400',
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground truncate">{alert.title}</span>
                        <Badge variant={isRed ? 'destructive' : 'warning'} className="text-[9px] shrink-0">
                          {isRed ? 'RED ALERT' : 'ORANGE ALERT'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin size={10} className="shrink-0" />
                        <span className="truncate">{alert.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3 font-mono">
                    <div className="text-xs text-muted-foreground font-semibold">{alert.window}</div>
                    <div className="text-[10px] text-foreground mt-0.5 bg-secondary px-1.5 py-0.5 border border-border inline-block">
                      {alert.timestamp}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Panel>
    </div>
  );
}

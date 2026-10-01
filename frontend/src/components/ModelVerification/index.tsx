'use client';
import { useState, useEffect, useRef } from 'react';
import { Panel } from '@/components/shell/Panel';
import { getModelVerification } from '@/lib/api';
import type { VerificationPayload, ContinuousVerificationRow, CategoricalVerificationRow } from '@/lib/api';

const METHOD_DISPLAY: Record<string, string> = {
  ecmwf: 'ECMWF', gfs: 'GFS', icon: 'ICON', gem: 'GEM',
  equal_avg: 'Ensemble mean', weighted_blend: 'Prakruti blend',
};

const METHOD_ORDER = ['ecmwf', 'gfs', 'icon', 'gem', 'equal_avg', 'weighted_blend'];
const VARS = ['temperature', 'rainfall', 'wind_speed'] as const;
const VAR_SHORT: Record<string, string> = { temperature: 'Temp', rainfall: 'Rain', wind_speed: 'Wind' };
const VAR_UNIT: Record<string, string> = { temperature: '°C', rainfall: 'mm/h', wind_speed: 'km/h' };

const OURS = 'weighted_blend';

function fmt(v: number | null | undefined, digits = 2): string {
  return v == null ? '—' : v.toFixed(digits);
}

function VerificationTable({ rows }: { rows: ContinuousVerificationRow[] }) {
  if (rows.length === 0) return null;

  const best = new Map<string, number>();
  for (const v of VARS) {
    for (const metric of ['mae', 'rmse'] as const) {
      const vals = rows.filter((r) => r.variable === v).map((r) => r[metric]);
      best.set(`${v}:${metric}`, Math.min(...vals));
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="text-left pb-2 font-semibold uppercase tracking-[0.08em] text-[11px]">Method</th>
            {VARS.map((v) => (
              <>
                <th key={`${v}-mae`} className="text-right pb-2 font-semibold uppercase tracking-[0.08em] text-[11px] px-2">{VAR_SHORT[v]} MAE</th>
                <th key={`${v}-rmse`} className="text-right pb-2 font-semibold uppercase tracking-[0.08em] text-[11px] px-2">{VAR_SHORT[v]} RMSE</th>
              </>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {METHOD_ORDER.filter((m) => rows.some((r) => r.model === m)).map((m) => {
            const isOurs = m === OURS;
            return (
              <tr key={m} className={isOurs ? 'bg-secondary/60' : 'hover:bg-secondary/40'}>
                <td className="py-2.5 font-semibold text-foreground">
                  {METHOD_DISPLAY[m] ?? m}
                  {isOurs && <span className="ml-2 text-[10px] uppercase tracking-wider text-success font-bold">ours</span>}
                </td>
                {VARS.map((v) => {
                  const r = rows.find((x) => x.model === m && x.variable === v);
                  if (!r) return <td key={`${v}-na`} className="px-2 text-right text-muted-foreground">—</td>;
                  return (
                    <>
                      <td key={`${v}-mae`} className={`py-2.5 text-right px-2 font-semibold ${r.mae === best.get(`${v}:mae`) ? 'text-success' : 'text-foreground'}`}>
                        {fmt(r.mae)}
                      </td>
                      <td key={`${v}-rmse`} className={`py-2.5 text-right px-2 ${r.rmse === best.get(`${v}:rmse`) ? 'text-success font-semibold' : 'text-muted-foreground'}`}>
                        {fmt(r.rmse)}
                      </td>
                    </>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CategoricalTable({ rows }: { rows: CategoricalVerificationRow[] }) {
  const rain = rows.filter((r) => r.variable === 'rainfall');
  if (rain.length === 0) return null;
  const thresholds = [...new Set(rain.map((r) => r.threshold))].sort((a, b) => a - b);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="text-left pb-2 font-semibold uppercase tracking-[0.08em] text-[11px]">Method</th>
            {thresholds.map((t) => (
              <th key={t} colSpan={2} className="text-center pb-2 font-semibold uppercase tracking-[0.08em] text-[11px] border-l border-border">
                ≥ {t} mm/h <span className="normal-case font-normal">(POD / FAR)</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {METHOD_ORDER.filter((m) => rain.some((r) => r.model === m)).map((m) => (
            <tr key={m} className={m === OURS ? 'bg-secondary/60' : ''}>
              <td className="py-2.5 font-semibold text-foreground">{METHOD_DISPLAY[m] ?? m}</td>
              {thresholds.map((t) => {
                const r = rain.find((x) => x.model === m && x.threshold === t);
                return (
                  <td key={t} className="text-center border-l border-border py-2.5">
                    {r ? (
                      <>
                        <span className="font-semibold text-foreground">{fmt(r.pod)}</span>
                        <span className="text-muted-foreground"> / {fmt(r.far)}</span>
                      </>
                    ) : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] font-mono text-muted-foreground mt-2">
        POD = hits share of observed events · FAR = false-alarm share of forecasts. Deterministic calls; CSI/ETS/BSS in the API payload.
      </p>
    </div>
  );
}

export function ModelVerification({ selectedCity = 'Kanpur' }: { selectedCity?: string }) {
  const [data, setData] = useState<VerificationPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    getModelVerification({ city: selectedCity })
      .then((payload) => {
        if (mounted) {
          setData(payload);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });
    return () => { mounted = false; };
  }, [selectedCity]);

  const methods = METHOD_ORDER.filter((m) => data?.continuous.some((r) => r.model === m));
  const current = methods[activeIdx];
  const meta = data?.meta;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const card = cardRefs.current[0];
    const width = card ? card.offsetWidth + 12 : el.clientWidth * 0.82;
    const idx = Math.min(methods.length - 1, Math.max(0, Math.round(el.scrollLeft / width)));
    if (idx !== activeIdx) setActiveIdx(idx);
  };

  const cityRows = (m: string) =>
    (data?.continuous ?? []).filter((r) => r.model === m && r.city.toLowerCase() === selectedCity.toLowerCase());

  return (
    <Panel
      title="Verification against observed weather"
      subtitle="61-day truth scoring per model and reference method — lower MAE/RMSE is better, green marks the column best"
      term="skillScore"
      collapsibleOnPhone
    >
      {isLoading && <div className="h-[200px] animate-pulse rounded-lg bg-secondary/50" />}

      {!isLoading && !meta && (
        <div className="py-10 text-center text-xs font-mono text-muted-foreground">
          Verification metrics not published yet — run the verification stage (ai/verify.py).
        </div>
      )}

      {!isLoading && meta && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-muted-foreground">
            <span>{meta.window_start?.slice(0, 10)} → {meta.window_end?.slice(0, 10)}</span>
            <span>N = {meta.n_pairs?.toLocaleString()} city-hours</span>
            <span>truth: {meta.truth_source}</span>
          </div>

          {/* Desktop (>1024px): analytical tables */}
          <div className="hidden lg:block space-y-5">
            <VerificationTable rows={data?.continuous ?? []} />
            <div className="pt-3 border-t border-border">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono mb-2">
                Rainfall event detection
              </div>
              <CategoricalTable rows={data?.categorical ?? []} />
            </div>
          </div>

          {/* Mobile & tablet (<1024px): swipeable method cards */}
          <div className="block lg:hidden">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                Method scorecards · swipe ↔
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                {methods.findIndex((m) => m === current) + 1}/{methods.length}
              </span>
            </div>
            <div
              onScroll={handleScroll}
              className="carousel-snap-deck gap-3 pb-2 touch-pan-y -mx-4 px-4 sm:-mx-6 sm:px-6"
            >
              {methods.map((m, idx) => {
                const isOurs = m === OURS;
                const cat = (data?.categorical ?? []).filter((r) => r.model === m && r.variable === 'rainfall');
                return (
                  <div
                    key={m}
                    ref={(el) => { cardRefs.current[idx] = el; }}
                    className={`w-[82vw] sm:w-[340px] shrink-0 carousel-snap-item rounded-lg border p-4 ${isOurs ? 'bg-secondary/60 border-foreground/30 ring-1 ring-foreground/20' : 'bg-card border-border'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-semibold uppercase tracking-wider text-foreground">
                        {METHOD_DISPLAY[m] ?? m}
                      </span>
                      {isOurs && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-foreground text-background">
                          Ours
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {VARS.map((v) => {
                        const r = cityRows(m).find((x) => x.variable === v);
                        return (
                          <div key={v} className="flex items-center justify-between p-2 rounded bg-secondary/40 border border-border">
                            <span className="text-[10px] font-mono uppercase text-muted-foreground">{VAR_SHORT[v]}</span>
                            <span className="text-xs font-mono">
                              <span className="font-semibold text-foreground">{fmt(r?.mae)}</span>
                              <span className="text-muted-foreground"> MAE · RMSE </span>
                              <span className="text-foreground">{fmt(r?.rmse)}</span>
                              <span className="text-muted-foreground"> {VAR_UNIT[v]}</span>
                            </span>
                          </div>
                        );
                      })}
                      {cat.length > 0 && (
                        <div className="flex items-center justify-between p-2 rounded bg-secondary/40 border border-border">
                          <span className="text-[10px] font-mono uppercase text-muted-foreground">Rain ≥{cat[0].threshold} POD/FAR</span>
                          <span className="text-xs font-mono text-foreground font-semibold">{fmt(cat[0].pod)} / {fmt(cat[0].far)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-1 mt-2 pb-1">
              {methods.map((m, idx) => (
                <button
                  key={m}
                  type="button"
                  aria-label={`View ${METHOD_DISPLAY[m] ?? m} scorecard`}
                  onClick={() => {
                    setActiveIdx(idx);
                    cardRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                  }}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center touch-target"
                >
                  <span className={`h-2 rounded-full transition-all duration-200 ${activeIdx === idx ? 'w-6 bg-foreground' : 'w-2 bg-muted-foreground/30'}`} />
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] font-mono text-muted-foreground">
            {meta.crps_note}
          </p>
        </div>
      )}
    </Panel>
  );
}

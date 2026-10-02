'use client';
import { useState, useEffect } from 'react';
import { Panel } from '@/components/shell/Panel';
import { getModelCalibration } from '@/lib/api';
import type { CalibrationPayload } from '@/lib/api';

const VAR_SHORT: Record<string, string> = { temperature: 'Temp', rainfall: 'Rain', wind_speed: 'Wind' };
const VAR_UNIT: Record<string, string> = { temperature: '°C', rainfall: 'mm/h', wind_speed: 'km/h' };
const MODEL_DISPLAY: Record<string, string> = {
  ecmwf: 'ECMWF', gfs: 'GFS', icon: 'ICON', gem: 'GEM',
};

function fmt(v: number | null | undefined, digits = 3): string {
  return v == null ? '—' : v.toFixed(digits);
}

export function ModelCalibration({ selectedCity = 'Kanpur' }: { selectedCity?: string }) {
  const [data, setData] = useState<CalibrationPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    getModelCalibration({ city: selectedCity })
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

  const rows = (data?.bias_correction_diagnostic ?? [])
    .filter((r) => r.city.toLowerCase() === selectedCity.toLowerCase());

  return (
    <Panel
      title="Raw vs calibrated"
      subtitle={`What the correction layers actually change for ${selectedCity} — measured out-of-sample, not promised`}
      term="calibration"
      collapsibleOnPhone
    >
      {isLoading && <div className="h-[180px] animate-pulse rounded-lg bg-secondary/50" />}

      {!isLoading && !data && (
        <div className="py-10 text-center text-xs font-mono text-muted-foreground">
          Calibration diagnostics not published yet — run the verification stage (ai/verify.py).
        </div>
      )}

      {!isLoading && data && (
        <div className="space-y-5">
          {/* Calibration chain — what actually exists, no invented layers */}
          <div className="flex flex-col sm:flex-row gap-2">
            {data.calibration_layers.map((layer, i) => (
              <div key={layer.name} className="flex-1 p-3 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground bg-secondary rounded-sm px-1.5 py-0.5">
                    {i + 1}
                  </span>
                  <span className="text-xs font-semibold font-mono uppercase tracking-wider text-foreground">
                    {layer.name.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">{layer.description}</p>
              </div>
            ))}
          </div>

          {/* Hybrid correction effect — the operational layer */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono mb-2">
              RF residual correction effect (test split RMSE)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {data.hybrid_vs_blend.map((h) => (
                <div key={`${h.variable}-${h.lead_days}`} className="p-3 rounded-lg bg-card border border-border">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-semibold text-foreground">
                      {VAR_SHORT[h.variable]} · day {h.lead_days}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-data-ok-text">
                      −{h.rmse_reduction_pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground">
                    blend {h.blend_test_rmse.toFixed(3)} → hybrid <span className="text-foreground font-semibold">{h.hybrid_test_rmse.toFixed(3)}</span> {VAR_UNIT[h.variable]}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Per-model bias correction diagnostic (compact mono table on all
              devices — 12 rows fits a phone without scrolling the page; the
              table itself scrolls horizontally where needed) */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono mb-2">
              Additive bias correction, out-of-sample ({selectedCity})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left pb-2 font-semibold uppercase tracking-[0.08em] text-[11px]">Model</th>
                    <th className="text-right pb-2 font-semibold uppercase tracking-[0.08em] text-[11px] px-2">Var</th>
                    <th className="text-right pb-2 font-semibold uppercase tracking-[0.08em] text-[11px] px-2">Bias raw</th>
                    <th className="text-right pb-2 font-semibold uppercase tracking-[0.08em] text-[11px] px-2">Corrected</th>
                    <th className="text-right pb-2 font-semibold uppercase tracking-[0.08em] text-[11px] px-2">MAE Δ</th>
                    <th className="text-right pb-2 font-semibold uppercase tracking-[0.08em] text-[11px] px-2">Bias cut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => {
                    const maeDelta = r.mae_corrected - r.mae_raw;
                    return (
                      <tr key={`${r.model}-${r.variable}`} className="hover:bg-secondary/40">
                        <td className="py-2 font-semibold text-foreground">{MODEL_DISPLAY[r.model] ?? r.model}</td>
                        <td className="py-2 text-right px-2 text-muted-foreground">{VAR_SHORT[r.variable]}</td>
                        <td className="py-2 text-right px-2 text-foreground">{fmt(r.bias_raw)}</td>
                        <td className="py-2 text-right px-2 text-foreground">{fmt(r.bias_corrected)}</td>
                        <td className={`py-2 text-right px-2 ${maeDelta <= 0 ? 'text-data-ok-text' : 'text-[#ab6400]'}`}>
                          {maeDelta > 0 ? '+' : ''}{maeDelta.toFixed(3)}
                        </td>
                        <td className="py-2 text-right px-2 font-semibold text-foreground">
                          {r.bias_reduction_pct == null ? '—' : `${r.bias_reduction_pct.toFixed(0)}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] font-mono text-muted-foreground mt-2">
              Bias fitted on the train split, applied to unseen test days. MAE Δ green when the correction helps on
              unseen data; a negative bias cut means the correction overshot. Null = raw bias too small to score (&lt; 0.1 {rows[0]?.variable === 'rainfall' ? 'mm/h' : rows[0]?.variable === 'wind_speed' ? 'km/h' : '°C'}).
            </p>
          </div>
        </div>
      )}
    </Panel>
  );
}

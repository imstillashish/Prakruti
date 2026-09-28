'use client';
import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { getCities, getMetadata, formatLastUpdated, ENGINE_STATUS } from '@/lib/api';

interface BlendingEngineModalProps {
  open: boolean;
  onClose: () => void;
}

const PIPELINE = [
  { label: 'AI Model', color: '#3b82f6' },
  { label: 'ECMWF IFS', color: '#0ea5e9' },
  { label: 'GFS Seamless', color: '#6366f1' },
  { label: 'Observations', color: '#10b981' },
];

export function BlendingEngineModal({ open, onClose }: BlendingEngineModalProps) {
  const [animStep, setAnimStep] = useState(0);
  const [status, setStatus] = useState(ENGINE_STATUS);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!open) { setAnimStep(0); return; }
    const interval = setInterval(() => {
      setAnimStep(s => (s + 1) % (PIPELINE.length + 2));
    }, 400);

    let mounted = true;
    getCities()
      .then((cities) => {
        if (mounted && cities && cities.length > 0) {
          setStatus(prev => ({ ...prev, regionsEvaluated: cities.length }));
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setIsError(true);
          setIsLoading(false);
        }
      });

    getMetadata()
      .then((meta) => {
        if (mounted && meta?.last_updated) {
          const formatted = formatLastUpdated(meta.last_updated);
          setStatus(prev => ({
            ...prev,
            lastDataRefresh: formatted,
            lastRecalculation: formatted,
          }));
        }
      })
      .catch(() => {});

    return () => {
      clearInterval(interval);
      mounted = false;
    };
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="BLENDING ENGINE" size="md">
      <div className="space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {[
            { label: 'Models Analyzed', value: status.modelsAnalyzed },
            { label: 'Stations Evaluated', value: status.regionsEvaluated },
            { label: 'Lead Time', value: status.leadTime },
            { label: 'Current Regime', value: status.currentRegime },
            { label: 'Adaptive Weighting', value: 'Enabled' },
            { label: 'Engine Confidence', value: `${status.confidence}%` },
          ].map(s => (
            <div key={s.label}
              className="p-3 bg-[#f7f7f7] border border-[#dbdbdb]"
              style={{ borderRadius: 0 }}
            >
              <div className="text-[10px] font-mono text-[#808080] mb-0.5">{s.label}</div>
              <div className="text-xs font-bold text-[#212121]">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Animated pipeline */}
        <div
          className="p-4 bg-white border border-[#dbdbdb]"
          style={{ borderRadius: 0 }}
        >
          <h3 className="text-xs font-mono font-bold tracking-wider text-[#212121] mb-3">
            BLENDING PIPELINE
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {PIPELINE.map((p, i) => (
              <div key={p.label} className="flex items-center gap-2">
                <div
                  className="px-2.5 py-1 text-xs font-mono font-medium transition-colors"
                  style={{
                    borderRadius: 0,
                    background: animStep >= i ? '#e6faee' : '#f7f7f7',
                    border: `1px solid ${animStep >= i ? '#1db961' : '#dbdbdb'}`,
                    color: animStep >= i ? '#168a49' : '#808080',
                  }}
                >
                  {p.label}
                </div>
                {i < PIPELINE.length - 1 && (
                  <span className="text-xs font-mono text-[#dbdbdb]">+</span>
                )}
              </div>
            ))}
            <span className="text-xs font-mono text-[#808080] mx-1">→</span>
            <div
              className="px-3 py-1 text-xs font-mono font-bold transition-colors"
              style={{
                borderRadius: 0,
                background: animStep >= PIPELINE.length ? '#1db961' : '#f7f7f7',
                border: `1px solid ${animStep >= PIPELINE.length ? '#168a49' : '#dbdbdb'}`,
                color: animStep >= PIPELINE.length ? '#ffffff' : '#808080',
              }}
            >
              FINAL FORECAST
            </div>
          </div>
        </div>

        {/* Timing */}
        <div className="grid grid-cols-3 gap-2 text-xs font-mono p-2.5 bg-[#f7f7f7] border border-[#dbdbdb]" style={{ borderRadius: 0 }}>
          {[
            { label: 'Last Recalculation', value: status.lastRecalculation },
            { label: 'Data Ingest', value: status.lastDataRefresh },
            { label: 'Next Cycle', value: status.nextUpdate },
          ].map(t => (
            <div key={t.label} className="text-center">
              <div className="text-[10px] text-[#808080] mb-0.5">{t.label}</div>
              <div className="font-bold text-[#212121] text-[11px]">{t.value}</div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

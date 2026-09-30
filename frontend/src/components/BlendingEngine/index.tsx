'use client';
import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { StatusTracker } from '@/components/spectrumui/blocks/ai-assistants/status-tracker';
import { getCities, getMetadata, formatLastUpdated, ENGINE_STATUS } from '@/lib/api';

interface BlendingEngineModalProps {
  open: boolean;
  onClose: () => void;
}

const PIPELINE = ['AI Model', 'ECMWF IFS', 'GFS Seamless', 'Observations', 'Final Forecast'];

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
            <div key={s.label} className="p-3 rounded-md bg-secondary border border-border">
              <div className="text-[10px] font-mono text-muted-foreground mb-0.5">{s.label}</div>
              <div className="text-xs font-bold text-foreground">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Animated pipeline — spectrum-ui StatusTracker */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-xs font-mono font-bold tracking-wider text-foreground mb-4">
            BLENDING PIPELINE
          </h3>
          <StatusTracker
            stages={PIPELINE.map((label) => ({ id: label.toLowerCase().replace(/\s+/g, '-'), label }))}
            activeIndex={animStep}
            detail="Weighted per station by verified skill — w ∝ 1/RMSE²"
          />
        </div>

        {/* Timing */}
        <div className="grid grid-cols-3 gap-2 text-xs font-mono p-2.5 bg-secondary border border-border">
          {[
            { label: 'Last Recalculation', value: status.lastRecalculation },
            { label: 'Data Ingest', value: status.lastDataRefresh },
            { label: 'Next Cycle', value: status.nextUpdate },
          ].map(t => (
            <div key={t.label} className="text-center">
              <div className="text-[10px] text-muted-foreground mb-0.5">{t.label}</div>
              <div className="font-bold text-foreground text-[11px]">{t.value}</div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

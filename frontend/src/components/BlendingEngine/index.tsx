'use client';
import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { StatusTracker } from '@/components/spectrumui/blocks/ai-assistants/status-tracker';
import { getCycleState, getMetadata, formatLastUpdated } from '@/lib/api';
import type { CycleState, MetadataRecord } from '@/lib/api';

interface BlendingEngineModalProps {
  open: boolean;
  onClose: () => void;
}

// The engine's real stages, in regeneration order (see api/cache_manager.py).
const PIPELINE = ['Model Fetch', 'Preprocessing', 'Skill Weighting', 'Blend', 'RF Correction', 'Hazards & Verification'];

export function BlendingEngineModal({ open, onClose }: BlendingEngineModalProps) {
  const [animStep, setAnimStep] = useState(0);
  const [cycle, setCycle] = useState<CycleState | null>(null);
  const [meta, setMeta] = useState<MetadataRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!open) { setAnimStep(0); return; }
    const interval = setInterval(() => {
      setAnimStep(s => (s + 1) % (PIPELINE.length + 2));
    }, 400);

    let mounted = true;
    getCycleState()
      .then((state) => {
        if (mounted) {
          setCycle(state);
          setIsLoading(false);
          if (!state) setIsError(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setIsError(true);
          setIsLoading(false);
        }
      });

    getMetadata()
      .then((m) => {
        if (mounted) setMeta(m);
      })
      .catch(() => {});

    return () => {
      clearInterval(interval);
      mounted = false;
    };
  }, [open]);

  const stats: { label: string; value: string | number }[] = cycle
    ? [
        { label: 'Models Analyzed', value: cycle.source_completeness?.expected ?? cycle.expected_models.length },
        { label: 'Feeds Received', value: cycle.source_completeness?.available ?? cycle.received_models.length },
        { label: 'Stations', value: Object.keys(cycle.models).length ? cycle.received_models.length ? 45 : '—' : '—' },
        { label: 'Cycle Regime', value: cycle.missing_models.length ? 'Degraded — fallback blend' : 'All sources nominal' },
        { label: 'Adaptive Weighting', value: 'Enabled' },
        { label: 'Forecast Checksum', value: cycle.forecast_checksum.slice(7, 19) + '…' },
      ]
    : [];

  return (
    <Modal open={open} onClose={onClose} title="BLENDING ENGINE" size="md">
      <div className="space-y-4">
        {isLoading && (
          <div className="py-10 text-center text-xs font-mono text-muted-foreground" role="status" aria-live="polite">
            Reading engine cycle state…
          </div>
        )}
        {isError && !cycle && (
          <div className="py-10 text-center text-xs font-mono text-muted-foreground">
            Engine cycle state unavailable — the API has not published a cycle yet.
          </div>
        )}
        {!isLoading && cycle && (
          <>
        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {stats.map(s => (
            <div key={s.label} className="p-3 rounded-md bg-secondary border border-border">
              <div className="text-[11.5px] font-mono text-muted-foreground mb-0.5">{s.label}</div>
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
        <div className="grid grid-cols-2 gap-2 text-xs font-mono p-2.5 rounded-md bg-secondary border border-border">
          {[
            { label: 'Cycle ID', value: cycle.cycle_id },
            { label: 'Last Refresh', value: meta?.last_updated ? formatLastUpdated(meta.last_updated) : '—' },
          ].map(t => (
            <div key={t.label} className="text-center">
              <div className="text-[11.5px] text-muted-foreground mb-0.5">{t.label}</div>
              <div className="font-bold text-foreground text-[12px]">{t.value}</div>
            </div>
          ))}
        </div>
          </>
        )}
      </div>
    </Modal>
  );
}

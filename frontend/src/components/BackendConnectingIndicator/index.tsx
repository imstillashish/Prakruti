'use client';

import { useState, useEffect, useRef } from 'react';
import { getBackendStatus, BackendStatusType } from '@/lib/api';
import { Satellite, CheckCircle2 } from '@/components/icons';
import type { AnimatedIconHandle } from '@/components/icons';

/**
 * BackendConnectingIndicator
 * 
 * Displays a lightweight, compact status pill/banner ONLY while the Render backend is connecting / waking up.
 * - Positioned globally in the top dashboard area using fixed positioning to prevent layout shift.
 * - When connecting:
 *   A card-shaped waiting surface: the itshover dish pulses as the signal
 *   arrives and the action ramp steps along the bottom edge.
 * - When connected:
 *   A short "live backend connected" pill (shown 2 seconds, then hidden)
 * - Uses CSS transitions and lightweight keyframes only.
 */
export function BackendConnectingIndicator() {
  const [status, setStatus] = useState<BackendStatusType>(() => {
    if (typeof window === 'undefined') return 'idle';
    return getBackendStatus() === 'connecting' ? 'connecting' : 'idle';
  });
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return getBackendStatus() === 'connecting';
  });

  const wasConnectingRef = useRef<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dishRef = useRef<AnimatedIconHandle>(null);

  // Keep the dish signalling while we wait — the icon animates on hover by
  // default, and nothing hovers a status pill.
  useEffect(() => {
    if (status !== 'connecting') return;
    dishRef.current?.startAnimation();
    const id = window.setInterval(() => dishRef.current?.startAnimation(), 2400);
    return () => window.clearInterval(id);
  }, [status]);

  useEffect(() => {
    let mounted = true;

    // Check status on mount: only show if actively waking up / connecting
    const current = getBackendStatus();
    if (current === 'connecting') {
      wasConnectingRef.current = true;
      setStatus('connecting');
      setVisible(true);
    }

    const handleStatus = (e: Event) => {
      const detail = (e as CustomEvent<{
        status?: BackendStatusType;
        wakingUp?: boolean;
        connected?: boolean;
        error?: boolean;
      }>).detail;

      if (!mounted || !detail) return;

      if (detail.status === 'connecting' || detail.wakingUp) {
        wasConnectingRef.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
        if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        setStatus('connecting');
        setVisible(true);
      } else if (detail.status === 'connected' || detail.connected) {
        // Only show green success pill if it was previously in connecting / waking-up state!
        // Do not show on instant normal loads or page reloads when backend was already awake.
        if (wasConnectingRef.current) {
          wasConnectingRef.current = false;
          setStatus('connected');
          setVisible(true);

          if (timerRef.current) clearTimeout(timerRef.current);
          if (exitTimerRef.current) clearTimeout(exitTimerRef.current);

          // Show green success pill for 2 seconds, then automatically hide
          timerRef.current = setTimeout(() => {
            if (!mounted) return;
            setVisible(false);
            exitTimerRef.current = setTimeout(() => {
              if (mounted) {
                setStatus('idle');
              }
            }, 350); // Matches CSS transition duration
          }, 2000);
        } else {
          // Normal fast fetch when backend is already connected: keep indicator hidden
          setStatus('idle');
          setVisible(false);
        }
      } else if (detail.status === 'error' || detail.error) {
        wasConnectingRef.current = false;
        setVisible(false);
        if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        exitTimerRef.current = setTimeout(() => {
          if (mounted) {
            setStatus('idle');
          }
        }, 350);
      }
    };

    window.addEventListener('backend-status', handleStatus);

    return () => {
      mounted = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      window.removeEventListener('backend-status', handleStatus);
    };
  }, []);

  if (status === 'idle') {
    return null;
  }

  const isConnecting = status === 'connecting';
  const isConnected = status === 'connected';

  return (
    <div
      className="fixed top-28 sm:top-32 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 ease-out max-w-[92vw]"
      style={{
        opacity: visible ? 1 : 0,
        transform: `translate(-50%, ${visible ? '0px' : '-8px'}) scale(${visible ? 1 : 0.96})`,
      }}
      aria-live="polite"
    >
      {isConnecting && (
        <div className="pointer-events-auto w-[min(92vw,21rem)] overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5">
            <Satellite ref={dishRef} size={16} className="shrink-0 text-action" />
            <div className="min-w-0">
              <div className="text-xs font-semibold leading-tight text-foreground">
                Waking the forecast engine
              </div>
              <div className="text-[10.5px] font-mono text-muted-foreground">
                Live backend is starting up · up to 60s
              </div>
            </div>
          </div>
          <span aria-hidden className="loading-sweep block h-0.5 overflow-hidden bg-secondary">
            <span
              className="block h-full w-1/2"
              style={{
                backgroundColor: 'var(--colorway-deep-ocean)',
                backgroundImage: 'var(--colorway-ramp-ocean)',
              }}
            />
          </span>
        </div>
      )}

      {isConnected && (
        <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-1.5 shadow-lg">
          <CheckCircle2 size={14} className="text-success" />
          <span className="text-xs font-mono font-bold text-foreground">
            Live backend connected
          </span>
        </div>
      )}
    </div>
  );
}

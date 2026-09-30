'use client';

import { useState, useEffect, useRef } from 'react';
import { getBackendStatus, BackendStatusType } from '@/lib/api';

/**
 * BackendConnectingIndicator
 * 
 * Displays a lightweight, compact status pill/banner ONLY while the Render backend is connecting / waking up.
 * - Positioned globally in the top dashboard area using fixed positioning to prevent layout shift.
 * - When connecting:
 *   🟠 Fetching Live Backend Data...
 *   Animated spinner + "Render server is waking up (may take up to 60 seconds)"
 * - When connected:
 *   🟢 Live Backend Connected (shown for 2 seconds, then smoothly hidden)
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
        <div
          className="pointer-events-auto flex flex-col items-center gap-1 px-4 py-2 bg-card ambient-gradient-warning border border-border border-l-2 border-l-warning rounded-lg shadow-lg transition-all"
        >
          {/* Main Title Row */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            <span className="text-xs font-mono font-bold text-foreground">
              Connecting to Live Forecast Backend...
            </span>
          </div>

          {/* Subtitle with Animated Spinner */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
            <span
              className="w-2.5 h-2.5 rounded-full border border-warning border-t-transparent animate-spin inline-block flex-shrink-0"
              aria-label="Loading spinner"
            />
            <span>Render server is waking up (may take up to 60s)</span>
          </div>
        </div>
      )}

      {isConnected && (
        <div
          className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 bg-card ambient-gradient-success border border-border border-l-2 border-l-success rounded-lg shadow-lg transition-all"
        >
          <span className="w-2 h-2 rounded-full bg-success" />
          <span className="text-xs font-mono font-bold text-primary">
            Live Backend Connected
          </span>
        </div>
      )}
    </div>
  );
}

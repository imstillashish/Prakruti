'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { getBackendStatus, getMetadata, SERVER_WAKING_UP_MSG, type BackendStatusType } from '@/lib/api';
import { MorMark } from '@/components/brand/MorMark';
import SplitFlapText from '@/components/SplitFlapText';
import DotGrid from '@/components/DotGrid';
import { AlertTriangle, ArrowRight, CheckCircle2, Gauge, Layers, RefreshCw, Satellite, ShieldCheck } from '@/components/icons';

const SEEN_KEY = 'prakruti:welcome-seen';

const STEPS = [
  {
    title: 'Every national weather model, one forecast.',
    lede: 'Prakruti runs the world’s forecasting supercomputers side by side, then blends them into a single answer for each of India’s monitored stations.',
  },
  {
    title: 'Trust is measured, not assumed.',
    lede: 'Each model is scored against observed weather, and the blend re-weights itself toward whichever model is winning for that variable, season and lead time.',
  },
  {
    title: 'Warming the forecast engine.',
    lede: 'The first cycle usually lands within a minute. The dashboard fills in on its own while you wait.',
  },
] as const;

const READY_STEP = {
  title: 'Engine live. Take a look.',
  lede: 'The latest verified cycle is loaded and the map is reporting. Everything you need is one screen away.',
} as const;

const FAILED_STEP = {
  title: 'The engine is not answering.',
  lede: 'The last cycle timed out. Retrying usually gets through — and the dashboard keeps checking on its own either way.',
} as const;

const TRUST_ROWS = [
  {
    Icon: ShieldCheck,
    title: 'Scored against observations',
    body: 'Daily miss-rates per variable, kept as a running skill record.',
  },
  {
    Icon: Gauge,
    title: 'Weighted by verified skill',
    body: 'Influence follows the score — no model holds a permanent seat.',
  },
  {
    Icon: Layers,
    title: 'Merged with honest spread',
    body: 'The blend carries its uncertainty, so a confident number never hides disagreement.',
  },
];

/**
 * WelcomeSplash
 *
 * First-run welcome and the wake-up screen for a cold backend, in one surface.
 * It shows when the engine is connecting (the dashboard would otherwise render
 * half-filled placeholders) or on the first visit of a session, and dismisses
 * for good on Skip or the final step — one appearance per session, never a gate.
 */
export function WelcomeSplash() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [status, setStatus] = useState<BackendStatusType>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [retrying, setRetrying] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // Portal target only exists after hydration; reading sessionStorage in the
  // same pass keeps the first paint free of a flash.
  useEffect(() => {
    setMounted(true);
    const current = getBackendStatus();
    setStatus(current);
    const seen = window.sessionStorage.getItem(SEEN_KEY) === '1';
    if (current === 'connecting' || !seen) setOpen(true);
  }, []);

  // The engine can finish waking while the splash is still on screen — track it
  // so the last step can flip from "warming" to "live" instead of lying, and
  // keep the failure message so that same step can say why it is stuck.
  useEffect(() => {
    const onStatus = (e: Event) => {
      const detail = (e as CustomEvent<{ status?: BackendStatusType; message?: string }>).detail;
      if (detail?.status) setStatus(detail.status);
      if (detail?.message) setStatusMessage(detail.message);
    };
    window.addEventListener('backend-status', onStatus);
    return () => window.removeEventListener('backend-status', onStatus);
  }, []);

  const dismiss = useCallback(() => {
    window.sessionStorage.setItem(SEEN_KEY, '1');
    setOpen(false);
  }, []);

  const go = useCallback(
    (next: number) => {
      if (next < 0 || next >= STEPS.length || next === step) return;
      setDir(next > step ? 1 : -1);
      setStep(next);
    },
    [step]
  );

  // Same recovery the status strip offers: re-issue the light metadata call and
  // let fetchWithReconnect drive the status event back through this component.
  const retry = useCallback(() => {
    setRetrying(true);
    getMetadata()
      .catch(() => {})
      .finally(() => setRetrying(false));
  }, []);

  // Escape skips, arrows walk the steps — the splash is the only focusable
  // surface while it is open, so nothing behind it should answer keys.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismiss();
      } else if (e.key === 'ArrowRight') {
        go(step + 1);
      } else if (e.key === 'ArrowLeft') {
        go(step - 1);
      } else if (e.key === 'Tab' && rootRef.current) {
        const focusable = rootRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, step, go, dismiss]);

  // Modal's convention: hold the page still behind the overlay.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (open) rootRef.current?.focus();
  }, [open]);

  const lastStep = step === STEPS.length - 1;
  const engineLive = status === 'connected';
  const engineFailed = status === 'error';
  const copy = lastStep ? (engineFailed ? FAILED_STEP : engineLive ? READY_STEP : STEPS[step]) : STEPS[step];

  // ponytail: the rise starts the step 18px low, so for the 420ms transition the
  // scroller carries 18px of slack on a 390px phone (measured 0 at rest, all
  // three tiers). Clip the step in a wrapper carrying the min-h-full column if
  // that flicker ever shows up on a real device.
  const body = useMemo(() => {
    const enter = reduce ? { opacity: 0 } : { opacity: 0, y: dir === 1 ? 18 : -18, filter: 'blur(6px)' };
    const settled = reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' };
    return { enter, settled };
  }, [reduce, dir]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      // Named on the dialog itself: the heading swaps between steps, so a
      // labelledby pointing at it would name the dialog only some of the time.
      aria-label="Welcome to Prakruti"
      className="fixed inset-0 z-50 flex flex-col bg-background outline-none"
    >
      {/* The step heading swaps inside AnimatePresence, which announces
          nothing on its own — this stable region carries the step change. */}
      <div role="status" aria-live="polite" className="sr-only">
        Step {step + 1} of {STEPS.length}: {copy.title}
      </div>

      {/* Ambient dot field — geometry on a measuring surface, not decoration.
          It listens to the pointer on window, so it stays non-interactive here. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <DotGrid
          dotSize={3}
          gap={26}
          baseColor="#e6e8ec"
          activeColor="#0d74ce"
          proximity={130}
          speedTrigger={100}
        />
      </div>

      <header className="relative z-10 flex items-center justify-between gap-4 px-5 pt-5 sm:px-8 sm:pt-6">
        <div className="flex items-center gap-2.5">
          <MorMark className="h-7 w-7 shrink-0 text-foreground sm:h-8 sm:w-8" />
          <SplitFlapText
            words={['PRAKRUTI', 'प्रकृति']}
            flipDuration={0.12}
            stagger={0.06}
            cycleDelay={3600}
            charset="alphanumeric"
            flipsPerChar={8}
            tileColor="#171717"
            textColor="#ffffff"
            tileRadius={4}
            gap={2}
            fontSize={16}
            loop
            padTo={8}
            aria-label="Prakruti"
          />
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="relative -mr-2 flex h-11 min-w-14 items-center justify-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Skip
        </button>
      </header>

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${step}-${lastStep && engineLive ? 'live' : 'wait'}`}
            initial={body.enter}
            animate={body.settled}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: dir === 1 ? -14 : 14, filter: 'blur(6px)' }}
            transition={reduce ? { duration: 0 } : { duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            className="grid min-h-full content-center gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-12 lg:gap-14"
          >
            <section className="min-w-0 lg:col-span-5">
              <h1 className="text-3xl font-semibold leading-[1.08] tracking-[-0.02em] text-foreground sm:text-4xl">
                {copy.title}
              </h1>
              <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-muted-foreground sm:text-base">
                {copy.lede}
              </p>
            </section>

            <aside className="flex min-w-0 items-center justify-center lg:col-span-7 lg:justify-start">
              {step === 0 && <BlendDiagram />}
              {step === 1 && <TrustRows />}
              {step === 2 && (
                <EngineState
                  state={engineFailed ? 'failed' : engineLive ? 'live' : 'starting'}
                  message={statusMessage || SERVER_WAKING_UP_MSG}
                  retrying={retrying}
                  onRetry={retry}
                />
              )}
            </aside>
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="relative z-10 border-t border-border bg-background/85 px-5 py-4 backdrop-blur-sm sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5" role="group" aria-label="Welcome steps">
            {STEPS.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => go(i)}
                aria-label={`Step ${i + 1} of ${STEPS.length}`}
                aria-current={i === step ? 'step' : undefined}
                className="group relative flex h-11 w-11 items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:h-8 lg:w-12"
              >
                <span className="relative h-1 w-full overflow-hidden rounded-full bg-secondary">
                  <span
                    className="absolute inset-y-0 left-0 bg-[var(--colorway-deep-ocean)] transition-[width] duration-500 ease-out"
                    style={{ width: i <= step ? '100%' : '0%' }}
                  />
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => go(step - 1)}
                className="flex h-11 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (lastStep ? dismiss() : go(step + 1))}
              className="gradient-animated-ocean group flex h-11 flex-1 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold shadow-[0_8px_24px_rgba(13,116,206,0.18)] transition-transform active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:flex-none"
            >
              {lastStep ? 'Enter the dashboard' : 'Continue'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </footer>
    </div>,
    document.body
  );
}

/**
 * Four model feeds converging on one blended line. The sources draw first, the
 * merged output last — the picture is the product's whole argument, so it gets
 * the one authored entrance animation on this surface.
 */
function BlendDiagram() {
  const sources = [
    'M6 22 C 74 22, 108 84, 168 84',
    'M6 63 C 74 63, 108 84, 168 84',
    'M6 105 C 74 105, 108 84, 168 84',
    'M6 146 C 74 146, 108 84, 168 84',
  ];
  const starts = [22, 63, 105, 146];

  return (
    <figure className="w-full max-w-[520px]">
      <svg viewBox="0 0 348 168" className="h-auto w-full" role="img" aria-label="Several weather models blending into one forecast">
        {starts.map((y, i) => (
          <rect key={y} x={2} y={y - 4} width={8} height={8} rx={1.5} className="fill-muted-foreground/45" />
        ))}
        {sources.map((d, i) => (
          <path
            key={d}
            d={d}
            pathLength={1}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.25}
            strokeLinecap="round"
            className="welcome-draw text-muted-foreground/55"
            style={{ '--i': i } as CSSProperties}
          />
        ))}
        <rect x={164} y={80} width={8} height={8} rx={1.5} className="fill-foreground/70" />
        <path
          d="M172 84 H 342"
          pathLength={1}
          fill="none"
          stroke="var(--colorway-deep-ocean)"
          strokeWidth={2.5}
          strokeLinecap="round"
          className="welcome-draw"
          style={{ '--i': 4 } as CSSProperties}
        />
      </svg>
      <figcaption className="mt-4 flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
        <span>National models</span>
        {/* Out-of-flow: the two ends stay put while plain-text readers get a
            verb between the labels instead of one run-on string. */}
        <span className="sr-only">converged into one</span>
        <span>Blended answer</span>
      </figcaption>
    </figure>
  );
}

/** The three claims the engine can actually back up, cascading in behind the copy. */
function TrustRows() {
  const reduce = useReducedMotion();
  const item = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: reduce ? { duration: 0 } : { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
  };

  return (
    <motion.ul
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.09 } } }}
      className="w-full max-w-[560px] divide-y divide-border border-y border-border"
    >
      {TRUST_ROWS.map(({ Icon, title, body }) => (
        <motion.li key={title} variants={item} className="group flex items-start gap-4 py-4">
          <Icon size={18} className="mt-0.5 shrink-0 text-action" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">{title}</div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </div>
        </motion.li>
      ))}
    </motion.ul>
  );
}

/** Live state of the wake-up: the same sweep the status pill uses, then a check,
 *  and — if the retries ran out — what went wrong plus the way back in. */
function EngineState({
  state,
  message,
  retrying,
  onRetry,
}: {
  state: 'starting' | 'live' | 'failed';
  message: string;
  retrying: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="w-full max-w-[520px] overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-start gap-3 px-4 py-3.5">
        {state === 'live' ? (
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" />
        ) : state === 'failed' ? (
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-destructive" />
        ) : (
          <Satellite size={18} className="mt-0.5 shrink-0 text-action" />
        )}
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">
            {state === 'live'
              ? 'Forecast engine connected'
              : state === 'failed'
              ? 'Forecast engine unreachable'
              : 'Forecast engine starting'}
          </div>
          <div className="mt-1 font-mono text-xs text-muted-foreground">
            {state === 'live'
              ? 'Latest verified cycle loaded'
              : state === 'failed'
              ? message
              : 'Cold start — up to 60 seconds'}
          </div>
        </div>
      </div>
      {state === 'starting' && (
        <span aria-hidden className="loading-sweep block h-0.5 overflow-hidden bg-secondary">
          <span
            className="block h-full w-1/2"
            style={{ backgroundColor: 'var(--colorway-deep-ocean)', backgroundImage: 'var(--colorway-ramp-ocean)' }}
          />
        </span>
      )}
      {state === 'failed' && (
        <div className="border-t border-border px-4 py-2.5">
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="flex h-11 items-center gap-2 rounded-md border border-input px-3 text-sm text-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
          >
            <RefreshCw size={15} className={retrying ? 'animate-spin' : undefined} />
            {retrying ? 'Retrying…' : 'Try again'}
          </button>
        </div>
      )}
    </div>
  );
}

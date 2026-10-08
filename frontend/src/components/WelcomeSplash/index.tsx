'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { getBackendStatus, getMetadata, SERVER_WAKING_UP_MSG, type BackendStatusType } from '@/lib/api';
import { MorMark } from '@/components/brand/MorMark';
import SplitFlapText from '@/components/SplitFlapText';
import DotGrid from '@/components/DotGrid';
import { AlertTriangle, ArrowRight, CheckCircle2, Gauge, Layers, RefreshCw, Satellite, Send, ShieldCheck } from '@/components/icons';

const SEEN_KEY = 'prakruti:welcome-seen';

const STEPS = [
  {
    title: 'Every national weather model, one forecast.',
    lede: 'Prakruti runs the world’s forecasting supercomputers side by side, then blends them into one answer for each monitored station.',
  },
  {
    title: 'Trust is measured, not assumed.',
    lede: 'Each model is scored against observed weather, so the blend re-weights toward whichever wins for that variable and lead time.',
  },
  {
    title: 'Your own model can earn a seat here.',
    lede: 'Post your model’s hourly rows: the engine scores them and prices the weight they would earn before admitting anything.',
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

// Each row carries a small instrument that plays its own claim once, then holds.
const TRUST_ROWS = [
  {
    Icon: ShieldCheck,
    Plot: ScoreBars,
    title: 'Scored against observations',
    body: 'Daily miss-rates per variable, kept as a running skill record.',
  },
  {
    Icon: Gauge,
    Plot: WeightSplit,
    title: 'Weighted by verified skill',
    body: 'Influence follows the score — no model holds a permanent seat.',
  },
  {
    Icon: Layers,
    Plot: SpreadBand,
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
      // `h-[100dvh]` rather than a plain `inset-0`: the fixed overlay sizes to the
      // layout viewport, which on iOS Safari includes the strip behind the
      // toolbar, and the CTA sits in the footer at the very bottom of it. The
      // dynamic viewport height keeps the button above the toolbar.
      className="fixed inset-x-0 top-0 z-50 flex h-[100dvh] flex-col bg-background outline-none"
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

      <header className="relative z-10 flex items-center justify-between gap-4 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8 sm:pt-6">
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

      {/* `overscroll-contain` keeps a flick at the end of the step from pulling
          the dashboard behind the splash with it.
          ponytail: measured at 844x390 (phone on its side) this scroller gets
          245px for a ~470px step, so the figure there sits below the fold and
          the step has to be swiped. Every tier in the §9.6 budget table is
          portrait and clears it; the upgrade path is a height-scoped compact
          mode once landscape phones join that table. */}
      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${step}-${lastStep && engineLive ? 'live' : 'wait'}`}
            initial={body.enter}
            animate={body.settled}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: dir === 1 ? -14 : 14, filter: 'blur(6px)' }}
            transition={reduce ? { duration: 0 } : { duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            className="grid min-h-full content-center gap-6 px-5 py-6 sm:px-8 sm:py-10 lg:grid-cols-12 lg:gap-14"
          >
            {/* Two things scale with the device rather than the viewport label:
                the measure and the column split. The copy takes its cap from
                `sm`, not `md`: between 640 and 768 there is no other stop, and
                an uncapped heading there runs the full 700px of a fold.
                The split is 6/6 from `lg` on. The 5/7 asymmetry this used to
                carry at `xl` needed the copy to stay at 36px; at the display-xl
                headline below it squeezes the column to three lines, so the
                even split holds all the way up. */}
            <section className="min-w-0 sm:max-w-[36rem] lg:col-span-6">
              <h1 className="text-3xl font-semibold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-4xl xl:text-5xl">
                {copy.title}
              </h1>
              <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-muted-foreground sm:text-base">
                {copy.lede}
              </p>
            </section>

            {/* Left-flush, not centred. From 640px the figure is narrower than
                the column, and a centred box under a left-aligned heading reads
                as two alignment systems stacked on each other. On a phone the
                step fills the width, so the two are the same thing there. */}
            <aside className="flex min-w-0 items-center justify-start lg:col-span-6">
              {step === 0 && <BlendDiagram />}
              {step === 1 && <TrustRows />}
              {step === 2 && <SeatsDiagram />}
              {step === 3 && (
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

      <footer className="relative z-10 border-t border-border bg-background/85 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5" role="group" aria-label="Welcome steps">
            {STEPS.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => go(i)}
                aria-label={`Step ${i + 1} of ${STEPS.length}`}
                aria-current={i === step ? 'step' : undefined}
                // The tier that shrinks this pip is a *pointer* tier, not a wide
                // one: `lg` also covers every tablet in landscape, where a 32px
                // tall pip is under the 44px touch floor. So the shrink asks the
                // pointer what it is instead of asking the viewport how wide it
                // is — a mouse gets the tighter pip at 1024px, an iPad keeps 44.
                className="group relative flex h-11 w-11 items-center rounded-md transition-transform active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:any-pointer-fine:h-8 lg:any-pointer-fine:w-12"
              >
                <span className="relative h-1 w-full overflow-hidden rounded-full bg-secondary">
                  <span
                    className="absolute inset-y-0 left-0 bg-[var(--colorway-deep-ocean)] transition-[width] duration-500 ease-out"
                    style={{
                      width: i <= step ? '100%' : '0%',
                      // The step you are on carries the moving ramp; the ones
                      // behind it hold the flat base, so the track reads as a
                      // route rather than four identical fills.
                      backgroundImage: i === step ? 'var(--colorway-ramp-ocean)' : undefined,
                    }}
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
 * Four named model feeds converging on one blended line.
 *
 * The sources are stroked in their own categorical series token, so the picture
 * names the models instead of showing four anonymous curves, and the legend
 * below reads straight off the same tokens. Ocean stays on the merged output
 * alone — that line is the product's answer, not a fourth data series.
 *
 * Two passes per line: a muted base that draws in, and a pulse that travels the
 * same path afterwards. `pathLength={1}` lets one dash pattern serve a 110-unit
 * feed and the 170-unit output alike.
 */
function BlendDiagram() {
  const feeds = [
    { model: 'ECMWF', token: '--series-1', y: 22 },
    { model: 'ICON', token: '--series-2', y: 63 },
    { model: 'GFS', token: '--series-3', y: 105 },
    { model: 'GEM', token: '--series-4', y: 146 },
  ] as const;
  const feedPath = (y: number) => `M6 ${y} C 74 ${y}, 108 84, 168 84`;
  const OUTPUT_PATH = 'M172 84 H 342';

  return (
    <figure className="w-full max-w-[520px]">
      <svg
        viewBox="0 0 348 168"
        className="h-auto w-full"
        role="img"
        aria-label="ECMWF, ICON, GFS and GEM feeding one blended forecast"
      >
        {feeds.map(({ model, token, y }, i) => (
          <g key={model}>
            <rect x={2} y={y - 4} width={8} height={8} rx={1.5} fill={`var(${token})`} />
            <path
              d={feedPath(y)}
              pathLength={1}
              fill="none"
              stroke={`var(${token})`}
              strokeOpacity={0.55}
              strokeWidth={1.5}
              strokeLinecap="round"
              className="welcome-draw"
              style={{ '--i': i } as CSSProperties}
            />
            <path
              d={feedPath(y)}
              pathLength={1}
              fill="none"
              stroke={`var(${token})`}
              strokeWidth={2}
              strokeLinecap="round"
              className="welcome-flow"
            />
          </g>
        ))}
        <rect x={164} y={80} width={8} height={8} rx={1.5} className="fill-foreground/70" />
        <path
          d={OUTPUT_PATH}
          pathLength={1}
          fill="none"
          stroke="var(--colorway-deep-ocean)"
          strokeWidth={2.5}
          strokeLinecap="round"
          className="welcome-draw"
          style={{ '--i': feeds.length } as CSSProperties}
        />
        <path
          d={OUTPUT_PATH}
          pathLength={1}
          fill="none"
          stroke="var(--colorway-deep-ocean)"
          strokeWidth={2.5}
          strokeLinecap="round"
          className="welcome-flow"
        />
      </svg>
      <figcaption className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
        {feeds.map(({ model, token }) => (
          <span key={model} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-1.5 w-3 shrink-0 rounded-xs border border-border/60 shadow-2xs"
              style={{ backgroundColor: `var(${token})` }}
            />
            {model}
          </span>
        ))}
        {/* Decorative in the visual flow, spelled out for plain-text readers
            underneath so the legend is not four names then one. */}
        <span aria-hidden className="text-input">
          →
        </span>
        <span className="sr-only">converge into one</span>
        <span className="inline-flex items-center gap-1.5 text-foreground">
          <span
            aria-hidden
            className="h-1.5 w-3 shrink-0 rounded-xs border border-border/60 shadow-2xs"
            style={{ backgroundColor: 'var(--colorway-deep-ocean)' }}
          />
          Blended answer
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * The six models the blend runs today, plus the open seat a reader's own model
 * posts into.
 *
 * Each seat carries its series token as a rail down the left edge rather than a
 * swatch beside the name — at this size a 12x6 chip read as decoration, and the
 * rail makes the row of seats scan as one rack held together by identity. The
 * empty place stays an outline, because an unclaimed seat is not a model yet.
 *
 * The seventh seat then arrives: it slides in from outside the rack and a ring
 * flares off its edge once, which is the whole invitation. One shot, no loop —
 * a seat that keeps pulsing is decoration, and this step already has the
 * reader's attention.
 */
function SeatsDiagram() {
  const reduce = useReducedMotion();
  const seats = [
    { name: 'ECMWF', token: '--series-1' },
    { name: 'ICON', token: '--series-2' },
    { name: 'GFS', token: '--series-3' },
    { name: 'GEM', token: '--series-4' },
    { name: 'JMA', token: '--series-5' },
    { name: 'UKMO', token: '--series-6' },
  ];
  const arrive = reduce ? { duration: 0 } : { delay: 0.45, duration: 0.55, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <figure className="w-full max-w-[520px]">
      <ul
        role="img"
        aria-label="Six blended models, with the seventh seat open for your own model"
        // Two columns on a phone: three squeezed `your_model` down to an
        // ellipsis at 390px, and the plate is the point of the step.
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
      >
        {seats.map(({ name, token }) => (
          <li
            key={name}
            className="relative flex items-center overflow-hidden rounded-md border border-border bg-card py-2.5 pl-3.5 pr-3"
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-[3px]"
              style={{ backgroundColor: `var(${token})` }}
            />
            <span className="truncate font-mono text-[11px] font-semibold text-foreground">{name}</span>
          </li>
        ))}
        <motion.li
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={arrive}
          className="relative flex items-center gap-2.5 rounded-md border border-dashed border-input py-2.5 pl-3.5 pr-3"
        >
          <Send size={13} className="shrink-0 text-action" />
          <span className="truncate font-mono text-[11px] text-muted-foreground">your_model</span>
          {!reduce && (
            <motion.span
              aria-hidden
              initial={{ opacity: 0.55, scale: 1 }}
              animate={{ opacity: 0, scale: 1.07 }}
              transition={{ delay: 0.45, duration: 0.9, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-[var(--action)]"
            />
          )}
        </motion.li>
      </ul>
      <figcaption className="mt-4 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
        Six seats filled · the seventh is yours to post
      </figcaption>
    </figure>
  );
}

/** The three claims the engine can actually back up, cascading in behind the copy.
 *  Each one carries the small instrument that plays its own claim. */
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
      {TRUST_ROWS.map(({ Icon, Plot, title, body }) => (
        <motion.li key={title} variants={item} className="py-4">
          {/* The instrument rides the title line and `flex-1` pushes it to the
              row's far edge. Stacking it under the copy instead cost 36px a row
              and put step 2 past the phone scroller — the claim and its evidence
              share a line here at every width. */}
          <div className="flex items-center gap-4">
            <Icon size={18} className="shrink-0 text-action" />
            <div className="min-w-0 flex-1 text-sm font-semibold text-foreground">{title}</div>
            <Plot />
          </div>
          <p className="mt-1 pl-[34px] text-sm leading-relaxed text-muted-foreground">{body}</p>
        </motion.li>
      ))}
    </motion.ul>
  );
}

/**
 * Row 1: a miss-rate record filling in. Bars are ink at two weights — error
 * magnitude is not a hazard, so it gets no semantic hue, and the newest day
 * simply sits darker than the days behind it.
 */
function ScoreBars() {
  const reduce = useReducedMotion();
  const heights = [14, 10, 16, 8, 12, 6, 9, 5];

  return (
    <svg viewBox="0 0 80 24" aria-hidden className="h-6 w-20 shrink-0">
      {heights.map((h, i) => (
        <motion.rect
          key={i}
          x={i * 10}
          width={6}
          rx={1}
          initial={{ height: 0, y: 22 }}
          animate={{ height: h, y: 22 - h }}
          transition={reduce ? { duration: 0 } : { delay: 0.12 + i * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className={i === heights.length - 1 ? 'fill-foreground/70' : 'fill-foreground/25'}
        />
      ))}
      <line x1={0} y1={23} x2={80} y2={23} className="stroke-border" strokeWidth={1} />
    </svg>
  );
}

/**
 * Row 2: the influence bar re-settling out of an even split. Deliberately
 * unlabelled — the widths show the mechanism, and a number here would claim a
 * precision the splash has not fetched yet. Identity rides the series tokens,
 * which is what those colours are for.
 */
function WeightSplit() {
  const reduce = useReducedMotion();
  const tokens = ['--series-1', '--series-2', '--series-3', '--series-4'];
  const settled = [34, 28, 21, 17];

  return (
    <div aria-hidden className="flex h-6 w-20 shrink-0 flex-col justify-center gap-1.5">
      <div className="flex h-2.5 w-full overflow-hidden rounded-xs">
        {tokens.map((token, i) => (
          <motion.span
            key={token}
            initial={{ width: '25%' }}
            animate={{ width: `${settled[i]}%` }}
            transition={reduce ? { duration: 0 } : { delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="h-full shrink-0"
            style={{ backgroundColor: `var(${token})` }}
          />
        ))}
      </div>
      <div className="h-px w-full bg-border" />
    </div>
  );
}

/**
 * Row 3: a P10–P90 band narrowing as the models agree. Ink again, not ocean —
 * the accent owns action, and a spread band is data.
 */
function SpreadBand() {
  const reduce = useReducedMotion();

  return (
    <svg viewBox="0 0 80 24" aria-hidden className="h-6 w-20 shrink-0">
      <motion.rect
        x={0}
        width={80}
        initial={{ height: 18, y: 3 }}
        animate={{ height: 6, y: 9 }}
        transition={reduce ? { duration: 0 } : { delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="fill-foreground/15"
      />
      <line x1={0} y1={12} x2={80} y2={12} className="stroke-foreground/35" strokeWidth={1.5} />
    </svg>
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
  const reduce = useReducedMotion();

  return (
    <div className="w-full max-w-[520px] overflow-hidden rounded-lg border border-border bg-card">
      {/* Keyed on the state so the flip from starting to live is visible: the
          engine arriving is the one thing this step exists to show, and a
          silent string swap hid it. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={state}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -5 }}
          transition={reduce ? { duration: 0 } : { duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-start gap-3 px-4 py-3.5"
        >
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
        </motion.div>
      </AnimatePresence>
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

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { PageHeader } from '@/components/shell/PageHeader';
import { Panel } from '@/components/shell/Panel';
import DotGrid from '@/components/DotGrid';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Code2,
  Cpu,
  Droplets,
  ExternalLink,
  Layers,
  RefreshCw,
  Send,
  ShieldCheck,
  Thermometer,
  Wind,
} from '@/components/icons';
import {
  EMPTY_BYOM_LIMITS,
  getByomRegistry,
  postByomForecasts,
  type ByomIngestResult,
  type ByomRegistry,
} from '@/lib/api';
import { BYOM_SAMPLE_MODEL_ID, byomSampleJson } from '@/data/byomSample';

/** Variable → the label and unit a forecast reader uses, not the column name. */
const VARIABLE_META: Record<string, { label: string; unit: string; Icon: typeof Wind }> = {
  temperature: { label: 'Air temperature', unit: '°C', Icon: Thermometer },
  rainfall: { label: 'Precipitation', unit: 'mm', Icon: Droplets },
  wind_speed: { label: 'Wind (10 m)', unit: 'km/h', Icon: Wind },
};

const CHAIN = [
  {
    Icon: ShieldCheck,
    title: 'Verified against observed weather',
    body: 'The rows are matched to actuals and scored the same way the six blended models are.',
  },
  {
    Icon: Layers,
    title: 'Weighted by measured skill',
    body: 'Inverse-RMSE weighting prices the model against the incumbents for each variable.',
  },
  {
    Icon: Cpu,
    title: 'Blended only when it earns it',
    body: 'The response shows what including it does to the blend’s own error, before admission.',
  },
];

export function ByomPage() {
  const [registry, setRegistry] = useState<ByomRegistry | null>(null);
  const [registryError, setRegistryError] = useState(false);
  const [modelId, setModelId] = useState(BYOM_SAMPLE_MODEL_ID);
  const [payload, setPayload] = useState(byomSampleJson);
  const [result, setResult] = useState<ByomIngestResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const reduce = useReducedMotion();

  const limits = registry?.limits ?? EMPTY_BYOM_LIMITS;

  const loadRegistry = useCallback(async () => {
    try {
      setRegistry(await getByomRegistry());
      setRegistryError(false);
    } catch {
      setRegistryError(true);
    }
  }, []);

  useEffect(() => {
    loadRegistry();
  }, [loadRegistry]);

  // The id rule comes from the server's own pattern rather than a copy, so the
  // input can never accept something the endpoint will reject.
  const idPattern = useMemo(() => {
    try {
      return new RegExp(limits.model_id);
    } catch {
      return /^$/;
    }
  }, [limits.model_id]);
  const idValid = idPattern.test(modelId);
  const idTaken =
    idValid &&
    !limits.reserved_ids.includes(modelId) &&
    !limits.built_in_models.includes(modelId);

  const parsed = useMemo(() => {
    try {
      const body = JSON.parse(payload);
      const rows = Array.isArray(body) ? body : body?.rows;
      if (!Array.isArray(rows)) return { rows: null, error: 'expected { "rows": [ … ] }' };
      if (rows.length === 0) return { rows: null, error: 'the rows array is empty' };
      if (rows.length > limits.row_cap) {
        return { rows: null, error: `${rows.length} rows exceeds the ${limits.row_cap}-row cap` };
      }
      return { rows, error: null };
    } catch (err) {
      return { rows: null, error: err instanceof Error ? err.message : 'invalid JSON' };
    }
  }, [payload, limits.row_cap]);

  const ready = idValid && idTaken && parsed.rows !== null && !busy;

  const submit = useCallback(async () => {
    if (!parsed.rows) return;
    setBusy(true);
    setFailure(null);
    const started = performance.now();
    try {
      const body = await postByomForecasts(modelId, parsed.rows);
      setResult(body);
      setElapsed(Math.round(performance.now() - started));
      await loadRegistry();
    } catch (err) {
      setResult(null);
      // fetchWithReconnect wraps non-retryable responses as `HTTP 400: {json}`.
      const message = err instanceof Error ? err.message : 'the request failed';
      const json = message.match(/\{[\s\S]*\}/);
      let detail = message;
      if (json) {
        try {
          detail = String(JSON.parse(json[0]).error ?? message);
        } catch {
          detail = message;
        }
      }
      setFailure(detail.replace(/^HTTP \d{3}:\s*/, ''));
    } finally {
      setBusy(false);
    }
  }, [modelId, parsed.rows, loadRegistry]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Cpu}
        title="Bring Your Own Model"
        sub="Post a foreign forecast model and the engine tells you what it is worth before admitting it."
      />

      {/* Hero band: sky atmosphere is hero-only, ink text sits straight on the
          wash. React Bits' dot field measures the surface and answers the
          pointer; it is ambient, so it stays aria-hidden and non-interactive. */}
      <section className="hero-sky relative overflow-hidden rounded-lg border border-border px-5 py-7 sm:px-8 sm:py-9">
        {/* ponytail: DotGrid keeps a rAF loop alive for as long as it is mounted,
            and it has no offscreen pause. That is the same cost the welcome splash
            already pays, and this band is one canvas on one tab — acceptable here.
            Ceiling: many more ambient fields, or one on a page that lives open all
            day. Upgrade path: gate the mount on an IntersectionObserver. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-70">
          <DotGrid dotSize={3} gap={28} baseColor="#ffffff" activeColor="#0d74ce" proximity={120} speedTrigger={110} />
        </div>

        <div className="relative">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-foreground/70">
            Open model intake
          </p>
          <h2 className="mt-2 max-w-[30ch] text-2xl font-semibold leading-[1.12] tracking-[-0.02em] text-foreground sm:text-3xl">
            Any model can earn a seat in the blend.
          </h2>
          {/* Two sentences on phone, three on wider screens: the phone budget is
              the binding one, and the third sentence is the same claim again. */}
          <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-foreground/80">
            Six models ship in the blend today — four national weather services, JMA GSM and UKMO
            Seamless. A seventh does not need a code change: post its hourly rows and the response
            tells you what it is worth.
          </p>

          {/* Phone: the three claims, one line each. The supporting sentence is
              progressive disclosure for a wider screen, not hover-only — the
              claim itself is always spelled out. */}
          <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-2.5 sm:mt-6 sm:grid-cols-3 sm:gap-y-4">
            {CHAIN.map(({ Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                  <Icon size={15} className="text-action" />
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-foreground">{title}</div>
                  <p className="mt-0.5 hidden text-xs leading-relaxed text-foreground/70 sm:block">
                    {body}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={submit}
              disabled={!ready}
              className="gradient-animated-ocean flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold shadow-[0_8px_24px_rgba(13,116,206,0.18)] transition-transform active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
            >
              {busy ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
              {busy ? 'Scoring…' : 'Run the sample'}
            </button>
            <button
              type="button"
              data-nav="api"
              className="flex h-11 items-center justify-center gap-2 rounded-md border border-input bg-card px-4 text-sm text-foreground transition-colors hover:bg-accent active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Raw endpoint in the API Explorer
              <ArrowRight size={15} />
            </button>
            {/* The endpoint path lives here rather than in a PageHeader action,
                which stacked its own row on a phone for the same string. */}
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-foreground/60">
              <Code2 size={12} />
              POST /api/models/{'{model_id}'}/forecasts
            </span>
          </div>
        </div>
      </section>

      {/* One console, two halves: what you send, what comes back. Stacks until
          lg — at tablet width the payload editor and the score table both want
          the full row. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <Panel
          className="lg:col-span-5"
          title="Your model's rows"
          // The window a post must land inside decides whether it scores at all,
          // so it rides in the subtitle that already exists rather than costing
          // its own row: as a separate line it measured three lines on a phone.
          subtitle={
            limits.verification_window.from
              ? `Scored inside ${limits.verification_window.from} → ${limits.verification_window.to}`
              : 'Long-format hours, same columns the ingest reads'
          }
        >
          <label className="block">
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              model_id
            </span>
            <input
              type="text"
              value={modelId}
              onChange={(e) => setModelId(e.target.value.trim().toLowerCase())}
              spellCheck={false}
              autoComplete="off"
              className="mt-1.5 h-11 w-full rounded-md border border-input bg-card px-3 font-mono text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
            <span className="mt-1 block font-mono text-[11px] text-muted-foreground">
              {limits.model_id}
              {limits.reserved_ids.length > 0 && ` · reserved: ${limits.reserved_ids.join(', ')}`}
            </span>
          </label>

          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                payload
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {parsed.rows ? `${parsed.rows.length} rows` : '—'}
              </span>
            </div>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              spellCheck={false}
              rows={7}
              aria-label="JSON payload"
              className="mt-1.5 w-full resize-y rounded-md border border-input bg-card p-3 font-mono text-[11px] leading-relaxed text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
            {/* Both halves of this row are 44px tall: an underline-only text link
                measured 105x17 and failed the touch tier. */}
            <div className="mt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPayload(byomSampleJson())}
                className="flex h-11 items-center font-mono text-[11px] text-text-link underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                reset to sample
              </button>
              <span className="font-mono text-[11px] text-muted-foreground">
                ≥{limits.min_rows_per_variable} h matched to score
              </span>
            </div>
          </div>

          {!idValid && (
            <p className="mt-3 flex items-start gap-2 text-xs text-destructive">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              model_id must be lowercase letters, digits and underscores.
            </p>
          )}
          {idValid && !idTaken && (
            <p className="mt-3 flex items-start gap-2 text-xs text-destructive">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {modelId} is a reserved or built-in id — pick another name.
            </p>
          )}
          {idTaken && parsed.error && (
            <p className="mt-3 flex items-start gap-2 text-xs text-destructive">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              Payload: {parsed.error}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={!ready}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-input bg-card text-sm font-semibold text-foreground transition-colors hover:bg-accent active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
          >
            {busy ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
            {busy ? 'Scoring…' : 'POST the rows'}
          </button>
        </Panel>

        <div className="space-y-4 lg:col-span-7">
          {failure && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-card px-4 py-3"
            >
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-destructive" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">The engine refused those rows</div>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">{failure}</p>
              </div>
            </div>
          )}

          {!result && !failure && (
            <Panel title="What comes back" subtitle="Scores, weight and blend impact — from the same POST">
              <p className="max-w-[58ch] text-sm leading-relaxed text-muted-foreground">
                Nothing posted yet. The request on the left is a real day of Kanpur hours — run it
                and this panel fills with the model’s error, its weight, and the blend impact.
              </p>
              {registryError && (
                <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0 text-data-watch" />
                  The engine is not answering, so the staged list below is empty. Executing will
                  retry automatically.
                </p>
              )}
            </Panel>
          )}

          {result && (
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={reduce ? { duration: 0 } : { duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4"
            >
              <Panel
                title={`${result.model} — ${result.status === 'accepted' ? 'scored' : 'stored, not yet scoreable'}`}
                subtitle={`${result.rows} rows accepted · ${result.cities} ${result.cities === 1 ? 'city' : 'cities'} · ${result.stored_rows} rows staged in total`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {result.status === 'accepted' ? (
                    <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-data-ok-text">
                      <CheckCircle2 size={12} />
                      Verified and priced
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-data-watch">
                      <AlertTriangle size={12} />
                      Staged — coverage too thin to score
                    </span>
                  )}
                  <span className="font-mono text-[11px] text-muted-foreground">
                    covered {result.coverage.matched_actuals} observed hours
                    {' · '}
                    {(result.coverage.share_of_actuals * 100).toFixed(2)}% of the verification window
                  </span>
                  {elapsed !== null && (
                    <span className="font-mono text-[11px] text-muted-foreground">· {elapsed} ms</span>
                  )}
                </div>

                {result.notes.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {result.notes.map((note) => (
                      <li key={note} className="text-xs text-muted-foreground">
                        {note}
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              {result.scores && (
                <Panel title="Error against observed weather" subtitle="Lower is better; skill is 0–100 against the incumbents">
                  <div className="divide-y divide-border">
                    {Object.entries(result.scores).map(([variable, score]) => {
                      const meta = VARIABLE_META[variable] ?? {
                        label: variable,
                        unit: '',
                        Icon: Layers,
                      };
                      const { Icon } = meta;
                      return (
                        <div key={variable} className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3 first:pt-0 last:pb-0">
                          <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold text-foreground">
                            <Icon size={15} className="shrink-0 text-muted-foreground" />
                            {meta.label}
                          </span>
                          {[
                            ['RMSE', score.rmse.toFixed(4), meta.unit],
                            ['MAE', score.mae.toFixed(4), meta.unit],
                            ['Bias', `${score.bias > 0 ? '+' : ''}${score.bias.toFixed(4)}`, meta.unit],
                            ['Skill', score.skill !== undefined ? score.skill.toFixed(1) : '—', '/100'],
                          ].map(([label, value, unit]) => (
                            <span key={label} className="flex flex-col">
                              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                                {label}
                              </span>
                              <span className="font-mono text-sm font-semibold text-foreground">
                                {value}
                                <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">{unit}</span>
                              </span>
                            </span>
                          ))}
                          <span className="font-mono text-[11px] text-muted-foreground">n={score.n}</span>
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              )}

              {result.weight && (
                <Panel title="Weight it would carry" subtitle="Inverse-RMSE share against the six blended models">
                  <div className="space-y-3">
                    {Object.entries(result.weight).map(([variable, weight]) => {
                      const meta = VARIABLE_META[variable];
                      return (
                        <div key={variable} className="flex items-center gap-3">
                          <span className="w-28 shrink-0 text-xs text-muted-foreground">
                            {meta?.label ?? variable}
                          </span>
                          {/* Width carries the magnitude; hue stays out of it. */}
                          <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
                            <span
                              className="block h-full rounded-full bg-foreground"
                              style={{ width: `${Math.min(100, weight * 100)}%` }}
                            />
                          </span>
                          <span className="w-14 shrink-0 text-right font-mono text-sm font-semibold text-foreground">
                            {(weight * 100).toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              )}

              {result.blend_preview && (
                <Panel title="What it does to the blend" subtitle="Recomputed both ways over the hours this model covers">
                  <div className="space-y-3">
                    {result.blend_preview.map((preview) => {
                      const delta =
                        preview.blend_rmse !== null && preview.blend_rmse_with_model !== null
                          ? preview.blend_rmse_with_model - preview.blend_rmse
                          : null;
                      const better = delta !== null && delta < 0;
                      const meta = VARIABLE_META[preview.variable];
                      return (
                        <div
                          key={preview.variable}
                          className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-border pb-3 last:border-0 last:pb-0"
                        >
                          <span className="min-w-0 flex-1 text-xs text-muted-foreground">
                            {meta?.label ?? preview.variable}
                            <span className="ml-2 font-mono">{preview.rows} h</span>
                          </span>
                          <span className="font-mono text-sm text-muted-foreground">
                            {preview.blend_rmse?.toFixed(4) ?? '—'}
                          </span>
                          <ArrowRight size={13} className="text-muted-foreground" />
                          <span className="font-mono text-sm font-semibold text-foreground">
                            {preview.blend_rmse_with_model?.toFixed(4) ?? '—'}
                          </span>
                          {delta !== null && (
                            <span
                              className={`font-mono text-[11px] font-semibold ${
                                better ? 'text-data-ok-text' : 'text-data-hazard'
                              }`}
                            >
                              {better ? 'improves' : 'worsens'} {delta > 0 ? '+' : ''}
                              {delta.toFixed(4)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* The trust boundary, read from the server's own constants so the page
          cannot promise a rule the endpoint does not enforce. */}
      <Panel title="What the engine will refuse" subtitle="Every check runs before a byte is written">
        <ul className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2 sm:gap-y-3">
          {[
            {
              Icon: Code2,
              title: 'model_id outside the alphabet',
              body: `${limits.model_id} — path separators and uppercase never reach the filesystem.`,
            },
            {
              Icon: ShieldCheck,
              title: 'Cities that are not monitored',
              body: 'Every row’s city must exist in the 45-station registry, and datetimes must parse as ISO-8601.',
            },
            {
              Icon: AlertTriangle,
              title: 'Non-finite numbers',
              body: 'NaN and infinity are rejected, as are negative rainfall or wind, and temperatures outside [-10, 55].',
            },
            {
              Icon: Layers,
              title: `Anything past ${limits.row_cap.toLocaleString('en-IN')} rows`,
              body: 'Re-POSTing the same (city, datetime) replaces those hours instead of duplicating them, so coverage grows in pieces.',
            },
          ].map(({ Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <Icon size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-foreground">{title}</div>
                <p className="mt-0.5 hidden text-xs leading-relaxed text-muted-foreground sm:block">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="Models posted from this server"
        subtitle={`${registry?.models.length ?? 0} staged · none of them change the shipped blend until they clear full coverage`}
        actions={
          <button
            type="button"
            onClick={loadRegistry}
            className="flex h-11 items-center gap-1.5 rounded-md px-3 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:h-9"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        }
      >
        {registry && registry.models.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  {['Model', 'Rows', 'Cities', 'Observed hours matched', 'Window'].map((head) => (
                    <th
                      key={head}
                      className="pb-2 font-mono text-[10px] font-normal uppercase tracking-[0.08em] text-muted-foreground"
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registry.models.map((model) => (
                  <tr key={model.model} className="border-b border-border last:border-0">
                    <td className="py-2.5 font-mono text-xs font-semibold text-foreground">
                      {model.model}
                      {model.scoreable && (
                        <span className="ml-2 text-[10px] font-normal text-data-ok-text">scoreable</span>
                      )}
                    </td>
                    <td className="py-2.5 font-mono text-xs text-foreground">{model.rows}</td>
                    <td className="py-2.5 font-mono text-xs text-foreground">{model.cities}</td>
                    <td className="py-2.5 font-mono text-xs text-foreground">
                      {model.matched_actuals}
                      <span className="ml-1 text-muted-foreground">
                        ({(model.share_of_actuals * 100).toFixed(2)}%)
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-[11px] text-muted-foreground">
                      {model.from} → {model.to}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing staged yet. Run the sample above and the model shows up here with its coverage.
          </p>
        )}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="hidden max-w-[92ch] text-xs leading-relaxed text-muted-foreground sm:block">
            Staged rows sit outside the production chain on purpose: the pipeline asserts gap-free
            hourly groups and an exact match to the observed pair set, which a partially covered
            foreign model cannot satisfy.
          </p>
          <a
            href="https://github.com/imstillashish/Prakruti/blob/main/docs/plans/2026-10-06-more-models.md"
            target="_blank"
            rel="noreferrer"
            className="flex h-11 shrink-0 items-center gap-1.5 text-xs text-text-link underline-offset-2 hover:underline lg:h-9"
          >
            <span className="sm:hidden">Promotion is a deliberate step — </span>
            the promotion path
            <ExternalLink size={11} />
          </a>
        </div>
      </Panel>
    </div>
  );
}

export default ByomPage;

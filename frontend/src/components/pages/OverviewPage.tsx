'use client';

import { useEffect, useMemo, useState } from 'react';
import { CloudRain, Thermometer, Wind, Droplets, MapPin, ShieldCheck } from '@/components/icons';
import { SunGlyph, CloudGlyph, RainGlyph, StormGlyph } from '@/components/icons/weather-glyphs';
import { getForecast, getDecision, getLiveConditions } from '@/lib/api';
import type { ForecastRecord, DecisionPayload, LiveConditions } from '@/lib/api';
import { More } from '@/components/plain/Plain';
import { WeatherMap } from '@/components/WeatherMap';
import { ForecastTimeline } from '@/components/ForecastTimeline';
import { ModelContribution } from '@/components/ModelContribution';
import { ModelSkillPanel } from '@/components/ModelSkill';
import { DataHealthPanel } from '@/components/DataHealth';
import { ModelComparison } from '@/components/ModelComparison';
import { RegionSelector } from '@/components/RegionSelector';
import type { CityForecast } from '@/types';

interface Day {
  key: string;
  date: string;
  weekday: string;
  dayNumber: string;
  month: string;
  high: number | null;
  low: number | null;
  rainTotal: number | null;
  maxWind: number | null;
  avgHumidity: number;
  condition: string;
  icon: 'clear' | 'cloud' | 'rain' | 'storm';
  hours: ForecastRecord[];
}

/**
 * Today, in the shape people actually read weather in: one number, one
 * sentence, one action — then strips of detail.
 *
 * The old page opened with a grid of six equal-weight panels and asked the
 * reader to assemble the answer. This one opens with the temperature, the
 * condition, and what to do about it, and puts the map, the model weights and
 * the health telemetry behind one disclosure.
 */
export function OverviewPage({
  selectedCity,
  onSelectCity,
  onNavigate,
}: {
  selectedCity: string | null;
  onSelectCity: (city: CityForecast | string) => void;
  onNavigate: (page: 'forecast' | 'extreme-weather' | 'rpi') => void;
}) {
  const city = selectedCity ?? 'Kanpur';
  const [records, setRecords] = useState<ForecastRecord[]>([]);
  const [live, setLive] = useState<LiveConditions | null>(null);
  const [decision, setDecision] = useState<DecisionPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoaded(false);
    Promise.all([
      getForecast(city).catch(() => [] as ForecastRecord[]),
      getDecision(city).catch(() => null),
      getLiveConditions(city).catch(() => null),
    ]).then(([f, d, l]) => {
      if (!alive) return;
      setRecords(f ?? []);
      setDecision(d);
      setLive(l);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [city]);

  const days = useMemo(() => buildDays(records), [records]);
  const today = days[0];

  // The decision payload publishes an agreement score (0-100) even when its
  // confidence score is null. That is the engine's own statement about how
  // much the models back each other up — a real number, not a stand-in.
  const certainty = decision?.records?.[0]?.agreement_score ?? null;

  // "Now" is the live observation when we have one; the forecast's first hour
  // is the fallback. Two different things, so they are never mixed.
  const nowTemp = live?.current.temperature ?? today?.hours[0]?.blend_temperature;
  const feelsLike = live?.current.feels_like ?? nowTemp;
  const condition = live?.current.condition ?? today?.condition ?? '—';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* ---- The number, the sentence, the action ------------------ */}
        <section className="lg:col-span-5">
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <MapPin size={12} className="shrink-0" />
            <span className="font-medium text-foreground">{city}</span>
            {live?.observed_at_ist && (
              <>
                <span aria-hidden>·</span>
                <span>observed {live.observed_at_ist}</span>
              </>
            )}
          </div>

          {nowTemp != null ? (
            <>
              <div className="mt-3 flex items-start gap-4">
                <span className="text-[64px] font-medium leading-[0.85] tracking-[-0.04em] tabular-nums text-foreground sm:text-[76px]">
                  {Math.round(nowTemp)}°
                </span>
                <div className="min-w-0 pt-1">
                  <p className="text-[19px] font-medium leading-tight text-foreground">{condition}</p>
                  {feelsLike != null && Math.abs(feelsLike - nowTemp) >= 1 && (
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      Feels like {Math.round(feelsLike)}°
                    </p>
                  )}
                </div>
              </div>

              <p className="mt-4 max-w-[46ch] text-[14px] leading-relaxed text-muted-foreground">
                {buildSentence({ city, today, live, decision })}
              </p>
            </>
          ) : (
            <>
              <div className="mt-3 text-[64px] font-medium leading-[0.85] tracking-[-0.04em] text-muted-foreground/35 sm:text-[76px]">
                —
              </div>
              <p className="mt-4 max-w-[46ch] text-[14px] leading-relaxed text-muted-foreground">
                The engine has not published {city} yet. The numbers arrive on the next six-hourly
                cycle — nothing here is guessed.
              </p>
            </>
          )}

          {/* ---- Four small cards: the conditions you actually feel ---- */}
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <MiniStat
              icon={Droplets}
              label="Humidity"
              value={live?.current.humidity != null ? `${Math.round(live.current.humidity)}%` : '—'}
              note={live?.current.humidity != null ? humidityNote(live.current.humidity) : 'Not observed'}
            />
            <MiniStat
              icon={CloudRain}
              label="Rain, next 24h"
              value={today?.rainTotal != null ? `${today.rainTotal.toFixed(1)}` : '—'}
              unit="mm"
              note={today?.rainTotal != null ? rainNote(today.rainTotal) : 'No forecast'}
            />
            <MiniStat
              icon={Wind}
              label="Wind"
              value={today?.maxWind != null ? `${Math.round(today.maxWind)}` : '—'}
              unit="km/h"
              note={today?.maxWind != null ? windNote(today.maxWind) : 'No forecast'}
            />
            <MiniStat
              icon={ShieldCheck}
              label="How sure"
              value={certainty != null ? `${Math.round(certainty)}` : '—'}
              unit={certainty != null ? '%' : undefined}
              note={certaintyNote(certainty)}
            />
          </div>
        </section>

        {/* ---- Hourly strip and the ten-day row --------------------- */}
        <section className="lg:col-span-7 space-y-5">
          <Strip title="Next 24 hours">
            {records.length > 0 ? (
              <HourlyStrip hours={records} />
            ) : (
              <EmptyStrip label="No hourly series published for this station yet" />
            )}
          </Strip>

          <Strip title="The next three days">
            {days.length > 0 ? (
              <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border">
                {days.map((d) => (
                  <div key={d.key} className="bg-card px-3 py-3.5 text-center">
                    <div className="text-[11.5px] text-muted-foreground">{d.weekday}</div>
                    <div className="text-[11px] text-muted-foreground/80">
                      {d.dayNumber} {d.month}
                    </div>
                    <div className="my-2 flex justify-center">
                      <WeatherGlyph condition={d.icon} />
                    </div>
                    <div className="text-[17px] font-medium tabular-nums text-foreground">
                      {d.high != null ? `${Math.round(d.high)}°` : '—'}
                    </div>
                    <div className="text-[12px] tabular-nums text-muted-foreground">
                      {d.low != null ? `${Math.round(d.low)}°` : '—'}
                    </div>
                    {d.rainTotal != null && d.rainTotal >= 0.1 && (
                      <div className="mt-1 text-[11px] tabular-nums text-data-rain">
                        {d.rainTotal.toFixed(1)} mm
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyStrip label="No daily forecast published for this station yet" />
            )}
          </Strip>

          <Strip title="Where the weather is worst">
            <div className="overflow-hidden rounded-lg border border-border">
              <WeatherMap selectedCity={city} onSelectCity={onSelectCity} />
            </div>
          </Strip>
        </section>
      </div>

      {/* ---- The working -------------------------------------------- */}
      <More label="How this was worked out">
        <div className="space-y-5">
          <p className="max-w-[68ch] text-[13.5px] leading-relaxed text-muted-foreground">
            The numbers above are a weighted blend of six independent forecast models — two numerical
            weather prediction runs from NCMRWF and four from international centres. The weight each
            model earns is recalculated every cycle against what actually happened, so a model that has
            been wrong about {city} lately counts for less here than it did last week.
          </p>
          <RegionSelector selectedCity={city} onSelectCity={onSelectCity} />
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
            <ModelContribution selectedCity={city} />
            <ModelSkillPanel />
            <DataHealthPanel />
            <ModelComparison selectedCity={city} />
          </div>
          <ForecastTimeline selectedCity={city} />
        </div>
      </More>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Strip({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2.5 text-[12.5px] font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

/**
 * The next hours, starting from the current one. The forecast runs midnight
 * to midnight, so anchoring the strip to the first row would open it at 00:00
 * — six hours of weather that has already happened. The strip is cut from the
 * full 72-hour series, not from today's block, so it crosses midnight instead
 * of ending early. Seven slots at three-hour spacing fills the row exactly.
 */
function HourlyStrip({ hours }: { hours: ForecastRecord[] }) {
  const slots = useMemo(() => {
    // The API groups rows by lead day, so the series has to be sorted by clock
    // time before it can be cut — otherwise the strip walks 00:00→23:00 of one
    // day and stops, instead of crossing midnight into the next.
    const sorted = [...hours].sort((a, b) => a.datetime.localeCompare(b.datetime));
    const now = new Date();
    const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:00`;

    // First slot at or after the current hour.
    let start = sorted.findIndex((h) => h.datetime.slice(0, 13) >= nowKey.slice(0, 13));
    if (start < 0) start = 0;

    const picked: ForecastRecord[] = [];
    for (let i = start; i < sorted.length && picked.length < 7; i += 3) picked.push(sorted[i]);
    return picked;
  }, [hours]);

  if (slots.length === 0) {
    return <EmptyStrip label="No hourly series published for this station yet" />;
  }

  return (
    <div
      className="grid gap-px overflow-hidden rounded-lg border border-border bg-border"
      style={{ gridTemplateColumns: `repeat(${slots.length}, minmax(0, 1fr))` }}
    >
      {slots.map((h, i) => {
        const label = h.datetime.split(' ')[1]?.slice(0, 5) ?? '--:--';
        const rain = h.blend_rainfall ?? 0;
        return (
          <div key={h.datetime} className="bg-card px-2 py-3 text-center">
            <div className="text-[11.5px] text-muted-foreground">{i === 0 ? 'Now' : label}</div>
            <div className="my-1.5 flex justify-center">
              <WeatherGlyph condition={conditionFor(rain, h.blend_temperature ?? 0)} />
            </div>
            <div className="text-[15px] font-medium tabular-nums text-foreground">
              {Math.round(h.blend_temperature ?? 0)}°
            </div>
            <div className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
              {rain >= 0.1 ? `${rain.toFixed(1)}mm` : '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyStrip({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-6 text-center text-[13px] text-muted-foreground">
      {label}
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  unit,
  note,
}: {
  icon: (props: { size?: number; className?: string }) => React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  note: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-3">
      <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        <Icon size={12} className="shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="text-[22px] font-medium leading-none tabular-nums text-foreground">
          {value}
        </span>
        {unit && <span className="text-[11.5px] text-muted-foreground">{unit}</span>}
      </div>
      <p className="mt-1.5 text-[11.5px] leading-snug text-muted-foreground">{note}</p>
    </div>
  );
}

/** The weather glyph is a plain vector, not a bitmap — it scales and recolours
    with the theme, and it costs nothing to render forty of them. */
function WeatherGlyph({ condition }: { condition: 'clear' | 'cloud' | 'rain' | 'storm' }) {
  if (condition === 'clear') {
    return <SunGlyph size={22} className="text-data-temp-mid" />;
  }
  if (condition === 'storm') {
    return <StormGlyph size={22} className="text-data-rain" />;
  }
  if (condition === 'rain') {
    return <RainGlyph size={22} className="text-data-rain" />;
  }
  return <CloudGlyph size={22} className="text-muted-foreground" />;
}

/* ------------------------------------------------------------------ */

function buildDays(records: ForecastRecord[]): Day[] {
  if (!records || records.length === 0) return [];

  const byDay = new Map<string, ForecastRecord[]>();
  for (const r of records) {
    const key = r.datetime.slice(0, 10);
    const list = byDay.get(key) ?? [];
    list.push(r);
    byDay.set(key, list);
  }

  const out: Day[] = [];
  for (const [date, hours] of byDay) {
    // Only real values feed the aggregates — a day the blend didn't publish
    // stays null instead of masquerading as 0°.
    const temps = hours.map((h) => h.blend_temperature).filter((t): t is number => t != null);
    const rains = hours.map((h) => h.blend_rainfall).filter((r): r is number => r != null);
    const winds = hours.map((h) => h.blend_wind_speed).filter((w): w is number => w != null);
    const totalRain = rains.length ? rains.reduce((a, b) => a + b, 0) : null;
    const d = new Date(`${date}T00:00:00`);
    out.push({
      key: date,
      date,
      weekday: d.toLocaleDateString('en-GB', { weekday: 'short' }),
      dayNumber: String(d.getDate()),
      month: d.toLocaleDateString('en-GB', { month: 'short' }),
      high: temps.length ? Math.max(...temps) : null,
      low: temps.length ? Math.min(...temps) : null,
      rainTotal: totalRain != null ? Math.round(totalRain * 10) / 10 : null,
      maxWind: winds.length ? Math.max(...winds) : null,
      avgHumidity: 0,
      condition: '',
      icon: conditionFor(totalRain ?? 0, temps.length ? Math.max(...temps) : 0),
      hours: hours.sort((a, b) => a.datetime.localeCompare(b.datetime)),
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
}

function conditionFor(rain: number, temp: number): 'clear' | 'cloud' | 'rain' | 'storm' {
  if (rain >= 12) return 'storm';
  if (rain >= 1.5) return 'rain';
  if (rain >= 0.1) return 'cloud';
  return temp >= 32 ? 'clear' : 'cloud';
}

/**
 * The one sentence under the number. Every clause is derived from a value
 * that is on screen — no clause means no sentence.
 */
function buildSentence({
  city,
  today,
  live,
  decision,
}: {
  city: string;
  today?: Day;
  live: LiveConditions | null;
  decision: DecisionPayload | null;
}): string {
  if (!today) {
    return `The engine has not published ${city} yet.`;
  }

  const clauses: string[] = [];
  if (today.rainTotal != null) {
    if (today.rainTotal >= 15) clauses.push('expect waterlogging on the main roads');
    else if (today.rainTotal >= 5) clauses.push('carry an umbrella');
    else if (today.rainTotal >= 1) clauses.push('expect a few passing showers');
  }

  if (today.high != null) {
    if (today.high >= 40) clauses.push('keep out of the sun between noon and three');
    else if (today.high >= 35) clauses.push('drink water through the afternoon');
    else if (today.high >= 20 && (today.rainTotal ?? 0) < 1) clauses.push('it is comfortable outside');
  }

  if (today.maxWind != null) {
    if (today.maxWind >= 45) clauses.push('gusts will take the edge off two-wheelers');
    else if (today.maxWind >= 25) clauses.push('it is breezy in the open');
  }

  if (clauses.length === 0) {
    return `Nothing in ${city} needs planning around today — it is a quiet day.`;
  }

  const action = clauses.join(', ');
  const agree = decision?.records?.[0]?.disagreement_class;
  const tail =
    agree === 'STRONG_AGREEMENT'
      ? ' The models agree closely on this.'
      : agree === 'MIXED_SPLIT'
        ? ' The models split on the details, so treat the last few degrees as approximate.'
        : '';

  const humidity = live?.current.humidity;
  const feel = humidity != null && humidity >= 75 ? ' Humid air makes it feel heavier than it is.' : '';

  return `${action.charAt(0).toUpperCase()}${action.slice(1)}.${tail}${feel}`;
}

function certaintyNote(score: number | null): string {
  if (score == null) return 'Not published';
  if (score >= 75) return 'The models back each other up.';
  if (score >= 55) return 'The models mostly agree.';
  return 'The models disagree on details.';
}

function humidityNote(pct: number): string {
  if (pct >= 80) return 'Sticky air.';
  if (pct >= 60) return 'A little humid.';
  if (pct >= 35) return 'Comfortable.';
  return 'Dry air.';
}

function rainNote(mm: number): string {
  if (mm >= 15) return 'Waterlogging likely.';
  if (mm >= 5) return 'Take an umbrella.';
  if (mm >= 1) return 'A few showers.';
  return 'Dry.';
}

function windNote(kmh: number): string {
  if (kmh >= 45) return 'Gusts. Careful.';
  if (kmh >= 25) return 'Breezy in the open.';
  return 'Calm.';
}

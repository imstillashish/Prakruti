'use client';
import { useEffect, useState } from 'react';
import { ForecastHero } from '@/components/ForecastHero';
import { ForecastTimeline } from '@/components/ForecastTimeline';
import { ModelComparison } from '@/components/ModelComparison';
import { WeatherMap } from '@/components/WeatherMap';
import { RegionSelector } from '@/components/RegionSelector';
import { PageHeader } from '@/components/shell/PageHeader';
import { Answer, More, Prose } from '@/components/plain/Plain';
import { CloudRain } from '@/components/icons';
import { getTimelineData } from '@/lib/api';
import type { CityForecast, TimelinePoint } from '@/types';

export function ForecastPage({
  selectedCity,
  onSelectCity,
}: {
  // The shell owns the station; a pick on the overview map or the RPI atlas
  // lands here already applied instead of resetting to the default.
  selectedCity: string | null;
  onSelectCity: (city: CityForecast | string) => void;
}) {
  const city = selectedCity ?? 'Kanpur';
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);

  useEffect(() => {
    let live = true;
    getTimelineData(city)
      .then((t) => live && setTimeline(t ?? []))
      .catch(() => live && setTimeline([]));
    return () => {
      live = false;
    };
  }, [city]);

  const summary = describeWindow(timeline, city);

  return (
    <div className="space-y-8">
      <PageHeader
        icon={CloudRain}
        title="Forecast"
        answer={summary.answer}
        sub={summary.sub}
      />

      {/* The page header already states the verdict, so the hero drops its
          headline and becomes the evidence block: numbers, station telemetry
          and the daily brief. */}
      <ForecastHero selectedCity={city} showVerdict={false} />

      {/* Phone picks stations via the docked thumb bar; the card list is tablet+ only. */}
      <div className="hidden sm:block">
        <RegionSelector selectedCity={city} onSelectCity={(c) => onSelectCity(c)} />
      </div>

      <section className="space-y-4">
        <h2 className="text-[15px] font-medium text-foreground">The next three days, hour by hour</h2>
        <p className="max-w-[68ch] text-[13.5px] leading-relaxed text-muted-foreground">
          Each column is a step in the window. The shaded band is the range the engine is confident
          about — a wide band is a warning that the number is soft, not a reason to ignore it.
        </p>
        {/* Phone: map and 72h trend are two snap slides instead of a stacked
            pair that alone eats most of the page budget. From sm the plain
            stack returns, from lg the 7/5 grid — one DOM for all three. */}
        <div className="carousel-snap-deck items-start -mx-3 gap-5 px-3 sm:mx-0 sm:grid sm:grid-cols-1 sm:items-stretch sm:gap-6 sm:overflow-visible sm:px-0 lg:grid-cols-12">
          <div className="w-[78vw] shrink-0 sm:w-auto sm:shrink lg:col-span-7">
            <WeatherMap selectedCity={city} onSelectCity={onSelectCity} fillHeight />
          </div>
          <div className="w-[88vw] shrink-0 sm:w-auto sm:shrink lg:col-span-5">
            <ForecastTimeline selectedCity={city} />
          </div>
        </div>
      </section>

      <More label="What the band means, and where the numbers come from">
        <Prose>
          <p>
            The solid line is the blended median. The band is the 10th to 90th percentile across the
            models that contributed — eight times out of ten, the real value lands inside it. A narrow
            band means the models agree; a wide one means they do not, and the single number in the
            headline is closer to a guess.
          </p>
          <p className="mt-3">
            Lead time widens the band for every model, without exception. Day three is always less
            certain than day one, and the chart is drawn so you can see that happening rather than take
            it on faith.
          </p>
        </Prose>
      </More>

      <More label="Compare the models behind this forecast">
        <ModelComparison selectedCity={city} />
      </More>
    </div>
  );
}

/**
 * One sentence about the window, derived from the series. If there is no
 * series, it says so — it never fills the gap with plausible weather.
 */
function describeWindow(points: TimelinePoint[], city: string): { answer: string; sub: string } {
  if (!points || points.length === 0) {
    return {
      answer: `No hourly series is published for ${city} yet.`,
      sub: 'The engine publishes after it has verified the cycle — usually within an hour of the run.',
    };
  }
  const wettest = points.reduce((a, b) => (b.rainfall > a.rainfall ? b : a));
  const hottest = points.reduce((a, b) => (b.temperature > a.temperature ? b : a));
  const windiest = points.reduce((a, b) => (b.wind > a.wind ? b : a));

  const wet = wettest.rainfall >= 1;
  const hot = hottest.temperature >= 35;
  const blowy = windiest.wind >= 35;

  const bits: string[] = [];
  if (wet) bits.push(`rain peaking at ${wettest.rainfall.toFixed(1)} mm`);
  if (hot) bits.push(`heat peaking at ${hottest.temperature.toFixed(0)}°C`);
  if (blowy) bits.push(`wind peaking at ${windiest.wind.toFixed(0)} km/h`);

  if (bits.length === 0) {
    return {
      answer: `Three quiet days in ${city}: no rain worth planning around, and nothing extreme in the heat or wind.`,
      sub: `The warmest point is ${hottest.temperature.toFixed(0)}°C; the models agree closely on all three days.`,
    };
  }

  const answer = `Over the next three days ${city} sees ${bits.join(', ')}.`;
  const sub = `Wettest around ${wettest.time}, warmest around ${hottest.time}. Select a step in the chart to read the band for that hour.`;
  return { answer, sub };
}
'use client';
import { useState } from 'react';
import { ForecastHero } from '@/components/ForecastHero';
import { ForecastTimeline } from '@/components/ForecastTimeline';
import { ModelComparison } from '@/components/ModelComparison';
import { WeatherMap } from '@/components/WeatherMap';
import { RegionSelector } from '@/components/RegionSelector';

export function ForecastPage() {
  const [selectedCity, setSelectedCity] = useState<string | null>('Kanpur');

  return (
    <div className="space-y-6">
      <ForecastHero selectedCity={selectedCity} />

      {/* Phone picks stations via the docked thumb bar; the card list is tablet+ only. */}
      <div className="hidden sm:block">
        <RegionSelector
          selectedCity={selectedCity}
          onSelectCity={(c) => setSelectedCity(c)}
        />
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground tracking-tight">
            The forecast, mapped and charted
          </h2>
          <p className="text-xs text-muted-foreground">
            Pick a station above — the map and the 72-hour horizon update together.
          </p>
        </div>
        {/* No items-start: the map card stretches to the row height so the
            166px white tail beside the taller timeline disappears. */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <WeatherMap
              selectedCity={selectedCity}
              onSelectCity={(c) => setSelectedCity(typeof c === 'string' ? c : c.city)}
              fillHeight
            />
          </div>
          <div className="lg:col-span-5">
            <ForecastTimeline selectedCity={selectedCity} />
          </div>
        </div>
      </section>

      {/* Comparison is supporting detail here; the map and chart above are the
          page's job. Collapsed below desktop, expansion is one tap. */}
      <ModelComparison selectedCity={selectedCity} collapsibleOnPhone collapsibleOnTablet />
    </div>
  );
}

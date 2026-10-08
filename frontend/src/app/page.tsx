'use client';
import { useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { TopBar } from '@/components/shell/TopBar';
import { NavRail } from '@/components/shell/NavRailView';
import { BackendConnectingIndicator } from '@/components/BackendConnectingIndicator';
import { StatusStrip } from '@/components/StatusStrip';
import { ForecastHero } from '@/components/ForecastHero';
import { ModelContribution } from '@/components/ModelContribution';
import { ForecastTimeline } from '@/components/ForecastTimeline';
import { ExtremeWeatherPanel } from '@/components/ExtremeWeather';
import { ModelSkillPanel } from '@/components/ModelSkill';
import { DataHealthPanel } from '@/components/DataHealth';
import { WeatherMap } from '@/components/WeatherMap';
import { RegionSelector } from '@/components/RegionSelector';
import { ModelComparison } from '@/components/ModelComparison';
import { ForecastPage } from '@/components/pages/ForecastPage';
import { ModelIntelligencePage } from '@/components/pages/ModelIntelligencePage';
import { ByomPage } from '@/components/pages/ByomPage';
import { ExtremeWeatherPage } from '@/components/pages/ExtremeWeatherPage';
import { ModelPerformancePage } from '@/components/pages/ModelPerformancePage';
import { LeaderboardPage } from '@/components/pages/LeaderboardPage';
import { DataHealthPage } from '@/components/pages/DataHealthPage';
import { RpiPage } from '@/components/pages/RpiPage';
import { ApiPage } from '@/components/pages/ApiPage';
import { MinimalFooter } from '@/components/spectrumui/blocks/footers/minimal-footer';
import { PhoneStationPicker } from '@/components/shell/PhoneStationPicker';
import { NavPage, CityForecast } from '@/types';

export default function Home() {
  const [currentPage, setCurrentPage] = useState<NavPage>('overview');
  // The desktop rail and the content gutter both read --rail-w, so a collapsed
  // rail and a matching gutter can never disagree. Expanded is the default:
  // the section names are the point of the wider rail.
  const [railExpanded, setRailExpanded] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string | null>('Kanpur');
  const handleCitySelect = (city: CityForecast | string) => {
    const cityName = typeof city === 'string' ? city : city.city;
    setSelectedCity(cityName);
  };

  // The TopBar diagnostics button jumps to Data Health without owning nav state.
  const handleTopBarNav = (e: MouseEvent<HTMLElement>) => {
    const target = (e.target as HTMLElement).closest('[data-nav]');
    if (target) setCurrentPage(target.getAttribute('data-nav') as NavPage);
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'forecast':
        return <ForecastPage />;
      case 'model-intelligence':
        return <ModelIntelligencePage />;
      case 'byom':
        return <ByomPage />;
      case 'extreme-weather':
        return <ExtremeWeatherPage />;
      case 'rpi':
        return <RpiPage selectedCity={selectedCity} onSelectCity={handleCitySelect} />;
      case 'model-performance':
        return <ModelPerformancePage />;
      case 'leaderboard':
        return <LeaderboardPage />;
      case 'data-health':
        return <DataHealthPage />;
      case 'api':
        return <ApiPage />;
      case 'overview':
      default:
        return (
          // One rhythm for the whole page, matching the other sections and the
          // rail's own space-y-6. The md:space-y-8 step made the strip's 24px
          // gap read as a tighter seam above a 32px stack below it.
          <div className="space-y-6">
            {/* Top Forecast Decision Hero */}
            <ForecastHero selectedCity={selectedCity} />

            {/* Core Operational Grid. Below sm the cards become a horizontal
                snap deck (same mechanism as the hero metric cards): the stacked
                column was the page's whole budget overrun. From sm the plain
                stack, from lg the 7/5 two-rail grid — one DOM for all three.
                max-lg:contents dissolves the two rail wrappers so their cards
                are the deck's slides; at lg the wrappers box up again and the
                desktop geometry is byte-identical to the pre-deck layout. */}
            <div className="carousel-snap-deck items-start -mx-3 px-3 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-1 sm:overflow-visible sm:gap-6 lg:grid-cols-12 lg:items-start">
              {/* Left rail (7 cols on desktop): map, trend, hazard advisory —
                  the hazard sits with the forecast evidence it warns about.
                  On a phone this DOM order is the swipe order: evidence first. */}
              <div className="max-lg:contents lg:col-span-7 lg:space-y-6">
                <div className="w-[78vw] shrink-0 sm:w-auto sm:shrink">
                  <WeatherMap
                    selectedCity={selectedCity}
                    onSelectCity={handleCitySelect}
                  />
                </div>
                <div className="w-[88vw] shrink-0 sm:w-auto sm:shrink">
                  <ForecastTimeline selectedCity={selectedCity} phoneCompact />
                </div>
                <div className="w-[78vw] shrink-0 sm:w-auto sm:shrink">
                  <ExtremeWeatherPanel selectedCity={selectedCity} collapsibleOnPhone />
                </div>
              </div>

              {/* Right rail (5 cols on desktop): controls & deep intelligence.
                  Station picker lives in the docked thumb bar only on phones
                  (<640px), which is where the shell puts it; above that the
                  RegionSelector card is the only station switcher. */}
              <div className="max-lg:contents lg:col-span-5 lg:space-y-6">
                <div className="hidden w-[78vw] shrink-0 sm:block sm:w-auto sm:shrink">
                  <RegionSelector selectedCity={selectedCity} onSelectCity={handleCitySelect} />
                </div>
                {/* Measured at 768px: expanded these three make this rail 1944px
                    against the visualizations' 1440px, so they set the page height.
                    Secondary detail collapses below desktop. */}
                <div className="w-[78vw] shrink-0 sm:w-auto sm:shrink">
                  <ModelContribution selectedCity={selectedCity} collapsibleOnPhone collapsibleOnTablet />
                </div>
                <div className="w-[78vw] shrink-0 sm:w-auto sm:shrink">
                  <ModelSkillPanel collapsibleOnPhone collapsibleOnTablet />
                </div>
                <div className="w-[78vw] shrink-0 sm:w-auto sm:shrink">
                  <DataHealthPanel collapsibleOnPhone collapsibleOnTablet />
                </div>
              </div>
            </div>

            {/* Full-width consensus row. Inside the 7-col rail the comparison card
                sat ~640px wide, stretched its row to 1244px and stranded
                ~1140px of white beside the right rail; full width fits the
                six-model strip in one row (~475px tall instead of 1244). */}
            <ModelComparison selectedCity={selectedCity} collapsibleOnPhone collapsibleOnTablet />
          </div>
        );
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ '--rail-w': railExpanded ? '192px' : '88px' } as CSSProperties}
      onClick={handleTopBarNav}
    >
      <TopBar selectedCity={selectedCity} />
      <NavRail
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        expanded={railExpanded}
        onToggleExpanded={() => setRailExpanded((v) => !v)}
        mobileTrailing={
          <PhoneStationPicker selectedCity={selectedCity} onSelectCity={handleCitySelect} />
        }
      />

      {/* Global Backend Connecting / Cold Start Indicator */}
      <BackendConnectingIndicator />

      {/* Main Content */}
      <main className="relative z-10 max-w-[1440px] mx-auto px-3 sm:px-4 pt-16 sm:pt-20 sm:pl-20 sm:pr-4 sm:pt-20 lg:pl-[calc(var(--rail-w)_+_1.5rem)] lg:pr-6 lg:pt-24 transition-[padding-left] duration-200 ease-out motion-reduce:transition-none">
        <StatusStrip />
        {/* Keyed on the page: a nav swap is a state change, so the surface
            cross-fades instead of hard-cutting. One fade at the shared point,
            not choreography per page. */}
        <div key={currentPage} className="animate-fade-in">{renderContent()}</div>
      </main>

      {/* Footer */}
      <MinimalFooter
        brand="Prakruti"
        copyright="Hybrid AI–NWP Platform · MoES / NCMRWF · SIH 2026 · PS 26081"
        clusters={[
          {
            title: 'Project',
            links: [
              { label: 'GitHub', href: 'https://github.com/imstillashish/Prakruti' },
              { label: 'API', href: 'https://prakruti-api.onrender.com' },
            ],
          },
        ]}
        status="45 stations · live"
        className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-6 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6 sm:pl-20 lg:pl-[calc(var(--rail-w)_+_1.5rem)] transition-[padding-left] duration-200 ease-out motion-reduce:transition-none"
      />
    </div>
  );
}

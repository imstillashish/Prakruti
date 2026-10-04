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
          <div className="space-y-6 md:space-y-8">
            {/* Top Forecast Decision Hero */}
            <ForecastHero selectedCity={selectedCity} />

            {/* Core Operational Grid. Splits side-by-side from lg: at tablet
                the 7/5 split left the collapsed right rail ~380px short of the
                map+timeline stack — dead white — so tablet stacks instead. */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 items-start">
              {/* Left Column (Primary Visualizations) - 7 cols on desktop.
                  The hazard advisory sits with the forecast evidence it warns
                  about; it also brings this rail level with the right one. */}
              <div className="lg:col-span-7 space-y-5 md:space-y-6">
                <WeatherMap
                  selectedCity={selectedCity}
                  onSelectCity={handleCitySelect}
                />
                <ForecastTimeline selectedCity={selectedCity} phoneCompact />
                <ExtremeWeatherPanel selectedCity={selectedCity} collapsibleOnPhone />
              </div>

              {/* Right Column (Controls & Deep Intelligence) - 5 cols on desktop */}
              <div className="lg:col-span-5 space-y-5 md:space-y-6">
                {/* Station picker lives in the docked thumb bar only on phones (<640px),
                    which is where the shell puts it; above that the RegionSelector card
                    is the only station switcher, or 4 screens of content separate it. */}
                <div className="hidden sm:block">
                  <RegionSelector selectedCity={selectedCity} onSelectCity={handleCitySelect} />
                </div>
                {/* Measured at 768px: expanded these three make this column 1944px
                    against the left column's 1440px, so they set the page height.
                    Collapsed, the column is 603px and the page is bound by the
                    evidence on the left. Secondary detail collapses below desktop. */}
                <ModelContribution selectedCity={selectedCity} collapsibleOnPhone collapsibleOnTablet />
                <ModelSkillPanel collapsibleOnPhone collapsibleOnTablet />
                <DataHealthPanel collapsibleOnPhone collapsibleOnTablet />
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

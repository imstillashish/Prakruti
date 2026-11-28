'use client';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { TopBar } from '@/components/shell/TopBar';
import { NavRail } from '@/components/shell/NavRailView';
import { BackendConnectingIndicator } from '@/components/BackendConnectingIndicator';
import { StatusStrip } from '@/components/StatusStrip';
import { AsciiStage } from '@/components/shell/AsciiStage';
import { OverviewPage } from '@/components/pages/OverviewPage';
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

  // A section switch starts at its top, like opening it fresh: the previous
  // page's scroll offset would otherwise land the new one mid-scroll (the swap
  // keeps window scroll). Instant, not smooth — the jump *is* the context
  // change, and focusing the surface lets a screen reader announce it without
  // a visible ring (this is programmatic focus, not keyboard traversal).
  const contentRef = useRef<HTMLDivElement>(null);
  const firstPage = useRef(true);
  useEffect(() => {
    if (firstPage.current) {
      firstPage.current = false;
      return;
    }
    contentRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [currentPage]);

  const renderContent = () => {
    switch (currentPage) {
      case 'forecast':
        return <ForecastPage selectedCity={selectedCity} onSelectCity={handleCitySelect} />;
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
          <OverviewPage
            selectedCity={selectedCity}
            onSelectCity={handleCitySelect}
            onNavigate={setCurrentPage}
          />
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
      <main className="relative z-10 max-w-[1440px] mx-auto px-3 sm:px-4 pt-16 sm:pt-20 sm:pl-20 sm:pr-4 lg:pl-[calc(var(--rail-w)_+_1.5rem)] lg:pr-6 lg:pt-24 transition-[padding-left] duration-200 ease-out motion-reduce:transition-none">
        <StatusStrip />
        {/* Keyed on the page: a nav swap is a state change, so the surface
            cross-fades instead of hard-cutting. One fade at the shared point,
            not choreography per page. */}
        <div key={currentPage} ref={contentRef} tabIndex={-1} className="outline-none">
          <AsciiStage>{renderContent()}</AsciiStage>
        </div>
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
        className="max-w-[1440px] mx-auto px-3 sm:px-4 pt-6 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6 sm:pl-20 sm:pr-4 lg:pl-[calc(var(--rail-w)_+_1.5rem)] lg:pr-6 transition-[padding-left] duration-200 ease-out motion-reduce:transition-none"
      />
    </div>
  );
}

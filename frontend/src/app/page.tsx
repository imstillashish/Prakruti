'use client';
import { useState } from 'react';
import type { MouseEvent } from 'react';
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
import { DataHealthPage } from '@/components/pages/DataHealthPage';
import { RpiPage } from '@/components/pages/RpiPage';
import { MinimalFooter } from '@/components/spectrumui/blocks/footers/minimal-footer';
import { NavPage, CityForecast } from '@/types';

export default function Home() {
  const [currentPage, setCurrentPage] = useState<NavPage>('overview');
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
      case 'data-health':
        return <DataHealthPage />;
      case 'overview':
      default:
        return (
          <div className="space-y-6">
            {/* Top Forecast Decision Hero */}
            <ForecastHero selectedCity={selectedCity} />

            {/* Core Operational Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (Primary Visualizations) - 7 cols */}
              <div className="lg:col-span-7 space-y-6">
                <WeatherMap
                  selectedCity={selectedCity}
                  onSelectCity={handleCitySelect}
                />
                <ForecastTimeline selectedCity={selectedCity} />
                
                {/* 2-Column Equal Height Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ModelComparison selectedCity={selectedCity} />
                  <ExtremeWeatherPanel selectedCity={selectedCity} />
                </div>
              </div>

              {/* Right Column (Controls & Deep Intelligence) - 5 cols */}
              <div className="lg:col-span-5 space-y-6">
                <RegionSelector selectedCity={selectedCity} onSelectCity={handleCitySelect} />
                <ModelContribution selectedCity={selectedCity} />
                <ModelSkillPanel />
                <DataHealthPanel />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden" onClick={handleTopBarNav}>
      <TopBar selectedCity={selectedCity} />
      <NavRail currentPage={currentPage} onNavigate={setCurrentPage} />

      {/* Global Backend Connecting / Cold Start Indicator */}
      <BackendConnectingIndicator />

      {/* Main Content */}
      <main className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 pt-20 pb-20 md:pl-20">
        <StatusStrip />
        {renderContent()}
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
        className="max-w-[1440px] mx-auto px-4 sm:px-6 md:pl-20"
      />
    </div>
  );
}

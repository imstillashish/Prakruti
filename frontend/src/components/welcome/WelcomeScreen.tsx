'use client';

import { useFTUE } from '@/hooks/useFTUE';
import { WelcomeHeroBackground } from './WelcomeHeroBackground';
import { FeatureCarousel } from './FeatureCarousel';

export function WelcomeScreen() {
  const { showWelcome, dismissWelcome } = useFTUE();

  if (!showWelcome) return null;

  return (
    <div className="fixed inset-0 z-50 bg-canvas overflow-y-auto overflow-x-hidden flex flex-col">
      {/* Hero Section */}
      <div className="relative w-full py-12 md:py-16 xl:py-24 px-4 flex-none border-b border-hairline bg-canvas">
        <WelcomeHeroBackground />
        <div className="relative z-10 max-w-7xl mx-auto flex flex-col items-center text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl xl:text-[64px] font-semibold text-ink leading-[1.05] tracking-[-1.92px] mb-4">
            Welcome to Prakruti
          </h1>
          <p className="text-body-md text-body max-w-2xl mx-auto">
            The infrastructure platform for intelligent meteorological monitoring. 
            Before you start, here is a quick overview of what you can do.
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 md:py-12">
        <FeatureCarousel />
      </div>

      {/* Docked Command Bar (Mobile) & Standard CTA (Desktop) */}
      <div className="fixed bottom-0 left-0 right-0 sm:static sm:mt-auto sm:pb-12 bg-white/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t border-hairline-strong sm:border-none p-4 sm:p-0 flex justify-center pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        <button 
          onClick={dismissWelcome}
          className="w-full sm:w-auto bg-primary hover:bg-primary-active text-on-primary font-medium text-[14px] leading-none py-[10px] px-[18px] h-[40px] rounded-md transition-colors active:scale-[0.98]"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}

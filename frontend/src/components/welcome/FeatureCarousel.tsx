import { Activity, ShieldAlert, Sparkles, Map } from 'lucide-react';

const features = [
  {
    icon: <Activity className="w-5 h-5 text-ink" />,
    title: 'Real-time Telemetry',
    description: 'Monitor live data from sensors and models without endless scrolling.',
  },
  {
    icon: <ShieldAlert className="w-5 h-5 text-destructive" />,
    title: 'Hazard Protocols',
    description: 'Instant alerts and dispatch actions for critical thresholds.',
  },
  {
    icon: <Map className="w-5 h-5 text-ink" />,
    title: 'Geospatial Radar',
    description: 'Two-finger pan protocols keep you in control of the map canvas.',
  },
  {
    icon: <Sparkles className="w-5 h-5 text-ink" />,
    title: 'AI Verification',
    description: 'Model recalculations and insights right when you need them.',
  }
];

export function FeatureCarousel() {
  return (
    <div className="w-full">
      {/* Mobile: Horizontal Snap Carousel, Desktop: Grid */}
      <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar md:grid md:grid-cols-2 xl:grid-cols-4 gap-4 pb-4">
        {features.map((feature, idx) => (
          <div 
            key={idx} 
            className="snap-start flex-none w-[85vw] md:w-auto bg-surface-card rounded-lg p-5 border border-hairline-strong shadow-2xs"
          >
            <div className="w-8 h-8 rounded-md bg-surface-strong flex items-center justify-center mb-4">
              {feature.icon}
            </div>
            <h3 className="text-title-md font-semibold text-ink mb-2 tracking-tight">
              {feature.title}
            </h3>
            <p className="text-body-md text-body">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}

export function WelcomeHeroBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div 
        className="absolute inset-0 opacity-50"
        style={{
          background: 'radial-gradient(circle at 50% 50%, #cfe7ff 0%, #a8c8e8 50%, #ffffff 100%)',
          animation: 'pulse-slow 8s ease-in-out infinite alternate',
        }}
      />
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-slow {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.1); opacity: 0.7; }
        }
      `}} />
    </div>
  );
}

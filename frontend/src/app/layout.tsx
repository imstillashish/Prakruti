import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prakruti · प्रकृति — Forecast Intelligence | SIH 2026',
  description:
    'Prakruti (प्रकृति): AI–NWP Multi-Model Forecast Blending System. Dynamically blended weather forecasts for India. Built for Smart India Hackathon 2026, Ministry of Earth Sciences.',
  keywords: 'Prakruti, प्रकृति, weather forecast, NWP, AI, blending, NCMRWF, MoES, India',
  icons: {
    icon: '/icon.png',
    shortcut: '/favicon.ico',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

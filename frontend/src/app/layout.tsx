import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Noto_Sans_Devanagari } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MeshVisibility } from '@/components/shell/MeshVisibility';
import { WelcomeScreen } from '@/components/welcome/WelcomeScreen';
import { Agentation } from 'agentation';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

// Inter and JetBrains Mono carry no Devanagari glyphs, so Hindi text (the brand
// lockup, the footer) renders in whatever the OS happens to supply. Self-host
// Noto instead so प्रकृति looks the same everywhere.
const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-devanagari',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Prakruti · प्रकृति — Forecast Intelligence | SIH 2026',
  description:
    'Prakruti (प्रकृति): AI–NWP Multi-Model Forecast Blending System. Dynamically blended weather forecasts for India. Built for Smart India Hackathon 2026, Ministry of Earth Sciences.',
  keywords: 'Prakruti, प्रकृति, weather forecast, NWP, AI, blending, NCMRWF, MoES, India',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${notoSansDevanagari.variable}`}>
      <body className="antialiased">
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <MeshVisibility />
        {process.env.NODE_ENV === "development" && <Agentation />}
        <WelcomeScreen />
      </body>
    </html>
  );
}

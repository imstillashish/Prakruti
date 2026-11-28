import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Noto_Sans_Devanagari } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MeshVisibility } from '@/components/shell/MeshVisibility';
import { WelcomeSplash } from '@/components/WelcomeSplash';
import { Agentation } from 'agentation';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  preload: true,
});

// Inter and JetBrains Mono carry no Devanagari glyphs, so Hindi text (the brand
// lockup, the footer) renders in whatever the OS happens to supply. Self-host
// Noto instead so प्रकृति looks the same everywhere.
const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-devanagari',
  display: 'swap',
  preload: true,
});

export const viewport: Viewport = {
  themeColor: '#ffffff',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://prakruti-weather.onrender.com'),
  applicationName: 'Prakruti',
  title: 'Prakruti · प्रकृति — Forecast Intelligence | SIH 2026',
  description:
    'Prakruti (प्रकृति): AI–NWP Multi-Model Forecast Blending System. Dynamically blended weather forecasts for India. Built for Smart India Hackathon 2026, Ministry of Earth Sciences.',
  keywords: [
    'Prakruti',
    'प्रकृति',
    'weather forecast',
    'NWP',
    'AI weather',
    'multi-model blend',
    'NCMRWF',
    'MoES',
    'India meteorological intelligence',
  ],
  authors: [{ name: 'MoES / NCMRWF / SIH 2026' }],
  creator: 'Ministry of Earth Sciences / NCMRWF',
  publisher: 'Smart India Hackathon 2026',
  formatDetection: {
    telephone: false,
    date: false,
    email: false,
    address: false,
  },
  openGraph: {
    title: 'Prakruti · प्रकृति — Forecast Intelligence',
    description:
      'AI–NWP Multi-Model Forecast Blending System for India. Dynamically blended forecasts from ECMWF, GFS, ICON, and GEM with quantified uncertainty.',
    siteName: 'Prakruti',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prakruti · प्रकृति — Forecast Intelligence',
    description: 'AI–NWP Multi-Model Forecast Blending System for India. Built for MoES / SIH 2026.',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} ${notoSansDevanagari.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-accent/15 selection:text-foreground">
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <MeshVisibility />
        <WelcomeSplash />
        {process.env.NODE_ENV === 'development' && <Agentation />}
      </body>
    </html>
  );
}

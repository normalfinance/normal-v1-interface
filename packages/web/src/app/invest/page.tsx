import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import InvestView from '@/sections/invest';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'Invest | Normal',
    template: '%s · Normal',
  },
  description: 'Buy and sell any global asset in seconds on Normal.',
  alternates: {
    canonical: '/invest',
  },
  openGraph: {
    title: 'Invest | Normal',
    description: 'Buy and sell any global asset in seconds on Normal.',
    url: `${CONFIG.siteUrl}/invest`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png', // replace with image you want to show when sharing link on other socials than twitter
        width: 1200,
        height: 630,
        alt: 'Normal Invest overview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Invest | Normal',
    description: 'Buy and sell any global asset in seconds on Normal.',
    images: ['/og/home.png'], // replace with image you want to show when sharing link on Twitter
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal', 'Normal Finance', 'invest', 'crypto exchange', 'DEX'],
};

export default function Page() {
  return <InvestView />;
}

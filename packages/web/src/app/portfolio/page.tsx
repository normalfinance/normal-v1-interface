import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import PortfolioView from '@/sections/portfolio';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'Portfolio | Normal',
    template: '%s · Normal',
  },
  description: 'View and manage your asset and index fund portfolio on Normal.',
  alternates: {
    canonical: '/invest',
  },
  openGraph: {
    title: 'Portfolio | Normal',
    description: 'View and manage your asset and index fund portfolio on Normal.',
    url: `${CONFIG.siteUrl}/invest`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png', // replace with image you want to show when sharing link on other socials than twitter
        width: 1200,
        height: 630,
        alt: 'Normal Portfolio overview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Portfolio | Normal',
    description: 'View and manage your asset and index fund portfolio on Normal.',
    images: ['/og/home.png'], // replace with image you want to show when sharing link on Twitter
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal', 'Normal Finance', 'token swap', 'crypto exchange', 'DEX'],
};

export default function Page() {
  return <PortfolioView />;
}

import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import PortfolioView from '@/sections/portfolio';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'Portfolio | Normal',
    template: '%s · Normal',
  },
  description: 'View your wallet balances, savings position, and earnings all in one place on Normal.',
  alternates: {
    canonical: '/invest',
  },
  openGraph: {
    title: 'Portfolio | Normal',
    description: 'View your wallet balances, savings position, and earnings all in one place on Normal.',
    url: `${CONFIG.siteUrl}/invest`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/portfolio.png',
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
    description: 'View your wallet balances, savings position, and earnings all in one place on Normal.',
    images: ['/og/portfolio.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal', 'Normal Finance', 'portfolio', 'USDC savings', 'crypto wallet', 'Stellar'],
};

export default function Page() {
  return <PortfolioView />;
}

import type { Metadata } from 'next';

import PoolsView from '@/sections/pools';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'Pools | Normal',
    template: '%s · Normal Finance',
  },
  description: 'Browse liquidity pools and earning opportunities on Normal Finance.',
  alternates: {
    canonical: '/pools',
  },
  openGraph: {
    title: 'Pools | Normal',
    description: 'Browse liquidity pools and earning opportunities on Normal Finance.',
    url: 'https://app.normalfinance.io/pools', // replace with real domain
    siteName: 'Normal Finance',
    images: [
      {
        url: '/og/home.png', // replace with image you want to show when sharing link on other socials than twitter
        width: 1200,
        height: 630,
        alt: 'Normal Pools overview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pools | Normal',
    description: 'Browse liquidity pools and earning opportunities on Normal Finance.',
    images: ['/og/home.png'], // replace with image you want to show when sharing link on Twitter
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal Finance', 'liquidity pools', 'yield farming', 'crypto liquidity'],
};

export default function Page() {
  return <PoolsView />;
}

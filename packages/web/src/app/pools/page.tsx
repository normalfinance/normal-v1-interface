import type { Metadata } from 'next';

import PoolsView from '@/sections/pools';
import { CONFIG } from '@/global-config';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'Pools | Normal',
    template: '%s · Normal',
  },
  description: 'Browse liquidity pools and earning opportunities on Normal.',
  alternates: {
    canonical: '/pools',
  },
  openGraph: {
    title: 'Pools | Normal',
    description: 'Browse liquidity pools and earning opportunities on Normal.',
    url: `${CONFIG.siteUrl}/pools`,
    siteName: 'Normal',
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
    description: 'Browse liquidity pools and earning opportunities on Normal.',
    images: ['/og/home.png'], // replace with image you want to show when sharing link on Twitter
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal', 'Normal Finance', 'liquidity pools', 'yield farming', 'crypto liquidity'],
};

export default function Page() {
  return <PoolsView />;
}

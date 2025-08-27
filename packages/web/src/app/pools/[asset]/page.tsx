import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import PoolView from '@/sections/pools/[asset]';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'Pool Details | Normal',
    template: '%s · Normal',
  },
  description: 'Detailed view of a specific liquidity pool on Normal.',
  alternates: {
    canonical: '/pools',
  },
  openGraph: {
    title: 'Pool Details | Normal',
    description: 'Detailed view of a specific liquidity pool on Normal.',
    url: `${CONFIG.siteUrl}/pools`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png', // replace with image you want to show when sharing link on other socials than twitter
        width: 1200,
        height: 630,
        alt: 'Normal Pool details',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pool Details | Normal',
    description: 'Detailed view of a specific liquidity pool on Normal.',
    images: ['/og/home.png'], // replace with image you want to show when sharing link on Twitter
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal', 'Normal Finance', 'liquidity pool', 'APY', 'crypto yield'],
};

interface PageProps {
  params: { asset: string };
}

export default function Page({ params }: PageProps) {
  return <PoolView asset={params.asset} />;
}

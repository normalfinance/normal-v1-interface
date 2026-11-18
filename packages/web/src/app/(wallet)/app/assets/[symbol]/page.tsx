import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import AssetView from '@/sections/assets/[symbol]';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'Asset Details | Normal',
    template: '%s · Normal',
  },
  description: 'Detailed view of a specific asset on Normal.',
  alternates: {
    canonical: '/assets',
  },
  openGraph: {
    title: 'Asset Details | Normal',
    description: 'Detailed view of a specific asset on Normal.',
    url: `${CONFIG.siteUrl}/assets`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png', // replace with image you want to show when sharing link on other socials than twitter
        width: 1200,
        height: 630,
        alt: 'Normal Asset details',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Asset Details | Normal',
    description: 'Detailed view of a specific asset on Normal.',
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
  params: { symbol: string };
}

export default function Page({ params }: PageProps) {
  return <AssetView symbol={params.symbol} />;
}

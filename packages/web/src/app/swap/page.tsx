import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import SwapView from '@/sections/swap';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'Swap | Normal',
    template: '%s · Normal',
  },
  description: 'Swap XLM and USDC instantly on Normal.',
  alternates: {
    canonical: '/swap',
  },
  openGraph: {
    title: 'Swap | Normal',
    description: 'Swap XLM and USDC instantly on Normal.',
    url: `${CONFIG.siteUrl}/swap`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png',
        width: 1200,
        height: 630,
        alt: 'Normal Swap',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Swap | Normal',
    description: 'Swap XLM and USDC instantly on Normal.',
    images: ['/og/home.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal', 'Normal Finance', 'token swap', 'XLM', 'USDC', 'Stellar', 'DEX'],
};

export default function Page() {
  return <SwapView />;
}

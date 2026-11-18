import type { Metadata } from 'next';

import SwapView from '@/sections/swap';
import { paths } from '@/routes/paths';
import { CONFIG } from '@/global-config';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'Swap | Normal',
    template: '%s · Normal',
  },
  description:
    'Swap between digital dollars, Bitcoin, Ethereum, Solana and Stellar. It all lands in your own wallet.',
  alternates: {
    canonical: '/swap',
  },
  openGraph: {
    title: 'Swap | Normal',
    description:
      'Swap between digital dollars, Bitcoin, Ethereum, Solana and Stellar. It all lands in your own wallet.',
    url: `${CONFIG.siteUrl}${paths.swap}`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/swap.png',
        width: 1200,
        height: 630,
        alt: 'Swap with low fees. The swap in the Normal app.',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Swap | Normal',
    description:
      'Swap between digital dollars, Bitcoin, Ethereum, Solana and Stellar. It all lands in your own wallet.',
    images: ['/og/swap.png'],
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

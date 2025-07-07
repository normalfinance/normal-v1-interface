import type { Metadata } from 'next';

import SwapView from '@/sections/swap';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'Swap | Normal',
    template: '%s · Normal Finance',
  },
  description: 'Swap tokens quickly and securely on Normal Finance.',
  alternates: {
    canonical: '/swap',
  },
  openGraph: {
    title: 'Swap | Normal',
    description: 'Swap tokens quickly and securely on Normal Finance.',
    url: 'https://app.normalfinance.io/swap', // replace with real domain
    siteName: 'Normal Finance',
    images: [
      {
        url: '/og/home.png', // replace with image you want to show when sharing link on other socials than twitter
        width: 1200,
        height: 630,
        alt: 'Normal Swap overview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Swap | Normal',
    description: 'Swap tokens quickly and securely on Normal Finance.',
    images: ['/og/home.png'], // replace with image you want to show when sharing link on Twitter
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal Finance', 'token swap', 'crypto exchange', 'DEX'],
};

export default function Page() {
  return <SwapView />;
}

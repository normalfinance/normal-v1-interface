import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import AssetsView from '@/sections/assets';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'Assets | Normal',
    template: '%s · Normal',
  },
  description: 'Discover trending assets on Normal.',
  alternates: {
    canonical: '/assets',
  },
  openGraph: {
    title: 'Assets | Normal',
    description: 'Discover trending assets on Normal.',
    url: `${CONFIG.siteUrl}/assets`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png', // replace with image you want to show when sharing link on other socials than twitter
        width: 1200,
        height: 630,
        alt: 'Normal Assets overview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Assets | Normal',
    description: 'Discover trending assets on Normal.',
    images: ['/og/home.png'], // replace with image you want to show when sharing link on Twitter
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal', 'Normal Finance', 'crypto assets', 'USDC', 'Stellar', 'DeFi'],
};

export default function Page() {
  return <AssetsView />;
}

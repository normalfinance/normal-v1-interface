import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import ExploreView from '@/sections/explore';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'Explore | Normal',
    template: '%s · Normal',
  },
  description: 'Discover trending crypto indices and assets built with Normal.',
  alternates: {
    canonical: '/explore',
  },
  openGraph: {
    title: 'Explore | Normal',
    description: 'Discover trending crypto indices and assets built with Normal.',
    url: `${CONFIG.siteUrl}/explore`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png', // replace with image you want to show when sharing link on other socials than twitter
        width: 1200,
        height: 630,
        alt: 'Normal Explore overview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Explore | Normal',
    description: 'Discover trending crypto indices and assets built with Normal.',
    images: ['/og/home.png'], // replace with image you want to show when sharing link on Twitter
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal', 'Normal Finance', 'crypto index', 'crypto investing', 'web3 portfolio'],
};

export default function Page() {
  return <ExploreView />;
}

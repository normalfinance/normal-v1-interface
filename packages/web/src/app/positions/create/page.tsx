import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import CreatePositionView from '@/sections/positions/create';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'Create Position | Normal',
    template: '%s · Normal',
  },
  description: 'Create a new position on Normal.',
  alternates: {
    canonical: '/positions/create',
  },
  openGraph: {
    title: 'Create Position | Normal',
    description: 'Create a new position on Normal.',
    url: `${CONFIG.siteUrl}/positions/create`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png', // replace with image you want to show when sharing link on other socials than twitter
        width: 1200,
        height: 630,
        alt: 'Normal Create Position',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Create Position | Normal',
    description: 'Create a new position on Normal.',
    images: ['/og/home.png'], // replace with image you want to show when sharing link on Twitter
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: [
    'Normal',
    'Normal Finance',
    'create position',
    'crypto trading',
    'portfolio management',
  ],
};

export default function Page() {
  return <CreatePositionView />;
}

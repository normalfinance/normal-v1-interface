import type { Metadata } from 'next';

import PositionsView from '@/sections/positions';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'Positions | Normal',
    template: '%s · Normal Finance',
  },
  description: 'Review and manage your positions on Normal Finance.',
  alternates: {
    canonical: '/positions',
  },
  openGraph: {
    title: 'Positions | Normal',
    description: 'Review and manage your positions on Normal Finance.',
    url: 'https://app.normalfinance.io/positions', // replace with real domain
    siteName: 'Normal Finance',
    images: [
      {
        url: '/og/home.png', // replace with image you want to show when sharing link on other socials than twitter
        width: 1200,
        height: 630,
        alt: 'Normal Positions overview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Positions | Normal',
    description: 'Review and manage your positions on Normal Finance.',
    images: ['/og/home.png'], // replace with image you want to show when sharing link on Twitter
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal Finance', 'positions', 'portfolio', 'crypto positions'],
};

export default function Page() {
  return <PositionsView />;
}

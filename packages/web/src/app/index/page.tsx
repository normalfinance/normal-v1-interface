import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import ComingSoonView from '@/sections/coming-soon';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'Index | Normal',
    template: '%s · Normal',
  },
  description: 'Review and manage your positions on Normal.',
  alternates: {
    canonical: '/positions',
  },
  openGraph: {
    title: 'Index | Normal',
    description: 'Review and manage your positions on Normal.',
    url: `${CONFIG.siteUrl}/positions`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png', // replace with image you want to show when sharing link on other socials than twitter
        width: 1200,
        height: 630,
        alt: 'Normal Index overview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Index | Normal',
    description: 'Review and manage your positions on Normal.',
    images: ['/og/home.png'], // replace with image you want to show when sharing link on Twitter
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal', 'Normal Finance', 'positions', 'portfolio', 'crypto positions'],
};

export default function Page() {
  return <ComingSoonView />;
}

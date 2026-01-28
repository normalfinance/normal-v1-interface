import type { Metadata } from 'next';

import BlockedView from '@/sections/blocked';
import { CONFIG } from '@/global-config';

export const metadata: Metadata = {
  title: {
    default: 'Blocked | Normal',
    template: '%s · Normal',
  },
  description: 'Normal is only available in certain regions and to certain users.',
  alternates: {
    canonical: '/assets',
  },
  openGraph: {
    title: 'Blocked | Normal',
    description: 'Normal is only available in certain regions and to certain users.',
    url: `${CONFIG.siteUrl}/blocked`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png', // replace with image you want to show when sharing link on other socials than twitter
        width: 1200,
        height: 630,
        alt: 'Normal Blocked',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blocked | Normal',
    description: 'Normal is only available in certain regions and to certain users.',
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
  return <BlockedView />;
}

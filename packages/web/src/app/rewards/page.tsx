import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import { RewardsView } from '@/sections/rewards/index';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'Rewards | Normal',
    template: '%s · Normal',
  },
  description: 'Track, harvest, and manage your rewards on Normal.',
  alternates: {
    canonical: '/rewards',
  },
  openGraph: {
    title: 'Rewards | Normal',
    description: 'Track, harvest, and manage your rewards on Normal.',
    url: `${CONFIG.siteUrl}/rewards`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png',
        width: 1200,
        height: 630,
        alt: 'Normal Rewards overview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rewards | Normal',
    description: 'Track, harvest, and manage your rewards on Normal.',
    images: ['/og/home.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal', 'Normal Finance', 'rewards', 'crypto rewards', 'staking rewards', 'yield'],
};

export default function Page() {
  return <RewardsView />;
}

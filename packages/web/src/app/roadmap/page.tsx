import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import RoadmapPage from '@/sections/roadmap';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'Roadmap | Normal',
    template: '%s · Normal',
  },
  description:
    'Explore the Normal roadmap – upcoming features, milestones, and our vision for the future of on-chain index funds.',
  alternates: {
    canonical: '/roadmap',
  },
  openGraph: {
    title: 'Roadmap | Normal',
    description:
      'Explore the Normal roadmap – upcoming features, milestones, and our vision for the future of on-chain index funds.',
    url: `${CONFIG.siteUrl}/roadmap`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png',
        width: 1200,
        height: 630,
        alt: 'Normal Roadmap overview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roadmap | Normal',
    description:
      'See what’s next on the Normal roadmap – new features, DeFi integrations, and index fund improvements.',
    images: ['/og/home.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: [
    'Normal',
    'Normal Finance',
    'roadmap',
    'crypto roadmap',
    'DeFi roadmap',
    'on-chain index funds',
  ],
};
export default function Page() {
  return <RoadmapPage />;
}

import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import IndexDetailsView from '@/sections/indexes/[indexDetails]';
import ExploreIndexesView from '@/sections/explore/indexes';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'Explore Indexes | Normal',
    template: '%s · Normal',
  },
  description:
    'Browse and compare Normal Finance indexes to discover opportunities, methodologies, and performance insights.',
  alternates: {
    canonical: '/indexes/explore',
  },
  openGraph: {
    title: 'Explore Indexes | Normal',
    description:
      'Discover and analyze Normal Finance indexes with insights into composition, risk, and performance.',
    url: `${CONFIG.siteUrl}/indexes/explore`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png',
        width: 1200,
        height: 630,
        alt: 'Normal Insurance overview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Explore Indexes | Normal',
    description:
      'Explore the full range of Normal Finance indexes, compare methodologies, and track performance.',
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
    'explore crypto indexes',
    'index comparison',
    'portfolio diversification',
    'web3 benchmarks',
  ],
};

export default function Page() {
  return <ExploreIndexesView />;
}

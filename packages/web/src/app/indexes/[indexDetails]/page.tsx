import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import IndexDetailsView from '@/sections/indexes/[indexDetails]';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'Index Details | Normal',
    template: '%s · Normal',
  },
  description: 'Dive into methodology, performance and key facts for Normal Finance indexes.',
  alternates: {
    canonical: '/indexes',
  },
  openGraph: {
    title: 'Index Details | Normal',
    description:
      'Explore in-depth information on Normal Finance indexes, including composition and performance metrics.',
    url: `${CONFIG.siteUrl}/indexes`,
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
    title: 'Index Details | Normal',
    description:
      'Get comprehensive insights on Normal Finance indexes, their methodology and risk profile.',
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
    'crypto indexes',
    'index methodology',
    'portfolio tracking',
    'web3 benchmarks',
  ],
};

export default function Page() {
  return <IndexDetailsView />;
}

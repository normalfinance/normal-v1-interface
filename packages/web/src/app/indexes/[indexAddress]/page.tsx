import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import IndexView from '@/sections/indexes/[indexAddress]';

export const metadata: Metadata = {
  title: {
    default: 'Index Details | Normal',
    template: '%s · Normal',
  },
  description: 'Detailed view of a specific index fund on Normal.',
  alternates: {
    canonical: '/indexes',
  },
  openGraph: {
    title: 'Index Details | Normal',
    description: 'Detailed view of a specific index fund on Normal.',
    url: `${CONFIG.siteUrl}/indexes`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png',
        width: 1200,
        height: 630,
        alt: 'Normal Index details',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Index Details | Normal',
    description: 'Detailed view of a specific index fund on Normal.',
    images: ['/og/home.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal', 'Normal Finance', 'index fund', 'APY', 'crypto yield'],
};

interface PageProps {
  params: { indexAddress: string };
}

export default function Page({ params }: PageProps) {
  return <IndexView indexAddress={params.indexAddress} />;
}

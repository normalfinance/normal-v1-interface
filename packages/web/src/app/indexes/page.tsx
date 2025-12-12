import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import IndexesView from '@/sections/indexes';

export const metadata: Metadata = {
  title: {
    default: 'Indexes | Normal',
    template: '%s · Normal',
  },
  description: 'Browse and invest in index funds on Normal.',
  alternates: {
    canonical: '/indexes',
  },
  openGraph: {
    title: 'Indexes | Normal',
    description: 'Browse and invest in index funds on Normal.',
    url: `${CONFIG.siteUrl}/indexes`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png',
        width: 1200,
        height: 630,
        alt: 'Normal Indexes overview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Indexes | Normal',
    description: 'Browse and invest in index funds on Normal.',
    images: ['/og/home.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal', 'Normal Finance', 'indexes', 'index funds', 'crypto yield'],
};

export default function Page() {
  return <IndexesView />;
}

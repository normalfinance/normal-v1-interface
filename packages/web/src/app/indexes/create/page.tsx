import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import CreateIndexView from '@/sections/indexes/create';

export const metadata: Metadata = {
  title: {
    default: 'Create Index | Normal',
    template: '%s · Normal',
  },
  description: 'Browse and invest in index funds on Normal.',
  alternates: {
    canonical: '/indexes',
  },
  openGraph: {
    title: 'Create Index | Normal',
    description: 'Browse and invest in index funds on Normal.',
    url: `${CONFIG.siteUrl}/indexes`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png',
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
    title: 'Create Index | Normal',
    description: 'Browse and invest in index funds on Normal.',
    images: ['/og/home.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal', 'Normal Finance', 'indexes', 'index funds', 'ETF'],
};

export default function Page() {
  return <CreateIndexView />;
}

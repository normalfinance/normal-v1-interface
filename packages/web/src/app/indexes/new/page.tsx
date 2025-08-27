import type { Metadata } from 'next';
import { CONFIG } from '@/global-config';
import CreateAnIndexView from '@/sections/indexes/new';

export const metadata: Metadata = {
  title: { default: 'Create Index | Normal', template: '%s · Normal' },
  description: 'Build and launch your own custom crypto index with Normal.',
  alternates: { canonical: '/index/new' },
  openGraph: {
    title: 'Create Index | Normal',
    description: 'Build and launch your own custom crypto index with Normal.',
    url: `${CONFIG.siteUrl}/index/new`,
    siteName: 'Normal',
    images: [{ url: '/og/home.png', width: 1200, height: 630, alt: 'Normal Create Index' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Create Index | Normal',
    description: 'Build and launch your own custom crypto index with Normal.',
    images: ['/og/home.png'],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  keywords: [
    'Normal',
    'Normal Finance',
    'create crypto index',
    'custom index',
    'crypto investing',
    'web3 portfolio',
  ],
};

export default function Page() {
  return <CreateAnIndexView />;
}

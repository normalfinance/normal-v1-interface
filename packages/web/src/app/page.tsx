import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import LandingPage from '@/sections/landing-page';

export const metadata: Metadata = {
  title: {
    default: 'Home | Normal',
    template: '%s · Normal',
  },
  description: 'Normal helps you invest in diversified crypto indices and assets.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Home | Normal',
    description: 'Normal helps you invest in diversified crypto indices and assets.',
    url: CONFIG.siteUrl,
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png',
        width: 1200,
        height: 630,
        alt: 'Normal landing page',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Home | Normal',
    description: 'Normal helps you invest in diversified crypto indices and assets.',
    images: ['/og/home.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal', 'Normal Finance', 'crypto index', 'crypto investing', 'web3 portfolio'],
};

export default function Page() {
  return <LandingPage />;
}

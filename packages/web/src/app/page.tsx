import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';

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
        url: '/og/home.png', // replace with image you want to show when sharing link on other socials than twitter
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
  return <LandingPage />;
}

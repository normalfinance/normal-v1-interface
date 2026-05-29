import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import LandingPage from '@/sections/landing-page';

export const metadata: Metadata = {
  title: {
    default: 'Home | Normal',
    template: '%s · Normal',
  },
  description:
    'Normal gives your USDC a job. Earn real yield through self-custody savings powered by DeFindex and Blend on Stellar.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Home | Normal',
    description:
      'Normal gives your USDC a job. Earn real yield through self-custody savings powered by DeFindex and Blend on Stellar.',
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
    description:
      'Normal gives your USDC a job. Earn real yield through self-custody savings powered by DeFindex and Blend on Stellar.',
    images: ['/og/home.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal', 'Normal Finance', 'USDC yield', 'crypto savings', 'DeFi', 'Stellar', 'Blend'],
};

export default function Page() {
  return <LandingPage />;
}

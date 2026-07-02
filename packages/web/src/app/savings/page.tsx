import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import SavingsView from '@/sections/savings';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'Savings | Normal',
    template: '%s · Normal',
  },
  description: 'Earn yield on your USDC savings with Normal.',
  alternates: {
    canonical: '/savings',
  },
  openGraph: {
    title: 'Savings | Normal',
    description: 'Earn yield on your USDC savings with Normal.',
    url: `${CONFIG.siteUrl}/savings`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/savings.png',
        width: 1200,
        height: 630,
        alt: 'Normal Savings',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Savings | Normal',
    description: 'Earn yield on your USDC savings with Normal.',
    images: ['/og/savings.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal', 'Normal Finance', 'savings', 'yield', 'USDC', 'Stellar', 'DeFi'],
};

export default function Page() {
  return <SavingsView />;
}

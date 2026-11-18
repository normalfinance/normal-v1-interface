import type { Metadata } from 'next';

import { paths } from '@/routes/paths';
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
    url: `${CONFIG.siteUrl}${paths.savings}`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/savings.jpg',
        width: 1200,
        height: 630,
        alt: 'Savings that earn every day. Savings in the Normal app.',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Savings | Normal',
    description: 'Earn yield on your USDC savings with Normal.',
    images: ['/og/savings.jpg'],
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

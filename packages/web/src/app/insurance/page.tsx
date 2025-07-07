import type { Metadata } from 'next';

import InsuranceView from '@/sections/insurance';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'Insurance | Normal',
    template: '%s · Normal Finance',
  },
  description: 'Protect your crypto assets with Normal insurance options.',
  alternates: {
    canonical: '/insurance',
  },
  openGraph: {
    title: 'Insurance | Normal',
    description: 'Protect your crypto assets with Normal insurance options.',
    url: 'https://app.normalfinance.io/insurance', // replace with real domain
    siteName: 'Normal Finance',
    images: [
      {
        url: '/og/home.png', // replace with image you want to show when sharing link on other socials than twitter
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
    title: 'Insurance | Normal',
    description: 'Protect your crypto assets with Normal insurance options.',
    images: ['/og/home.png'], // replace with image you want to show when sharing link on Twitter
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal Finance', 'crypto insurance', 'risk management', 'web3 security'],
};

export default function Page() {
  return <InsuranceView />;
}

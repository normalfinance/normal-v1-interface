import type { Metadata } from 'next';

import DisclaimerView from '@/sections/legal/disclaimer-view';
import { CONFIG } from '@/global-config';
import { paths } from '@/routes/paths';

export const metadata: Metadata = {
  title: {
    default: 'Legal - Disclaimer | Normal',
    template: '%s · Normal',
  },
  description: 'View our official Disclaimer.',
  alternates: {
    canonical: '/assets',
  },
  openGraph: {
    title: 'Legal - Disclaimer | Normal',
    description: 'View our official Disclaimer.',
    url: `${CONFIG.siteUrl}${paths.legal.disclaimer}`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png', // replace with image you want to show when sharing link on other socials than twitter
        width: 1200,
        height: 630,
        alt: 'Normal Legal - Disclaimer',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Legal - Disclaimer | Normal',
    description: 'View our official Disclaimer.',
    images: ['/og/home.png'], // replace with image you want to show when sharing link on Twitter
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal', 'Normal Finance', 'legal', 'disclaimer'],
};

export default function Page() {
  return <DisclaimerView />;
}

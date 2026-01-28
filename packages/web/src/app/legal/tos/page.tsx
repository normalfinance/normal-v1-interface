import type { Metadata } from 'next';

import { paths } from '@/routes/paths';
import { CONFIG } from '@/global-config';
import TermsOfServiceView from '@/sections/legal/tos-view';

export const metadata: Metadata = {
  title: {
    default: 'Legal - Terms of Service | Normal',
    template: '%s · Normal',
  },
  description: 'View our official Terms of Service.',
  alternates: {
    canonical: '/assets',
  },
  openGraph: {
    title: 'Legal - Terms of Service | Normal',
    description: 'View our official Terms of Service.',
    url: `${CONFIG.siteUrl}${paths.legal.tos}`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png', // replace with image you want to show when sharing link on other socials than twitter
        width: 1200,
        height: 630,
        alt: 'Normal Legal - Terms of Service',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Legal - Terms of Service | Normal',
    description: 'View our official Terms of Service.',
    images: ['/og/home.png'], // replace with image you want to show when sharing link on Twitter
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal', 'Normal Finance', 'legal', 'terms of service'],
};

export default function Page() {
  return <TermsOfServiceView />;
}

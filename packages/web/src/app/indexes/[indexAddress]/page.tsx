import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import ComingSoonView from '@/sections/coming-soon';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'Index Details | Normal',
    template: '%s · Normal',
  },
  description: 'Detailed view of a specific index fund on Normal.',
  alternates: {
    canonical: '/indexes',
  },
  openGraph: {
    title: 'Index Details | Normal',
    description: 'Detailed view of a specific index fund on Normal.',
    url: `${CONFIG.siteUrl}/pools`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png', // replace with image you want to show when sharing link on other socials than twitter
        width: 1200,
        height: 630,
        alt: 'Normal Index details',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Index Details | Normal',
    description: 'Detailed view of a specific index fund on Normal.',
    images: ['/og/home.png'], // replace with image you want to show when sharing link on Twitter
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal', 'Normal Finance', 'index fund', 'APY', 'crypto yield'],
};

interface PageProps {
  params: { indexAddress: string };
}

export default function Page({ params }: PageProps) {
  return <ComingSoonView />;
}

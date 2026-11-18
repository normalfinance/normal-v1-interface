import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import AboutUsView from '@/sections/about';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'About Us | Normal',
    template: '%s · Normal',
  },
  description: 'Get to know the people, mission, and values driving Normal.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'About Us | Normal',
    description: 'Get to know the people, mission, and values driving Normal.',
    url: `${CONFIG.siteUrl}/about`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/about.png',
        width: 1200,
        height: 630,
        alt: 'Normal – About Us',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Us | Normal',
    description: 'Get to know the people, mission, and values driving Normal.',
    images: ['/og/about.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal', 'Normal Finance', 'About Us', 'Company Mission', 'Our Team', 'Web3 Company'],
};

export default function Page() {
  return <AboutUsView />;
}

import type { Metadata } from 'next';

import { paths } from '@/routes/paths';
import { CONFIG } from '@/global-config';
import PrivacyPolicyView from '@/sections/legal/pp-view';

export const metadata: Metadata = {
  title: {
    default: 'Legal - Privacy Policy | Normal',
    template: '%s · Normal',
  },
  description: 'View our official Privacy Policy.',
  alternates: {
    canonical: '/assets',
  },
  openGraph: {
    title: 'Legal - Privacy Policy | Normal',
    description: 'View our official Privacy Policy.',
    url: `${CONFIG.siteUrl}${paths.legal.pp}`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png', // replace with image you want to show when sharing link on other socials than twitter
        width: 1200,
        height: 630,
        alt: 'Normal Legal - Privacy Policy',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Legal - Privacy Policy | Normal',
    description: 'View our official Privacy Policy.',
    images: ['/og/home.png'], // replace with image you want to show when sharing link on Twitter
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal', 'Normal Finance', 'legal', 'privacy policy'],
};

export default function Page() {
  return <PrivacyPolicyView />;
}

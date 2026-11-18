import type { Metadata } from 'next';

import { paths } from '@/routes/paths';
import { CONFIG } from '@/global-config';
import DeleteAccountView from '@/sections/legal/delete-account-view';

export const metadata: Metadata = {
  title: {
    default: 'Legal - Delete Your Account | Normal',
    template: '%s · Normal',
  },
  description: 'How to delete your Normal account and what happens to your data.',
  alternates: {
    canonical: '/legal/delete-account',
  },
  openGraph: {
    title: 'Legal - Delete Your Account | Normal',
    description: 'How to delete your Normal account and what happens to your data.',
    url: `${CONFIG.siteUrl}${paths.legal.deleteAccount}`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png', // replace with image you want to show when sharing link on other socials than twitter
        width: 1200,
        height: 630,
        alt: 'Normal Legal - Delete Your Account',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Legal - Delete Your Account | Normal',
    description: 'How to delete your Normal account and what happens to your data.',
    images: ['/og/home.png'], // replace with image you want to show when sharing link on Twitter
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal', 'Normal Finance', 'legal', 'delete account'],
};

export default function Page() {
  return <DeleteAccountView />;
}

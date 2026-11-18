import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import TransactionStatusView from '@/sections/trx';

export const metadata: Metadata = {
  title: {
    default: 'Transaction Status | Normal',
    template: '%s · Normal',
  },
  description: 'Track the status of a transaction on Normal.',
  alternates: {
    canonical: '/trx',
  },
  openGraph: {
    title: 'Transaction Status | Normal',
    description: 'Track the status of a transaction on Normal.',
    url: `${CONFIG.siteUrl}/trx`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png', // replace with image you want to show when sharing link on other socials than twitter
        width: 1200,
        height: 630,
        alt: 'Normal Transaction Status',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Transaction Status | Normal',
    description: 'Track the status of a transaction on Normal.',
    images: ['/og/home.png'], // replace with image you want to show when sharing link on Twitter
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal', 'Normal Finance', 'transaction'],
};

interface PageProps {
  params: { hash: string };
}

export default function Page({ params }: PageProps) {
  return <TransactionStatusView trxHash={params.hash} />;
}

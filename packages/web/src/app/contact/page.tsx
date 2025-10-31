import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import ContactView from '@/sections/contact';

export const metadata: Metadata = {
  title: {
    default: 'Contact | Normal',
    template: '%s · Normal',
  },
  description: 'Reach out to the Normal team for questions, support, or partnership inquiries.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'Contact | Normal',
    description: 'Reach out to the Normal team for questions, support, or partnership inquiries.',
    url: `${CONFIG.siteUrl}/contact`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png',
        width: 1200,
        height: 630,
        alt: 'Normal – Contact',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact | Normal',
    description: 'Reach out to the Normal team for questions, support, or partnership inquiries.',
    images: ['/og/home.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal', 'Normal Finance', 'Contact', 'Support', 'Partnerships', 'Web3 Company'],
};
export default function Page() {
  return <ContactView />;
}

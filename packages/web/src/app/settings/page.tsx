'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserSettingsView } from '@/sections/settings';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { Metadata } from 'next';
import { CONFIG } from '@/global-config';

export const metadata: Metadata = {
  title: {
    default: 'Settings | Normal',
    template: '%s · Normal',
  },
  description: 'View and manage your Normal account settings.',
  alternates: {
    canonical: '/assets',
  },
  openGraph: {
    title: 'Settings | Normal',
    description: 'View and manage your Normal account settings.',
    url: `${CONFIG.siteUrl}/legal/disclaimer`,
    siteName: 'Normal',
    images: [
      {
        url: '/og/home.png', // replace with image you want to show when sharing link on other socials than twitter
        width: 1200,
        height: 630,
        alt: 'Normal Settings',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Settings | Normal',
    description: 'View and manage your Normal account settings.',
    images: ['/og/home.png'], // replace with image you want to show when sharing link on Twitter
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  keywords: ['Normal', 'Normal Finance', 'settings'],
};

export default function SettingsPage() {
  const { session, isLoading } = useSupabaseAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/');
    }
  }, [session, isLoading, router]);

  if (isLoading) {
    return null; // Should be a skeleton loader here
  }

  return <UserSettingsView />;
}

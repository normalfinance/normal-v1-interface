'use client';

import type { ReactNode } from 'react';

import posthog from 'posthog-js';
import { useEffect } from 'react';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

const network = process.env.NEXT_PUBLIC_NETWORK?.toLowerCase() || 'testnet';

export function PostHogProvider({ children }: { children: ReactNode }) {
  const isMainnet = network === 'mainnet';

  const key = isMainnet
    ? process.env.NEXT_PUBLIC_MAINNET_POSTHOG_KEY
    : process.env.NEXT_PUBLIC_TESTNET_POSTHOG_KEY;

  const host = isMainnet
    ? process.env.NEXT_PUBLIC_MAINNET_POSTHOG_HOST
    : process.env.NEXT_PUBLIC_TESTNET_POSTHOG_HOST;

  useEffect(() => {
    posthog.init(key!, {
      api_host: '/ph',
      ui_host: host ?? 'https://us.posthog.com',
      defaults: '2025-05-24',
      capture_exceptions: true,
      debug: process.env.NODE_ENV === 'development',
      fetch_options: {
        cache: 'force-cache', // Use Next.js cache
        next_options: {
          // Passed to the `next` option for `fetch`
          revalidate: 60, // Cache for 60 seconds
          tags: ['posthog'], // Can be used with Next.js `revalidateTag` function
        },
      },
      __add_tracing_headers: ['normalfinance.io'],
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

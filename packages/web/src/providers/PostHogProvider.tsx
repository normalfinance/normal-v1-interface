'use client';

import type { ReactNode } from 'react';

import posthog from 'posthog-js';
import { useEffect } from 'react';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: '/ingest',
      ui_host: 'https://us.posthog.com',
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
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

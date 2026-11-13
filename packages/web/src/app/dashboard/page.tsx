import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import { unstable_cache } from 'next/cache';
import { toPublicSnapshot } from '@/lib/metrics/snapshot';
import { MetricsView } from '@/sections/metrics/metrics-view';
import { METRICS_CACHE_TAG, loadMetricsSnapshot } from '@/server/metrics-store';

// ----------------------------------------------------------------------

// Public, like the Dune dashboard it replaces (Niko, 2026-11-13), but kept
// out of search results.
export const metadata: Metadata = {
  title: 'Dashboard | Normal',
  description: 'Normal in numbers: users, volume, revenue, savings and activity, refreshed daily.',
  alternates: { canonical: '/dashboard' },
  openGraph: {
    title: 'Dashboard | Normal',
    description: 'Normal in numbers, refreshed daily.',
    url: `${CONFIG.siteUrl}/dashboard`,
    siteName: 'Normal',
    type: 'website',
  },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

// Rendered per request (Redis is never read at build time). Requests within
// a minute share one Redis read, whatever it found, and the daily sync
// clears the cache the moment it saves new numbers. A short window on
// purpose: with 5 minutes a page kept showing numbers already deleted, then
// "No numbers yet" well after they were back (2026-11-13).
export const dynamic = 'force-dynamic';

const getSnapshot = unstable_cache(
  async () => toPublicSnapshot(await loadMetricsSnapshot()),
  ['metrics-snapshot-v3'],
  { revalidate: 60, tags: [METRICS_CACHE_TAG] }
);

export default async function Page() {
  const snapshot = await getSnapshot();
  return <MetricsView snapshot={snapshot} />;
}

import type { MetricsSnapshot } from '@/lib/metrics/snapshot';

import { logger } from '@/utils/logger';
import { redis } from '@/server/rateLimiter';
import { METRICS_SNAPSHOT_VERSION } from '@/lib/metrics/snapshot';

// ---------------------------------------------------------------------------
// Where the /dashboard numbers live between daily syncs: ONE Redis value.
//
// Redis rather than a database table on purpose: the snapshot is derived data
// that the next sync rebuilds in full from our database, DeFindex and the
// chains, so losing it costs one refresh, not history. Every page view reads
// this one key (cached for 5 minutes by the page), never the sources.
// ---------------------------------------------------------------------------

/** Lets the sync tell the page's cache that new numbers exist. */
export const METRICS_CACHE_TAG = 'metrics-snapshot';

/** Upstash refuses requests above 1 MB; stay well under it. */
const MAX_BYTES = 900_000;

/**
 * One key per deployment environment. Staging is a preview deployment of
 * `develop` and may share the Upstash database with production; it must
 * never overwrite what the public page shows.
 */
export function metricsSnapshotKey(): string {
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
  return `metrics:snapshot:v${METRICS_SNAPSHOT_VERSION}:${env}`;
}

export async function loadMetricsSnapshot(): Promise<MetricsSnapshot | null> {
  try {
    const snapshot = await redis.get<MetricsSnapshot>(metricsSnapshotKey());
    return snapshot && snapshot.version === METRICS_SNAPSHOT_VERSION ? snapshot : null;
  } catch (error) {
    logger.error('[metrics] could not read the snapshot', error);
    return null;
  }
}

/** Saves the snapshot and returns its size. Throws when Redis refuses it. */
export async function saveMetricsSnapshot(snapshot: MetricsSnapshot): Promise<number> {
  let toSave = snapshot;
  let bytes = JSON.stringify(toSave).length;
  // The activity log is the only part that grows with usage: shorten it
  // rather than fail the whole save.
  while (bytes > MAX_BYTES && toSave.activityLog.rows.length > 50) {
    toSave = {
      ...toSave,
      activityLog: {
        ...toSave.activityLog,
        rows: toSave.activityLog.rows.slice(0, Math.floor(toSave.activityLog.rows.length / 2)),
      },
    };
    bytes = JSON.stringify(toSave).length;
  }
  await redis.set(metricsSnapshotKey(), toSave);
  return bytes;
}

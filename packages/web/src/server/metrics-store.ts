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
 * never overwrite what the public page shows. Outside Vercel the key always
 * starts with "local-": a laptop running `next start` (NODE_ENV=production)
 * must never write the key the live page reads.
 */
export function metricsEnvironment(
  env: { VERCEL_ENV?: string; NODE_ENV?: string } = process.env
): string {
  return env.VERCEL_ENV ? env.VERCEL_ENV : `local-${env.NODE_ENV || 'development'}`;
}

function environment(): string {
  return metricsEnvironment();
}

export function metricsSnapshotKey(version: number = METRICS_SNAPSHOT_VERSION): string {
  return `metrics:snapshot:v${version}:${environment()}`;
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

/**
 * The yield ledger saved by the first snapshot format (v1, 2026-11-13), so
 * moving to v2 does not forget savers who have since left the vault. Empty
 * when there is none.
 */
export async function loadLegacyYieldLedger(): Promise<Record<string, number>> {
  try {
    const legacy = await redis.get<{ internal?: { yieldByWallet?: Record<string, number> } }>(
      metricsSnapshotKey(1)
    );
    const ledger = legacy?.internal?.yieldByWallet;
    return ledger && typeof ledger === 'object' ? ledger : {};
  } catch {
    return {};
  }
}

/** Saves the snapshot and returns its size. Throws when Redis refuses it. */
export async function saveMetricsSnapshot(snapshot: MetricsSnapshot): Promise<number> {
  let toSave = snapshot;
  let bytes = JSON.stringify(toSave).length;
  // The activity log is the only part that grows with usage: shorten it
  // rather than fail the whole save.
  while (bytes > MAX_BYTES && toSave.private.activityLog.rows.length > 50) {
    const log = toSave.private.activityLog;
    toSave = {
      ...toSave,
      private: {
        ...toSave.private,
        activityLog: { ...log, rows: log.rows.slice(0, Math.floor(log.rows.length / 2)) },
      },
    };
    bytes = JSON.stringify(toSave).length;
  }
  await redis.set(metricsSnapshotKey(), toSave);
  return bytes;
}

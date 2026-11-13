import type { SectionKey, MetricsSources } from '@/lib/metrics/snapshot';

import { logger } from '@/utils/logger';
import { revalidateTag } from 'next/cache';
import { fetchSupabaseUsers } from '@/services/supabase-sync';
import { fetchAllDepositWallets } from '@/services/prisma-sync';
import { buildSavingsTvl, buildMetricsSnapshot } from '@/lib/metrics/snapshot';
import { fetchActivityV2, fetchWalletChains, fetchHoldingsSnapshot } from '@/services/dune-sync-v2';
import {
  fetchVaultSnapshots,
  fetchYieldSnapshots,
  fetchVaultWalletsFromHorizon,
} from '@/services/defindex-sync';

import { METRICS_CACHE_TAG, loadMetricsSnapshot, saveMetricsSnapshot } from './metrics-store';

// ---------------------------------------------------------------------------
// The daily sync behind /dashboard (replaces the Dune upload, 2026-11-13).
//
// Same fetchers as the Dune sync, run one after another: the per-saver
// DeFindex reads and the balance fan-out hit rate-limited third parties, and
// running them side by side is what produced the DeFindex 429 bursts. Each
// source fails on its own; the snapshot keeps its previous numbers for that
// section and records why (lib/metrics/snapshot.ts).
// ---------------------------------------------------------------------------

export interface MetricsSyncResult {
  results: Record<string, string>;
  bytes: number;
}

export async function runMetricsSync(
  now: () => Date = () => new Date()
): Promise<MetricsSyncResult> {
  const previous = await loadMetricsSnapshot();
  const sources: MetricsSources = {
    relayerAddresses: {
      evm: process.env.CCTP_RELAYER_EVM_ADDRESS ?? null,
      stellar: process.env.CCTP_RELAYER_STELLAR_ADDRESS ?? null,
    },
  };
  const errors: Partial<Record<SectionKey, string>> = {};
  const results: Record<string, string> = {};

  async function step<T>(
    key: SectionKey,
    fetcher: () => Promise<T>,
    keep: (value: T) => string
  ): Promise<void> {
    try {
      results[key] = keep(await fetcher());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors[key] = message;
      results[key] = `ERROR: ${message}`;
      logger.error(`[metrics] ${key} failed`, error);
    }
  }

  await step('users', fetchSupabaseUsers, (rows) => {
    sources.users = rows;
    return `${rows.length} users`;
  });

  await step('walletChains', fetchWalletChains, (rows) => {
    sources.walletChains = rows;
    return `${rows.length} rows`;
  });

  // The holdings snapshot adds the savings TVL as its own row; reuse this
  // run's reading so the two never disagree (or the last known one).
  let savingsTvlUsd = previous?.savings.tvlUsd ?? 0;
  await step('savingsTvl', fetchVaultSnapshots, (rows) => {
    sources.vaultSnapshots = rows;
    if (rows.length) savingsTvlUsd = buildSavingsTvl(rows).tvlUsd;
    return `${rows.length} days`;
  });

  await step('activity', fetchActivityV2, (activity) => {
    sources.activity = activity.rows;
    // savingsSource says whether the chain-event union worked or the step
    // fell back to database rows only (doc 122).
    return `${activity.rows.length} rows (savings: ${activity.savingsSource})`;
  });

  await step(
    'yield',
    async () => {
      // Database wallets plus every wallet Horizon saw touch the vault, so a
      // saver who deposited outside the app still counts.
      const [dbWallets, horizonWallets] = await Promise.all([
        fetchAllDepositWallets(),
        fetchVaultWalletsFromHorizon(),
      ]);
      return fetchYieldSnapshots(Array.from(new Set([...dbWallets, ...horizonWallets])));
    },
    (rows) => {
      sources.yieldRows = rows;
      return `${rows.length} savers`;
    }
  );

  await step(
    'holdings',
    () => fetchHoldingsSnapshot(savingsTvlUsd),
    (rows) => {
      sources.holdings = rows;
      return `${rows.length} rows`;
    }
  );

  const snapshot = buildMetricsSnapshot(sources, errors, previous, now());
  const bytes = await saveMetricsSnapshot(snapshot);

  try {
    // The page caches the snapshot for 5 minutes; show the new one now.
    revalidateTag(METRICS_CACHE_TAG);
  } catch (error) {
    logger.error('[metrics] could not refresh the page cache', error);
  }

  return { results, bytes };
}

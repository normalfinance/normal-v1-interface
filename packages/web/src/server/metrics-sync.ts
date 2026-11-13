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
  fetchVaultDepositors,
  fetchVaultWalletsFromHorizon,
} from '@/services/defindex-sync';

import {
  METRICS_CACHE_TAG,
  loadMetricsSnapshot,
  saveMetricsSnapshot,
  loadLegacyYieldLedger,
} from './metrics-store';

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
  // First run of a new snapshot format: keep the savers the old one knew.
  const ledgerSeed = previous ? {} : await loadLegacyYieldLedger();
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
    // Each step reports its time: the whole run must fit Vercel's 5 minutes.
    const started = Date.now();
    const took = () => `${Math.round((Date.now() - started) / 1000)}s`;
    try {
      results[key] = `${keep(await fetcher())} (${took()})`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors[key] = message;
      results[key] = `ERROR: ${message} (${took()})`;
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
      // Only real savers: confirmed database deposits plus every wallet with
      // a savings deposit or withdrawal in this run's activity (database rows
      // merged with DeFindex chain events, so savers outside the app count).
      // Asking about every account Horizon saw near the vault meant 461 calls
      // for 17 depositors, one at a time: minutes, past Vercel's limit.
      // Without this run's activity, fall back to that wider list.
      const dbWallets = await fetchAllDepositWallets();
      const depositors = await fetchVaultDepositors().catch(() => null);
      const seen = sources.activity
        ? sources.activity.filter((r) => r.product === 'savings').map((r) => r.wallet_address)
        : [];
      const wider =
        depositors === null && !sources.activity ? await fetchVaultWalletsFromHorizon() : [];
      return fetchYieldSnapshots(
        Array.from(new Set([...dbWallets, ...(depositors ?? []), ...seen, ...wider])).filter(
          Boolean
        )
      );
    },
    ({ rows, failed, total }) => {
      sources.yieldRows = rows;
      // A saver DeFindex would not answer for keeps their last known yield
      // (the ledger); say so instead of dropping them quietly.
      if (failed.length) {
        errors.yield = `${failed.length} of ${total} savers could not be read; their last known yield is used`;
      }
      const interest = rows.reduce((sum, r) => sum + r.total_interest_earned, 0);
      return `${rows.length} of ${total} savers read, $${interest.toFixed(2)} earned${failed.length ? `, ${failed.length} failed` : ''}`;
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

  const snapshot = buildMetricsSnapshot(sources, errors, previous, now(), ledgerSeed);
  const bytes = await saveMetricsSnapshot(snapshot);

  try {
    // The page caches the snapshot for a minute; show the new one now.
    revalidateTag(METRICS_CACHE_TAG);
  } catch (error) {
    logger.error('[metrics] could not refresh the page cache', error);
  }

  return { results, bytes };
}

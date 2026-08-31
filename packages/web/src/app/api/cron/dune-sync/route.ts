import { NextResponse } from 'next/server';
import { cronAuthVerdict } from '@/server/cron-auth';
import { fetchSupabaseUsers } from '@/services/supabase-sync';
import { recordCronHeartbeat } from '@/server/cron-heartbeat';
import { duneClear, duneInsert, resetDuneRetryBudget } from '@/lib/dune/client';
import {
  fetchCctpOps,
  fetchActivityV2,
  fetchWalletChains,
  fetchHoldingsSnapshot,
} from '@/services/dune-sync-v2';
import {
  fetchSavingsVolume,
  fetchVaultSnapshots,
  fetchYieldSnapshots,
  fetchVaultWalletsFromHorizon,
} from '@/services/defindex-sync';
import {
  fetchReferrals,
  fetchSwapVolume,
  fetchLinkedWallets,
  fetchWalletActivity,
  fetchTransactionLog,
  fetchAllDepositWallets,
} from '@/services/prisma-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min — needed for yield snapshot batching across 200 wallets

// Vercel Cron calls this with a secret to prevent unauthorized triggers
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  // Auth check — Vercel Cron sets Authorization: Bearer <CRON_SECRET>
  // Doc 95 Wave 7: an UNSET secret used to skip this check entirely, leaving
  // a money-moving endpoint public. cronAuthVerdict fails closed instead.
  const auth = cronAuthVerdict(
    CRON_SECRET,
    req.headers.get('authorization'),
    process.env.NODE_ENV === 'development'
  );
  if (!auth.ok) {
    console.error('[cron] refused:', auth.error);
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // The 429-retry budget is shared module state (doc 121) and serverless
  // instances stay warm between cron runs — reset it so every run starts full.
  resetDuneRetryBudget();

  const results: Record<string, string> = {};

  try {
    // 1. Vault snapshots (TVL over time)
    const vaultSnapshots = await fetchVaultSnapshots();
    await duneClear('normal_vault_snapshots');
    await duneInsert('normal_vault_snapshots', vaultSnapshots);
    results.vault_snapshots = `${vaultSnapshots.length} rows`;
  } catch (e: any) {
    results.vault_snapshots = `ERROR: ${e.message}`;
  }

  try {
    // 2. Savings volume (deposits + withdrawals from DeFindex)
    const savingsVolume = await fetchSavingsVolume();

    // 3. Swap volume (from Prisma)
    const swapVolume = await fetchSwapVolume();

    const allVolume = [...savingsVolume, ...swapVolume];
    await duneClear('normal_volume_daily');
    await duneInsert('normal_volume_daily', allVolume);
    results.volume_daily = `${allVolume.length} rows`;
  } catch (e: any) {
    results.volume_daily = `ERROR: ${e.message}`;
  }

  try {
    // 4. Wallet activity (from Prisma — swaps + deposits)
    const walletActivity = await fetchWalletActivity();
    await duneClear('normal_wallet_activity');
    await duneInsert('normal_wallet_activity', walletActivity);
    results.wallet_activity = `${walletActivity.length} rows`;
  } catch (e: any) {
    results.wallet_activity = `ERROR: ${e.message}`;
  }

  try {
    // 5. Yield snapshots (per-wallet, from DeFindex account API)
    // Merge DB wallets with Horizon-discovered wallets so we never miss a depositor
    // that bypassed Normal's app (or whose log-transaction call failed silently).
    const [dbWallets, horizonWallets] = await Promise.all([
      fetchAllDepositWallets(),
      fetchVaultWalletsFromHorizon(),
    ]);
    const wallets = Array.from(new Set([...dbWallets, ...horizonWallets]));
    const yieldSnapshots = await fetchYieldSnapshots(wallets);
    // Don't clear — append each day's snapshot to preserve history
    await duneInsert('normal_yield_snapshots', yieldSnapshots);
    results.yield_snapshots = `${yieldSnapshots.length} rows`;
  } catch (e: any) {
    results.yield_snapshots = `ERROR: ${e.message}`;
  }

  try {
    // 6. Referrals (from Prisma)
    const referrals = await fetchReferrals();
    await duneClear('normal_referrals');
    await duneInsert('normal_referrals', referrals);
    results.referrals = `${referrals.length} rows`;
  } catch (e: any) {
    results.referrals = `ERROR: ${e.message}`;
  }

  try {
    // 7. Registered users (from Supabase Auth)
    const users = await fetchSupabaseUsers();
    await duneClear('normal_users');
    await duneInsert('normal_users', users);
    results.users = `${users.length} rows`;
  } catch (e: any) {
    results.users = `ERROR: ${e.message}`;
  }

  try {
    // 8. Linked wallets (supabaseUid ↔ walletAddress mapping)
    const linkedWallets = await fetchLinkedWallets();
    await duneClear('normal_linked_wallets');
    await duneInsert('normal_linked_wallets', linkedWallets);
    results.linked_wallets = `${linkedWallets.length} rows`;
  } catch (e: any) {
    results.linked_wallets = `ERROR: ${e.message}`;
  }

  try {
    // 9. Transaction log (every on-chain action through Normal, per wallet)
    const txLog = await fetchTransactionLog();
    await duneClear('normal_transaction_log');
    await duneInsert('normal_transaction_log', txLog);
    results.transaction_log = `${txLog.length} rows`;
  } catch (e: any) {
    results.transaction_log = `ERROR: ${e.message}`;
  }

  // -------------------------------------------------------------------
  // Dashboard v2 (doc 119): one wide activity table across every product,
  // CCTP ops detail, per-chain wallet provisioning, and an append-only daily
  // holdings snapshot (combined-TVL charts join it with the savings
  // snapshots — holdings history starts the day this shipped).
  // -------------------------------------------------------------------
  let latestSavingsTvl = 0;
  try {
    const activity = await fetchActivityV2();
    await duneClear('normal_activity_v2');
    await duneInsert('normal_activity_v2', activity);
    results.activity_v2 = `${activity.length} rows`;
  } catch (e: any) {
    results.activity_v2 = `ERROR: ${e.message}`;
  }

  try {
    const ops = await fetchCctpOps();
    await duneClear('normal_cctp_ops');
    await duneInsert('normal_cctp_ops', ops);
    results.cctp_ops = `${ops.length} rows`;
  } catch (e: any) {
    results.cctp_ops = `ERROR: ${e.message}`;
  }

  try {
    const chains = await fetchWalletChains();
    await duneClear('normal_wallet_chains');
    await duneInsert('normal_wallet_chains', chains);
    results.wallet_chains = `${chains.length} rows`;
  } catch (e: any) {
    results.wallet_chains = `ERROR: ${e.message}`;
  }

  try {
    // Reuse the TVL the vault-snapshot step just fetched (last point) so the
    // holdings snapshot never disagrees with the savings chart.
    try {
      const snaps = await fetchVaultSnapshots();
      latestSavingsTvl = snaps.length ? snaps[snaps.length - 1].tvl_usd : 0;
    } catch {
      /* holdings still upload without the savings row */
    }
    const holdings = await fetchHoldingsSnapshot(latestSavingsTvl);
    // Append-only: each day's snapshot extends the history.
    await duneInsert('normal_holdings_snapshots', holdings);
    results.holdings_snapshots = `${holdings.length} rows`;
  } catch (e: any) {
    results.holdings_snapshots = `ERROR: ${e.message}`;
  }

  const heartbeat = await recordCronHeartbeat('dune-sync');
  return NextResponse.json({ ok: true, results, heartbeat });
}

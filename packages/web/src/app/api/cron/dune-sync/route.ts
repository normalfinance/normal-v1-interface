import { NextResponse } from 'next/server';
import { duneInsert, duneClear } from '@/lib/dune/client';
import {
  fetchVaultSnapshots,
  fetchSavingsVolume,
  fetchYieldSnapshots,
} from '@/services/defindex-sync';
import {
  fetchSwapVolume,
  fetchWalletActivity,
  fetchAllDepositWallets,
  fetchReferrals,
} from '@/services/prisma-sync';

// Vercel Cron calls this with a secret to prevent unauthorized triggers
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  // Auth check — Vercel Cron sets Authorization: Bearer <CRON_SECRET>
  if (CRON_SECRET) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

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
    const wallets = await fetchAllDepositWallets();
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

  return NextResponse.json({ ok: true, results });
}

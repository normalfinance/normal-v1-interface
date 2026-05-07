import type { VolumeDailyRow, VaultSnapshotRow, YieldSnapshotRow, WalletActivityRow } from '@/lib/dune/tables';

const DEFINDEX_API = 'https://api.defindex.io';
const VAULT_ADDRESS = process.env.NEXT_PUBLIC_MAINNET_DEFINDEX_VAULT!;
const NETWORK = 'mainnet';
const DEFINDEX_API_KEY = process.env.DEFINDEX_API_KEY;

function defindexHeaders(): HeadersInit {
  return DEFINDEX_API_KEY
    ? { Authorization: `Bearer ${DEFINDEX_API_KEY}` }
    : {};
}

// ---------------------------------------------------------------------------
// Vault history → vault snapshots + savings volume
// ---------------------------------------------------------------------------

export async function fetchVaultSnapshots(): Promise<VaultSnapshotRow[]> {
  const url = `${DEFINDEX_API}/vault/${VAULT_ADDRESS}/history?network=${NETWORK}&period=all&interval=daily`;
  const res = await fetch(url, { headers: defindexHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error(`DeFindex vault history failed: ${res.status}`);

  const json = await res.json();
  const rows: VaultSnapshotRow[] = [];

  for (const point of json.data ?? []) {
    if (!point.timestamp) continue;
    rows.push({
      date: new Date(point.timestamp).toISOString(),
      vault_address: VAULT_ADDRESS,
      network: NETWORK,
      tvl_usd: Number(point.totalManagedFunds ?? point.tvl ?? 0) / 1e7,
      pps: Number(point.pps ?? 0) / 1e7,
      total_supply: Number(point.totalSupply ?? 0) / 1e7,
    });
  }

  return rows;
}

export async function fetchSavingsVolume(): Promise<VolumeDailyRow[]> {
  const url = `${DEFINDEX_API}/vault/${VAULT_ADDRESS}/history?network=${NETWORK}&period=all&interval=daily`;
  const res = await fetch(url, { headers: defindexHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error(`DeFindex vault history failed: ${res.status}`);

  const json = await res.json();
  const rows: VolumeDailyRow[] = [];

  for (const point of json.data ?? []) {
    if (!point.timestamp) continue;
    const date = new Date(point.timestamp).toISOString();

    if (Number(point.deposits ?? 0) > 0) {
      rows.push({
        date,
        type: 'savings_deposit',
        network: NETWORK,
        volume_usd: Number(point.deposits ?? 0) / 1e7,
        fee_usd: (Number(point.deposits ?? 0) / 1e7) * 0.005,
        tx_count: Number(point.depositCount ?? 1),
      });
    }

    if (Number(point.withdrawals ?? 0) > 0) {
      rows.push({
        date,
        type: 'savings_withdraw',
        network: NETWORK,
        volume_usd: Number(point.withdrawals ?? 0) / 1e7,
        fee_usd: 0, // withdrawal commission handled separately
        tx_count: Number(point.withdrawalCount ?? 1),
      });
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Per-wallet yield — fetches all wallets that ever deposited
// ---------------------------------------------------------------------------

export async function fetchYieldSnapshots(walletAddresses: string[]): Promise<YieldSnapshotRow[]> {
  const snapshotDate = new Date().toISOString();
  const rows: YieldSnapshotRow[] = [];

  await Promise.allSettled(
    walletAddresses.map(async (wallet) => {
      try {
        const url = `${DEFINDEX_API}/account/${wallet}/vault/${VAULT_ADDRESS}?network=${NETWORK}`;
        const res = await fetch(url, { headers: defindexHeaders(), cache: 'no-store' });
        if (!res.ok) return; // wallet may have no position — skip

        const json = await res.json();
        const perf = json.performance ?? {};
        const pos = json.currentPosition ?? {};

        rows.push({
          snapshot_date: snapshotDate,
          wallet_address: wallet,
          vault_address: VAULT_ADDRESS,
          network: NETWORK,
          total_interest_earned: Number(perf.totalInterestEarned ?? 0) / 1e7,
          total_deposited: Number(perf.totalDeposited ?? 0) / 1e7,
          current_position: Number(pos.estimatedValue ?? 0) / 1e7,
          roi: Number(perf.roi ?? 0),
        });
      } catch {
        // skip wallets with no vault history
      }
    })
  );

  return rows;
}

export async function fetchSavingsWalletActivity(): Promise<WalletActivityRow[]> {
  const url = `${DEFINDEX_API}/vault/${VAULT_ADDRESS}/history?network=${NETWORK}&period=all&interval=daily`;
  const res = await fetch(url, { headers: defindexHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error(`DeFindex vault history failed: ${res.status}`);

  const json = await res.json();
  const rows: WalletActivityRow[] = [];

  for (const point of json.data ?? []) {
    if (!point.timestamp || !point.depositors) continue;
    const date = new Date(point.timestamp).toISOString();
    for (const wallet of point.depositors ?? []) {
      rows.push({ date, wallet_address: wallet, activity_type: 'savings', network: NETWORK });
    }
  }

  return rows;
}

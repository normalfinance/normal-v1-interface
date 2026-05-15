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

  // Log the raw shape once so we can verify field names in production logs.
  const sample = (json.data ?? [])[0];
  console.log('[defindex-sync] vault history keys:', Object.keys(json));
  if (sample) console.log('[defindex-sync] data[0] keys:', Object.keys(sample));

  const rows: VolumeDailyRow[] = [];
  const today = new Date().toISOString();

  // Try per-day incremental fields first (field names vary by API version).
  let hasPerDayData = false;
  for (const point of json.data ?? []) {
    if (!point.timestamp) continue;
    const date = new Date(point.timestamp).toISOString();
    const deposits = Number(
      point.deposits ?? point.dailyDeposits ?? point.depositVolume ?? 0
    );
    const withdrawals = Number(
      point.withdrawals ?? point.dailyWithdrawals ?? point.withdrawalVolume ?? 0
    );
    if (deposits > 0 || withdrawals > 0) hasPerDayData = true;
    if (deposits > 0) {
      rows.push({
        date,
        type: 'savings_deposit',
        network: NETWORK,
        volume_usd: deposits / 1e7,
        fee_usd: (deposits / 1e7) * 0.005,
        tx_count: Number(point.depositCount ?? 1),
      });
    }
    if (withdrawals > 0) {
      rows.push({
        date,
        type: 'savings_withdraw',
        network: NETWORK,
        volume_usd: withdrawals / 1e7,
        fee_usd: 0,
        tx_count: Number(point.withdrawalCount ?? 1),
      });
    }
  }

  // If the per-day fields are empty (API only exposes cumulative totals at the
  // metrics / currentState level), fall back to a single cumulative row.
  // The Dune SUM query for the total-volume KPI will still be correct because
  // duneClear wipes the table before each insert — so this one row IS the total.
  if (!hasPerDayData) {
    console.log('[defindex-sync] no per-day deposit fields found — falling back to cumulative metrics');
    const m = json.metrics ?? json.currentState ?? json;
    const totalDeposits = Number(
      m.totalDeposits ?? m.cumulativeDeposits ?? m.total_deposits ?? 0
    ) / 1e7;
    const totalWithdrawals = Number(
      m.totalWithdrawals ?? m.cumulativeWithdrawals ?? m.total_withdrawals ?? 0
    ) / 1e7;
    console.log('[defindex-sync] cumulative totalDeposits:', totalDeposits, 'totalWithdrawals:', totalWithdrawals);
    if (totalDeposits > 0) {
      rows.push({
        date: today,
        type: 'savings_deposit',
        network: NETWORK,
        volume_usd: totalDeposits,
        fee_usd: totalDeposits * 0.005,
        tx_count: 1,
      });
    }
    if (totalWithdrawals > 0) {
      rows.push({
        date: today,
        type: 'savings_withdraw',
        network: NETWORK,
        volume_usd: totalWithdrawals,
        fee_usd: 0,
        tx_count: 1,
      });
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Discover all wallets that ever interacted with the vault via Stellar Horizon.
// This is the authoritative source — it catches wallets that deposited directly
// on-chain without going through Normal's app (and thus missing from the DB).
// ---------------------------------------------------------------------------

const HORIZON_URL = 'https://horizon.stellar.org';

export async function fetchVaultWalletsFromHorizon(): Promise<string[]> {
  const wallets = new Set<string>();
  let url: string | null =
    `${HORIZON_URL}/operations?account=${VAULT_ADDRESS}&limit=200&order=desc`;

  // Paginate until we have all historical interactions (max 5 pages = 1 000 ops)
  for (let page = 0; page < 5 && url; page++) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) break;
      const json = await res.json();
      const records: any[] = json._embedded?.records ?? [];
      for (const op of records) {
        if (op.source_account) wallets.add(op.source_account);
      }
      url = json._links?.next?.href ?? null;
      if (records.length < 200) break;
    } catch {
      break;
    }
  }

  return Array.from(wallets);
}

// ---------------------------------------------------------------------------
// Per-wallet yield — fetches all wallets that ever deposited
// ---------------------------------------------------------------------------

export async function fetchYieldSnapshots(walletAddresses: string[]): Promise<YieldSnapshotRow[]> {
  const snapshotDate = new Date().toISOString();
  const rows: YieldSnapshotRow[] = [];
  const BATCH_SIZE = 5;
  const BATCH_DELAY_MS = 500;

  for (let i = 0; i < walletAddresses.length; i += BATCH_SIZE) {
    const batch = walletAddresses.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (wallet) => {
        try {
          const url = `${DEFINDEX_API}/account/${wallet}/vault/${VAULT_ADDRESS}?network=${NETWORK}`;
          const res = await fetch(url, { headers: defindexHeaders(), cache: 'no-store' });
          if (!res.ok) return; // wallet has no position — skip

          const json = await res.json();
          const perf = json.performance ?? {};
          const pos = json.currentPosition ?? {};

          // Only record wallets with an actual position
          const currentPosition = Number(pos.estimatedValue ?? 0) / 1e7;
          if (currentPosition <= 0) return;

          rows.push({
            snapshot_date: snapshotDate,
            wallet_address: wallet,
            vault_address: VAULT_ADDRESS,
            network: NETWORK,
            total_interest_earned: Number(perf.totalInterestEarned ?? 0) / 1e7,
            total_deposited: Number(perf.totalDeposited ?? 0) / 1e7,
            current_position: currentPosition,
            roi: Number(perf.roi ?? 0),
          });
        } catch {
          // skip wallets with no vault history
        }
      })
    );

    if (i + BATCH_SIZE < walletAddresses.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

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

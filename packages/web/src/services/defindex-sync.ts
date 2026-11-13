import type {
  VolumeDailyRow,
  VaultSnapshotRow,
  YieldSnapshotRow,
  WalletActivityRow,
} from '@/lib/dune/tables';

const DEFINDEX_API = 'https://api.defindex.io';
const VAULT_ADDRESS = process.env.NEXT_PUBLIC_MAINNET_DEFINDEX_VAULT!;
const NETWORK = 'mainnet';
const DEFINDEX_API_KEY = process.env.DEFINDEX_API_KEY;

function defindexHeaders(): HeadersInit {
  return DEFINDEX_API_KEY ? { Authorization: `Bearer ${DEFINDEX_API_KEY}` } : {};
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
    const deposits = Number(point.deposits ?? point.dailyDeposits ?? point.depositVolume ?? 0);
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
    console.log(
      '[defindex-sync] no per-day deposit fields found — falling back to cumulative metrics'
    );
    const m = json.metrics ?? json.currentState ?? json;
    const totalDeposits =
      Number(m.totalDeposits ?? m.cumulativeDeposits ?? m.total_deposits ?? 0) / 1e7;
    const totalWithdrawals =
      Number(m.totalWithdrawals ?? m.cumulativeWithdrawals ?? m.total_withdrawals ?? 0) / 1e7;
    console.log(
      '[defindex-sync] cumulative totalDeposits:',
      totalDeposits,
      'totalWithdrawals:',
      totalWithdrawals
    );
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

/**
 * Every wallet that ever deposited into the vault, from DeFindex's own
 * depositors list (18 on 2026-11-13). This is the list to ask about: the
 * Horizon scan below returns every account with ANY operation near the
 * vault (payments, offers), 432 accounts for 18 depositors, and asking
 * DeFindex about each one, one at a time, ran past Vercel's 5-minute limit.
 */
export async function fetchVaultDepositors(): Promise<string[]> {
  const wallets: string[] = [];
  const LIMIT = 100;
  for (let offset = 0, page = 0; page < 50; offset += LIMIT, page++) {
    const url = `${DEFINDEX_API}/vault/${VAULT_ADDRESS}/depositors?network=${NETWORK}&limit=${LIMIT}&offset=${offset}`;
    const res = await fetch(url, { headers: defindexHeaders(), cache: 'no-store' });
    if (!res.ok) throw new Error(`DeFindex depositors failed: ${res.status}`);
    const json = await res.json();
    const batch: any[] = json.depositors ?? [];
    for (const d of batch) if (typeof d?.walletAddress === 'string') wallets.push(d.walletAddress);
    if (batch.length < LIMIT || wallets.length >= Number(json.total ?? 0)) break;
  }
  return wallets;
}

const HORIZON_URL = 'https://horizon.stellar.org';

export async function fetchVaultWalletsFromHorizon(): Promise<string[]> {
  const wallets = new Set<string>();
  let url: string | null =
    `${HORIZON_URL}/operations?account=${VAULT_ADDRESS}&limit=200&order=desc`;

  // Paginate until we have all historical interactions (max 5 pages = 1 000 ops)
  for (let page = 0; page < 5 && url; page++) {
    try {
      const res: Response = await fetch(url, { cache: 'no-store' });
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
// Per-wallet yield: every wallet that ever deposited.
//
// Fixed 2026-11-13 (the dashboard showed $31 of interest; the vault had paid
// about $477). Two bugs: batches of 5 parallel calls hit DeFindex's
// throttle, and a 429 was read as "no position", silently dropping the
// biggest saver; and wallets that had withdrawn everything were skipped,
// although DeFindex still reports what they earned. Now: one call at a time,
// 429s retried, closed positions kept, and a wallet that still cannot be read
// is reported as failed so the dashboard keeps its last known number.
// ---------------------------------------------------------------------------

const YIELD_GAP_MS = 500;
const YIELD_RETRY_MS = [2_000, 5_000, 10_000]; // waits after a 429

/** One account answer as a yield row; null when the wallet never saved. */
export function parseYieldAccount(
  json: any,
  wallet: string,
  snapshotDate: string,
  vault: string = VAULT_ADDRESS
): YieldSnapshotRow | null {
  const perf = json?.performance ?? {};
  const totalDeposited = Number(perf.totalDeposited ?? 0) / 1e7;
  const interest = Number(perf.totalInterestEarned ?? 0) / 1e7;
  const position = Number(json?.currentPosition?.estimatedValue ?? 0) / 1e7;
  if (!(totalDeposited > 0) && !(position > 0) && interest === 0) return null;
  return {
    snapshot_date: snapshotDate,
    wallet_address: wallet,
    vault_address: vault,
    network: NETWORK,
    total_interest_earned: Number.isFinite(interest) ? interest : 0,
    total_deposited: Number.isFinite(totalDeposited) ? totalDeposited : 0,
    current_position: Number.isFinite(position) ? position : 0,
    roi: Number(perf.roi ?? 0),
  };
}

export interface YieldFetchResult {
  rows: YieldSnapshotRow[];
  /** Wallets DeFindex would not answer for (throttled or down) after retries. */
  failed: string[];
  total: number;
}

export async function fetchYieldSnapshots(walletAddresses: string[]): Promise<YieldFetchResult> {
  const snapshotDate = new Date().toISOString();
  const rows: YieldSnapshotRow[] = [];
  const failed: string[] = [];

  for (const [i, wallet] of walletAddresses.entries()) {
    const url = `${DEFINDEX_API}/account/${wallet}/vault/${VAULT_ADDRESS}?network=${NETWORK}`;
    let done = false;
    for (let attempt = 0; !done; attempt++) {
      try {
        const res = await fetch(url, { headers: defindexHeaders(), cache: 'no-store' });
        if (res.status === 429 && attempt < YIELD_RETRY_MS.length) {
          await new Promise((r) => setTimeout(r, YIELD_RETRY_MS[attempt]));
          continue;
        }
        done = true;
        if (res.status === 404) break; // never touched the vault
        if (!res.ok) {
          failed.push(wallet);
          break;
        }
        const row = parseYieldAccount(await res.json(), wallet, snapshotDate);
        if (row) rows.push(row);
      } catch {
        done = true;
        failed.push(wallet);
      }
    }
    if (i < walletAddresses.length - 1) await new Promise((r) => setTimeout(r, YIELD_GAP_MS));
  }

  return { rows, failed, total: walletAddresses.length };
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

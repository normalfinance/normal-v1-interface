// ---------------------------------------------------------------------------
// The public metrics page (/dashboard), built from the same rows the daily
// sync used to upload to Dune (2026-11-13: Dune's free plan ended, so the
// numbers now live with us).
//
// Each builder below reproduces one Dune query from
// docs/audit/119-dune-v2-setup-guide.html (its number is in the comment), so
// the figures carry over unchanged. Everything here is pure and jest-covered;
// fetching and saving live in server/metrics-sync.ts and the page only reads
// the saved snapshot.
//
// Carry-forward rule: a source that failed this run keeps its previous
// section, with the time it was last refreshed and the error, rather than
// showing zeros. A dashboard that drops to nothing because one API hiccuped
// is worse than one that is a day old and says so.
// ---------------------------------------------------------------------------

import type { UserRow, VaultSnapshotRow, YieldSnapshotRow } from '@/lib/dune/tables';
import type { ActivityV2Row, WalletChainRow, HoldingsSnapshotRow } from '@/lib/dune/activity-v2';

import { transactionActionType } from '@/lib/dune/transaction-log';

export const METRICS_SNAPSHOT_VERSION = 1;

/** Newest activity rows kept for the log table. Months of history at today's
 *  pace, and small enough to keep the whole snapshot one Redis value. */
export const ACTIVITY_LOG_LIMIT = 500;

/** 3.8 kept the 15 busiest routes. */
export const TOP_ROUTES_LIMIT = 15;

/**
 * Relayer gas thresholds, measured in doc 128 ("Thresholds: measured, not
 * guessed"): one inbound mint costs about 0.5 XLM, one Base mint well under
 * a millionth of an ETH. Below these a top-up is due.
 */
export const GAS_TOP_UP_BELOW: Record<string, number> = {
  GAS_STELLAR: 20,
  GAS_BASE: 0.002,
};

/** The fixed series order for chains, so a chain keeps its colour. */
export const CHAIN_ORDER = ['bitcoin', 'ethereum', 'solana', 'stellar'] as const;

/** The slice for the integrator fees that reached the fee wallets before the
 *  app recorded fees per swap (doc 124). */
export const PRE_RECORDING_FEES = 'lifi-pre-recording';

// ---------------------------------------------------------------------------
// Snapshot shape
// ---------------------------------------------------------------------------

/** One value per UTC day; `day` is YYYY-MM-DD. */
export type Point = { day: string; value: number };
export type Slice = { label: string; value: number };
/** Several series over one shared list of days (stacked charts need that). */
export type StackedDaily = { days: string[]; series: { name: string; data: number[] }[] };

export type RouteRow = { route: string; volumeUsd: number; swaps: number };
export type HoldingRow = { asset: string; balance: number; usd: number };

export type GasStatus = 'ok' | 'top-up' | 'ignore';
export interface GasFloatRow {
  asset: string;
  wallet: string;
  role: string;
  /** Where a top-up goes; read from the relayer env at sync time. */
  address: string | null;
  balance: number;
  usd: number;
  status: GasStatus;
  verdict: string;
}

export interface ActivityLogRow {
  date: string;
  wallet: string;
  action: string;
  chain: string;
  assetIn: string;
  assetOut: string;
  amount: number;
  amountUsd: number;
  feeUsd: number;
  txHash: string;
}

export type SectionKey =
  | 'users'
  | 'activity'
  | 'walletChains'
  | 'savingsTvl'
  | 'yield'
  | 'holdings';
export const SECTION_KEYS: SectionKey[] = [
  'users',
  'activity',
  'walletChains',
  'savingsTvl',
  'yield',
  'holdings',
];

export interface SectionState {
  /** When this section last refreshed successfully; null = never. */
  updatedAt: string | null;
  /** Why the latest run could not refresh it; null when it did. */
  error: string | null;
}

export interface MetricsSnapshot {
  version: typeof METRICS_SNAPSHOT_VERSION;
  generatedAt: string;
  sections: Record<SectionKey, SectionState>;
  users: { total: number; signupsByDay: Point[] };
  volume: { totalUsd: number; productMix: Slice[]; topRoutes: RouteRow[] };
  revenue: {
    totalUsd: number;
    byProduct: Slice[];
    dailyByProduct: StackedDaily;
    cumulative: Point[];
  };
  activeWallets: Point[];
  savings: { tvlUsd: number; tvlByDay: Point[]; yieldEarnedUsd: number };
  walletsByChain: StackedDaily;
  holdings: { byAsset: HoldingRow[]; gasFloat: GasFloatRow[]; feesInWalletsUsd: number };
  activityLog: { rows: ActivityLogRow[]; total: number };
  /** Kept between runs, never sent to the page. */
  internal: {
    /** Latest known interest per saver, so a saver who withdrew everything
     *  keeps counting toward "yield earned" after leaving the vault. */
    yieldByWallet: Record<string, number>;
  };
}

/** What the page receives: the snapshot without its internal bookkeeping. */
export type PublicMetricsSnapshot = Omit<MetricsSnapshot, 'internal'>;

export function toPublicSnapshot(snapshot: MetricsSnapshot | null): PublicMetricsSnapshot | null {
  if (!snapshot) return null;
  const copy: Partial<MetricsSnapshot> = { ...snapshot };
  delete copy.internal;
  return copy as PublicMetricsSnapshot;
}

export interface MetricsSources {
  users?: UserRow[];
  activity?: ActivityV2Row[];
  walletChains?: WalletChainRow[];
  vaultSnapshots?: VaultSnapshotRow[];
  yieldRows?: YieldSnapshotRow[];
  holdings?: HoldingsSnapshotRow[];
  relayerAddresses?: { evm?: string | null; stellar?: string | null };
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** UTC day of an ISO-ish timestamp, or null when it does not parse. */
export function dayOf(value: string): string | null {
  const time = Date.parse(value);
  if (Number.isNaN(time)) return null;
  return new Date(time).toISOString().slice(0, 10);
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Every day from `first` to `last` inclusive, as YYYY-MM-DD. */
export function daysBetween(first: string, last: string): string[] {
  const out: string[] = [];
  const end = Date.parse(`${last}T00:00:00Z`);
  for (let t = Date.parse(`${first}T00:00:00Z`); t <= end; t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

function sortedSlices(map: Map<string, number>): Slice[] {
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function add(map: Map<string, number>, key: string, value: number) {
  map.set(key, (map.get(key) ?? 0) + value);
}

const isCompleted = (row: ActivityV2Row) => row.status === 'completed';

// ---------------------------------------------------------------------------
// Builders, one per Dune query
// ---------------------------------------------------------------------------

/** Registered users counter + sign-ups per day (the pre-v2 queries). */
export function buildUsers(rows: UserRow[]): MetricsSnapshot['users'] {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    const day = dayOf(row.created_at);
    if (day) add(byDay, day, 1);
  }
  const signupsByDay = Array.from(byDay.entries())
    .map(([day, value]) => ({ day, value }))
    .sort((a, b) => a.day.localeCompare(b.day));
  return { total: rows.length, signupsByDay };
}

/** 3.1 total volume, 3.7 product mix, 3.8 top swap routes. Completed rows only. */
export function buildVolume(rows: ActivityV2Row[]): MetricsSnapshot['volume'] {
  const done = rows.filter(isCompleted);
  let totalUsd = 0;
  const byProduct = new Map<string, number>();
  const routes = new Map<string, RouteRow>();
  for (const row of done) {
    const usd = num(row.amount_usd);
    totalUsd += usd;
    add(byProduct, row.product, usd);
    if (row.action === 'swap') {
      const route = `${row.asset_in} → ${row.asset_out}`;
      const entry = routes.get(route) ?? { route, volumeUsd: 0, swaps: 0 };
      entry.volumeUsd += usd;
      entry.swaps += 1;
      routes.set(route, entry);
    }
  }
  return {
    totalUsd,
    productMix: sortedSlices(byProduct).filter((s) => s.value > 0),
    topRoutes: Array.from(routes.values())
      .sort((a, b) => b.volumeUsd - a.volumeUsd)
      .slice(0, TOP_ROUTES_LIMIT),
  };
}

/**
 * 3.2 total fees, 3.3 fees by product, 3.4 daily fees by product, 3.5
 * cumulative fees (doc 124's corrected versions).
 *
 * LI.FI and CCTP fees land in one shared on-chain pot, the fee wallets. Fees
 * recorded per swap only started partway through, so the pot can hold more
 * than the rows explain: the total takes the larger of the two for those
 * products, and the difference shows as its own slice. The daily and
 * cumulative charts can only show recorded fees, which is why the cumulative
 * line ends slightly below the total by exactly that slice.
 */
export function buildRevenue(
  rows: ActivityV2Row[],
  feesInWalletsUsd: number
): MetricsSnapshot['revenue'] {
  const done = rows.filter(isCompleted);

  const recorded = new Map<string, number>();
  for (const row of done) {
    const fee = num(row.fee_usd);
    if (fee > 0) add(recorded, row.product, fee);
  }
  const shared = (recorded.get('lifi') ?? 0) + (recorded.get('cctp') ?? 0);
  let other = 0;
  for (const [product, fees] of recorded) {
    if (product !== 'lifi' && product !== 'cctp') other += fees;
  }
  const totalUsd = other + Math.max(shared, feesInWalletsUsd);

  const slices = new Map(recorded);
  const preRecording = Math.max(0, feesInWalletsUsd - shared);
  if (preRecording > 0) slices.set(PRE_RECORDING_FEES, preRecording);

  // 3.4: fees per day per product, completed rows.
  const perDay = new Map<string, Map<string, number>>();
  const products = new Map<string, number>();
  for (const row of done) {
    const day = dayOf(row.date);
    if (!day) continue;
    const fee = num(row.fee_usd);
    const bucket = perDay.get(day) ?? new Map<string, number>();
    add(bucket, row.product, fee);
    perDay.set(day, bucket);
    add(products, row.product, fee);
  }
  const days = Array.from(perDay.keys()).sort();
  // A product that never earned a fee would only add an empty legend entry.
  const earning = sortedSlices(products)
    .filter((s) => s.value > 0)
    .map((s) => s.label);
  const dailyByProduct: StackedDaily = {
    days,
    series: earning.map((name) => ({
      name,
      data: days.map((day) => perDay.get(day)?.get(name) ?? 0),
    })),
  };

  // 3.5: running total of the daily recorded fees.
  let running = 0;
  const cumulative = days.map((day) => {
    let dayTotal = 0;
    for (const value of perDay.get(day)?.values() ?? []) dayTotal += value;
    running += dayTotal;
    return { day, value: running };
  });

  return {
    totalUsd,
    byProduct: sortedSlices(slices).filter((s) => s.value > 0),
    dailyByProduct,
    cumulative,
  };
}

/**
 * 3.9 daily active wallets: distinct wallets with a completed action that
 * day, across every product. Days without any activity are filled with zero
 * up to `today`; Dune joined only the active days, which drew a line over the
 * quiet ones.
 */
export function buildActiveWallets(rows: ActivityV2Row[], today: string): Point[] {
  const perDay = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!isCompleted(row) || !row.wallet_address) continue;
    const day = dayOf(row.date);
    if (!day) continue;
    const set = perDay.get(day) ?? new Set<string>();
    set.add(row.wallet_address);
    perDay.set(day, set);
  }
  if (perDay.size === 0) return [];
  const sorted = Array.from(perDay.keys()).sort();
  const last = sorted[sorted.length - 1] > today ? sorted[sorted.length - 1] : today;
  return daysBetween(sorted[0], last).map((day) => ({ day, value: perDay.get(day)?.size ?? 0 }));
}

/**
 * 3.10 wallets by chain, cumulative. Each chain's running total is carried
 * across every day (Dune only had points on the days a chain grew, which
 * broke the stacked area) and extended to `today`.
 */
export function buildWalletsByChain(rows: WalletChainRow[], today: string): StackedDaily {
  const added = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const day = dayOf(row.date);
    if (!day) continue;
    const bucket = added.get(day) ?? new Map<string, number>();
    add(bucket, row.chain, num(row.wallets_added));
    added.set(day, bucket);
  }
  if (added.size === 0) return { days: [], series: [] };
  const sorted = Array.from(added.keys()).sort();
  const last = sorted[sorted.length - 1] > today ? sorted[sorted.length - 1] : today;
  const days = daysBetween(sorted[0], last);
  const chains = CHAIN_ORDER.filter((chain) =>
    rows.some((row) => row.chain === chain && num(row.wallets_added) > 0)
  );
  return {
    days,
    series: chains.map((chain) => {
      let total = 0;
      return {
        name: chain,
        data: days.map((day) => {
          total += added.get(day)?.get(chain) ?? 0;
          return total;
        }),
      };
    }),
  };
}

/** Savings TVL over time and now (the pre-v2 vault snapshot queries). Last value per day. */
export function buildSavingsTvl(rows: VaultSnapshotRow[]): { tvlUsd: number; tvlByDay: Point[] } {
  const perDay = new Map<string, { at: number; value: number }>();
  for (const row of rows) {
    const day = dayOf(row.date);
    if (!day) continue;
    const at = Date.parse(row.date);
    const previous = perDay.get(day);
    if (!previous || at >= previous.at) perDay.set(day, { at, value: num(row.tvl_usd) });
  }
  const tvlByDay = Array.from(perDay.entries())
    .map(([day, { value }]) => ({ day, value }))
    .sort((a, b) => a.day.localeCompare(b.day));
  return { tvlUsd: tvlByDay.length ? tvlByDay[tvlByDay.length - 1].value : 0, tvlByDay };
}

/**
 * Yield earned by savers: each saver's latest known total interest, summed.
 * The ledger keeps savers who have since withdrawn everything (the DeFindex
 * read only returns open positions), so the total never shrinks when someone
 * leaves.
 */
export function buildYield(
  rows: YieldSnapshotRow[],
  previousLedger: Record<string, number>
): { yieldEarnedUsd: number; yieldByWallet: Record<string, number> } {
  const yieldByWallet: Record<string, number> = { ...previousLedger };
  for (const row of rows) {
    if (!row.wallet_address) continue;
    yieldByWallet[row.wallet_address] = num(row.total_interest_earned);
  }
  let yieldEarnedUsd = 0;
  for (const value of Object.values(yieldByWallet)) yieldEarnedUsd += num(value);
  return { yieldEarnedUsd, yieldByWallet };
}

const GAS_WALLETS: Record<string, { wallet: string; role: string; addressKey: 'evm' | 'stellar' }> =
  {
    GAS_BASE: { wallet: 'Base relayer (ETH)', role: 'Pays every mint', addressKey: 'evm' },
    GAS_STELLAR: {
      wallet: 'Stellar relayer (XLM)',
      role: 'Pays inbound mints',
      addressKey: 'stellar',
    },
    GAS_ETHEREUM: { wallet: 'Ethereum relayer (ETH)', role: 'Not used today', addressKey: 'evm' },
  };

/**
 * 3.13 holdings by asset now (user money only), 3.14 fees sitting in the fee
 * wallets, 3.15 relayer gas float with a top-up verdict. Treasury rows are
 * company money, so they never count as user holdings.
 */
export function buildHoldings(
  rows: HoldingsSnapshotRow[],
  addresses: MetricsSources['relayerAddresses'] = {}
): MetricsSnapshot['holdings'] {
  const byAsset = new Map<string, HoldingRow>();
  let feesInWalletsUsd = 0;
  const gasFloat: GasFloatRow[] = [];

  for (const row of rows) {
    if (row.chain === 'treasury') {
      if (row.asset === 'FEES') {
        feesInWalletsUsd += num(row.usd_total);
      } else if (row.asset.startsWith('GAS')) {
        const known = GAS_WALLETS[row.asset];
        const balance = num(row.balance_total);
        const threshold = GAS_TOP_UP_BELOW[row.asset];
        let status: GasStatus = 'ok';
        let verdict = 'OK';
        if (row.asset === 'GAS_ETHEREUM') {
          status = 'ignore';
          verdict = 'Ignore: the CCTP pivot is always Base';
        } else if (threshold !== undefined && balance < threshold) {
          status = 'top-up';
          verdict =
            row.asset === 'GAS_STELLAR'
              ? 'Top up: under ~40 mints left'
              : 'Top up: under ~2,500 mints left';
        }
        gasFloat.push({
          asset: row.asset,
          wallet: known?.wallet ?? row.asset,
          role: known?.role ?? '',
          address: (known && addresses?.[known.addressKey]) || null,
          balance,
          usd: num(row.usd_total),
          status,
          verdict,
        });
      }
      continue;
    }
    const entry = byAsset.get(row.asset) ?? { asset: row.asset, balance: 0, usd: 0 };
    entry.balance += num(row.balance_total);
    entry.usd += num(row.usd_total);
    byAsset.set(row.asset, entry);
  }

  return {
    byAsset: Array.from(byAsset.values()).sort((a, b) => b.usd - a.usd),
    gasFloat: gasFloat.sort((a, b) => b.usd - a.usd),
    feesInWalletsUsd,
  };
}

/** The "Full activity timeline": completed actions, newest first. */
export function buildActivityLog(rows: ActivityV2Row[]): MetricsSnapshot['activityLog'] {
  const done = rows
    .filter(isCompleted)
    .slice()
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  return {
    total: done.length,
    rows: done.slice(0, ACTIVITY_LOG_LIMIT).map((row) => ({
      date: row.date,
      wallet: row.wallet_address,
      action: transactionActionType(row),
      chain: row.chain,
      assetIn: row.asset_in,
      assetOut: row.asset_out,
      amount: num(row.amount_token),
      amountUsd: num(row.amount_usd),
      feeUsd: num(row.fee_usd),
      txHash: row.tx_hash ?? '',
    })),
  };
}

// ---------------------------------------------------------------------------
// The whole snapshot
// ---------------------------------------------------------------------------

function emptySnapshot(now: string): MetricsSnapshot {
  const section: SectionState = { updatedAt: null, error: null };
  return {
    version: METRICS_SNAPSHOT_VERSION,
    generatedAt: now,
    sections: {
      users: { ...section },
      activity: { ...section },
      walletChains: { ...section },
      savingsTvl: { ...section },
      yield: { ...section },
      holdings: { ...section },
    },
    users: { total: 0, signupsByDay: [] },
    volume: { totalUsd: 0, productMix: [], topRoutes: [] },
    revenue: {
      totalUsd: 0,
      byProduct: [],
      dailyByProduct: { days: [], series: [] },
      cumulative: [],
    },
    activeWallets: [],
    savings: { tvlUsd: 0, tvlByDay: [], yieldEarnedUsd: 0 },
    walletsByChain: { days: [], series: [] },
    holdings: { byAsset: [], gasFloat: [], feesInWalletsUsd: 0 },
    activityLog: { rows: [], total: 0 },
    internal: { yieldByWallet: {} },
  };
}

/**
 * Build this run's snapshot. A source left undefined (its fetch failed) keeps
 * the previous run's section and records `errors[section]`.
 */
export function buildMetricsSnapshot(
  sources: MetricsSources,
  errors: Partial<Record<SectionKey, string>>,
  previous: MetricsSnapshot | null,
  now: Date
): MetricsSnapshot {
  const at = now.toISOString();
  const today = at.slice(0, 10);
  const base = previous && previous.version === METRICS_SNAPSHOT_VERSION ? previous : null;
  // A deep copy, so building never mutates the snapshot it carries from.
  const next: MetricsSnapshot = base
    ? { ...(JSON.parse(JSON.stringify(base)) as MetricsSnapshot), generatedAt: at }
    : emptySnapshot(at);

  const mark = (key: SectionKey, fresh: boolean) => {
    next.sections[key] = fresh
      ? { updatedAt: at, error: null }
      : {
          updatedAt: base?.sections[key]?.updatedAt ?? null,
          error: errors[key] ?? 'Not refreshed in this run',
        };
  };

  if (sources.users) next.users = buildUsers(sources.users);
  mark('users', !!sources.users);

  // Holdings first: revenue needs the fee-wallet total.
  if (sources.holdings) next.holdings = buildHoldings(sources.holdings, sources.relayerAddresses);
  mark('holdings', !!sources.holdings);

  if (sources.activity) {
    next.volume = buildVolume(sources.activity);
    next.revenue = buildRevenue(sources.activity, next.holdings.feesInWalletsUsd);
    next.activeWallets = buildActiveWallets(sources.activity, today);
    next.activityLog = buildActivityLog(sources.activity);
  }
  mark('activity', !!sources.activity);

  if (sources.walletChains) next.walletsByChain = buildWalletsByChain(sources.walletChains, today);
  mark('walletChains', !!sources.walletChains);

  if (sources.vaultSnapshots) {
    const tvl = buildSavingsTvl(sources.vaultSnapshots);
    next.savings = { ...next.savings, tvlUsd: tvl.tvlUsd, tvlByDay: tvl.tvlByDay };
  }
  mark('savingsTvl', !!sources.vaultSnapshots);

  if (sources.yieldRows) {
    const result = buildYield(sources.yieldRows, next.internal.yieldByWallet);
    next.savings = { ...next.savings, yieldEarnedUsd: result.yieldEarnedUsd };
    next.internal = { ...next.internal, yieldByWallet: result.yieldByWallet };
  }
  mark('yield', !!sources.yieldRows);

  return next;
}

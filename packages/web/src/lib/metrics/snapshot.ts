// ---------------------------------------------------------------------------
// The numbers behind /dashboard (public) and /dashboard/team (team only),
// built from the same rows the daily sync used to upload to Dune
// (2026-11-13: Dune's free plan ended, so the numbers now live with us).
//
// The builders reproduce the Dune queries in
// docs/audit/119-dune-v2-setup-guide.html (numbers in the comments), but keep
// everything PER DAY so the page's period dropdown can cut any window
// (lib/metrics/periods.ts). Counts of distinct wallets cannot be added up
// across days, so those are counted here for every day, week, month and
// period window.
//
// Pure and jest-covered; fetching and saving live in server/metrics-sync.ts.
//
// Carry-forward rule: a source that failed this run keeps its previous
// section, with the time it was last refreshed and the error, rather than
// showing zeros. A dashboard that drops to nothing because one API hiccuped
// is worse than one that is a day old and says so.
// ---------------------------------------------------------------------------

import type { UserRow, VaultSnapshotRow, YieldSnapshotRow } from '@/lib/dune/tables';
import type { ActivityV2Row, WalletChainRow, HoldingsSnapshotRow } from '@/lib/dune/activity-v2';

import { transactionActionType } from '@/lib/dune/transaction-log';

import { countKinds, withAllStellarWallets } from './wallets';
import { PERIODS, bucketOf, bucketKeys, windowStart } from './periods';

import type { StellarWalletRecord } from './wallets';
import type { Point, PeriodKey, StackedDaily } from './periods';

export type { Point, StackedDaily } from './periods';

export const METRICS_SNAPSHOT_VERSION = 2;

/** Newest activity rows kept for the team page's log. Months of history at
 *  today's pace, and small enough to keep the snapshot one Redis value. */
export const ACTIVITY_LOG_LIMIT = 500;

/**
 * Relayer gas thresholds, measured in doc 128 ("Thresholds: measured, not
 * guessed"): an inbound mint costs about 0.5 XLM and a Base mint about
 * 0.0000008 ETH, so these leave roughly 40 and 2,500 mints. Below them a
 * top-up is due.
 */
export const GAS_TOP_UP_BELOW: Record<string, number> = {
  GAS_STELLAR: 20,
  GAS_BASE: 0.002,
};

/** The fixed series order for chains, so a chain keeps its place. */
export const CHAIN_ORDER = ['bitcoin', 'ethereum', 'solana', 'stellar'] as const;

/** The slice for the integrator fees that reached the fee wallets before the
 *  app recorded fees per swap (doc 124). */
export const PRE_RECORDING_FEES = 'lifi-pre-recording';

// ---------------------------------------------------------------------------
// Snapshot shape
// ---------------------------------------------------------------------------

export type Slice = { label: string; value: number };
export type HoldingRow = { asset: string; balance: number; usd: number };

/** Distinct wallets per day, week (Monday) and month (1st), each filled with
 *  zeros up to today, plus the count inside every period's window. */
export interface DistinctSeries {
  daily: Point[];
  weekly: Point[];
  monthly: Point[];
  window: Record<PeriodKey, number>;
}

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

export interface ActivitySection {
  /** Completed actions per day. */
  actionsByDay: Point[];
  activeWallets: DistinctSeries;
  /** USD per day, per product (3.6). */
  volumeByProduct: StackedDaily;
  /** USD per day, per chain the action started on. */
  volumeByChain: StackedDaily;
  /** USD per day, per swap route (3.8, cut to any window). */
  volumeByRoute: StackedDaily;
}

/**
 * What happened on Stellar, the numbers SDF asks for. An action counts when
 * it settles on Stellar: it started there (Soroswap, savings, sends,
 * MoneyGram, outbound bridges) or it is a CCTP bridge INTO Stellar, whose
 * mint lands there. Every CCTP route has Stellar on one side, so a CCTP row
 * that started elsewhere is inbound.
 */
export interface StellarSection {
  actionsByDay: Point[];
  volumeByDay: Point[];
  activeWallets: DistinctSeries;
  /** USD bridged into Stellar with CCTP, per day. */
  cctpInByDay: Point[];
  /** USD bridged out of Stellar with CCTP, per day. */
  cctpOutByDay: Point[];
  /** USD of MoneyGram cash deposits (in) and cash pick-ups (out), per day. */
  moneygramInByDay: Point[];
  moneygramOutByDay: Point[];
}

export interface MetricsSnapshot {
  version: typeof METRICS_SNAPSHOT_VERSION;
  generatedAt: string;
  sections: Record<SectionKey, SectionState>;
  users: { total: number; signupsByDay: Point[] };
  activity: ActivitySection;
  stellar: StellarSection;
  revenue: {
    /** All time, including the fee-wallet slice that predates recording (3.2). */
    totalUsd: number;
    /** All time, by product, with that slice (3.3). */
    byProduct: Slice[];
    /** Recorded fees per day per product (3.4). */
    dailyByProduct: StackedDaily;
    /** Running total of the recorded fees (3.5). */
    cumulative: Point[];
  };
  savings: {
    tvlUsd: number;
    tvlByDay: Point[];
    yieldEarnedUsd: number;
    /** The yield total as each daily sync saw it (history starts with this page). */
    yieldByDay: Point[];
  };
  /** Running total of addresses per chain, per day (3.10). Stellar counts
   *  every Stellar wallet (lib/metrics/wallets.ts), not only passkey ones. */
  walletsByChain: StackedDaily;
  /** How the Stellar wallets split; absent in snapshots saved before 2026-11-13. */
  stellarWallets?: { passkey: number; earlier: number };
  holdings: { byAsset: HoldingRow[]; feesInWalletsUsd: number };
  /** Team page only: never sent to the public page. */
  private: {
    gasFloat: GasFloatRow[];
    activityLog: { rows: ActivityLogRow[]; total: number };
  };
  /** Kept between runs, never sent to any page. */
  internal: {
    /** Latest known interest per saver, so a saver who withdrew everything
     *  keeps counting toward "yield earned" after leaving the vault. */
    yieldByWallet: Record<string, number>;
  };
}

/** What the public page receives. */
export type PublicMetricsSnapshot = Omit<MetricsSnapshot, 'private' | 'internal'>;
/** What the team page receives. */
export type TeamMetricsSnapshot = Omit<MetricsSnapshot, 'internal'>;

export function toPublicSnapshot(snapshot: MetricsSnapshot | null): PublicMetricsSnapshot | null {
  if (!snapshot) return null;
  const copy: Partial<MetricsSnapshot> = { ...snapshot };
  delete copy.private;
  delete copy.internal;
  return copy as PublicMetricsSnapshot;
}

export function toTeamSnapshot(snapshot: MetricsSnapshot | null): TeamMetricsSnapshot | null {
  if (!snapshot) return null;
  const copy: Partial<MetricsSnapshot> = { ...snapshot };
  delete copy.internal;
  return copy as TeamMetricsSnapshot;
}

export interface MetricsSources {
  users?: UserRow[];
  activity?: ActivityV2Row[];
  walletChains?: WalletChainRow[];
  /** Every Stellar wallet; replaces the passkey-only Stellar rows of walletChains. */
  stellarWallets?: StellarWalletRecord[];
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
  return bucketKeys(first, last, 'day');
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

/** True when the action settles on Stellar (see StellarSection). */
export function settlesOnStellar(row: ActivityV2Row): boolean {
  return row.chain === 'stellar' || (row.product === 'cctp' && row.chain !== 'stellar');
}

/** Sparse day -> value map as a sorted point list. */
function toPoints(map: Map<string, number>): Point[] {
  return Array.from(map.entries())
    .map(([day, value]) => ({ day, value }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

/** Day -> (name -> value) as one stacked series set; `order` ranks the names. */
function toStacked(
  perDay: Map<string, Map<string, number>>,
  order: (totals: Map<string, number>) => string[]
): StackedDaily {
  const days = Array.from(perDay.keys()).sort();
  const totals = new Map<string, number>();
  for (const bucket of perDay.values()) {
    for (const [name, value] of bucket) add(totals, name, value);
  }
  return {
    days,
    series: order(totals).map((name) => ({
      name,
      data: days.map((day) => perDay.get(day)?.get(name) ?? 0),
    })),
  };
}

function addTo(
  perDay: Map<string, Map<string, number>>,
  day: string,
  name: string,
  value: number
): void {
  const bucket = perDay.get(day) ?? new Map<string, number>();
  add(bucket, name, value);
  perDay.set(day, bucket);
}

const byTotal = (totals: Map<string, number>) =>
  sortedSlices(totals)
    .filter((s) => s.value > 0)
    .map((s) => s.label);

const byChainOrder = (totals: Map<string, number>) => {
  const known: string[] = CHAIN_ORDER.filter((chain) => (totals.get(chain) ?? 0) > 0);
  const others = Array.from(totals.keys())
    .filter((name) => !(CHAIN_ORDER as readonly string[]).includes(name))
    .filter((name) => (totals.get(name) ?? 0) > 0)
    .sort();
  return [...known, ...others];
};

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

/** Distinct wallets per day, week and month, and inside each period window. */
export function buildDistinct(
  entries: { day: string; wallet: string }[],
  today: string
): DistinctSeries {
  const window = Object.fromEntries(PERIODS.map((p) => [p.key, 0])) as Record<PeriodKey, number>;
  if (entries.length === 0) return { daily: [], weekly: [], monthly: [], window };

  const sets = {
    day: new Map<string, Set<string>>(),
    week: new Map<string, Set<string>>(),
    month: new Map<string, Set<string>>(),
  };
  let first = entries[0].day;
  for (const { day, wallet } of entries) {
    if (day < first) first = day;
    for (const bucket of ['day', 'week', 'month'] as const) {
      const key = bucketOf(day, bucket);
      const set = sets[bucket].get(key) ?? new Set<string>();
      set.add(wallet);
      sets[bucket].set(key, set);
    }
  }
  const last = entries.reduce((max, e) => (e.day > max ? e.day : max), today);
  const series = (bucket: 'day' | 'week' | 'month') =>
    bucketKeys(first, last, bucket).map((key) => ({
      day: key,
      value: sets[bucket].get(key)?.size ?? 0,
    }));

  for (const period of PERIODS) {
    const start = windowStart(period, today);
    const wallets = new Set<string>();
    for (const { day, wallet } of entries) if (start === null || day >= start) wallets.add(wallet);
    window[period.key] = wallets.size;
  }

  return { daily: series('day'), weekly: series('week'), monthly: series('month'), window };
}

/** Registered users counter + sign-ups per day (the pre-v2 queries). */
export function buildUsers(rows: UserRow[]): MetricsSnapshot['users'] {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    const day = dayOf(row.created_at);
    if (day) add(byDay, day, 1);
  }
  return { total: rows.length, signupsByDay: toPoints(byDay) };
}

/**
 * Everything the activity rows feed, per day: actions, volume by product
 * (3.1, 3.6, 3.7), by chain and by route (3.8), distinct active wallets
 * (3.9), and the Stellar-side numbers. Completed rows only.
 */
export function buildActivity(
  rows: ActivityV2Row[],
  today: string
): { activity: ActivitySection; stellar: StellarSection } {
  const actions = new Map<string, number>();
  const byProduct = new Map<string, Map<string, number>>();
  const byChain = new Map<string, Map<string, number>>();
  const byRoute = new Map<string, Map<string, number>>();
  const active: { day: string; wallet: string }[] = [];

  const stellarActions = new Map<string, number>();
  const stellarVolume = new Map<string, number>();
  const stellarActive: { day: string; wallet: string }[] = [];
  const cctpIn = new Map<string, number>();
  const cctpOut = new Map<string, number>();
  const mgiIn = new Map<string, number>();
  const mgiOut = new Map<string, number>();

  for (const row of rows) {
    if (!isCompleted(row)) continue;
    const day = dayOf(row.date);
    if (!day) continue;
    const usd = num(row.amount_usd);

    add(actions, day, 1);
    addTo(byProduct, day, row.product, usd);
    addTo(byChain, day, row.chain || 'unknown', usd);
    if (row.action === 'swap') addTo(byRoute, day, `${row.asset_in} → ${row.asset_out}`, usd);
    if (row.wallet_address) active.push({ day, wallet: row.wallet_address });

    if (settlesOnStellar(row)) {
      add(stellarActions, day, 1);
      add(stellarVolume, day, usd);
      if (row.wallet_address) stellarActive.push({ day, wallet: row.wallet_address });
    }
    if (row.product === 'cctp') add(row.chain === 'stellar' ? cctpOut : cctpIn, day, usd);
    if (row.product === 'ramp' && row.provider === 'moneygram') {
      add(row.action === 'offramp' ? mgiOut : mgiIn, day, usd);
    }
  }

  return {
    activity: {
      actionsByDay: toPoints(actions),
      activeWallets: buildDistinct(active, today),
      volumeByProduct: toStacked(byProduct, byTotal),
      volumeByChain: toStacked(byChain, byChainOrder),
      volumeByRoute: toStacked(byRoute, byTotal),
    },
    stellar: {
      actionsByDay: toPoints(stellarActions),
      volumeByDay: toPoints(stellarVolume),
      activeWallets: buildDistinct(stellarActive, today),
      cctpInByDay: toPoints(cctpIn),
      cctpOutByDay: toPoints(cctpOut),
      moneygramInByDay: toPoints(mgiIn),
      moneygramOutByDay: toPoints(mgiOut),
    },
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
  for (const row of done) {
    const day = dayOf(row.date);
    if (day) addTo(perDay, day, row.product, num(row.fee_usd));
  }
  // A product that never earned a fee would only add an empty legend entry.
  const dailyByProduct = toStacked(perDay, byTotal);

  // 3.5: running total of the daily recorded fees.
  let running = 0;
  const cumulative = dailyByProduct.days.map((day) => {
    for (const value of perDay.get(day)?.values() ?? []) running += value;
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
 * 3.10 wallets by chain: each chain's running total of addresses, carried
 * across every day up to `today`.
 */
export function buildWalletsByChain(rows: WalletChainRow[], today: string): StackedDaily {
  const added = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const day = dayOf(row.date);
    if (day) addTo(added, day, row.chain, num(row.wallets_added));
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
): { byAsset: HoldingRow[]; gasFloat: GasFloatRow[]; feesInWalletsUsd: number } {
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
export function buildActivityLog(rows: ActivityV2Row[]): MetricsSnapshot['private']['activityLog'] {
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

function emptyDistinct(): DistinctSeries {
  return buildDistinct([], '1970-01-01');
}

function emptySnapshot(now: string): MetricsSnapshot {
  const section = (): SectionState => ({ updatedAt: null, error: null });
  const stacked = (): StackedDaily => ({ days: [], series: [] });
  return {
    version: METRICS_SNAPSHOT_VERSION,
    generatedAt: now,
    sections: {
      users: section(),
      activity: section(),
      walletChains: section(),
      savingsTvl: section(),
      yield: section(),
      holdings: section(),
    },
    users: { total: 0, signupsByDay: [] },
    activity: {
      actionsByDay: [],
      activeWallets: emptyDistinct(),
      volumeByProduct: stacked(),
      volumeByChain: stacked(),
      volumeByRoute: stacked(),
    },
    stellar: {
      actionsByDay: [],
      volumeByDay: [],
      activeWallets: emptyDistinct(),
      cctpInByDay: [],
      cctpOutByDay: [],
      moneygramInByDay: [],
      moneygramOutByDay: [],
    },
    revenue: { totalUsd: 0, byProduct: [], dailyByProduct: stacked(), cumulative: [] },
    savings: { tvlUsd: 0, tvlByDay: [], yieldEarnedUsd: 0, yieldByDay: [] },
    walletsByChain: stacked(),
    holdings: { byAsset: [], feesInWalletsUsd: 0 },
    private: { gasFloat: [], activityLog: { rows: [], total: 0 } },
    internal: { yieldByWallet: {} },
  };
}

/**
 * Build this run's snapshot. A source left undefined (its fetch failed) keeps
 * the previous run's section and records `errors[section]`. `ledgerSeed`
 * carries the yield ledger over from an older snapshot format.
 */
export function buildMetricsSnapshot(
  sources: MetricsSources,
  errors: Partial<Record<SectionKey, string>>,
  previous: MetricsSnapshot | null,
  now: Date,
  ledgerSeed: Record<string, number> = {}
): MetricsSnapshot {
  const at = now.toISOString();
  const today = at.slice(0, 10);
  const base = previous && previous.version === METRICS_SNAPSHOT_VERSION ? previous : null;
  // A deep copy, so building never mutates the snapshot it carries from.
  const next: MetricsSnapshot = base
    ? { ...(JSON.parse(JSON.stringify(base)) as MetricsSnapshot), generatedAt: at }
    : { ...emptySnapshot(at), internal: { yieldByWallet: { ...ledgerSeed } } };

  // A fresh section can still carry a note (refreshed, but partly: e.g. some
  // savers could not be read); a stale one keeps its last refresh time.
  const mark = (key: SectionKey, fresh: boolean) => {
    next.sections[key] = fresh
      ? { updatedAt: at, error: errors[key] ?? null }
      : {
          updatedAt: base?.sections[key]?.updatedAt ?? null,
          error: errors[key] ?? 'Not refreshed in this run',
        };
  };

  if (sources.users) next.users = buildUsers(sources.users);
  mark('users', !!sources.users);

  // Holdings first: revenue needs the fee-wallet total.
  if (sources.holdings) {
    const holdings = buildHoldings(sources.holdings, sources.relayerAddresses);
    next.holdings = { byAsset: holdings.byAsset, feesInWalletsUsd: holdings.feesInWalletsUsd };
    next.private = { ...next.private, gasFloat: holdings.gasFloat };
  }
  mark('holdings', !!sources.holdings);

  if (sources.activity) {
    const built = buildActivity(sources.activity, today);
    next.activity = built.activity;
    next.stellar = built.stellar;
    next.revenue = buildRevenue(sources.activity, next.holdings.feesInWalletsUsd);
    next.private = { ...next.private, activityLog: buildActivityLog(sources.activity) };
  }
  mark('activity', !!sources.activity);

  if (sources.walletChains) {
    const network = sources.walletChains[0]?.network ?? 'mainnet';
    const rows = sources.stellarWallets
      ? withAllStellarWallets(sources.walletChains, sources.stellarWallets, network)
      : sources.walletChains;
    next.walletsByChain = buildWalletsByChain(rows, today);
    if (sources.stellarWallets) next.stellarWallets = countKinds(sources.stellarWallets);
  }
  mark('walletChains', !!sources.walletChains);

  if (sources.vaultSnapshots) {
    const tvl = buildSavingsTvl(sources.vaultSnapshots);
    next.savings = { ...next.savings, tvlUsd: tvl.tvlUsd, tvlByDay: tvl.tvlByDay };
  }
  mark('savingsTvl', !!sources.vaultSnapshots);

  if (sources.yieldRows) {
    const result = buildYield(sources.yieldRows, next.internal.yieldByWallet);
    const history = next.savings.yieldByDay.filter((p) => p.day !== today);
    history.push({ day: today, value: result.yieldEarnedUsd });
    next.savings = { ...next.savings, yieldEarnedUsd: result.yieldEarnedUsd, yieldByDay: history };
    next.internal = { ...next.internal, yieldByWallet: result.yieldByWallet };
  }
  mark('yield', !!sources.yieldRows);

  return next;
}

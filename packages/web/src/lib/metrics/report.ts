// ---------------------------------------------------------------------------
// The monthly report on /dashboard/team: one row per calendar month (UTC),
// for SDF and investor updates, downloadable as CSV. Derived from the same
// snapshot the charts read, so a report never disagrees with the page.
// ---------------------------------------------------------------------------

import { bucketKeys } from './periods';

import type { Point, StackedDaily } from './periods';
import type { PublicMetricsSnapshot } from './snapshot';

export interface MonthlyRow {
  /** YYYY-MM */
  month: string;
  newUsers: number;
  activeWallets: number;
  actions: number;
  volumeUsd: number;
  revenueUsd: number;
  /** Savings TVL at the month's last reading (today for the current month). */
  savingsEndUsd: number;
  newWallets: number;
  stellarActiveWallets: number;
  stellarActions: number;
  stellarVolumeUsd: number;
  newStellarWallets: number;
  cctpIntoStellarUsd: number;
  cctpOutOfStellarUsd: number;
  moneygramUsd: number;
}

export const MONTHLY_COLUMNS: { key: keyof MonthlyRow; label: string; money?: boolean }[] = [
  { key: 'month', label: 'Month' },
  { key: 'newUsers', label: 'New users' },
  { key: 'activeWallets', label: 'Active wallets' },
  { key: 'actions', label: 'Completed actions' },
  { key: 'volumeUsd', label: 'Volume (USD)', money: true },
  { key: 'revenueUsd', label: 'Revenue recorded (USD)', money: true },
  { key: 'savingsEndUsd', label: 'In savings at month end (USD)', money: true },
  { key: 'newWallets', label: 'New wallet addresses' },
  { key: 'stellarActiveWallets', label: 'Active on Stellar' },
  { key: 'stellarActions', label: 'Actions on Stellar' },
  { key: 'stellarVolumeUsd', label: 'Volume on Stellar (USD)', money: true },
  { key: 'newStellarWallets', label: 'New Stellar wallets' },
  { key: 'cctpIntoStellarUsd', label: 'Bridged into Stellar via CCTP (USD)', money: true },
  { key: 'cctpOutOfStellarUsd', label: 'Bridged out of Stellar via CCTP (USD)', money: true },
  { key: 'moneygramUsd', label: 'MoneyGram cash in and out (USD)', money: true },
];

const monthOf = (day: string) => day.slice(0, 7);

function sumByMonth(points: Point[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const p of points) out.set(monthOf(p.day), (out.get(monthOf(p.day)) ?? 0) + p.value);
  return out;
}

function flatten(data: StackedDaily): Point[] {
  return data.days.map((day, i) => ({
    day,
    value: data.series.reduce((sum, s) => sum + (s.data[i] ?? 0), 0),
  }));
}

/** The level at each month's last reading, carried into months without one. */
function lastByMonth(points: Point[], months: string[]): Map<string, number> {
  const sorted = points.slice().sort((a, b) => a.day.localeCompare(b.day));
  const out = new Map<string, number>();
  let carry = 0;
  let i = 0;
  for (const month of months) {
    while (i < sorted.length && monthOf(sorted[i].day) <= month) {
      carry = sorted[i].value;
      i += 1;
    }
    out.set(month, carry);
  }
  return out;
}

/** Month-on-month growth of a running total. */
function addedByMonth(points: Point[], months: string[]): Map<string, number> {
  const ends = lastByMonth(points, months);
  const out = new Map<string, number>();
  let previous = 0;
  for (const month of months) {
    const end = ends.get(month) ?? previous;
    out.set(month, end - previous);
    previous = end;
  }
  return out;
}

export function buildMonthlyReport(snapshot: PublicMetricsSnapshot, today: string): MonthlyRow[] {
  const { users, activity, stellar, revenue, savings, walletsByChain } = snapshot;

  const firsts = [
    users.signupsByDay[0]?.day,
    activity.actionsByDay[0]?.day,
    savings.tvlByDay.find((p) => p.value > 0)?.day,
    walletsByChain.days[0],
  ].filter((d): d is string => !!d);
  if (firsts.length === 0) return [];
  const first = firsts.sort()[0];
  const months = bucketKeys(first, today, 'month').map(monthOf);

  const newUsers = sumByMonth(users.signupsByDay);
  const actions = sumByMonth(activity.actionsByDay);
  const volume = sumByMonth(flatten(activity.volumeByProduct));
  const fees = sumByMonth(flatten(revenue.dailyByProduct));
  const savingsEnd = lastByMonth(savings.tvlByDay, months);
  const walletTotals = flatten(walletsByChain);
  const stellarSeries = walletsByChain.series.find((s) => s.name === 'stellar');
  const stellarTotals = stellarSeries
    ? walletsByChain.days.map((day, i) => ({ day, value: stellarSeries.data[i] ?? 0 }))
    : [];
  const newWallets = addedByMonth(walletTotals, months);
  const newStellarWallets = addedByMonth(stellarTotals, months);
  const activeMonthly = new Map(
    activity.activeWallets.monthly.map((p) => [monthOf(p.day), p.value])
  );
  const stellarActiveMonthly = new Map(
    stellar.activeWallets.monthly.map((p) => [monthOf(p.day), p.value])
  );
  const stellarActions = sumByMonth(stellar.actionsByDay);
  const stellarVolume = sumByMonth(stellar.volumeByDay);
  const cctpIn = sumByMonth(stellar.cctpInByDay);
  const cctpOut = sumByMonth(stellar.cctpOutByDay);
  const mgi = sumByMonth([...stellar.moneygramInByDay, ...stellar.moneygramOutByDay]);

  return months.map((month) => ({
    month,
    newUsers: newUsers.get(month) ?? 0,
    activeWallets: activeMonthly.get(month) ?? 0,
    actions: actions.get(month) ?? 0,
    volumeUsd: volume.get(month) ?? 0,
    revenueUsd: fees.get(month) ?? 0,
    savingsEndUsd: savingsEnd.get(month) ?? 0,
    newWallets: newWallets.get(month) ?? 0,
    stellarActiveWallets: stellarActiveMonthly.get(month) ?? 0,
    stellarActions: stellarActions.get(month) ?? 0,
    stellarVolumeUsd: stellarVolume.get(month) ?? 0,
    newStellarWallets: newStellarWallets.get(month) ?? 0,
    cctpIntoStellarUsd: cctpIn.get(month) ?? 0,
    cctpOutOfStellarUsd: cctpOut.get(month) ?? 0,
    moneygramUsd: mgi.get(month) ?? 0,
  }));
}

/** RFC 4180 CSV: quotes any cell holding a comma, quote or line break. */
export function toCsv(header: string[], rows: (string | number)[][]): string {
  const cell = (value: string | number) => {
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
}

export function monthlyReportCsv(rows: MonthlyRow[]): string {
  return toCsv(
    MONTHLY_COLUMNS.map((c) => c.label),
    rows.map((row) =>
      MONTHLY_COLUMNS.map((c) => {
        const value = row[c.key];
        return c.money && typeof value === 'number' ? value.toFixed(2) : value;
      })
    )
  );
}

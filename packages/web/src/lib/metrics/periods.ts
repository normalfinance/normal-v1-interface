// ---------------------------------------------------------------------------
// The period dropdown on /dashboard: which days a period covers and how its
// days are grouped into bars. Pure and shared by the sync (window counts) and
// the page (charts and tiles), so both always cut the same slice.
//
// Long periods are grouped into weeks or months: a year of daily bars is
// several hundred hairlines nobody can read (Niko, 2026-11-13: "we can
// barely see the days").
// ---------------------------------------------------------------------------

/** One value per UTC day (or per bucket start); `day` is YYYY-MM-DD. */
export type Point = { day: string; value: number };
/** Several series over one shared list of days (stacked charts need that). */
export type StackedDaily = { days: string[]; series: { name: string; data: number[] }[] };

export type PeriodKey = '7d' | '30d' | '90d' | '12m' | 'all';
export type Bucket = 'day' | 'week' | 'month';

export interface Period {
  key: PeriodKey;
  label: string;
  /** Days in the window, today included; null = since the first data. */
  days: number | null;
  bucket: Bucket;
}

export const PERIODS: Period[] = [
  { key: '7d', label: 'Last 7 days', days: 7, bucket: 'day' },
  { key: '30d', label: 'Last 30 days', days: 30, bucket: 'day' },
  { key: '90d', label: 'Last 90 days', days: 90, bucket: 'week' },
  { key: '12m', label: 'Last 12 months', days: 365, bucket: 'month' },
  { key: 'all', label: 'All time', days: null, bucket: 'month' },
];

export const DEFAULT_PERIOD: PeriodKey = '30d';

export function periodOf(key: string | null | undefined): Period {
  return PERIODS.find((p) => p.key === key) ?? PERIODS.find((p) => p.key === DEFAULT_PERIOD)!;
}

const DAY_MS = 86_400_000;
const toTime = (day: string) => Date.parse(`${day}T00:00:00Z`);
const toDay = (time: number) => new Date(time).toISOString().slice(0, 10);

export function addDays(day: string, n: number): string {
  return toDay(toTime(day) + n * DAY_MS);
}

/** First day inside the period's window, or null for "all time". */
export function windowStart(period: Period, today: string): string | null {
  return period.days === null ? null : addDays(today, -(period.days - 1));
}

/** The bucket a day falls in: the day itself, its week's Monday, or its month's 1st. */
export function bucketOf(day: string, bucket: Bucket): string {
  if (bucket === 'day') return day;
  if (bucket === 'month') return `${day.slice(0, 7)}-01`;
  const weekday = new Date(toTime(day)).getUTCDay(); // 0 = Sunday
  return addDays(day, -((weekday + 6) % 7));
}

/** Every bucket start from the one holding `first` to the one holding `last`. */
export function bucketKeys(first: string, last: string, bucket: Bucket): string[] {
  const out: string[] = [];
  let key = bucketOf(first, bucket);
  const end = bucketOf(last, bucket);
  while (key <= end) {
    out.push(key);
    if (bucket === 'day') key = addDays(key, 1);
    else if (bucket === 'week') key = addDays(key, 7);
    else {
      const [y, m] = key.split('-').map(Number);
      key = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    }
  }
  return out;
}

function firstDay(points: Point[]): string | null {
  let first: string | null = null;
  for (const p of points) if (first === null || p.day < first) first = p.day;
  return first;
}

/** Sum of the values from `start` (inclusive) on; everything when start is null. */
export function sumSince(points: Point[], start: string | null): number {
  let total = 0;
  for (const p of points) if (start === null || p.day >= start) total += p.value;
  return total;
}

/** The last value recorded on or before `day`, or null when there is none. */
export function lastOnOrBefore(points: Point[], day: string): number | null {
  let best: Point | null = null;
  for (const p of points) if (p.day <= day && (!best || p.day > best.day)) best = p;
  return best ? best.value : null;
}

/**
 * Group a daily series into the period's buckets.
 *  - 'sum' for flows (sign-ups, volume, fees): each bucket adds its days;
 *    empty buckets show 0.
 *  - 'last' for levels (TVL, running totals): each bucket shows the latest
 *    value up to its end, carried over buckets without a reading.
 */
export function aggregate(
  points: Point[],
  period: Period,
  today: string,
  mode: 'sum' | 'last'
): Point[] {
  const start = windowStart(period, today) ?? firstDay(points);
  if (!start || start > today) return [];
  const keys = bucketKeys(start, today, period.bucket);

  if (mode === 'sum') {
    const sums = new Map<string, number>();
    for (const p of points) {
      if (p.day < start || p.day > today) continue;
      const key = bucketOf(p.day, period.bucket);
      sums.set(key, (sums.get(key) ?? 0) + p.value);
    }
    return keys.map((key) => ({ day: key, value: sums.get(key) ?? 0 }));
  }

  const latest = new Map<string, Point>();
  for (const p of points) {
    if (p.day < start || p.day > today) continue;
    const key = bucketOf(p.day, period.bucket);
    const held = latest.get(key);
    if (!held || p.day >= held.day) latest.set(key, p);
  }
  let carry = lastOnOrBefore(points, addDays(start, -1)) ?? 0;
  return keys.map((key) => {
    const value = latest.get(key)?.value ?? carry;
    carry = value;
    return { day: key, value };
  });
}

/** `aggregate` for every series of a stacked chart, on one shared set of buckets. */
export function aggregateStacked(
  data: StackedDaily,
  period: Period,
  today: string,
  mode: 'sum' | 'last'
): StackedDaily {
  const series = data.series.map((s) => ({
    name: s.name,
    points: aggregate(
      data.days.map((day, i) => ({ day, value: s.data[i] ?? 0 })),
      period,
      today,
      mode
    ),
  }));
  // The same first day for every series (they share data.days), so the
  // bucket lists line up; take the longest to be safe.
  const days = series.reduce<string[]>(
    (longest, s) => (s.points.length > longest.length ? s.points.map((p) => p.day) : longest),
    []
  );
  return {
    days,
    series: series
      .map((s) => {
        const byDay = new Map(s.points.map((p) => [p.day, p.value]));
        return { name: s.name, data: days.map((day) => byDay.get(day) ?? 0) };
      })
      .filter((s) => s.data.some((v) => v !== 0)),
  };
}

/** Totals per series over the window, largest first (donuts, rankings). */
export function stackedTotals(
  data: StackedDaily,
  start: string | null
): { label: string; value: number }[] {
  return data.series
    .map((s) => ({
      label: s.name,
      value: data.days.reduce(
        (sum, day, i) => (start === null || day >= start ? sum + (s.data[i] ?? 0) : sum),
        0
      ),
    }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
}

/** "per day" / "per week" / "per month", for chart subtitles. */
export function bucketPhrase(bucket: Bucket): string {
  return bucket === 'day' ? 'per day' : bucket === 'week' ? 'per week' : 'per month';
}

import { CRYPTO_INDEX } from './basket';

import type { IndexDef } from './basket';

// ---------------------------------------------------------------------------
// Every index Normal offers, in the order the Indexes page shows them. One
// today; the page and the routes are built for many (Niko 2026-11-09). An
// index's `id` is stored on its purchases (quoteJson.index), so it never
// changes; its `slug` is its address in the app, /app/indexes/<slug>.
// ---------------------------------------------------------------------------

export interface IndexMeta {
  id: string;
  slug: string;
  /** Its name in the app: "Top 3". */
  name: string;
  /** One line under the name: what it is, for people who don't know crypto. */
  tagline: string;
  def: IndexDef;
}

export const TOP_3: IndexMeta = {
  id: CRYPTO_INDEX.id,
  slug: 'top-3',
  name: 'Top 3',
  tagline: 'Bitcoin, Ethereum and Solana, the three largest coins, in one purchase.',
  def: CRYPTO_INDEX,
};

export const INDEXES: IndexMeta[] = [TOP_3];

export const indexBySlug = (slug: string) => INDEXES.find((i) => i.slug === slug) ?? null;
export const indexById = (id: string | null | undefined) =>
  INDEXES.find((i) => i.id === id) ?? null;

// ---------------------------------------------------------------------------
// How an index moves. It is weighted by market size, so it moves exactly as
// its coins' combined market size does: today's coin counts (market cap over
// price) at each moment's prices. Every line and figure below is that sum,
// which also means the weights drift with prices between purchases, as a
// market-cap index's do.
// ---------------------------------------------------------------------------

/** What the index reads of a coin's market (AssetMarket satisfies it). */
export interface IndexCoinMarket {
  price: number;
  marketCap: number | null;
  change24h: number | null;
  /** Hourly prices over the last 24 hours, oldest first, ending on `price`. */
  sparkline24h: number[];
}

/** Coins in circulation today: market cap over price. Null when unknown. */
const supplyOf = (m: IndexCoinMarket | undefined) =>
  m && m.price > 0 && typeof m.marketCap === 'number' && m.marketCap > 0
    ? m.marketCap / m.price
    : null;

/**
 * How the index moved today, in percent: the coins' combined market size now
 * against 24 hours ago (each coin's size then is its size now, undone by its
 * change). Null when a coin's size or change is unknown (never a guess).
 */
export function basketChange(
  def: IndexDef,
  marketOf: (symbol: string) => IndexCoinMarket | undefined
): number | null {
  let now = 0;
  let before = 0;
  for (const symbol of def.coins) {
    const m = marketOf(symbol);
    const c = m?.change24h;
    if (!supplyOf(m) || c == null || !Number.isFinite(c) || c <= -100) return null;
    now += m!.marketCap!;
    before += m!.marketCap! / (1 + c / 100);
  }
  return (now / before - 1) * 100;
}

/**
 * The index's last day as one line, from 100 at the start: the coins'
 * combined market size hour by hour. Each coin's hourly prices are taken from
 * the end, so series of slightly different lengths line up on "now". Empty
 * when a coin has no line or no market size.
 */
export function basketSeries(
  def: IndexDef,
  marketOf: (symbol: string) => IndexCoinMarket | undefined
): number[] {
  const coins = def.coins.map((symbol) => marketOf(symbol));
  const supplies = coins.map(supplyOf);
  if (supplies.some((s) => s === null)) return [];
  const lines = coins.map((m) => m!.sparkline24h);
  const length = Math.min(...lines.map((l) => l.length));
  if (!Number.isFinite(length) || length < 2) return [];
  const aligned = lines.map((l) => l.slice(l.length - length));
  const sizes = Array.from({ length }, (_, i) =>
    aligned.reduce((sum, line, j) => sum + supplies[j]! * line[i], 0)
  );
  if (!(sizes[0] > 0)) return [];
  return sizes.map((v) => (v / sizes[0]) * 100);
}

/**
 * The index over a chosen range as one line of [time, value] from 100 at the
 * range's start: the coins' combined market size at each moment. Each coin is
 * read on the first coin's moments, at its latest price at or before each
 * one, so series sampled at slightly different times line up; the line starts
 * once every coin has a price. Empty when a coin has no line or no market size.
 */
export function basketHistory(
  def: IndexDef,
  marketOf: (symbol: string) => IndexCoinMarket | undefined,
  historyOf: (symbol: string) => [number, number][] | undefined
): [number, number][] {
  const supplies = def.coins.map((symbol) => supplyOf(marketOf(symbol)));
  if (supplies.some((s) => s === null)) return [];
  const lines = def.coins.map((symbol) => historyOf(symbol) ?? []);
  if (lines.some((l) => l.length < 2)) return [];
  const at = lines.map(() => 0);
  const sizes: [number, number][] = [];
  for (const [ts] of lines[0]) {
    let size = 0;
    let priced = true;
    for (let j = 0; j < lines.length && priced; j += 1) {
      const line = lines[j];
      while (at[j] + 1 < line.length && line[at[j] + 1][0] <= ts) at[j] += 1;
      priced = line[at[j]][0] <= ts;
      size += supplies[j]! * line[at[j]][1];
    }
    if (priced) sizes.push([ts, size]);
  }
  if (sizes.length < 2 || !(sizes[0][1] > 0)) return [];
  const start = sizes[0][1];
  return sizes.map(([ts, v]) => [ts, (v / start) * 100]);
}

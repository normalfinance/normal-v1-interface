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

/**
 * How the basket moved today: each coin's 24-hour change, weighted by its
 * share. Null when a coin's change is unknown (never a guess).
 */
export function basketChange(
  def: IndexDef,
  changeOf: (symbol: string) => number | null | undefined
): number | null {
  let total = 0;
  for (const leg of def.legs) {
    const c = changeOf(leg.symbol);
    if (c == null || !Number.isFinite(c)) return null;
    total += (c * leg.weightBps) / 10_000;
  }
  return total;
}

/**
 * The basket's last day as one line: $100 split by weight at the start and
 * held, hour by hour. Each coin's hourly prices are taken from the end, so
 * series of slightly different lengths line up on "now". Empty when a coin
 * has no line.
 */
export function basketSeries(
  def: IndexDef,
  seriesOf: (symbol: string) => number[] | undefined
): number[] {
  const lines = def.legs.map((leg) => seriesOf(leg.symbol) ?? []);
  const length = Math.min(...lines.map((l) => l.length));
  if (!Number.isFinite(length) || length < 2) return [];
  const aligned = lines.map((l) => l.slice(l.length - length));
  if (aligned.some((l) => !(l[0] > 0))) return [];
  return Array.from({ length }, (_, i) =>
    def.legs.reduce(
      (sum, leg, j) => sum + (leg.weightBps / 100) * (aligned[j][i] / aligned[j][0]),
      0
    )
  );
}

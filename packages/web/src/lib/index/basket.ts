// ---------------------------------------------------------------------------
// The crypto index (2026-11-09): one purchase of Bitcoin, Ethereum and Solana
// from digital dollars, with ONE passkey signature.
//
// How the money moves (see docs in the report and server/index-legs.ts):
//   1. the person signs ONE Stellar transaction: Circle takes the whole amount
//      from their Stellar wallet (one CCTP transfer, direction
//      'stellar_to_index'),
//   2. Circle releases it to their OWN Base address (the cron mints it),
//   3. Autopilot, under the Turnkey policy the person already granted (Base
//      only; USDC, Circle and LI.FI contracts; no ETH value), makes one LI.FI
//      swap per coin, each delivering to the person's own address on that
//      coin's chain.
//
// Weighted by market size (Niko 2026-11-10: "it should look at market caps of
// assets and give percentage to each"): each coin's share is its share of the
// coins' combined market cap, as a market-cap index is. The page shows the
// shares from the same market data the server splits by (api/prices/markets),
// and a purchase carries the shares the person reviewed (weightsWithin).
//
// This file is pure: the shares, the exact split of an amount, and the
// minimum that keeps every slice above the bridges' fixed costs. Every amount
// is integer USDC wire units (6 decimals), never a float.
// ---------------------------------------------------------------------------

export type IndexCoin = 'BTC' | 'ETH' | 'SOL' | 'XLM';

/**
 * How an index turns market sizes into shares: in proportion to each coin's
 * market cap, or (doc 129, Niko 2026-11-19) to its square root, which still
 * follows market size but leaves smaller coins a visible share.
 */
export type IndexWeighting = 'market-cap' | 'sqrt-market-cap';

export interface IndexDef {
  id: string;
  /** The coins it holds. Their shares follow their market sizes (marketWeights). */
  coins: IndexCoin[];
  weighting: IndexWeighting;
}

/** One coin's share of a purchase, in basis points. */
export interface IndexWeight {
  symbol: IndexCoin;
  weightBps: number;
}

/**
 * The first index (2026-11-09 to 2026-11-19): Bitcoin, Ethereum and Solana by
 * market cap. No longer offered; kept so its purchases read as they were.
 */
export const CRYPTO_INDEX: IndexDef = {
  id: 'crypto-3',
  coins: ['BTC', 'ETH', 'SOL'],
  weighting: 'market-cap',
};

/**
 * Core 4 (doc 129, Niko 2026-11-19): Bitcoin, Ethereum, Solana and Stellar,
 * each by the square root of its market cap.
 */
export const CORE_INDEX: IndexDef = {
  id: 'core-4',
  coins: ['BTC', 'ETH', 'SOL', 'XLM'],
  weighting: 'sqrt-market-cap',
};

/**
 * Coins bought on Stellar itself (a Soroswap swap from the purchase's USDC):
 * their slice never crosses a bridge. Every other coin is bought on Base after
 * Circle's transfer (server/index-legs.ts).
 */
export const STELLAR_COINS: IndexCoin[] = ['XLM'];
export const isStellarCoin = (symbol: string) => (STELLAR_COINS as string[]).includes(symbol);

const BPS = 10_000n;
const WIRE_PER_USD = 1_000_000n;

/**
 * Each slice pays a bridge's fixed costs; below this they eat the slice. The
 * same reasoning as the $10 minimum on a single Circle swap.
 */
export const INDEX_MIN_SLICE_USD = 10;

/** A slice bought on Stellar crosses no bridge: only dust is refused. */
export const INDEX_MIN_STELLAR_SLICE_USD = 1;

/** Normal's fee on a coin of an index purchase, the same 0.5% as a swap. */
export const INDEX_FEE_BPS = 50;

/**
 * How far the shares a person reviewed may be from the server's own reading
 * when the purchase is saved: one percentage point per coin. Market sizes are
 * read from one five-minute cache on both sides, so a review and its purchase
 * normally agree exactly; a move this large means the person should look again.
 */
export const WEIGHT_TOLERANCE_BPS = 100;

/**
 * Each coin's share of the coins' combined market cap, in whole basis points
 * summing to exactly 10,000 (the points rounding leaves over go to the largest
 * remainders), biggest first. Null when a coin's market cap is unknown: a
 * share is never guessed.
 */
export function marketWeights(
  def: IndexDef,
  capOf: (symbol: IndexCoin) => number | null | undefined
): IndexWeight[] | null {
  const caps = def.coins.map((symbol) => ({ symbol, cap: capOf(symbol) }));
  if (!caps.length) return null;
  if (caps.some((c) => typeof c.cap !== 'number' || !Number.isFinite(c.cap) || c.cap <= 0)) {
    return null;
  }
  // A coin's size: its market cap, or its square root (IndexWeighting).
  const sizeOf = (cap: number) => (def.weighting === 'sqrt-market-cap' ? Math.sqrt(cap) : cap);
  const total = caps.reduce((sum, c) => sum + sizeOf(c.cap as number), 0);
  const shares = caps.map((c) => {
    const exact = (sizeOf(c.cap as number) / total) * 10_000;
    // Every coin the index holds is bought: at least one point each.
    const weightBps = Math.max(1, Math.floor(exact));
    return { symbol: c.symbol, weightBps, rest: exact - Math.floor(exact) };
  });
  let left = 10_000 - shares.reduce((sum, s) => sum + s.weightBps, 0);
  if (left > 0) {
    // Rounding down leaves a point or two over (at most one per coin): they
    // go to the largest remainders, ties to the bigger coin.
    const byRest = [...shares].sort((a, b) => b.rest - a.rest || b.weightBps - a.weightBps);
    for (let i = 0; left > 0; i = (i + 1) % byRest.length) {
      byRest[i].weightBps += 1;
      left -= 1;
    }
  } else if (left < 0) {
    // A dust coin's one point came from nowhere: the biggest gives it back.
    shares.reduce((a, b) => (b.weightBps > a.weightBps ? b : a)).weightBps += left;
  }
  return shares
    .map(({ symbol, weightBps }) => ({ symbol, weightBps }))
    .sort((a, b) => b.weightBps - a.weightBps);
}

/** Shares must be whole, positive, each coin once, and sum to exactly 100%. */
export function assertIndexWeights(weights: IndexWeight[]): void {
  if (!weights.length) throw new Error('An index needs at least one coin');
  const seen = new Set<string>();
  let sum = 0;
  for (const w of weights) {
    if (!Number.isInteger(w.weightBps) || w.weightBps <= 0) {
      throw new Error(`Weight for ${w.symbol} must be a positive whole number of basis points`);
    }
    if (seen.has(w.symbol)) throw new Error(`${w.symbol} appears twice`);
    seen.add(w.symbol);
    sum += w.weightBps;
  }
  if (sum !== 10_000) throw new Error(`Weights sum to ${sum} basis points, not 10,000`);
}

/**
 * Shares a client sent, read strictly: the index's own coins, each once, whole
 * positive points summing to 10,000. Null for anything else.
 */
export function parseWeights(def: IndexDef, raw: unknown): IndexWeight[] | null {
  if (!Array.isArray(raw) || raw.length !== def.coins.length) return null;
  const weights: IndexWeight[] = [];
  for (const item of raw) {
    const symbol = (item as { symbol?: unknown })?.symbol;
    const weightBps = (item as { weightBps?: unknown })?.weightBps;
    if (typeof symbol !== 'string' || !def.coins.includes(symbol as IndexCoin)) return null;
    if (typeof weightBps !== 'number') return null;
    weights.push({ symbol: symbol as IndexCoin, weightBps });
  }
  try {
    assertIndexWeights(weights);
  } catch {
    return null;
  }
  return weights.sort((a, b) => b.weightBps - a.weightBps);
}

/** The same coins, each share within `toleranceBps` of the other's. */
export function weightsWithin(a: IndexWeight[], b: IndexWeight[], toleranceBps: number): boolean {
  if (a.length !== b.length) return false;
  return a.every((wa) => {
    const wb = b.find((x) => x.symbol === wa.symbol);
    return !!wb && Math.abs(wa.weightBps - wb.weightBps) <= toleranceBps;
  });
}

export interface IndexSlice {
  symbol: IndexCoin;
  weightBps: number;
  amountWire: bigint;
}

/**
 * Split a purchase exactly: each slice is its weight, rounded down, and the
 * few units rounding leaves over go to the biggest slice, so the slices
 * always add up to the purchase to the last unit.
 */
export function splitPurchase(totalWire: bigint, weights: IndexWeight[]): IndexSlice[] {
  assertIndexWeights(weights);
  if (totalWire <= 0n) throw new Error('A purchase must be more than zero');
  const slices = weights.map((w) => ({
    symbol: w.symbol,
    weightBps: w.weightBps,
    amountWire: (totalWire * BigInt(w.weightBps)) / BPS,
  }));
  const used = slices.reduce((sum, s) => sum + s.amountWire, 0n);
  const biggest = slices.reduce((a, b) => (b.weightBps > a.weightBps ? b : a));
  biggest.amountWire += totalWire - used;
  return slices;
}

/**
 * The smallest purchase whose every slice reaches its floor, rounded up to
 * whole dollars: INDEX_MIN_SLICE_USD for a coin bought across the bridge
 * ($67 when the smallest holds 15%, $250 when it holds 4%), and
 * INDEX_MIN_STELLAR_SLICE_USD for one bought on Stellar.
 */
export function minimumPurchaseWire(weights: IndexWeight[]): bigint {
  assertIndexWeights(weights);
  let neededWire = 0n;
  for (const w of weights) {
    const floorUsd = isStellarCoin(w.symbol) ? INDEX_MIN_STELLAR_SLICE_USD : INDEX_MIN_SLICE_USD;
    const sliceWire = BigInt(floorUsd) * WIRE_PER_USD;
    // ceil(slice / weight)
    const need = (sliceWire * BPS + BigInt(w.weightBps) - 1n) / BigInt(w.weightBps);
    if (need > neededWire) neededWire = need;
  }
  const dollars = (neededWire + WIRE_PER_USD - 1n) / WIRE_PER_USD;
  return dollars * WIRE_PER_USD;
}

/** What Circle moves to Base: the slices bought there, to the last unit. */
export function bridgedWire(slices: IndexSlice[]): bigint {
  return slices.filter((s) => !isStellarCoin(s.symbol)).reduce((sum, s) => sum + s.amountWire, 0n);
}

/**
 * A Stellar slice: Normal's 0.5% (rounded down) and what the swap spends.
 * They add up to the slice exactly, as every other coin's fee comes out of
 * its own slice.
 */
export function stellarSliceAmounts(sliceWire: bigint): { feeWire: bigint; swapWire: bigint } {
  const feeWire = (sliceWire * BigInt(INDEX_FEE_BPS)) / BPS;
  return { feeWire, swapWire: sliceWire - feeWire };
}

export type PurchaseVerdict =
  | { ok: true; slices: IndexSlice[] }
  | { ok: false; reason: 'too-small'; minimumWire: bigint }
  | { ok: false; reason: 'too-large'; maximumWire: bigint };

/**
 * Can this amount be bought at these shares? `maximumWire` is the pilot cap
 * when one is set (CCTP_PILOT_MAX_USD on the server), null for none.
 */
export function purchaseVerdict(
  totalWire: bigint,
  maximumWire: bigint | null,
  weights: IndexWeight[]
): PurchaseVerdict {
  const minimumWire = minimumPurchaseWire(weights);
  if (totalWire < minimumWire) return { ok: false, reason: 'too-small', minimumWire };
  if (maximumWire !== null && totalWire > maximumWire) {
    return { ok: false, reason: 'too-large', maximumWire };
  }
  return { ok: true, slices: splitPurchase(totalWire, weights) };
}

/** "82.5%" from basis points, for the page: whole points drop the decimal. */
export const weightLabel = (weightBps: number) =>
  `${Number.isInteger(weightBps / 100) ? weightBps / 100 : (weightBps / 100).toFixed(1)}%`;

/** Whole dollars and cents from wire units, for messages ("$67"). */
export const wireToUsdNumber = (wire: bigint) => Number(wire) / 1_000_000;

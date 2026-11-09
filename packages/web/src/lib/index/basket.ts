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
// This file is pure: the basket's definition, the exact split of an amount,
// and the minimum that keeps every slice above the bridges' fixed costs. Every
// amount is integer USDC wire units (6 decimals), never a float.
// ---------------------------------------------------------------------------

export type IndexCoin = 'BTC' | 'ETH' | 'SOL';

export interface IndexLegDef {
  symbol: IndexCoin;
  /** Share of the purchase in basis points (all legs sum to 10,000). */
  weightBps: number;
}

export interface IndexDef {
  id: string;
  /** Biggest slice first: the order the legs are bought and shown in. */
  legs: IndexLegDef[];
}

/**
 * The first index. Fixed weights with Bitcoin the biggest slice (Niko's
 * brief). By market size alone Bitcoin would be about 82% and Solana under 3%
 * (CoinGecko, 2026-11-08), which makes Solana's slice too small to be worth a
 * bridge on an everyday purchase; fixed weights keep every slice meaningful.
 */
export const CRYPTO_INDEX: IndexDef = {
  id: 'crypto-3',
  legs: [
    { symbol: 'BTC', weightBps: 6000 },
    { symbol: 'ETH', weightBps: 2500 },
    { symbol: 'SOL', weightBps: 1500 },
  ],
};

const BPS = 10_000n;
const WIRE_PER_USD = 1_000_000n;

/**
 * Each slice pays a bridge's fixed costs; below this they eat the slice. The
 * same reasoning as the $10 minimum on a single Circle swap.
 */
export const INDEX_MIN_SLICE_USD = 10;

/** Weights must be whole, positive and sum to exactly 100%. */
export function assertIndexDef(def: IndexDef): void {
  if (!def.legs.length) throw new Error('An index needs at least one coin');
  const seen = new Set<string>();
  let sum = 0;
  for (const leg of def.legs) {
    if (!Number.isInteger(leg.weightBps) || leg.weightBps <= 0) {
      throw new Error(`Weight for ${leg.symbol} must be a positive whole number of basis points`);
    }
    if (seen.has(leg.symbol)) throw new Error(`${leg.symbol} appears twice`);
    seen.add(leg.symbol);
    sum += leg.weightBps;
  }
  if (sum !== 10_000) throw new Error(`Weights sum to ${sum} basis points, not 10,000`);
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
export function splitPurchase(totalWire: bigint, def: IndexDef = CRYPTO_INDEX): IndexSlice[] {
  assertIndexDef(def);
  if (totalWire <= 0n) throw new Error('A purchase must be more than zero');
  const slices = def.legs.map((leg) => ({
    symbol: leg.symbol,
    weightBps: leg.weightBps,
    amountWire: (totalWire * BigInt(leg.weightBps)) / BPS,
  }));
  const used = slices.reduce((sum, s) => sum + s.amountWire, 0n);
  const biggest = slices.reduce((a, b) => (b.weightBps > a.weightBps ? b : a));
  biggest.amountWire += totalWire - used;
  return slices;
}

/**
 * The smallest purchase whose every slice reaches INDEX_MIN_SLICE_USD,
 * rounded up to whole dollars: $67 for 60/25/15 (the 15% slice needs $10).
 */
export function minimumPurchaseWire(def: IndexDef = CRYPTO_INDEX): bigint {
  assertIndexDef(def);
  const smallest = def.legs.reduce((a, b) => (b.weightBps < a.weightBps ? b : a)).weightBps;
  const sliceWire = BigInt(INDEX_MIN_SLICE_USD) * WIRE_PER_USD;
  // ceil(slice / weight), in whole dollars
  const neededWire = (sliceWire * BPS + BigInt(smallest) - 1n) / BigInt(smallest);
  const dollars = (neededWire + WIRE_PER_USD - 1n) / WIRE_PER_USD;
  return dollars * WIRE_PER_USD;
}

export type PurchaseVerdict =
  | { ok: true; slices: IndexSlice[] }
  | { ok: false; reason: 'too-small'; minimumWire: bigint }
  | { ok: false; reason: 'too-large'; maximumWire: bigint };

/**
 * Can this amount be bought? `maximumWire` is the pilot cap when one is set
 * (CCTP_PILOT_MAX_USD on the server), null for none.
 */
export function purchaseVerdict(
  totalWire: bigint,
  maximumWire: bigint | null,
  def: IndexDef = CRYPTO_INDEX
): PurchaseVerdict {
  const minimumWire = minimumPurchaseWire(def);
  if (totalWire < minimumWire) return { ok: false, reason: 'too-small', minimumWire };
  if (maximumWire !== null && totalWire > maximumWire) {
    return { ok: false, reason: 'too-large', maximumWire };
  }
  return { ok: true, slices: splitPurchase(totalWire, def) };
}

/** "60%" from basis points, for the page. */
export const weightLabel = (weightBps: number) =>
  `${Number.isInteger(weightBps / 100) ? weightBps / 100 : (weightBps / 100).toFixed(1)}%`;

/** Whole dollars and cents from wire units, for messages ("$67"). */
export const wireToUsdNumber = (wire: bigint) => Number(wire) / 1_000_000;

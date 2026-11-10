import { BRAND_COLORS } from '@/theme/brand-colors';
import { assetColor } from '@/lib/portfolio/display';

// ---------------------------------------------------------------------------
// How someone's money splits across what they hold, as a ring (Niko
// 2026-11-10: "pie chart on home screen and assets to display our assets").
//
// Each asset has a fixed place in the ring, clockwise from the top, so it keeps
// its place and its colour whatever else is held. Neighbours in a ring must be
// told apart for every kind of colour vision, so the order was chosen by
// validating every order of the six (the dataviz skill's validate_palette.js,
// light and dark): Stellar's ink sits between Ethereum's and Solana's violets,
// which are too alike to touch. Worst neighbours: ΔE 23.4 colour-blind, 24.3
// normal (floors 8 and 15). A part someone doesn't hold leaves a gap closed by
// its neighbours; the legend, the gaps and the readout carry identity then.
// ---------------------------------------------------------------------------

export const ALLOCATION_ORDER = ['USDC', 'BTC', 'ETH', 'XLM', 'SOL', 'Savings'] as const;

/** An asset's colour in the ring: its coin colour; Savings the savings green. */
export function allocationColor(symbol: string): string {
  return symbol === 'Savings' ? BRAND_COLORS.mint.deep : assetColor(symbol);
}

export interface AllocationPart {
  /** The asset: 'BTC', 'USDC', 'Savings'. Its colour and its place in the ring. */
  symbol: string;
  /** Its name for people: "Bitcoin". */
  label: string;
  /** What it is worth, in dollars. */
  value: number;
}

export interface AllocationSlice extends AllocationPart {
  /** Its share of the whole, 0 to 1. */
  share: number;
  /** Where its arc starts and ends, in radians clockwise from the top. */
  start: number;
  end: number;
}

const rank = (symbol: string) => {
  const i = (ALLOCATION_ORDER as readonly string[]).indexOf(symbol);
  return i < 0 ? ALLOCATION_ORDER.length : i;
};

/**
 * The ring's slices: one per asset (rows of the same asset in two wallets are
 * summed), in the ring's order, nothing for an asset worth nothing. Shares sum
 * to 1 and the arcs close the circle. Empty when nothing is held.
 */
export function allocationSlices(parts: AllocationPart[]): AllocationSlice[] {
  const bySymbol = new Map<string, AllocationPart>();
  for (const part of parts) {
    if (!(part.value > 0) || !Number.isFinite(part.value)) continue;
    const seen = bySymbol.get(part.symbol);
    bySymbol.set(part.symbol, seen ? { ...seen, value: seen.value + part.value } : { ...part });
  }
  const held = [...bySymbol.values()].sort(
    (a, b) => rank(a.symbol) - rank(b.symbol) || b.value - a.value
  );
  const total = held.reduce((sum, p) => sum + p.value, 0);
  if (!(total > 0)) return [];
  let at = 0;
  return held.map((part) => {
    const share = part.value / total;
    const start = at * 2 * Math.PI;
    at += share;
    return { ...part, share, start, end: at * 2 * Math.PI };
  });
}

/** "29%", "<1%": a share as people read it. */
export const shareLabel = (share: number) =>
  share > 0 && share < 0.01 ? '<1%' : `${Math.round(share * 100)}%`;

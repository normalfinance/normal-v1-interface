// ---------------------------------------------------------------------------
// Coinbase Offramp (sell) rules shared by the Sell dialog and the completion
// modal. Everything here was verified against Coinbase's own
// GET /onramp/v1/sell/options?country=US on 2026-10-09 (412 sellable assets):
//   - BTC, ETH, SOL and USDC are sellable; USDC on 15 networks (Base, Ethereum,
//     Solana, Arbitrum, Optimism, Polygon, …) — but NOT on Stellar.
//   - No asset lists a Stellar network and XLM is absent entirely.
//   - USD payout limits: ACH $10–$50,000; Coinbase balance $2–$1,000,000.
// Offering Coinbase for a Stellar asset therefore produces a sale that can
// never be completed. Re-run the options call before loosening this.
// ---------------------------------------------------------------------------

export type SellChain = 'stellar' | 'bitcoin' | 'ethereum' | 'solana';

/** Can Coinbase Offramp sell this asset from this chain? */
export function coinbaseCanSell(chain: SellChain, symbol: string): boolean {
  if (chain === 'stellar') return false; // no Stellar network on the sell side
  const sym = symbol.toUpperCase();
  if (chain === 'bitcoin') return sym === 'BTC';
  if (chain === 'ethereum') return sym === 'ETH' || sym === 'USDC';
  if (chain === 'solana') return sym === 'SOL' || sym === 'USDC';
  return false;
}

/**
 * Coinbase gives the user 30 minutes from "Cash out now" to broadcast the
 * send (docs.cdp.coinbase.com Offramp FAQ). A send that lands later is NOT
 * matched to the sale: the crypto arrives as a plain balance in the user's
 * Coinbase account instead of being sold. The order's createdAt is the best
 * proxy we have for that moment.
 */
export const COINBASE_SELL_WINDOW_MS = 30 * 60_000;

/** Milliseconds left in the send window; null when createdAt is unusable. */
export function sellWindowRemainingMs(createdAt: string | null, now = Date.now()): number | null {
  if (!createdAt) return null;
  const t = Date.parse(createdAt);
  if (!Number.isFinite(t)) return null;
  return t + COINBASE_SELL_WINDOW_MS - now;
}

/**
 * Hand-off marker written by the Sell dialog the moment we open Coinbase, read
 * by the completion modal so it only accepts orders created for THIS sale and
 * not an older abandoned STARTED order of a smaller amount.
 */
export const OFFRAMP_HANDOFF_KEY = 'nf:offramp-handoff:v1';

export interface OfframpHandoff {
  at: number; // Date.now() when we navigated to Coinbase
  sym: string;
  chain: SellChain;
  amount: string | null; // crypto amount we pre-filled, if any
}

/** Clock skew between us and Coinbase's createdAt we tolerate. */
export const HANDOFF_SKEW_MS = 2 * 60_000;

export function orderIsFromHandoff(
  createdAt: string | null,
  handoff: OfframpHandoff | null,
  symbol: string
): boolean {
  if (!handoff) return true; // no marker (e.g. old tab) → fall back to the other filters
  if (handoff.sym.toUpperCase() !== symbol.toUpperCase()) return true;
  if (!createdAt) return false; // cannot date it → do not trust it against a known hand-off
  const t = Date.parse(createdAt);
  if (!Number.isFinite(t)) return false;
  return t >= handoff.at - HANDOFF_SKEW_MS;
}

export function readHandoff(): OfframpHandoff | null {
  try {
    const raw = window.sessionStorage.getItem(OFFRAMP_HANDOFF_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as OfframpHandoff;
    return typeof v?.at === 'number' && typeof v?.sym === 'string' ? v : null;
  } catch {
    return null;
  }
}

export function writeHandoff(h: OfframpHandoff): void {
  try {
    window.sessionStorage.setItem(OFFRAMP_HANDOFF_KEY, JSON.stringify(h));
  } catch {
    /* private mode — the modal falls back to the balance/age filters */
  }
}

export function clearHandoff(): void {
  try {
    window.sessionStorage.removeItem(OFFRAMP_HANDOFF_KEY);
  } catch {
    /* ignore */
  }
}

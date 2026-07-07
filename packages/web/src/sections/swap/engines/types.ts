import type { ReactNode } from 'react';
import type { BigNumber } from 'bignumber.js';

// ---------------------------------------------------------------------------
// Unified swap asset registry. Two routing groups that can never be paired with
// each other because no bridge supports the crossing:
//   - stellar    → XLM ⇄ USDC via Soroswap
//   - crosschain → BTC / ETH / SOL via LI.FI
// The card constrains the destination picker to the source's own group.
// ---------------------------------------------------------------------------

export type SwapSymbol = 'XLM' | 'USDC' | 'BTC' | 'ETH' | 'SOL';
export type StellarSymbol = 'XLM' | 'USDC';
export type CrosschainSymbol = 'BTC' | 'ETH' | 'SOL';
export type SwapGroup = 'stellar' | 'crosschain';

export interface SwapAsset {
  symbol: SwapSymbol;
  name: string;
  group: SwapGroup;
  decimals: number;
}

export const SWAP_ASSETS: SwapAsset[] = [
  { symbol: 'XLM', name: 'Stellar Lumens', group: 'stellar', decimals: 7 },
  { symbol: 'USDC', name: 'USD Coin', group: 'stellar', decimals: 7 },
  { symbol: 'BTC', name: 'Bitcoin', group: 'crosschain', decimals: 8 },
  { symbol: 'ETH', name: 'Ethereum', group: 'crosschain', decimals: 18 },
  { symbol: 'SOL', name: 'Solana', group: 'crosschain', decimals: 9 },
];

export const assetBySymbol = (symbol: SwapSymbol): SwapAsset =>
  SWAP_ASSETS.find((a) => a.symbol === symbol)!;

export const groupOf = (symbol: SwapSymbol): SwapGroup => assetBySymbol(symbol).group;

/** First in-group asset that isn't `symbol` — the default destination when the
 * source moves to a new group (e.g. XLM→USDC, BTC→ETH). */
export const counterpartOf = (symbol: SwapSymbol): SwapSymbol =>
  SWAP_ASSETS.find((a) => a.group === groupOf(symbol) && a.symbol !== symbol)!.symbol;

// ---------------------------------------------------------------------------
// Cross-group routing (Circle CCTP + LI.FI composite). v1 supports the inbound
// direction only: BTC/ETH/SOL → XLM/USDC via LI.FI→Base-USDC→CCTP→Stellar.
// Outbound (stellar → crosschain) needs pivot-side swap execution — next slice.
// ---------------------------------------------------------------------------

export type PairType = SwapGroup | 'cctp';

export const canPair = (from: SwapSymbol, to: SwapSymbol): boolean =>
  groupOf(from) === groupOf(to) || (groupOf(from) === 'crosschain' && groupOf(to) === 'stellar');

export const pairTypeOf = (from: SwapSymbol, to: SwapSymbol): PairType =>
  groupOf(from) === groupOf(to) ? groupOf(from) : 'cctp';

// ---------------------------------------------------------------------------
// Normalised contract every engine fulfils so the shell renders one chrome and
// never branches on the routing provider. The shell owns the amount input,
// USD/token toggle, balances, prices and the asset picker; the engine owns the
// quote, execution, gating and any provider-specific dialogs.
// ---------------------------------------------------------------------------

export interface SwapEngineButton {
  label: string;
  /** null ⇒ the CTA is disabled */
  action: (() => void) | null;
  loading: boolean;
  /** rendered above the CTA (e.g. trustline / activation notices) */
  helper?: ReactNode;
}

export interface SwapEngineResult {
  /** token amount the user receives, or null until a quote settles */
  toAmount: BigNumber | null;
  quoteLoading: boolean;
  quoteError: string | null;
  /** rows for the details panel (rate, fee, route, eta…) — null hides the panel */
  details: ReactNode;
  /** note under the CTA (e.g. delivery address) */
  footer: ReactNode;
  button: SwapEngineButton;
  /** dialogs/modals the engine needs mounted (chain setup, status tracker…) */
  modals: ReactNode;
  /** max spendable amount in *token* units — performs live reads (gas, reserves) */
  getMaxToken: () => Promise<BigNumber>;
}

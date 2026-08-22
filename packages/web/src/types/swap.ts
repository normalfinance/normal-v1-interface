// Swap types for the swap aggregator integration

export interface SwapQuote {
  path: string[];
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  estimatedAmountOut: string;
  minAmountOut: string;
  priceImpact: number;
  fee: string;
  xdr: string;
  /** #33: fee embedded in the swap tx (Soroswap feeBps+referralId) — one
   *  signature; the fee-pair path is skipped. */
  embedded?: boolean;
}

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut: string;
  path: string[];
  xdr: string;
}

export type SwapMode = 'strict-send' | 'strict-receive';

/** Optional labels passed when executing a swap so the server log has accurate symbols. */
export interface SwapDisplayMeta {
  tokenInSymbol: string;
  tokenOutSymbol: string;
}

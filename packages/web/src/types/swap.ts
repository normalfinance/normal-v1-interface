// Swap types for Aqua Network integration

export interface SwapQuote {
  path: string[];
  amountIn: string;
  amountOut: string;
  estimatedAmountOut: string;
  priceImpact: number;
  fee: string;
  xdr: string;
}

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut: string;
  path: string[];
  xdr: string;
}

export interface AquaFindPathRequest {
  token_in_address: string;
  token_out_address: string;
  amount: string;
}

export interface AquaFindPathResponse {
  success: boolean;
  path: string[];
  amount_in: string;
  amount_out: string;
  xdr: string;
  error?: string;
}

export type SwapMode = 'strict-send' | 'strict-receive';

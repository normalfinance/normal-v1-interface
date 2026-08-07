import type { BigNumber } from 'bignumber.js';
import type { Token } from '@normalfinance/types';
import type { ChainId } from '@/lib/chains/registry';

// ----------------------------------------------------------------------

export interface SendParams {
  token: Token;
  amount: string; // coin units (e.g. "0.001" for BTC or "10.5" for USDC)
  destination: string;
  memo?: string;
}

export interface AdapterFeeInfo {
  label: string; // "0.0002 XLM"  /  "~1,234 sat"
  fiatLabel: string; // "($0.01)"
  tooltip: string;
}

/**
 * Contract that every network must implement.
 *
 * `network` is the registry's ChainId rather than a hand-written union, so a
 * chain added to `lib/chains/registry.ts` is immediately expressible here
 * instead of requiring this type — and everything switching on it — to be
 * edited too.
 */
export interface SendAdapter {
  readonly network: ChainId;
  readonly hasMemo: boolean;
  readonly addressPlaceholder: string;
  validateAddress(address: string): boolean;
  getSpendableBalance(token: Token, xlmSubentries?: number): BigNumber;
  /** null = fee is computed async and shown separately in the modal */
  feeInfo: AdapterFeeInfo | null;
  /** Returns txHash on success, empty string on handled error */
  send(params: SendParams): Promise<string>;
}

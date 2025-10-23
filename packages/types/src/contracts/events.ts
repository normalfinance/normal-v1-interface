// ─── Pool Events ──────────────────────────────────

export interface DepositLiquidityEvent {
  type: 'deposit_liquidity';
  token: string; // Address
  user: string; // Address
  amount: bigint;
  shareAmount: bigint;
}

export interface WithdrawLiquidityEvent {
  type: 'withdraw_liquidity';
  token: string;
  user: string;
  shareAmount: bigint;
  amount: bigint;
}

export interface SwapEvent {
  type: 'swap';
  direction: 'Buy' | 'Sell';
  tokenIn: string;
  tokenOut: string;
  user: string;
  inAmount: bigint;
  outAmount: bigint;
  feeAmount: bigint;
}

// ─── PoolRouter Events ─────────────────────────────

export interface RouterDepositLiquidityEvent {
  type: 'deposit_liquidity';
  tokens: string[];
  user: string;
  poolAddress: string;
  amounts: bigint[];
  shareAmount: bigint;
}

export interface RouterSwapEvent {
  type: 'swap';
  tokens: string[];
  user: string;
  poolAddress: string;
  tokenIn: string;
  tokenOut: string;
  inAmount: bigint;
  outAmount: bigint;
}

export interface RouterWithdrawLiquidityEvent {
  type: 'withdraw_liquidity';
  tokens: string[];
  user: string;
  poolAddress: string;
  amounts: bigint[];
  shareAmount: bigint;
}

export interface ClaimRewardEvent {
  type: 'claim';
  asset: string;
  pool: string;
  user: string;
  rewardToken: string;
  rewardAmount: bigint;
}

// ─── Union Type ─────────────────────────────────────────────

export type PoolEvent = (DepositLiquidityEvent | WithdrawLiquidityEvent | SwapEvent) & {
  timestamp?: number;
  txHash: string;
};

export type PoolRouterEvent = (
  | RouterDepositLiquidityEvent
  | RouterSwapEvent
  | RouterWithdrawLiquidityEvent
  | ClaimRewardEvent
) & {
  timestamp?: number;
  txHash: string;
};

export type UserActivityEvent = (
  | RouterDepositLiquidityEvent
  | RouterSwapEvent
  | RouterWithdrawLiquidityEvent
) & {
  timestamp?: number;
  txHash: string;
};

export type NormalContractEvent = PoolEvent | PoolRouterEvent;

export interface GoldskyTableRow {
  id: string;
  type: string;
  contract_id?: string;
  topics?: string;
  data?: string;
  in_successful_contract_call: boolean;
  transaction_hash: string;
  transaction_account: string;
  transaction_successful: boolean;
  ledger_sequence: number;
  ledger_hash: string;
  ledger_closed_at: Date;
  transaction_fee_account?: string;
  ledger_signature?: string;
}

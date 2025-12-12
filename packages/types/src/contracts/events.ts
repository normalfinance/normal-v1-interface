// ─── PoolRouter Events ─────────────────────────────

export interface RouterDepositLiquidityEvent {
  type: 'deposit';
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
  type: 'withdraw';
  tokens: string[];
  user: string;
  poolAddress: string;
  amounts: bigint[];
  shareAmount: bigint;
}

export interface ClaimRewardEvent {
  type: 'claim';
  pool: string;
  user: string;
  rewardToken: string;
  rewardAmount: bigint;
}

// ─── Union Type ─────────────────────────────────────────────

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

export type NormalContractEvent = PoolRouterEvent;

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

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
  direction: 'buy' | 'sell';
  tokenIn: string;
  tokenOut: string;
  user: string;
  inAmount: bigint;
  outAmount: bigint;
  feeAmount: bigint;
}

export interface RebalanceEvent {
  type: 'rebalance';
  reserveA: bigint;
  reserveB: bigint;
  newReserveA: bigint;
  newReserveB: bigint;
  deltaA: bigint;
}

// ─── Insurance Fund Events ──────────────────────────────────

export interface IfStakeRecordEvent {
  type: 'if_stake_record';
  user: string;
  action: string; // Assuming StakeAction is symbol (e.g., "stake" / "unstake")
  amount: bigint;
  insuranceVaultAmountBefore: bigint;
  ifSharesBefore: bigint;
  totalIfSharesBefore: bigint;
  ifSharesAfter: bigint;
  totalIfSharesAfter: bigint;
}

export interface CollectPremiumEvent {
  type: 'collect_premium';
  sender: string;
  amount: bigint;
}

// ─── PoolSwapFee Events ─────────────────────────────

export interface FeeSwapEvent {
  type: 'swap';
  asset: string; // symbol
  pool: string; // address
  user: string; // address
  direction: string; // symbol (e.g. "buy" or "sell")
  inAmount: bigint;
  outAmount: bigint;
  feeAmount: bigint;
  lpFee: bigint;
  ifPremium: bigint;
  revenueFee: bigint;
}

export interface ClaimFeesEvent {
  type: 'claim_fees';
  token: string;
  sender: string;
  amount: bigint;
}

// ─── PoolRouter Events ─────────────────────────────

export interface RouterDepositLiquidityEvent {
  type: 'deposit_liquidity';
  asset: string;
  pool: string;
  user: string;
  amount: bigint;
  shareAmount: bigint;
}

export interface RouterSwapEvent {
  type: 'swap';
  asset: string;
  pool: string;
  user: string;
  direction: string;
  inAmount: bigint;
  outAmount: bigint;
}

export interface RouterWithdrawLiquidityEvent {
  type: 'withdraw_liquidity';
  asset: string;
  pool: string;
  user: string;
  shareAmount: bigint;
  amount: bigint;
}

export interface AddPoolEvent {
  type: 'add_pool';
  asset: string;
  pool: string;
  tokens: string[];
  initArgs: unknown[]; // these are `Val`s; parsing depends on context
}

export interface ConfigRewardsEvent {
  type: 'config_rewards';
  asset: string;
  pool: string;
  poolTps: bigint;
  expiredAt: bigint;
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

export type PoolEvent = (
  | DepositLiquidityEvent
  | WithdrawLiquidityEvent
  | SwapEvent
  | RebalanceEvent
) & {
  timestamp?: number;
  txHash: string;
};

export type InsuranceFundEvent = IfStakeRecordEvent & {
  timestamp?: number;
  txHash: string;
};

export type PoolSwapFeeEvent = (CollectPremiumEvent | FeeSwapEvent | ClaimFeesEvent) & {
  timestamp?: number;
  txHash: string;
};

export type PoolRouterEvent = (
  | RouterDepositLiquidityEvent
  | RouterSwapEvent
  | RouterWithdrawLiquidityEvent
  | AddPoolEvent
  | ConfigRewardsEvent
  | ClaimRewardEvent
) & {
  timestamp?: number;
  txHash: string;
};

export type UserActivityEvent = (
  | RouterDepositLiquidityEvent
  | RouterSwapEvent
  | RouterWithdrawLiquidityEvent
  | IfStakeRecordEvent
) & {
  timestamp?: number;
  txHash: string;
};

export type NormalContractEvent =
  | PoolEvent
  | InsuranceFundEvent
  | PoolSwapFeeEvent
  | PoolRouterEvent;

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

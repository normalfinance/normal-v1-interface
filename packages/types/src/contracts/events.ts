// ─── Treasury Events ─────────────────────────────
export interface TreasuryDepositEvent {
  type: 'deposit';
  user: string;
  pair: string;
  pairAmount: bigint;
  usdcAmount: bigint;
  ts: bigint;
}

export interface TreasuryWithdrawEvent {
  type: 'withdraw';
  user: string;
  pair: string;
  pairAmount: bigint;
  usdcAmount: bigint;
  ts: bigint;
}

export interface TreasuryTradeEvent {
  type: 'trade';
  user: string;
  pair: string;
  side: string;
  direction: string;
  inAmount: bigint;
  outAmount: bigint;
  price: bigint;
  ts: bigint;
}

// ─── LongShortPair Events ─────────────────────────────

export interface PairMintEvent {
  type: 'mint';
  user: string;
  pair: string;
  collateral: bigint;
  tokensMinted: bigint;
  ts: bigint;
}

export interface PairRedeemEvent {
  type: 'redeem';
  user: string;
  pair: string;
  collateral: bigint;
  tokensRedeemed: bigint;
  ts: bigint;
}

// ─── Union Type ─────────────────────────────────────────────

export type TreasuryEvent = (TreasuryDepositEvent | TreasuryWithdrawEvent | TreasuryTradeEvent) & {
  txHash: string;
};

export type PairEvent = (PairMintEvent | PairRedeemEvent) & {
  txHash: string;
};

export type NormalContractEvent = TreasuryEvent | PairEvent;

export type UserActivityEvent = NormalContractEvent & {
  txHash: string;
};

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

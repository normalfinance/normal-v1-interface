export type Sep24Status =
  | 'incomplete'
  | 'pending_user_transfer_start'
  | 'pending_user_transfer_complete'
  | 'completed'
  | 'refunded'
  | 'expired'
  | 'no_market'
  | 'too_small'
  | 'too_large'
  | 'error';

export type Sep24Kind = 'deposit' | 'withdrawal';

export interface Amount {
  amount: string;
  asset: string;
}

export interface Refunds {
  amount_refunded: Amount;
  amount_fee?: Amount;
}

export interface Sep24Transaction {
  id: string;
  kind: Sep24Kind;
  status: Sep24Status;
  amount_in?: Amount;
  amount_out?: Amount;
  amount_fee?: Amount;
  started_at: string;
  completed_at?: string;
  updated_at?: string;
  refunded_at?: string;
  memo?: string;
  memo_type?: 'text' | 'id' | 'hash';
  stellar_transaction_id?: string;
  external_transaction_id?: string;
  more_info_url?: string;
  from?: string;
  to?: string;
  refunds?: Refunds;
  message?: string;
}

export interface Sep24ListResponse {
  transactions: Sep24Transaction[];
}

export interface Sep24SingleResponse {
  transaction: Sep24Transaction;
}

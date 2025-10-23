export interface BaseQueryParams {
  [key: string]: string | undefined;
}

export interface SwapQueryParams extends BaseQueryParams {
  asset?: string;
  token_in?: string;
  token_out?: string;
  in_amount?: string;
  out_minimum?: string;
}

export interface SendQueryParams extends BaseQueryParams {
  token?: string;
  amount?: string;
  destination?: string;
}

export interface BuyQueryParams extends BaseQueryParams {
  token?: string;
  amount?: string;
}

export interface TokenActionQueryParams extends BaseQueryParams {
  tab?: 'swap' | 'send' | 'buy';
  asset?: string;
  token_in?: string;
  token_out?: string;
  in_amount?: string;
  out_minimum?: string;
  token?: string;
  amount?: string;
  destination?: string;
}

export interface DepositLiquidityQueryParams extends BaseQueryParams {
  asset?: string;
  amount?: string;
}

export interface WithdrawLiquidityQueryParams extends BaseQueryParams {
  asset?: string;
  share_amount?: string;
}

export interface PoolQueryParams extends BaseQueryParams {
  pool_address?: string;
  action?: 'deposit' | 'withdraw';
  amount?: string;
}

export interface PositionQueryParams extends BaseQueryParams {
  position_id?: string;
  action?: 'close' | 'modify';
  amount?: string;
}

export interface ExploreQueryParams extends BaseQueryParams {
  search?: string;
  category?: string;
  sort_by?: 'volume' | 'tvl' | 'apy' | 'name';
  sort_order?: 'asc' | 'desc';
}

export interface TransactionQueryParams extends BaseQueryParams {
  tx_hash?: string;
  from?: string;
  to?: string;
  amount?: string;
}

export interface ReferralQueryParams extends BaseQueryParams {
  ref?: string;
  referral?: string;
  referrer?: string;
  invite?: string;
}

export type AllQueryParams =
  | SwapQueryParams
  | SendQueryParams
  | BuyQueryParams
  | TokenActionQueryParams
  | DepositLiquidityQueryParams
  | WithdrawLiquidityQueryParams
  | PoolQueryParams
  | PositionQueryParams
  | ExploreQueryParams
  | TransactionQueryParams
  | ReferralQueryParams;

export type QueryParamKey<T extends BaseQueryParams> = keyof T;
export type QueryParamValue<T extends BaseQueryParams, K extends keyof T> = T[K];

export type RequiredQueryParams<T extends BaseQueryParams> = {
  [K in keyof T]-?: NonNullable<T[K]>;
};

export type PartialQueryParams<T extends BaseQueryParams, K extends keyof T = keyof T> = Pick<T, K>;

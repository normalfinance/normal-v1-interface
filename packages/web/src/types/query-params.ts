export interface BaseQueryParams {
  [key: string]: string | undefined;
}

export interface SwapQueryParams extends BaseQueryParams {
  token_a?: string;
  token_b?: string;
  in_amount?: string;
  out_minimum?: string;
}

export interface DepositLiquidityQueryParams extends BaseQueryParams {
  amount?: string;
  token_a?: string;
  token_b?: string;
  pool_address?: string;
}

export interface WithdrawLiquidityQueryParams extends BaseQueryParams {
  amount?: string;
  pool_address?: string;
  percentage?: string;
}

export interface StakeInsuranceQueryParams extends BaseQueryParams {
  token?: string;
  amount?: string;
  duration?: string;
}

export interface UnstakeInsuranceQueryParams extends BaseQueryParams {
  amount?: string;
  stake_id?: string;
}

export interface PoolQueryParams extends BaseQueryParams {
  pool_address?: string;
  action?: 'deposit' | 'withdraw' | 'stake';
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

export type AllQueryParams =
  | SwapQueryParams
  | DepositLiquidityQueryParams
  | WithdrawLiquidityQueryParams
  | StakeInsuranceQueryParams
  | UnstakeInsuranceQueryParams
  | PoolQueryParams
  | PositionQueryParams
  | ExploreQueryParams
  | TransactionQueryParams;

export type QueryParamKey<T extends BaseQueryParams> = keyof T;
export type QueryParamValue<T extends BaseQueryParams, K extends keyof T> = T[K];

export type RequiredQueryParams<T extends BaseQueryParams> = {
  [K in keyof T]-?: NonNullable<T[K]>;
};

export type PartialQueryParams<T extends BaseQueryParams, K extends keyof T = keyof T> = Pick<T, K>;

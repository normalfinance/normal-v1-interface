import type { i128, i32, Option, u128, u32, u64 } from '@stellar/stellar-sdk/contract'
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  Spec as ContractSpec,
  MethodOptions,
} from '@stellar/stellar-sdk/contract'
import { Buffer } from 'buffer'
export * from '@stellar/stellar-sdk'
export * as contract from '@stellar/stellar-sdk/contract'
export * as rpc from '@stellar/stellar-sdk/rpc'

if (typeof window !== 'undefined') {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer
}

export const InsuranceFundError = {
  /**
   * InsuranceFundError
   */
  0: { message: 'MaxIFWithdrawReached' },
  1: { message: 'NoIFWithdrawAvailable' },
  2: { message: 'InvalidIFUnstake' },
  3: { message: 'InvalidIFUnstakeSize' },
  6: { message: 'InvalidIFRebase' },
  7: { message: 'InvalidInsuranceUnstakeSize' },
  9: { message: 'IFWithdrawRequestInProgress' },
  10: { message: 'NoIFWithdrawRequestInProgress' },
  11: { message: 'IFWithdrawRequestTooSmall' },
  12: { message: 'InvalidIFSharesDetected' },
  13: { message: 'InsufficientIFShares' },
  14: { message: 'TryingToRemoveLiquidityTooFast' },
  15: { message: 'AlreadyInitialized' },
  16: { message: 'NotAuthorized' },
  17: { message: 'AdminNotSet' },
  18: { message: 'InsufficientCollateral' },
  19: { message: 'InvalidIFDetected' },
  20: { message: 'TooMuchInsurance' },
  21: { message: 'InvalidOptimalUtilization' },
  22: { message: 'InvalidTimestamp' },
  23: { message: 'CostBasisUnderflow' },
  24: { message: 'QueryPoolFailed' },
  25: { message: 'PayInsuranceClaimFailed' },
  26: { message: 'UnsupportedToken' },
  27: { message: 'TokenAlreadyDeleted' },
  28: { message: 'InvalidOracle' },
  30: { message: 'FundDepositKilled' },
  31: { message: 'FundRequestWithdrawKilled' },
  32: { message: 'FundWithdrawKilled' },
}

export interface InsuranceFundReserve {
  balance: u128
  last_claim: u128
  last_claim_ts: u64
  last_update_ts: u64
  shares_base: u128
  token: string
  total_claims: u128
  total_deposits: u128
  total_shares: u128
  total_withdrawals: u128
}

export type StakeAction =
  | { tag: 'Deposit'; values: void }
  | { tag: 'WithdrawRequest'; values: void }
  | { tag: 'WithdrawCancelRequest'; values: void }
  | { tag: 'Withdraw'; values: void }

export interface Stake {
  base: u128
  cost_basis: u128
  last_withdraw_request_shares: u128
  last_withdraw_request_ts: u64
  last_withdraw_request_value: u128
  shares: u128
  token: string
  user: string
}

export interface WhitelistToken {
  active: boolean
  address: string
  symbol: string
}

export const AccessControlError = {
  /**
   * AccessControlError
   */
  101: { message: 'RoleNotFound' },
  102: { message: 'Unauthorized' },
  103: { message: 'AdminAlreadySet' },
  104: { message: 'BadRoleUsage' },
  2906: { message: 'AnotherActionActive' },
  2907: { message: 'NoActionActive' },
  2908: { message: 'ActionNotReadyYet' },
}

export const UpgradeError = {
  /**
   * UpgradeError
   */
  2906: { message: 'AnotherActionActive' },
  2907: { message: 'NoActionActive' },
  2908: { message: 'ActionNotReadyYet' },
}

export const MathError = {
  /**
   * MathError: NumberOverflow
   */
  510: { message: 'NumberOverflow' },
  511: { message: 'MathError' },
}

export const OracleError = {
  /**
   * OracleError: OracleNonPositive
   */
  601: { message: 'OracleNonPositive' },
  602: { message: 'OracleTooVolatile' },
  603: { message: 'OracleStaleForPool' },
}

export const StorageError = {
  /**
   * StorageError
   */
  501: { message: 'ValueNotInitialized' },
  502: { message: 'ValueMissing' },
}

export const ValidationError = {
  /**
   * ValidationError
   */
  801: { message: 'InvalidToken' },
  802: { message: 'InvalidPercentage' },
  803: { message: 'Reentrancy' },
  804: { message: 'ZeroAmount' },
}

export interface PrivilegedAddresses {
  emergency_admin: string
  emergency_pause_admins: Array<string>
  operations_admin: string
  pause_admin: string
  rewards_admin: string
}

export interface OraclePriceData {
  delay: Delay
  price: u128
}

export interface OracleInfo {
  address: string
  decimals: u32
  frozen: boolean
  last_updated: u64
  sanitize_clamp_denominator: u64
}

export interface MutableOracleInfo {
  address: Option<string>
  decimals: Option<u32>
  frozen: Option<boolean>
  sanitize_clamp_denominator: Option<u64>
}

export type NormalAction =
  | { tag: 'PoolInit'; values: void }
  | { tag: 'AddLiquidity'; values: void }
  | { tag: 'RemoveLiquidity'; values: void }
  | { tag: 'Swap'; values: void }
  | { tag: 'UpdateTwap'; values: void }
  | { tag: 'Rebalance'; values: void }
  | { tag: 'ClaimInsurance'; values: void }

export interface PriceDivergenceGuardRails {
  oracle_twap_percent_divergence: u64
}

export interface ValidityGuardRails {
  seconds_before_stale_for_pool: u64
  too_volatile_ratio: u64
}

export interface OracleGuardRails {
  price_divergence: PriceDivergenceGuardRails
  validity: ValidityGuardRails
}

export type OracleValidity =
  | { tag: 'NonPositive'; values: void }
  | { tag: 'TooVolatile'; values: void }
  | { tag: 'StaleForPool'; values: void }
  | { tag: 'Frozen'; values: void }
  | { tag: 'Valid'; values: void }

export interface HistoricalOracleData {
  last_oracle_price: u128
  last_oracle_price_twap: u128
  last_oracle_price_twap_ts: u64
}

export interface Pool {
  base_asset: string
  fee_fraction: u32
  insurance_claim: InsuranceClaim
  liquidity_max_imbalance: u128
  quote_asset: string
  status: PoolStatus
  tier: PoolTier
  token_b: string
}

export type PoolStatus =
  | { tag: 'Initialized'; values: void }
  | { tag: 'Active'; values: void }
  | { tag: 'Frozen'; values: void }
  | { tag: 'ReduceOnly'; values: void }
  | { tag: 'Settlement'; values: void }
  | { tag: 'Delisted'; values: void }

export type PoolTier =
  | { tag: 'A'; values: void }
  | { tag: 'B'; values: void }
  | { tag: 'C'; values: void }
  | { tag: 'Speculative'; values: void }
  | { tag: 'HighlySpeculative'; values: void }
  | { tag: 'Isolated'; values: void }

export interface InsuranceClaim {
  last_revenue_withdraw_ts: u64
  quote_max_insurance: u128
  quote_settled_insurance: u128
  rev_withdraw_since_last_settle: i128
}

export interface PoolResponse {
  pool: Pool
  token_a: AddressAndAmount
  token_b: AddressAndAmount
  token_share: AddressAndAmount
}

export interface PoolInfo {
  pool_address: string
  pool_response: PoolResponse
}

export interface RewardConfig {
  reward_token: string
}

export interface InitializeParams {
  admin: string
  assets: readonly [string, string]
  fee_fraction: u32
  lp_token_info: TokenInitInfo
  oracle_registry: string
  privileged_addrs: PrivilegedAddresses
  quote_max_insurance: u128
  router: string
  synthetic_sac_address: string
  tier: PoolTier
  token_b: string
}

export interface InitializeAllParams {
  base: InitializeParams
  plane: string
  reward_config: RewardConfig
}

export type SwapDirection = { tag: 'Buy'; values: void } | { tag: 'Sell'; values: void }

export interface TokenInitInfo {
  name: string
  symbol: string
  token_wasm_hash: Buffer
}

export interface AddressAndAmount {
  address: string
  amount: u128
}

export type Delay = readonly [u64]

export interface Client {
  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize: (
    {
      admin,
      emergency_admin,
      oracle_registry,
      pool_router,
      premium_token,
      unstaking_period,
      optimal_utilization,
      base_rate,
      rate_slopes,
    }: {
      admin: string
      emergency_admin: string
      oracle_registry: string
      pool_router: string
      premium_token: string
      unstaking_period: u64
      optimal_utilization: u32
      base_rate: i32
      rate_slopes: readonly [u32, u32]
    },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  deposit: (
    { user, token, amount }: { user: string; token: string; amount: u128 },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a request_withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  request_withdraw: (
    { user, token, amount }: { user: string; token: string; amount: u128 },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a cancel_request_withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  cancel_request_withdraw: (
    { user, token }: { user: string; token: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  withdraw: (
    { user, token }: { user: string; token: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a pay_premium transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  pay_premium: (
    { sender, amount }: { sender: string; amount: u128 },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a sync transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  sync: (
    { sender, token }: { sender: string; token: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a skim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  skim: (
    { sender, token }: { sender: string; token: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_oracle_registry transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_oracle_registry: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean
  }) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a get_pool_router transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_pool_router: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean
  }) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a get_premium_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_premium_token: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean
  }) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a get_unstaking_period transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_unstaking_period: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean
  }) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a get_optimal_insurance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_optimal_insurance: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean
  }) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a get_reserve transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_reserve: (
    { token }: { token: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<InsuranceFundReserve>>

  /**
   * Construct and simulate a get_stake transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_stake: (
    { user, token }: { user: string; token: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<Stake>>

  /**
   * Construct and simulate a get_optimal_utilization transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_optimal_utilization: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean
  }) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a get_utilization transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_utilization: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean
  }) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a get_rate transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_rate: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean
  }) => Promise<AssembledTransaction<i32>>

  /**
   * Construct and simulate a get_base_rate transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_base_rate: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean
  }) => Promise<AssembledTransaction<i32>>

  /**
   * Construct and simulate a get_rate_slopes transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_rate_slopes: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean
  }) => Promise<AssembledTransaction<readonly [u32, u32]>>

  /**
   * Construct and simulate a get_token_whitelist transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_token_whitelist: (
    { token }: { token: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<WhitelistToken>>

  /**
   * Construct and simulate a get_premium_payer_status transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_premium_payer_status: (
    { address }: { address: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a sync_optimal_insurance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  sync_optimal_insurance: (
    { admin }: { admin: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a file_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  file_claim: (
    { admin, token, asset }: { admin: string; token: string; asset: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_oracle_registry transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_oracle_registry: (
    { admin, oracle_registry }: { admin: string; oracle_registry: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_pool_router transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_pool_router: (
    { admin, pool_router }: { admin: string; pool_router: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_premium_payer_status transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_premium_payer_status: (
    { admin, payer, status }: { admin: string; payer: string; status: boolean },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_unstaking_period transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_unstaking_period: (
    { admin, unstaking_period }: { admin: string; unstaking_period: u64 },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_rate_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_rate_config: (
    {
      admin,
      optimal_utilization,
      base_rate,
      rate_slope_a,
      rate_slope_b,
    }: { admin: string; optimal_utilization: u32; base_rate: i32; rate_slope_a: u32; rate_slope_b: u32 },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_optimal_insurance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_optimal_insurance: (
    { admin, optimal_insurance }: { admin: string; optimal_insurance: u128 },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a add_token_whitelist transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  add_token_whitelist: (
    { admin, token, symbol }: { admin: string; token: string; symbol: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_token_whitelist_status transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_token_whitelist_status: (
    { admin, token, status }: { admin: string; token: string; status: boolean },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a remove_whitelist_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  remove_whitelist_token: (
    { admin, token }: { admin: string; token: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a kill_deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  kill_deposit: (
    { admin }: { admin: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a kill_request_withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  kill_request_withdraw: (
    { admin }: { admin: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a kill_withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  kill_withdraw: (
    { admin }: { admin: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a unkill_deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  unkill_deposit: (
    { admin }: { admin: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a unkill_request_withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  unkill_request_withdraw: (
    { admin }: { admin: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a unkill_withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  unkill_withdraw: (
    { admin }: { admin: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_is_killed_deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_is_killed_deposit: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean
  }) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a get_is_killed_request_withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_is_killed_request_withdraw: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean
  }) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a get_is_killed_withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_is_killed_withdraw: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean
  }) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a version transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  version: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean
  }) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a commit_upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  commit_upgrade: (
    { admin, new_wasm_hash }: { admin: string; new_wasm_hash: Buffer },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a apply_upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  apply_upgrade: (
    { admin }: { admin: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<Buffer>>

  /**
   * Construct and simulate a revert_upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  revert_upgrade: (
    { admin }: { admin: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_emergency_mode transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_emergency_mode: (
    { emergency_admin, value }: { emergency_admin: string; value: boolean },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_emergency_mode transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_emergency_mode: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean
  }) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a commit_transfer_ownership transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  commit_transfer_ownership: (
    { admin, role_name, new_address }: { admin: string; role_name: string; new_address: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a apply_transfer_ownership transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  apply_transfer_ownership: (
    { admin, role_name }: { admin: string; role_name: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a revert_transfer_ownership transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  revert_transfer_ownership: (
    { admin, role_name }: { admin: string; role_name: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_future_address transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_future_address: (
    { role_name }: { role_name: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean
    },
  ) => Promise<AssembledTransaction<string>>
}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, 'contractId'> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: 'hex' | 'base64'
      },
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([
        'AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAACQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAA9lbWVyZ2VuY3lfYWRtaW4AAAAAEwAAAAAAAAAPb3JhY2xlX3JlZ2lzdHJ5AAAAABMAAAAAAAAAC3Bvb2xfcm91dGVyAAAAABMAAAAAAAAADXByZW1pdW1fdG9rZW4AAAAAAAATAAAAAAAAABB1bnN0YWtpbmdfcGVyaW9kAAAABgAAAAAAAAATb3B0aW1hbF91dGlsaXphdGlvbgAAAAAEAAAAAAAAAAliYXNlX3JhdGUAAAAAAAAFAAAAAAAAAAtyYXRlX3Nsb3BlcwAAAAPtAAAAAgAAAAQAAAAEAAAAAA==',
        'AAAAAAAAAAAAAAAHZGVwb3NpdAAAAAADAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAoAAAAA',
        'AAAAAAAAAAAAAAAQcmVxdWVzdF93aXRoZHJhdwAAAAMAAAAAAAAABHVzZXIAAAATAAAAAAAAAAV0b2tlbgAAAAAAABMAAAAAAAAABmFtb3VudAAAAAAACgAAAAA=',
        'AAAAAAAAAAAAAAAXY2FuY2VsX3JlcXVlc3Rfd2l0aGRyYXcAAAAAAgAAAAAAAAAEdXNlcgAAABMAAAAAAAAABXRva2VuAAAAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAAId2l0aGRyYXcAAAACAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAALcGF5X3ByZW1pdW0AAAAAAgAAAAAAAAAGc2VuZGVyAAAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAoAAAAA',
        'AAAAAAAAAAAAAAAEc3luYwAAAAIAAAAAAAAABnNlbmRlcgAAAAAAEwAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAAEc2tpbQAAAAIAAAAAAAAABnNlbmRlcgAAAAAAEwAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAATZ2V0X29yYWNsZV9yZWdpc3RyeQAAAAAAAAAAAQAAABM=',
        'AAAAAAAAAAAAAAAPZ2V0X3Bvb2xfcm91dGVyAAAAAAAAAAABAAAAEw==',
        'AAAAAAAAAAAAAAARZ2V0X3ByZW1pdW1fdG9rZW4AAAAAAAAAAAAAAQAAABM=',
        'AAAAAAAAAAAAAAAUZ2V0X3Vuc3Rha2luZ19wZXJpb2QAAAAAAAAAAQAAAAY=',
        'AAAAAAAAAAAAAAAVZ2V0X29wdGltYWxfaW5zdXJhbmNlAAAAAAAAAAAAAAEAAAAK',
        'AAAAAAAAAAAAAAALZ2V0X3Jlc2VydmUAAAAAAQAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAQAAB9AAAAAUSW5zdXJhbmNlRnVuZFJlc2VydmU=',
        'AAAAAAAAAAAAAAAJZ2V0X3N0YWtlAAAAAAAAAgAAAAAAAAAEdXNlcgAAABMAAAAAAAAABXRva2VuAAAAAAAAEwAAAAEAAAfQAAAABVN0YWtlAAAA',
        'AAAAAAAAAAAAAAAXZ2V0X29wdGltYWxfdXRpbGl6YXRpb24AAAAAAAAAAAEAAAAE',
        'AAAAAAAAAAAAAAAPZ2V0X3V0aWxpemF0aW9uAAAAAAAAAAABAAAABA==',
        'AAAAAAAAAAAAAAAIZ2V0X3JhdGUAAAAAAAAAAQAAAAU=',
        'AAAAAAAAAAAAAAANZ2V0X2Jhc2VfcmF0ZQAAAAAAAAAAAAABAAAABQ==',
        'AAAAAAAAAAAAAAAPZ2V0X3JhdGVfc2xvcGVzAAAAAAAAAAABAAAD7QAAAAIAAAAEAAAABA==',
        'AAAAAAAAAAAAAAATZ2V0X3Rva2VuX3doaXRlbGlzdAAAAAABAAAAAAAAAAV0b2tlbgAAAAAAABMAAAABAAAH0AAAAA5XaGl0ZWxpc3RUb2tlbgAA',
        'AAAAAAAAAAAAAAAYZ2V0X3ByZW1pdW1fcGF5ZXJfc3RhdHVzAAAAAQAAAAAAAAAHYWRkcmVzcwAAAAATAAAAAQAAAAE=',
        'AAAAAAAAAAAAAAAWc3luY19vcHRpbWFsX2luc3VyYW5jZQAAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAAKZmlsZV9jbGFpbQAAAAAAAwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAV0b2tlbgAAAAAAABMAAAAAAAAABWFzc2V0AAAAAAAAEQAAAAA=',
        'AAAAAAAAAAAAAAATc2V0X29yYWNsZV9yZWdpc3RyeQAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAD29yYWNsZV9yZWdpc3RyeQAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAAPc2V0X3Bvb2xfcm91dGVyAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAALcG9vbF9yb3V0ZXIAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAAYc2V0X3ByZW1pdW1fcGF5ZXJfc3RhdHVzAAAAAwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAVwYXllcgAAAAAAABMAAAAAAAAABnN0YXR1cwAAAAAAAQAAAAA=',
        'AAAAAAAAAAAAAAAUc2V0X3Vuc3Rha2luZ19wZXJpb2QAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAEHVuc3Rha2luZ19wZXJpb2QAAAAGAAAAAA==',
        'AAAAAAAAAAAAAAAPc2V0X3JhdGVfY29uZmlnAAAAAAUAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAATb3B0aW1hbF91dGlsaXphdGlvbgAAAAAEAAAAAAAAAAliYXNlX3JhdGUAAAAAAAAFAAAAAAAAAAxyYXRlX3Nsb3BlX2EAAAAEAAAAAAAAAAxyYXRlX3Nsb3BlX2IAAAAEAAAAAA==',
        'AAAAAAAAAAAAAAAVc2V0X29wdGltYWxfaW5zdXJhbmNlAAAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAABFvcHRpbWFsX2luc3VyYW5jZQAAAAAAAAoAAAAA',
        'AAAAAAAAAAAAAAATYWRkX3Rva2VuX3doaXRlbGlzdAAAAAADAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABXRva2VuAAAAAAAAEwAAAAAAAAAGc3ltYm9sAAAAAAARAAAAAA==',
        'AAAAAAAAAAAAAAAac2V0X3Rva2VuX3doaXRlbGlzdF9zdGF0dXMAAAAAAAMAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAAAAAAZzdGF0dXMAAAAAAAEAAAAA',
        'AAAAAAAAAAAAAAAWcmVtb3ZlX3doaXRlbGlzdF90b2tlbgAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAV0b2tlbgAAAAAAABMAAAAA',
        'AAAAAAAAAAAAAAAMa2lsbF9kZXBvc2l0AAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAAVa2lsbF9yZXF1ZXN0X3dpdGhkcmF3AAAAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAANa2lsbF93aXRoZHJhdwAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAAOdW5raWxsX2RlcG9zaXQAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAAXdW5raWxsX3JlcXVlc3Rfd2l0aGRyYXcAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAAPdW5raWxsX3dpdGhkcmF3AAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAAVZ2V0X2lzX2tpbGxlZF9kZXBvc2l0AAAAAAAAAAAAAAEAAAAB',
        'AAAAAAAAAAAAAAAeZ2V0X2lzX2tpbGxlZF9yZXF1ZXN0X3dpdGhkcmF3AAAAAAAAAAAAAQAAAAE=',
        'AAAAAAAAAAAAAAAWZ2V0X2lzX2tpbGxlZF93aXRoZHJhdwAAAAAAAAAAAAEAAAAB',
        'AAAAAAAAAAAAAAAHdmVyc2lvbgAAAAAAAAAAAQAAAAQ=',
        'AAAAAAAAAAAAAAAOY29tbWl0X3VwZ3JhZGUAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAANbmV3X3dhc21faGFzaAAAAAAAA+4AAAAgAAAAAA==',
        'AAAAAAAAAAAAAAANYXBwbHlfdXBncmFkZQAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAEAAAPuAAAAIA==',
        'AAAAAAAAAAAAAAAOcmV2ZXJ0X3VwZ3JhZGUAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAASc2V0X2VtZXJnZW5jeV9tb2RlAAAAAAACAAAAAAAAAA9lbWVyZ2VuY3lfYWRtaW4AAAAAEwAAAAAAAAAFdmFsdWUAAAAAAAABAAAAAA==',
        'AAAAAAAAAAAAAAASZ2V0X2VtZXJnZW5jeV9tb2RlAAAAAAAAAAAAAQAAAAE=',
        'AAAAAAAAAAAAAAAZY29tbWl0X3RyYW5zZmVyX293bmVyc2hpcAAAAAAAAAMAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAJcm9sZV9uYW1lAAAAAAAAEQAAAAAAAAALbmV3X2FkZHJlc3MAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAAYYXBwbHlfdHJhbnNmZXJfb3duZXJzaGlwAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAlyb2xlX25hbWUAAAAAAAARAAAAAA==',
        'AAAAAAAAAAAAAAAZcmV2ZXJ0X3RyYW5zZmVyX293bmVyc2hpcAAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAJcm9sZV9uYW1lAAAAAAAAEQAAAAA=',
        'AAAAAAAAAAAAAAASZ2V0X2Z1dHVyZV9hZGRyZXNzAAAAAAABAAAAAAAAAAlyb2xlX25hbWUAAAAAAAARAAAAAQAAABM=',
        'AAAABAAAAAAAAAAAAAAAEkluc3VyYW5jZUZ1bmRFcnJvcgAAAAAAHQAAABJJbnN1cmFuY2VGdW5kRXJyb3IAAAAAABRNYXhJRldpdGhkcmF3UmVhY2hlZAAAAAAAAAAAAAAAFU5vSUZXaXRoZHJhd0F2YWlsYWJsZQAAAAAAAAEAAAAAAAAAEEludmFsaWRJRlVuc3Rha2UAAAACAAAAAAAAABRJbnZhbGlkSUZVbnN0YWtlU2l6ZQAAAAMAAAAAAAAAD0ludmFsaWRJRlJlYmFzZQAAAAAGAAAAAAAAABtJbnZhbGlkSW5zdXJhbmNlVW5zdGFrZVNpemUAAAAABwAAAAAAAAAbSUZXaXRoZHJhd1JlcXVlc3RJblByb2dyZXNzAAAAAAkAAAAAAAAAHU5vSUZXaXRoZHJhd1JlcXVlc3RJblByb2dyZXNzAAAAAAAACgAAAAAAAAAZSUZXaXRoZHJhd1JlcXVlc3RUb29TbWFsbAAAAAAAAAsAAAAAAAAAF0ludmFsaWRJRlNoYXJlc0RldGVjdGVkAAAAAAwAAAAAAAAAFEluc3VmZmljaWVudElGU2hhcmVzAAAADQAAAAAAAAAeVHJ5aW5nVG9SZW1vdmVMaXF1aWRpdHlUb29GYXN0AAAAAAAOAAAAAAAAABJBbHJlYWR5SW5pdGlhbGl6ZWQAAAAAAA8AAAAAAAAADU5vdEF1dGhvcml6ZWQAAAAAAAAQAAAAAAAAAAtBZG1pbk5vdFNldAAAAAARAAAAAAAAABZJbnN1ZmZpY2llbnRDb2xsYXRlcmFsAAAAAAASAAAAAAAAABFJbnZhbGlkSUZEZXRlY3RlZAAAAAAAABMAAAAAAAAAEFRvb011Y2hJbnN1cmFuY2UAAAAUAAAAAAAAABlJbnZhbGlkT3B0aW1hbFV0aWxpemF0aW9uAAAAAAAAFQAAAAAAAAAQSW52YWxpZFRpbWVzdGFtcAAAABYAAAAAAAAAEkNvc3RCYXNpc1VuZGVyZmxvdwAAAAAAFwAAAAAAAAAPUXVlcnlQb29sRmFpbGVkAAAAABgAAAAAAAAAF1BheUluc3VyYW5jZUNsYWltRmFpbGVkAAAAABkAAAAAAAAAEFVuc3VwcG9ydGVkVG9rZW4AAAAaAAAAAAAAABNUb2tlbkFscmVhZHlEZWxldGVkAAAAABsAAAAAAAAADUludmFsaWRPcmFjbGUAAAAAAAAcAAAAAAAAABFGdW5kRGVwb3NpdEtpbGxlZAAAAAAAAB4AAAAAAAAAGUZ1bmRSZXF1ZXN0V2l0aGRyYXdLaWxsZWQAAAAAAAAfAAAAAAAAABJGdW5kV2l0aGRyYXdLaWxsZWQAAAAAACA=',
        'AAAAAQAAAAAAAAAAAAAAFEluc3VyYW5jZUZ1bmRSZXNlcnZlAAAACgAAAAAAAAAHYmFsYW5jZQAAAAAKAAAAAAAAAApsYXN0X2NsYWltAAAAAAAKAAAAAAAAAA1sYXN0X2NsYWltX3RzAAAAAAAABgAAAAAAAAAObGFzdF91cGRhdGVfdHMAAAAAAAYAAAAAAAAAC3NoYXJlc19iYXNlAAAAAAoAAAAAAAAABXRva2VuAAAAAAAAEwAAAAAAAAAMdG90YWxfY2xhaW1zAAAACgAAAAAAAAAOdG90YWxfZGVwb3NpdHMAAAAAAAoAAAAAAAAADHRvdGFsX3NoYXJlcwAAAAoAAAAAAAAAEXRvdGFsX3dpdGhkcmF3YWxzAAAAAAAACg==',
        'AAAAAgAAAAAAAAAAAAAAC1N0YWtlQWN0aW9uAAAAAAQAAAAAAAAAAAAAAAdEZXBvc2l0AAAAAAAAAAAAAAAAD1dpdGhkcmF3UmVxdWVzdAAAAAAAAAAAAAAAABVXaXRoZHJhd0NhbmNlbFJlcXVlc3QAAAAAAAAAAAAAAAAAAAhXaXRoZHJhdw==',
        'AAAAAQAAAAAAAAAAAAAABVN0YWtlAAAAAAAACAAAAAAAAAAEYmFzZQAAAAoAAAAAAAAACmNvc3RfYmFzaXMAAAAAAAoAAAAAAAAAHGxhc3Rfd2l0aGRyYXdfcmVxdWVzdF9zaGFyZXMAAAAKAAAAAAAAABhsYXN0X3dpdGhkcmF3X3JlcXVlc3RfdHMAAAAGAAAAAAAAABtsYXN0X3dpdGhkcmF3X3JlcXVlc3RfdmFsdWUAAAAACgAAAAAAAAAGc2hhcmVzAAAAAAAKAAAAAAAAAAV0b2tlbgAAAAAAABMAAAAAAAAABHVzZXIAAAAT',
        'AAAAAQAAAAAAAAAAAAAADldoaXRlbGlzdFRva2VuAAAAAAADAAAAAAAAAAZhY3RpdmUAAAAAAAEAAAAAAAAAB2FkZHJlc3MAAAAAEwAAAAAAAAAGc3ltYm9sAAAAAAAR',
        'AAAABAAAAAAAAAAAAAAAEkFjY2Vzc0NvbnRyb2xFcnJvcgAAAAAABwAAABJBY2Nlc3NDb250cm9sRXJyb3IAAAAAAAxSb2xlTm90Rm91bmQAAABlAAAAAAAAAAxVbmF1dGhvcml6ZWQAAABmAAAAAAAAAA9BZG1pbkFscmVhZHlTZXQAAAAAZwAAAAAAAAAMQmFkUm9sZVVzYWdlAAAAaAAAAAAAAAATQW5vdGhlckFjdGlvbkFjdGl2ZQAAAAtaAAAAAAAAAA5Ob0FjdGlvbkFjdGl2ZQAAAAALWwAAAAAAAAARQWN0aW9uTm90UmVhZHlZZXQAAAAAAAtc',
        'AAAABAAAAAAAAAAAAAAADFVwZ3JhZGVFcnJvcgAAAAMAAAAMVXBncmFkZUVycm9yAAAAE0Fub3RoZXJBY3Rpb25BY3RpdmUAAAALWgAAAAAAAAAOTm9BY3Rpb25BY3RpdmUAAAAAC1sAAAAAAAAAEUFjdGlvbk5vdFJlYWR5WWV0AAAAAAALXA==',
        'AAAABAAAAAAAAAAAAAAACU1hdGhFcnJvcgAAAAAAAAIAAAAZTWF0aEVycm9yOiBOdW1iZXJPdmVyZmxvdwAAAAAAAA5OdW1iZXJPdmVyZmxvdwAAAAAB/gAAAAAAAAAJTWF0aEVycm9yAAAAAAAB/w==',
        'AAAABAAAAAAAAAAAAAAAC09yYWNsZUVycm9yAAAAAAMAAAAeT3JhY2xlRXJyb3I6IE9yYWNsZU5vblBvc2l0aXZlAAAAAAART3JhY2xlTm9uUG9zaXRpdmUAAAAAAAJZAAAAAAAAABFPcmFjbGVUb29Wb2xhdGlsZQAAAAAAAloAAAAAAAAAEk9yYWNsZVN0YWxlRm9yUG9vbAAAAAACWw==',
        'AAAABAAAAAAAAAAAAAAADFN0b3JhZ2VFcnJvcgAAAAIAAAAMU3RvcmFnZUVycm9yAAAAE1ZhbHVlTm90SW5pdGlhbGl6ZWQAAAAB9QAAAAAAAAAMVmFsdWVNaXNzaW5nAAAB9g==',
        'AAAABAAAAAAAAAAAAAAAD1ZhbGlkYXRpb25FcnJvcgAAAAAEAAAAD1ZhbGlkYXRpb25FcnJvcgAAAAAMSW52YWxpZFRva2VuAAADIQAAAAAAAAARSW52YWxpZFBlcmNlbnRhZ2UAAAAAAAMiAAAAAAAAAApSZWVudHJhbmN5AAAAAAMjAAAAAAAAAApaZXJvQW1vdW50AAAAAAMk',
        'AAAAAQAAAAAAAAAAAAAAE1ByaXZpbGVnZWRBZGRyZXNzZXMAAAAABQAAAAAAAAAPZW1lcmdlbmN5X2FkbWluAAAAABMAAAAAAAAAFmVtZXJnZW5jeV9wYXVzZV9hZG1pbnMAAAAAA+oAAAATAAAAAAAAABBvcGVyYXRpb25zX2FkbWluAAAAEwAAAAAAAAALcGF1c2VfYWRtaW4AAAAAEwAAAAAAAAANcmV3YXJkc19hZG1pbgAAAAAAABM=',
        'AAAAAQAAAAAAAAAAAAAAD09yYWNsZVByaWNlRGF0YQAAAAACAAAAAAAAAAVkZWxheQAAAAAAB9AAAAAFRGVsYXkAAAAAAAAAAAAABXByaWNlAAAAAAAACg==',
        'AAAAAQAAAAAAAAAAAAAACk9yYWNsZUluZm8AAAAAAAUAAAAAAAAAB2FkZHJlc3MAAAAAEwAAAAAAAAAIZGVjaW1hbHMAAAAEAAAAAAAAAAZmcm96ZW4AAAAAAAEAAAAAAAAADGxhc3RfdXBkYXRlZAAAAAYAAAAAAAAAGnNhbml0aXplX2NsYW1wX2Rlbm9taW5hdG9yAAAAAAAG',
        'AAAAAQAAAAAAAAAAAAAAEU11dGFibGVPcmFjbGVJbmZvAAAAAAAABAAAAAAAAAAHYWRkcmVzcwAAAAPoAAAAEwAAAAAAAAAIZGVjaW1hbHMAAAPoAAAABAAAAAAAAAAGZnJvemVuAAAAAAPoAAAAAQAAAAAAAAAac2FuaXRpemVfY2xhbXBfZGVub21pbmF0b3IAAAAAA+gAAAAG',
        'AAAAAgAAAAAAAAAAAAAADE5vcm1hbEFjdGlvbgAAAAcAAAAAAAAAAAAAAAhQb29sSW5pdAAAAAAAAAAAAAAADEFkZExpcXVpZGl0eQAAAAAAAAAAAAAAD1JlbW92ZUxpcXVpZGl0eQAAAAAAAAAAAAAAAARTd2FwAAAAAAAAAAAAAAAKVXBkYXRlVHdhcAAAAAAAAAAAAAAAAAAJUmViYWxhbmNlAAAAAAAAAAAAAAAAAAAOQ2xhaW1JbnN1cmFuY2UAAA==',
        'AAAAAQAAAAAAAAAAAAAAGVByaWNlRGl2ZXJnZW5jZUd1YXJkUmFpbHMAAAAAAAABAAAAAAAAAB5vcmFjbGVfdHdhcF9wZXJjZW50X2RpdmVyZ2VuY2UAAAAAAAY=',
        'AAAAAQAAAAAAAAAAAAAAElZhbGlkaXR5R3VhcmRSYWlscwAAAAAAAgAAAAAAAAAdc2Vjb25kc19iZWZvcmVfc3RhbGVfZm9yX3Bvb2wAAAAAAAAGAAAAAAAAABJ0b29fdm9sYXRpbGVfcmF0aW8AAAAAAAY=',
        'AAAAAQAAAAAAAAAAAAAAEE9yYWNsZUd1YXJkUmFpbHMAAAACAAAAAAAAABBwcmljZV9kaXZlcmdlbmNlAAAH0AAAABlQcmljZURpdmVyZ2VuY2VHdWFyZFJhaWxzAAAAAAAAAAAAAAh2YWxpZGl0eQAAB9AAAAASVmFsaWRpdHlHdWFyZFJhaWxzAAA=',
        'AAAAAgAAAAAAAAAAAAAADk9yYWNsZVZhbGlkaXR5AAAAAAAFAAAAAAAAAAAAAAALTm9uUG9zaXRpdmUAAAAAAAAAAAAAAAALVG9vVm9sYXRpbGUAAAAAAAAAAAAAAAAMU3RhbGVGb3JQb29sAAAAAAAAAAAAAAAGRnJvemVuAAAAAAAAAAAAAAAAAAVWYWxpZAAAAA==',
        'AAAAAQAAAAAAAAAAAAAAFEhpc3RvcmljYWxPcmFjbGVEYXRhAAAAAwAAAAAAAAARbGFzdF9vcmFjbGVfcHJpY2UAAAAAAAAKAAAAAAAAABZsYXN0X29yYWNsZV9wcmljZV90d2FwAAAAAAAKAAAAAAAAABlsYXN0X29yYWNsZV9wcmljZV90d2FwX3RzAAAAAAAABg==',
        'AAAAAQAAAAAAAAAAAAAABFBvb2wAAAAIAAAAAAAAAApiYXNlX2Fzc2V0AAAAAAARAAAAAAAAAAxmZWVfZnJhY3Rpb24AAAAEAAAAAAAAAA9pbnN1cmFuY2VfY2xhaW0AAAAH0AAAAA5JbnN1cmFuY2VDbGFpbQAAAAAAAAAAABdsaXF1aWRpdHlfbWF4X2ltYmFsYW5jZQAAAAAKAAAAAAAAAAtxdW90ZV9hc3NldAAAAAARAAAAAAAAAAZzdGF0dXMAAAAAB9AAAAAKUG9vbFN0YXR1cwAAAAAAAAAAAAR0aWVyAAAH0AAAAAhQb29sVGllcgAAAAAAAAAHdG9rZW5fYgAAAAAT',
        'AAAAAgAAAAAAAAAAAAAAClBvb2xTdGF0dXMAAAAAAAYAAAAAAAAAAAAAAAtJbml0aWFsaXplZAAAAAAAAAAAAAAAAAZBY3RpdmUAAAAAAAAAAAAAAAAABkZyb3plbgAAAAAAAAAAAAAAAAAKUmVkdWNlT25seQAAAAAAAAAAAAAAAAAKU2V0dGxlbWVudAAAAAAAAAAAAAAAAAAIRGVsaXN0ZWQ=',
        'AAAAAgAAAAAAAAAAAAAACFBvb2xUaWVyAAAABgAAAAAAAAAAAAAAAUEAAAAAAAAAAAAAAAAAAAFCAAAAAAAAAAAAAAAAAAABQwAAAAAAAAAAAAAAAAAAC1NwZWN1bGF0aXZlAAAAAAAAAAAAAAAAEUhpZ2hseVNwZWN1bGF0aXZlAAAAAAAAAAAAAAAAAAAISXNvbGF0ZWQ=',
        'AAAAAQAAAAAAAAAAAAAADkluc3VyYW5jZUNsYWltAAAAAAAEAAAAAAAAABhsYXN0X3JldmVudWVfd2l0aGRyYXdfdHMAAAAGAAAAAAAAABNxdW90ZV9tYXhfaW5zdXJhbmNlAAAAAAoAAAAAAAAAF3F1b3RlX3NldHRsZWRfaW5zdXJhbmNlAAAAAAoAAAAAAAAAHnJldl93aXRoZHJhd19zaW5jZV9sYXN0X3NldHRsZQAAAAAACw==',
        'AAAAAQAAAAAAAAAAAAAADFBvb2xSZXNwb25zZQAAAAQAAAAAAAAABHBvb2wAAAfQAAAABFBvb2wAAAAAAAAAB3Rva2VuX2EAAAAH0AAAABBBZGRyZXNzQW5kQW1vdW50AAAAAAAAAAd0b2tlbl9iAAAAB9AAAAAQQWRkcmVzc0FuZEFtb3VudAAAAAAAAAALdG9rZW5fc2hhcmUAAAAH0AAAABBBZGRyZXNzQW5kQW1vdW50',
        'AAAAAQAAAAAAAAAAAAAACFBvb2xJbmZvAAAAAgAAAAAAAAAMcG9vbF9hZGRyZXNzAAAAEwAAAAAAAAANcG9vbF9yZXNwb25zZQAAAAAAB9AAAAAMUG9vbFJlc3BvbnNl',
        'AAAAAQAAAAAAAAAAAAAADFJld2FyZENvbmZpZwAAAAEAAAAAAAAADHJld2FyZF90b2tlbgAAABM=',
        'AAAAAQAAAAAAAAAAAAAAEEluaXRpYWxpemVQYXJhbXMAAAALAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABmFzc2V0cwAAAAAD7QAAAAIAAAARAAAAEQAAAAAAAAAMZmVlX2ZyYWN0aW9uAAAABAAAAAAAAAANbHBfdG9rZW5faW5mbwAAAAAAB9AAAAANVG9rZW5Jbml0SW5mbwAAAAAAAAAAAAAPb3JhY2xlX3JlZ2lzdHJ5AAAAABMAAAAAAAAAEHByaXZpbGVnZWRfYWRkcnMAAAfQAAAAE1ByaXZpbGVnZWRBZGRyZXNzZXMAAAAAAAAAABNxdW90ZV9tYXhfaW5zdXJhbmNlAAAAAAoAAAAAAAAABnJvdXRlcgAAAAAAEwAAAAAAAAAVc3ludGhldGljX3NhY19hZGRyZXNzAAAAAAAAEwAAAAAAAAAEdGllcgAAB9AAAAAIUG9vbFRpZXIAAAAAAAAAB3Rva2VuX2IAAAAAEw==',
        'AAAAAQAAAAAAAAAAAAAAE0luaXRpYWxpemVBbGxQYXJhbXMAAAAAAwAAAAAAAAAEYmFzZQAAB9AAAAAQSW5pdGlhbGl6ZVBhcmFtcwAAAAAAAAAFcGxhbmUAAAAAAAATAAAAAAAAAA1yZXdhcmRfY29uZmlnAAAAAAAH0AAAAAxSZXdhcmRDb25maWc=',
        'AAAAAgAAAAAAAAAAAAAADVN3YXBEaXJlY3Rpb24AAAAAAAACAAAAAAAAAAAAAAADQnV5AAAAAAAAAAAAAAAABFNlbGw=',
        'AAAAAQAAAAAAAAAAAAAADVRva2VuSW5pdEluZm8AAAAAAAADAAAAAAAAAARuYW1lAAAAEAAAAAAAAAAGc3ltYm9sAAAAAAAQAAAAAAAAAA90b2tlbl93YXNtX2hhc2gAAAAD7gAAACA=',
        'AAAAAQAAAAAAAAAAAAAAEEFkZHJlc3NBbmRBbW91bnQAAAACAAAAAAAAAAdhZGRyZXNzAAAAABMAAAAAAAAABmFtb3VudAAAAAAACg==',
        'AAAAAQAAAAAAAAAAAAAABURlbGF5AAAAAAAAAQAAAAAAAAABMAAAAAAAAAY=',
      ]),
      options,
    )
  }
  public readonly fromJSON = {
    initialize: this.txFromJSON<null>,
    deposit: this.txFromJSON<null>,
    request_withdraw: this.txFromJSON<null>,
    cancel_request_withdraw: this.txFromJSON<null>,
    withdraw: this.txFromJSON<null>,
    pay_premium: this.txFromJSON<null>,
    sync: this.txFromJSON<null>,
    skim: this.txFromJSON<null>,
    get_oracle_registry: this.txFromJSON<string>,
    get_pool_router: this.txFromJSON<string>,
    get_premium_token: this.txFromJSON<string>,
    get_unstaking_period: this.txFromJSON<u64>,
    get_optimal_insurance: this.txFromJSON<u128>,
    get_reserve: this.txFromJSON<InsuranceFundReserve>,
    get_stake: this.txFromJSON<Stake>,
    get_optimal_utilization: this.txFromJSON<u32>,
    get_utilization: this.txFromJSON<u32>,
    get_rate: this.txFromJSON<i32>,
    get_base_rate: this.txFromJSON<i32>,
    get_rate_slopes: this.txFromJSON<readonly [u32, u32]>,
    get_token_whitelist: this.txFromJSON<WhitelistToken>,
    get_premium_payer_status: this.txFromJSON<boolean>,
    sync_optimal_insurance: this.txFromJSON<null>,
    file_claim: this.txFromJSON<null>,
    set_oracle_registry: this.txFromJSON<null>,
    set_pool_router: this.txFromJSON<null>,
    set_premium_payer_status: this.txFromJSON<null>,
    set_unstaking_period: this.txFromJSON<null>,
    set_rate_config: this.txFromJSON<null>,
    set_optimal_insurance: this.txFromJSON<null>,
    add_token_whitelist: this.txFromJSON<null>,
    set_token_whitelist_status: this.txFromJSON<null>,
    remove_whitelist_token: this.txFromJSON<null>,
    kill_deposit: this.txFromJSON<null>,
    kill_request_withdraw: this.txFromJSON<null>,
    kill_withdraw: this.txFromJSON<null>,
    unkill_deposit: this.txFromJSON<null>,
    unkill_request_withdraw: this.txFromJSON<null>,
    unkill_withdraw: this.txFromJSON<null>,
    get_is_killed_deposit: this.txFromJSON<boolean>,
    get_is_killed_request_withdraw: this.txFromJSON<boolean>,
    get_is_killed_withdraw: this.txFromJSON<boolean>,
    version: this.txFromJSON<u32>,
    commit_upgrade: this.txFromJSON<null>,
    apply_upgrade: this.txFromJSON<Buffer>,
    revert_upgrade: this.txFromJSON<null>,
    set_emergency_mode: this.txFromJSON<null>,
    get_emergency_mode: this.txFromJSON<boolean>,
    commit_transfer_ownership: this.txFromJSON<null>,
    apply_transfer_ownership: this.txFromJSON<null>,
    revert_transfer_ownership: this.txFromJSON<null>,
    get_future_address: this.txFromJSON<string>,
  }
}

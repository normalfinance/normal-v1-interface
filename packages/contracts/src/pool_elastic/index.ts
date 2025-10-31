import type { i128, Option, u128, u32, u64 } from '@stellar/stellar-sdk/contract'
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

export const LiquidityPoolError = {
  201: { message: 'AlreadyInitialized' },
  202: { message: 'PlaneAlreadyInitialized' },
  203: { message: 'RewardsAlreadyInitialized' },
  204: { message: 'InvariantDoesNotHold' },
  205: { message: 'PoolDepositKilled' },
  206: { message: 'PoolSwapKilled' },
  207: { message: 'PoolClaimKilled' },
  208: { message: 'FutureShareIdNotSet' },
  209: { message: 'SinkDepositFailure' },
  210: { message: 'SinkWithdrawFailure' },
  211: { message: 'InvalidTokenADelta' },
}

export type DataKey =
  | { tag: 'TokenA'; values: void }
  | { tag: 'TokenB'; values: void }
  | { tag: 'BaseAsset'; values: void }
  | { tag: 'QuoteAsset'; values: void }
  | { tag: 'ReserveA'; values: void }
  | { tag: 'ReserveB'; values: void }
  | { tag: 'Plane'; values: void }
  | { tag: 'Router'; values: void }
  | { tag: 'Sink'; values: void }
  | { tag: 'Oracle'; values: void }
  | { tag: 'OracleGuardRails'; values: void }
  | { tag: 'HistoricalOracleData'; values: readonly [string] }
  | { tag: 'FeeFraction'; values: void }
  | { tag: 'FeeRebateFraction'; values: void }
  | { tag: 'ProtocolFeeFraction'; values: void }
  | { tag: 'ProtocolFeeA'; values: void }
  | { tag: 'ProtocolFeeB'; values: void }
  | { tag: 'BaseTaxFraction'; values: void }
  | { tag: 'TaxIncline'; values: void }
  | { tag: 'MaxTaxFraction'; values: void }
  | { tag: 'ProtocolTaxB'; values: void }
  | { tag: 'IsKilledSwap'; values: void }
  | { tag: 'IsKilledDeposit'; values: void }
  | { tag: 'IsKilledClaim'; values: void }
  | { tag: 'IsKilledTax'; values: void }
  | { tag: 'IsKilledBonus'; values: void }
  | { tag: 'TokenFutureWASM'; values: void }
  | { tag: 'GaugeFutureWASM'; values: void }

export const AccessControlError = {
  101: { message: 'RoleNotFound' },
  102: { message: 'Unauthorized' },
  103: { message: 'AdminAlreadySet' },
  104: { message: 'BadRoleUsage' },
  2906: { message: 'AnotherActionActive' },
  2907: { message: 'NoActionActive' },
  2908: { message: 'ActionNotReadyYet' },
}

export type WASMDataKey =
  | { tag: 'TokenHash'; values: void }
  | { tag: 'TokenFutureWASM'; values: void }
  | { tag: 'GaugeWASM'; values: void }
  | { tag: 'FutureGaugeWASM'; values: void }
  | { tag: 'ConstantPoolHash'; values: void }
  | { tag: 'ElasticPoolHash'; values: void }

export const GaugeError = {
  207: { message: 'ClaimKilled' },
  305: { message: 'GaugesOverMax' },
  401: { message: 'GaugeAlreadyExists' },
  404: { message: 'GaugeNotFound' },
}

export interface RewardConfig {
  expired_at: u64
  start_at: u64
  tps: u128
}

export const PoolValidationError = {
  2001: { message: 'WrongInputVecSize' },
  2003: { message: 'FeeOutOfBounds' },
  2004: { message: 'AllCoinsRequired' },
  2005: { message: 'InMinNotSatisfied' },
  2006: { message: 'OutMinNotSatisfied' },
  2007: { message: 'CannotSwapSameToken' },
  2008: { message: 'InTokenOutOfBounds' },
  2009: { message: 'OutTokenOutOfBounds' },
  2010: { message: 'EmptyPool' },
  2011: { message: 'InvalidDepositAmount' },
  2012: { message: 'AdminFeeOutOfBounds' },
  2013: { message: 'UnknownPoolType' },
  2014: { message: 'ZeroSharesBurned' },
  2015: { message: 'TooManySharesBurned' },
  2017: { message: 'CannotComparePools' },
  2018: { message: 'ZeroAmount' },
  2019: { message: 'InsufficientBalance' },
  2020: { message: 'InMaxNotSatisfied' },
  2021: { message: 'WithdrawExceedsMinLiquidity' },
  2022: { message: 'RebaseTooSoon' },
  2023: { message: 'CircuitBreaker' },
  2024: { message: 'InvalidOracle' },
}

export const RewardsError = {
  701: { message: 'PastTimeNotAllowed' },
  702: { message: 'SameRewardsConfig' },
}

export interface PoolRewardConfig {
  expired_at: u64
  tps: u128
}

export interface PoolRewardData {
  accumulated: u128
  block: u64
  claimed: u128
  last_time: u64
}

export interface UserRewardData {
  last_block: u64
  pool_accumulated: u128
  to_claim: u128
}

/**
 * Price data for an asset at a specific timestamp
 */
export interface PriceData {
  price: i128
  timestamp: u64
}

/**
 * Asset type
 */
export type Asset = { tag: 'Stellar'; values: readonly [string] } | { tag: 'Other'; values: readonly [string] }

export const Errors = {
  2906: { message: 'AnotherActionActive' },
  2907: { message: 'NoActionActive' },
  2908: { message: 'ActionNotReadyYet' },
}

export const MathError = {
  /**
   * MathError: NumberOverflow
   */
  510: { message: 'NumberOverflow' },
  /**
   * MathError: Generic math error
   */
  511: { message: 'MathError' },
  /**
   * MathError: Addition operation caused overflow
   */
  512: { message: 'AdditionOverflow' },
  /**
   * MathError: Subtraction operation caused underflow
   */
  513: { message: 'SubtractionUnderflow' },
  /**
   * MathError: Multiplication operation caused overflow
   */
  514: { message: 'MultiplicationOverflow' },
  /**
   * MathError: Division by zero
   */
  515: { message: 'DivisionByZero' },
  /**
   * MathError: Type conversion overflow
   */
  516: { message: 'ConversionOverflow' },
  /**
   * MathError: Attempted to convert negative value to unsigned type
   */
  517: { message: 'NegativeToUnsigned' },
  /**
   * MathError: Fixed-point arithmetic overflow
   */
  518: { message: 'FixedPointOverflow' },
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
  201: { message: 'AlreadyInitialized' },
  501: { message: 'ValueNotInitialized' },
  502: { message: 'ValueMissing' },
  503: { message: 'ValueConversionError' },
}

export const ValidationError = {
  /**
   * ValidationError
   */
  801: { message: 'InvalidToken' },
  802: { message: 'InvalidPercentage' },
  804: { message: 'ZeroAmount' },
}

export interface OraclePriceData {
  delay: Delay
  price: u128
}

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
  last_price: u128
  last_price_twap: u128
  last_update_ts: u64
}

export type Delay = readonly [u64]

export interface Client {
  /**
   * Construct and simulate a initialize_all transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize_all: (
    {
      admin,
      privileged_addrs,
      router,
      oracle,
      lp_token_wasm_hash,
      tokens,
      fees_config,
      assets_config,
      extra_addrs,
    }: {
      admin: string
      privileged_addrs: readonly [string, string, string, string, Array<string>, string]
      router: string
      oracle: string
      lp_token_wasm_hash: Buffer
      tokens: Array<string>
      fees_config: readonly [u32, u32]
      assets_config: readonly [string, string]
      extra_addrs: readonly [string, string, string]
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
   * Construct and simulate a pool_type transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  pool_type: (options?: {
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
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize: (
    {
      admin,
      privileged_addrs,
      router,
      oracle,
      lp_token_wasm_hash,
      tokens,
      fees_config,
      assets_config,
    }: {
      admin: string
      privileged_addrs: readonly [string, string, string, string, Array<string>, string]
      router: string
      oracle: string
      lp_token_wasm_hash: Buffer
      tokens: Array<string>
      fees_config: readonly [u32, u32]
      assets_config: readonly [string, string]
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
   * Construct and simulate a share_id transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  share_id: (options?: {
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
   * Construct and simulate a get_total_shares transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_shares: (options?: {
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
   * Construct and simulate a get_tokens transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_tokens: (options?: {
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
  }) => Promise<AssembledTransaction<Array<string>>>

  /**
   * Construct and simulate a deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  deposit: (
    { user, desired_amounts, min_shares }: { user: string; desired_amounts: Array<u128>; min_shares: u128 },
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
  ) => Promise<AssembledTransaction<readonly [Array<u128>, u128]>>

  /**
   * Construct and simulate a swap transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  swap: (
    {
      user,
      in_idx,
      out_idx,
      in_amount,
      out_min,
    }: { user: string; in_idx: u32; out_idx: u32; in_amount: u128; out_min: u128 },
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
  ) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a estimate_swap transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  estimate_swap: (
    { in_idx, out_idx, in_amount }: { in_idx: u32; out_idx: u32; in_amount: u128 },
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
  ) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a swap_strict_receive transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  swap_strict_receive: (
    {
      user,
      in_idx,
      out_idx,
      out_amount,
      in_max,
    }: { user: string; in_idx: u32; out_idx: u32; out_amount: u128; in_max: u128 },
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
  ) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a estimate_swap_strict_receive transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  estimate_swap_strict_receive: (
    { in_idx, out_idx, out_amount }: { in_idx: u32; out_idx: u32; out_amount: u128 },
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
  ) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  withdraw: (
    { user, share_amount, min_amounts }: { user: string; share_amount: u128; min_amounts: Array<u128> },
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
  ) => Promise<AssembledTransaction<Array<u128>>>

  /**
   * Construct and simulate a get_reserves transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_reserves: (options?: {
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
  }) => Promise<AssembledTransaction<Array<u128>>>

  /**
   * Construct and simulate a get_fee_fraction transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_fee_fraction: (options?: {
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
   * Construct and simulate a get_protocol_fee_fraction transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_protocol_fee_fraction: (options?: {
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
   * Construct and simulate a get_info transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_info: (options?: {
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
  }) => Promise<AssembledTransaction<Map<string, any>>>

  /**
   * Construct and simulate a set_privileged_addrs transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_privileged_addrs: (
    {
      admin,
      rewards_admin,
      operations_admin,
      pause_admin,
      emergency_pause_admins,
      system_fee_admin,
    }: {
      admin: string
      rewards_admin: string
      operations_admin: string
      pause_admin: string
      emergency_pause_admins: Array<string>
      system_fee_admin: string
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
   * Construct and simulate a get_privileged_addrs transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_privileged_addrs: (options?: {
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
  }) => Promise<AssembledTransaction<Map<string, Array<string>>>>

  /**
   * Construct and simulate a set_oracle_guard_rails transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_oracle_guard_rails: (
    {
      admin,
      twap_divergence,
      stale_limit,
      too_volatile_ratio,
    }: { admin: string; twap_divergence: u64; stale_limit: u64; too_volatile_ratio: u64 },
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
   * Construct and simulate a get_oracle_guard_rails transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_oracle_guard_rails: (options?: {
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
  }) => Promise<AssembledTransaction<OracleGuardRails>>

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
   * Construct and simulate a kill_swap transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  kill_swap: (
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
   * Construct and simulate a kill_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  kill_claim: (
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
   * Construct and simulate a kill_tax transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  kill_tax: (
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
   * Construct and simulate a kill_bonus transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  kill_bonus: (
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
   * Construct and simulate a unkill_swap transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  unkill_swap: (
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
   * Construct and simulate a unkill_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  unkill_claim: (
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
   * Construct and simulate a unkill_tax transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  unkill_tax: (
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
   * Construct and simulate a unkill_bonus transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  unkill_bonus: (
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
   * Construct and simulate a get_is_killed_swap transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_is_killed_swap: (options?: {
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
   * Construct and simulate a get_is_killed_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_is_killed_claim: (options?: {
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
   * Construct and simulate a get_is_killed_tax transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_is_killed_tax: (options?: {
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
   * Construct and simulate a get_is_killed_bonus transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_is_killed_bonus: (options?: {
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
   * Construct and simulate a set_protocol_fee_fraction transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_protocol_fee_fraction: (
    { admin, new_fraction }: { admin: string; new_fraction: u32 },
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
   * Construct and simulate a get_protocol_fees transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_protocol_fees: (options?: {
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
  }) => Promise<AssembledTransaction<Array<u128>>>

  /**
   * Construct and simulate a claim_protocol_fees transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  claim_protocol_fees: (
    { admin, destination }: { admin: string; destination: string },
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
  ) => Promise<AssembledTransaction<Array<u128>>>

  /**
   * Construct and simulate a set_fee_rebate_fraction transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_fee_rebate_fraction: (
    { admin, new_fraction }: { admin: string; new_fraction: u32 },
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
   * Construct and simulate a set_base_tax_fraction transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_base_tax_fraction: (
    { admin, tax_fraction }: { admin: string; tax_fraction: u32 },
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
   * Construct and simulate a set_tax_incline transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_tax_incline: (
    { admin, tax_incline }: { admin: string; tax_incline: u32 },
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
   * Construct and simulate a set_max_tax_fraction transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_max_tax_fraction: (
    { admin, max_tax_fraction }: { admin: string; max_tax_fraction: u32 },
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
   * Construct and simulate a get_tax_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_tax_config: (options?: {
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
  }) => Promise<AssembledTransaction<readonly [u32, u32, u32]>>

  /**
   * Construct and simulate a claim_protocol_tax transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  claim_protocol_tax: (
    { admin, destination }: { admin: string; destination: string },
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
  ) => Promise<AssembledTransaction<u128>>

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
   * Construct and simulate a contract_name transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  contract_name: (options?: {
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
   * Construct and simulate a commit_upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  commit_upgrade: (
    {
      admin,
      new_wasm_hash,
      token_new_wasm_hash,
      gauges_new_wasm_hash,
    }: { admin: string; new_wasm_hash: Buffer; token_new_wasm_hash: Buffer; gauges_new_wasm_hash: Buffer },
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
  ) => Promise<AssembledTransaction<readonly [Buffer, Buffer]>>

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
   * Construct and simulate a initialize_rewards_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize_rewards_config: (
    { reward_token }: { reward_token: string },
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
   * Construct and simulate a set_rewards_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_rewards_config: (
    { admin, expired_at, tps }: { admin: string; expired_at: u64; tps: u128 },
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
   * Construct and simulate a get_unused_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_unused_reward: (options?: {
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
   * Construct and simulate a return_unused_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  return_unused_reward: (
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
  ) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a get_rewards_info transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_rewards_info: (
    { user }: { user: string },
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
  ) => Promise<AssembledTransaction<Map<string, i128>>>

  /**
   * Construct and simulate a get_user_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_user_reward: (
    { user }: { user: string },
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
  ) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a checkpoint_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  checkpoint_reward: (
    { token_contract, user, user_shares }: { token_contract: string; user: string; user_shares: u128 },
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
   * Construct and simulate a checkpoint_working_balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  checkpoint_working_balance: (
    { token_contract, user, user_shares }: { token_contract: string; user: string; user_shares: u128 },
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
   * Construct and simulate a get_total_accumulated_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_accumulated_reward: (options?: {
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
   * Construct and simulate a get_total_configured_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_configured_reward: (options?: {
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
   * Construct and simulate a adjust_total_accumulated_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  adjust_total_accumulated_reward: (
    { admin, diff }: { admin: string; diff: i128 },
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
   * Construct and simulate a get_total_claimed_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_claimed_reward: (options?: {
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
   * Construct and simulate a claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  claim: (
    { user }: { user: string },
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
  ) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a gauge_add transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  gauge_add: (
    { admin, gauge_address }: { admin: string; gauge_address: string },
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
   * Construct and simulate a gauge_remove transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  gauge_remove: (
    { admin, reward_token }: { admin: string; reward_token: string },
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
   * Construct and simulate a gauge_schedule_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  gauge_schedule_reward: (
    {
      router,
      distributor,
      gauge,
      start_at,
      duration,
      tps,
    }: { router: string; distributor: string; gauge: string; start_at: Option<u64>; duration: u64; tps: u128 },
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
   * Construct and simulate a kill_gauges_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  kill_gauges_claim: (
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
   * Construct and simulate a unkill_gauges_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  unkill_gauges_claim: (
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
   * Construct and simulate a get_gauges transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_gauges: (options?: {
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
  }) => Promise<AssembledTransaction<Map<string, string>>>

  /**
   * Construct and simulate a gauges_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  gauges_claim: (
    { user }: { user: string },
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
  ) => Promise<AssembledTransaction<Map<string, u128>>>

  /**
   * Construct and simulate a gauges_get_reward_info transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  gauges_get_reward_info: (
    { user }: { user: string },
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
  ) => Promise<AssembledTransaction<Map<string, Map<string, i128>>>>

  /**
   * Construct and simulate a init_pools_plane transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  init_pools_plane: (
    { plane }: { plane: string },
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
   * Construct and simulate a set_pools_plane transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_pools_plane: (
    { admin, plane }: { admin: string; plane: string },
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
   * Construct and simulate a get_pools_plane transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_pools_plane: (options?: {
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
   * Construct and simulate a backfill_plane_data transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  backfill_plane_data: (options?: {
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
  }) => Promise<AssembledTransaction<null>>

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

  /**
   * Construct and simulate a init_config_storage transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  init_config_storage: (
    { admin, config_storage }: { admin: string; config_storage: string },
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
        'AAAAAAAAAAAAAAAOaW5pdGlhbGl6ZV9hbGwAAAAAAAkAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAQcHJpdmlsZWdlZF9hZGRycwAAA+0AAAAGAAAAEwAAABMAAAATAAAAEwAAA+oAAAATAAAAEwAAAAAAAAAGcm91dGVyAAAAAAATAAAAAAAAAAZvcmFjbGUAAAAAABMAAAAAAAAAEmxwX3Rva2VuX3dhc21faGFzaAAAAAAD7gAAACAAAAAAAAAABnRva2VucwAAAAAD6gAAABMAAAAAAAAAC2ZlZXNfY29uZmlnAAAAA+0AAAACAAAABAAAAAQAAAAAAAAADWFzc2V0c19jb25maWcAAAAAAAPtAAAAAgAAABEAAAARAAAAAAAAAAtleHRyYV9hZGRycwAAAAPtAAAAAwAAABMAAAATAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAAJcG9vbF90eXBlAAAAAAAAAAAAAAEAAAAR',
        'AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAACAAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAABBwcml2aWxlZ2VkX2FkZHJzAAAD7QAAAAYAAAATAAAAEwAAABMAAAATAAAD6gAAABMAAAATAAAAAAAAAAZyb3V0ZXIAAAAAABMAAAAAAAAABm9yYWNsZQAAAAAAEwAAAAAAAAASbHBfdG9rZW5fd2FzbV9oYXNoAAAAAAPuAAAAIAAAAAAAAAAGdG9rZW5zAAAAAAPqAAAAEwAAAAAAAAALZmVlc19jb25maWcAAAAD7QAAAAIAAAAEAAAABAAAAAAAAAANYXNzZXRzX2NvbmZpZwAAAAAAA+0AAAACAAAAEQAAABEAAAAA',
        'AAAAAAAAAAAAAAAIc2hhcmVfaWQAAAAAAAAAAQAAABM=',
        'AAAAAAAAAAAAAAAQZ2V0X3RvdGFsX3NoYXJlcwAAAAAAAAABAAAACg==',
        'AAAAAAAAAAAAAAAKZ2V0X3Rva2VucwAAAAAAAAAAAAEAAAPqAAAAEw==',
        'AAAAAAAAAAAAAAAHZGVwb3NpdAAAAAADAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAPZGVzaXJlZF9hbW91bnRzAAAAA+oAAAAKAAAAAAAAAAptaW5fc2hhcmVzAAAAAAAKAAAAAQAAA+0AAAACAAAD6gAAAAoAAAAK',
        'AAAAAAAAAAAAAAAEc3dhcAAAAAUAAAAAAAAABHVzZXIAAAATAAAAAAAAAAZpbl9pZHgAAAAAAAQAAAAAAAAAB291dF9pZHgAAAAABAAAAAAAAAAJaW5fYW1vdW50AAAAAAAACgAAAAAAAAAHb3V0X21pbgAAAAAKAAAAAQAAAAo=',
        'AAAAAAAAAAAAAAANZXN0aW1hdGVfc3dhcAAAAAAAAAMAAAAAAAAABmluX2lkeAAAAAAABAAAAAAAAAAHb3V0X2lkeAAAAAAEAAAAAAAAAAlpbl9hbW91bnQAAAAAAAAKAAAAAQAAAAo=',
        'AAAAAAAAAAAAAAATc3dhcF9zdHJpY3RfcmVjZWl2ZQAAAAAFAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAGaW5faWR4AAAAAAAEAAAAAAAAAAdvdXRfaWR4AAAAAAQAAAAAAAAACm91dF9hbW91bnQAAAAAAAoAAAAAAAAABmluX21heAAAAAAACgAAAAEAAAAK',
        'AAAAAAAAAAAAAAAcZXN0aW1hdGVfc3dhcF9zdHJpY3RfcmVjZWl2ZQAAAAMAAAAAAAAABmluX2lkeAAAAAAABAAAAAAAAAAHb3V0X2lkeAAAAAAEAAAAAAAAAApvdXRfYW1vdW50AAAAAAAKAAAAAQAAAAo=',
        'AAAAAAAAAAAAAAAId2l0aGRyYXcAAAADAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAMc2hhcmVfYW1vdW50AAAACgAAAAAAAAALbWluX2Ftb3VudHMAAAAD6gAAAAoAAAABAAAD6gAAAAo=',
        'AAAAAAAAAAAAAAAMZ2V0X3Jlc2VydmVzAAAAAAAAAAEAAAPqAAAACg==',
        'AAAAAAAAAAAAAAAQZ2V0X2ZlZV9mcmFjdGlvbgAAAAAAAAABAAAABA==',
        'AAAAAAAAAAAAAAAZZ2V0X3Byb3RvY29sX2ZlZV9mcmFjdGlvbgAAAAAAAAAAAAABAAAABA==',
        'AAAAAAAAAAAAAAAIZ2V0X2luZm8AAAAAAAAAAQAAA+wAAAARAAAAAA==',
        'AAAAAAAAAAAAAAAUc2V0X3ByaXZpbGVnZWRfYWRkcnMAAAAGAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAADXJld2FyZHNfYWRtaW4AAAAAAAATAAAAAAAAABBvcGVyYXRpb25zX2FkbWluAAAAEwAAAAAAAAALcGF1c2VfYWRtaW4AAAAAEwAAAAAAAAAWZW1lcmdlbmN5X3BhdXNlX2FkbWlucwAAAAAD6gAAABMAAAAAAAAAEHN5c3RlbV9mZWVfYWRtaW4AAAATAAAAAA==',
        'AAAAAAAAAAAAAAAUZ2V0X3ByaXZpbGVnZWRfYWRkcnMAAAAAAAAAAQAAA+wAAAARAAAD6gAAABM=',
        'AAAAAAAAAAAAAAAWc2V0X29yYWNsZV9ndWFyZF9yYWlscwAAAAAABAAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAA90d2FwX2RpdmVyZ2VuY2UAAAAABgAAAAAAAAALc3RhbGVfbGltaXQAAAAABgAAAAAAAAASdG9vX3ZvbGF0aWxlX3JhdGlvAAAAAAAGAAAAAA==',
        'AAAAAAAAAAAAAAAWZ2V0X29yYWNsZV9ndWFyZF9yYWlscwAAAAAAAAAAAAEAAAfQAAAAEE9yYWNsZUd1YXJkUmFpbHM=',
        'AAAAAAAAAAAAAAAMa2lsbF9kZXBvc2l0AAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAAJa2lsbF9zd2FwAAAAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAAKa2lsbF9jbGFpbQAAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAAIa2lsbF90YXgAAAABAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAA',
        'AAAAAAAAAAAAAAAKa2lsbF9ib251cwAAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAAOdW5raWxsX2RlcG9zaXQAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAALdW5raWxsX3N3YXAAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAAMdW5raWxsX2NsYWltAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAAKdW5raWxsX3RheAAAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAAMdW5raWxsX2JvbnVzAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAAVZ2V0X2lzX2tpbGxlZF9kZXBvc2l0AAAAAAAAAAAAAAEAAAAB',
        'AAAAAAAAAAAAAAASZ2V0X2lzX2tpbGxlZF9zd2FwAAAAAAAAAAAAAQAAAAE=',
        'AAAAAAAAAAAAAAATZ2V0X2lzX2tpbGxlZF9jbGFpbQAAAAAAAAAAAQAAAAE=',
        'AAAAAAAAAAAAAAARZ2V0X2lzX2tpbGxlZF90YXgAAAAAAAAAAAAAAQAAAAE=',
        'AAAAAAAAAAAAAAATZ2V0X2lzX2tpbGxlZF9ib251cwAAAAAAAAAAAQAAAAE=',
        'AAAAAAAAAAAAAAAZc2V0X3Byb3RvY29sX2ZlZV9mcmFjdGlvbgAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAMbmV3X2ZyYWN0aW9uAAAABAAAAAA=',
        'AAAAAAAAAAAAAAARZ2V0X3Byb3RvY29sX2ZlZXMAAAAAAAAAAAAAAQAAA+oAAAAK',
        'AAAAAAAAAAAAAAATY2xhaW1fcHJvdG9jb2xfZmVlcwAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAC2Rlc3RpbmF0aW9uAAAAABMAAAABAAAD6gAAAAo=',
        'AAAAAAAAAAAAAAAXc2V0X2ZlZV9yZWJhdGVfZnJhY3Rpb24AAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAxuZXdfZnJhY3Rpb24AAAAEAAAAAA==',
        'AAAAAAAAAAAAAAAVc2V0X2Jhc2VfdGF4X2ZyYWN0aW9uAAAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAx0YXhfZnJhY3Rpb24AAAAEAAAAAA==',
        'AAAAAAAAAAAAAAAPc2V0X3RheF9pbmNsaW5lAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAALdGF4X2luY2xpbmUAAAAABAAAAAA=',
        'AAAAAAAAAAAAAAAUc2V0X21heF90YXhfZnJhY3Rpb24AAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAEG1heF90YXhfZnJhY3Rpb24AAAAEAAAAAA==',
        'AAAAAAAAAAAAAAAOZ2V0X3RheF9jb25maWcAAAAAAAAAAAABAAAD7QAAAAMAAAAEAAAABAAAAAQ=',
        'AAAAAAAAAAAAAAASY2xhaW1fcHJvdG9jb2xfdGF4AAAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAC2Rlc3RpbmF0aW9uAAAAABMAAAABAAAACg==',
        'AAAAAAAAAAAAAAAHdmVyc2lvbgAAAAAAAAAAAQAAAAQ=',
        'AAAAAAAAAAAAAAANY29udHJhY3RfbmFtZQAAAAAAAAAAAAABAAAAEQ==',
        'AAAAAAAAAAAAAAAOY29tbWl0X3VwZ3JhZGUAAAAAAAQAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAANbmV3X3dhc21faGFzaAAAAAAAA+4AAAAgAAAAAAAAABN0b2tlbl9uZXdfd2FzbV9oYXNoAAAAA+4AAAAgAAAAAAAAABRnYXVnZXNfbmV3X3dhc21faGFzaAAAA+4AAAAgAAAAAA==',
        'AAAAAAAAAAAAAAANYXBwbHlfdXBncmFkZQAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAEAAAPtAAAAAgAAA+4AAAAgAAAD7gAAACA=',
        'AAAAAAAAAAAAAAAOcmV2ZXJ0X3VwZ3JhZGUAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAASc2V0X2VtZXJnZW5jeV9tb2RlAAAAAAACAAAAAAAAAA9lbWVyZ2VuY3lfYWRtaW4AAAAAEwAAAAAAAAAFdmFsdWUAAAAAAAABAAAAAA==',
        'AAAAAAAAAAAAAAASZ2V0X2VtZXJnZW5jeV9tb2RlAAAAAAAAAAAAAQAAAAE=',
        'AAAAAAAAAAAAAAAZaW5pdGlhbGl6ZV9yZXdhcmRzX2NvbmZpZwAAAAAAAAEAAAAAAAAADHJld2FyZF90b2tlbgAAABMAAAAA',
        'AAAAAAAAAAAAAAASc2V0X3Jld2FyZHNfY29uZmlnAAAAAAADAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAACmV4cGlyZWRfYXQAAAAAAAYAAAAAAAAAA3RwcwAAAAAKAAAAAA==',
        'AAAAAAAAAAAAAAARZ2V0X3VudXNlZF9yZXdhcmQAAAAAAAAAAAAAAQAAAAo=',
        'AAAAAAAAAAAAAAAUcmV0dXJuX3VudXNlZF9yZXdhcmQAAAABAAAAAAAAAAVhZG1pbgAAAAAAABMAAAABAAAACg==',
        'AAAAAAAAAAAAAAAQZ2V0X3Jld2FyZHNfaW5mbwAAAAEAAAAAAAAABHVzZXIAAAATAAAAAQAAA+wAAAARAAAACw==',
        'AAAAAAAAAAAAAAAPZ2V0X3VzZXJfcmV3YXJkAAAAAAEAAAAAAAAABHVzZXIAAAATAAAAAQAAAAo=',
        'AAAAAAAAAAAAAAARY2hlY2twb2ludF9yZXdhcmQAAAAAAAADAAAAAAAAAA50b2tlbl9jb250cmFjdAAAAAAAEwAAAAAAAAAEdXNlcgAAABMAAAAAAAAAC3VzZXJfc2hhcmVzAAAAAAoAAAAA',
        'AAAAAAAAAAAAAAAaY2hlY2twb2ludF93b3JraW5nX2JhbGFuY2UAAAAAAAMAAAAAAAAADnRva2VuX2NvbnRyYWN0AAAAAAATAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAALdXNlcl9zaGFyZXMAAAAACgAAAAA=',
        'AAAAAAAAAAAAAAAcZ2V0X3RvdGFsX2FjY3VtdWxhdGVkX3Jld2FyZAAAAAAAAAABAAAACg==',
        'AAAAAAAAAAAAAAAbZ2V0X3RvdGFsX2NvbmZpZ3VyZWRfcmV3YXJkAAAAAAAAAAABAAAACg==',
        'AAAAAAAAAAAAAAAfYWRqdXN0X3RvdGFsX2FjY3VtdWxhdGVkX3Jld2FyZAAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABGRpZmYAAAALAAAAAA==',
        'AAAAAAAAAAAAAAAYZ2V0X3RvdGFsX2NsYWltZWRfcmV3YXJkAAAAAAAAAAEAAAAK',
        'AAAAAAAAAAAAAAAFY2xhaW0AAAAAAAABAAAAAAAAAAR1c2VyAAAAEwAAAAEAAAAK',
        'AAAAAAAAAAAAAAAJZ2F1Z2VfYWRkAAAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAA1nYXVnZV9hZGRyZXNzAAAAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAAMZ2F1Z2VfcmVtb3ZlAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAxyZXdhcmRfdG9rZW4AAAATAAAAAA==',
        'AAAAAAAAAAAAAAAVZ2F1Z2Vfc2NoZWR1bGVfcmV3YXJkAAAAAAAABgAAAAAAAAAGcm91dGVyAAAAAAATAAAAAAAAAAtkaXN0cmlidXRvcgAAAAATAAAAAAAAAAVnYXVnZQAAAAAAABMAAAAAAAAACHN0YXJ0X2F0AAAD6AAAAAYAAAAAAAAACGR1cmF0aW9uAAAABgAAAAAAAAADdHBzAAAAAAoAAAAA',
        'AAAAAAAAAAAAAAARa2lsbF9nYXVnZXNfY2xhaW0AAAAAAAABAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAA',
        'AAAAAAAAAAAAAAATdW5raWxsX2dhdWdlc19jbGFpbQAAAAABAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAA',
        'AAAAAAAAAAAAAAAKZ2V0X2dhdWdlcwAAAAAAAAAAAAEAAAPsAAAAEwAAABM=',
        'AAAAAAAAAAAAAAAMZ2F1Z2VzX2NsYWltAAAAAQAAAAAAAAAEdXNlcgAAABMAAAABAAAD7AAAABMAAAAK',
        'AAAAAAAAAAAAAAAWZ2F1Z2VzX2dldF9yZXdhcmRfaW5mbwAAAAAAAQAAAAAAAAAEdXNlcgAAABMAAAABAAAD7AAAABMAAAPsAAAAEQAAAAs=',
        'AAAAAAAAAAAAAAAQaW5pdF9wb29sc19wbGFuZQAAAAEAAAAAAAAABXBsYW5lAAAAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAAPc2V0X3Bvb2xzX3BsYW5lAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAFcGxhbmUAAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAAPZ2V0X3Bvb2xzX3BsYW5lAAAAAAAAAAABAAAAEw==',
        'AAAAAAAAAAAAAAATYmFja2ZpbGxfcGxhbmVfZGF0YQAAAAAAAAAAAA==',
        'AAAAAAAAAAAAAAAZY29tbWl0X3RyYW5zZmVyX293bmVyc2hpcAAAAAAAAAMAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAJcm9sZV9uYW1lAAAAAAAAEQAAAAAAAAALbmV3X2FkZHJlc3MAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAAYYXBwbHlfdHJhbnNmZXJfb3duZXJzaGlwAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAlyb2xlX25hbWUAAAAAAAARAAAAAA==',
        'AAAAAAAAAAAAAAAZcmV2ZXJ0X3RyYW5zZmVyX293bmVyc2hpcAAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAJcm9sZV9uYW1lAAAAAAAAEQAAAAA=',
        'AAAAAAAAAAAAAAASZ2V0X2Z1dHVyZV9hZGRyZXNzAAAAAAABAAAAAAAAAAlyb2xlX25hbWUAAAAAAAARAAAAAQAAABM=',
        'AAAAAAAAAAAAAAATaW5pdF9jb25maWdfc3RvcmFnZQAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAADmNvbmZpZ19zdG9yYWdlAAAAAAATAAAAAA==',
        'AAAABAAAAAAAAAAAAAAAEkxpcXVpZGl0eVBvb2xFcnJvcgAAAAAACwAAAAAAAAASQWxyZWFkeUluaXRpYWxpemVkAAAAAADJAAAAAAAAABdQbGFuZUFscmVhZHlJbml0aWFsaXplZAAAAADKAAAAAAAAABlSZXdhcmRzQWxyZWFkeUluaXRpYWxpemVkAAAAAAAAywAAAAAAAAAUSW52YXJpYW50RG9lc05vdEhvbGQAAADMAAAAAAAAABFQb29sRGVwb3NpdEtpbGxlZAAAAAAAAM0AAAAAAAAADlBvb2xTd2FwS2lsbGVkAAAAAADOAAAAAAAAAA9Qb29sQ2xhaW1LaWxsZWQAAAAAzwAAAAAAAAATRnV0dXJlU2hhcmVJZE5vdFNldAAAAADQAAAAAAAAABJTaW5rRGVwb3NpdEZhaWx1cmUAAAAAANEAAAAAAAAAE1NpbmtXaXRoZHJhd0ZhaWx1cmUAAAAA0gAAAAAAAAASSW52YWxpZFRva2VuQURlbHRhAAAAAADT',
        'AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAAHAAAAAAAAAAAAAAABlRva2VuQQAAAAAAAAAAAAAAAAAGVG9rZW5CAAAAAAAAAAAAAAAAAAlCYXNlQXNzZXQAAAAAAAAAAAAAAAAAAApRdW90ZUFzc2V0AAAAAAAAAAAAAAAAAAhSZXNlcnZlQQAAAAAAAAAAAAAACFJlc2VydmVCAAAAAAAAAAAAAAAFUGxhbmUAAAAAAAAAAAAAAAAAAAZSb3V0ZXIAAAAAAAAAAAAAAAAABFNpbmsAAAAAAAAAAAAAAAZPcmFjbGUAAAAAAAAAAAAAAAAAEE9yYWNsZUd1YXJkUmFpbHMAAAABAAAAAAAAABRIaXN0b3JpY2FsT3JhY2xlRGF0YQAAAAEAAAARAAAAAAAAAAAAAAALRmVlRnJhY3Rpb24AAAAAAAAAAAAAAAARRmVlUmViYXRlRnJhY3Rpb24AAAAAAAAAAAAAAAAAABNQcm90b2NvbEZlZUZyYWN0aW9uAAAAAAAAAAAAAAAADFByb3RvY29sRmVlQQAAAAAAAAAAAAAADFByb3RvY29sRmVlQgAAAAAAAAAAAAAAD0Jhc2VUYXhGcmFjdGlvbgAAAAAAAAAAAAAAAApUYXhJbmNsaW5lAAAAAAAAAAAAAAAAAA5NYXhUYXhGcmFjdGlvbgAAAAAAAAAAAAAAAAAMUHJvdG9jb2xUYXhCAAAAAAAAAAAAAAAMSXNLaWxsZWRTd2FwAAAAAAAAAAAAAAAPSXNLaWxsZWREZXBvc2l0AAAAAAAAAAAAAAAADUlzS2lsbGVkQ2xhaW0AAAAAAAAAAAAAAAAAAAtJc0tpbGxlZFRheAAAAAAAAAAAAAAAAA1Jc0tpbGxlZEJvbnVzAAAAAAAAAAAAAAAAAAAPVG9rZW5GdXR1cmVXQVNNAAAAAAAAAAAAAAAAD0dhdWdlRnV0dXJlV0FTTQA=',
        'AAAABAAAAAAAAAAAAAAAEkFjY2Vzc0NvbnRyb2xFcnJvcgAAAAAABwAAAAAAAAAMUm9sZU5vdEZvdW5kAAAAZQAAAAAAAAAMVW5hdXRob3JpemVkAAAAZgAAAAAAAAAPQWRtaW5BbHJlYWR5U2V0AAAAAGcAAAAAAAAADEJhZFJvbGVVc2FnZQAAAGgAAAAAAAAAE0Fub3RoZXJBY3Rpb25BY3RpdmUAAAALWgAAAAAAAAAOTm9BY3Rpb25BY3RpdmUAAAAAC1sAAAAAAAAAEUFjdGlvbk5vdFJlYWR5WWV0AAAAAAALXA==',
        'AAAAAgAAAAAAAAAAAAAAC1dBU01EYXRhS2V5AAAAAAYAAAAAAAAAAAAAAAlUb2tlbkhhc2gAAAAAAAAAAAAAAAAAAA9Ub2tlbkZ1dHVyZVdBU00AAAAAAAAAAAAAAAAJR2F1Z2VXQVNNAAAAAAAAAAAAAAAAAAAPRnV0dXJlR2F1Z2VXQVNNAAAAAAAAAAAAAAAAEENvbnN0YW50UG9vbEhhc2gAAAAAAAAAAAAAAA9FbGFzdGljUG9vbEhhc2gA',
        'AAAABAAAAAAAAAAAAAAACkdhdWdlRXJyb3IAAAAAAAQAAAAAAAAAC0NsYWltS2lsbGVkAAAAAM8AAAAAAAAADUdhdWdlc092ZXJNYXgAAAAAAAExAAAAAAAAABJHYXVnZUFscmVhZHlFeGlzdHMAAAAAAZEAAAAAAAAADUdhdWdlTm90Rm91bmQAAAAAAAGU',
        'AAAAAQAAAAAAAAAAAAAADFJld2FyZENvbmZpZwAAAAMAAAAAAAAACmV4cGlyZWRfYXQAAAAAAAYAAAAAAAAACHN0YXJ0X2F0AAAABgAAAAAAAAADdHBzAAAAAAo=',
        'AAAABAAAAAAAAAAAAAAAE1Bvb2xWYWxpZGF0aW9uRXJyb3IAAAAAFgAAAAAAAAARV3JvbmdJbnB1dFZlY1NpemUAAAAAAAfRAAAAAAAAAA5GZWVPdXRPZkJvdW5kcwAAAAAH0wAAAAAAAAAQQWxsQ29pbnNSZXF1aXJlZAAAB9QAAAAAAAAAEUluTWluTm90U2F0aXNmaWVkAAAAAAAH1QAAAAAAAAAST3V0TWluTm90U2F0aXNmaWVkAAAAAAfWAAAAAAAAABNDYW5ub3RTd2FwU2FtZVRva2VuAAAAB9cAAAAAAAAAEkluVG9rZW5PdXRPZkJvdW5kcwAAAAAH2AAAAAAAAAATT3V0VG9rZW5PdXRPZkJvdW5kcwAAAAfZAAAAAAAAAAlFbXB0eVBvb2wAAAAAAAfaAAAAAAAAABRJbnZhbGlkRGVwb3NpdEFtb3VudAAAB9sAAAAAAAAAE0FkbWluRmVlT3V0T2ZCb3VuZHMAAAAH3AAAAAAAAAAPVW5rbm93blBvb2xUeXBlAAAAB90AAAAAAAAAEFplcm9TaGFyZXNCdXJuZWQAAAfeAAAAAAAAABNUb29NYW55U2hhcmVzQnVybmVkAAAAB98AAAAAAAAAEkNhbm5vdENvbXBhcmVQb29scwAAAAAH4QAAAAAAAAAKWmVyb0Ftb3VudAAAAAAH4gAAAAAAAAATSW5zdWZmaWNpZW50QmFsYW5jZQAAAAfjAAAAAAAAABFJbk1heE5vdFNhdGlzZmllZAAAAAAAB+QAAAAAAAAAG1dpdGhkcmF3RXhjZWVkc01pbkxpcXVpZGl0eQAAAAflAAAAAAAAAA1SZWJhc2VUb29Tb29uAAAAAAAH5gAAAAAAAAAOQ2lyY3VpdEJyZWFrZXIAAAAAB+cAAAAAAAAADUludmFsaWRPcmFjbGUAAAAAAAfo',
        'AAAABAAAAAAAAAAAAAAADFJld2FyZHNFcnJvcgAAAAIAAAAAAAAAElBhc3RUaW1lTm90QWxsb3dlZAAAAAACvQAAAAAAAAARU2FtZVJld2FyZHNDb25maWcAAAAAAAK+',
        'AAAAAQAAAAAAAAAAAAAAEFBvb2xSZXdhcmRDb25maWcAAAACAAAAAAAAAApleHBpcmVkX2F0AAAAAAAGAAAAAAAAAAN0cHMAAAAACg==',
        'AAAAAQAAAAAAAAAAAAAADlBvb2xSZXdhcmREYXRhAAAAAAAEAAAAAAAAAAthY2N1bXVsYXRlZAAAAAAKAAAAAAAAAAVibG9jawAAAAAAAAYAAAAAAAAAB2NsYWltZWQAAAAACgAAAAAAAAAJbGFzdF90aW1lAAAAAAAABg==',
        'AAAAAQAAAAAAAAAAAAAADlVzZXJSZXdhcmREYXRhAAAAAAADAAAAAAAAAApsYXN0X2Jsb2NrAAAAAAAGAAAAAAAAABBwb29sX2FjY3VtdWxhdGVkAAAACgAAAAAAAAAIdG9fY2xhaW0AAAAK',
        'AAAAAQAAAC9QcmljZSBkYXRhIGZvciBhbiBhc3NldCBhdCBhIHNwZWNpZmljIHRpbWVzdGFtcAAAAAAAAAAACVByaWNlRGF0YQAAAAAAAAIAAAAAAAAABXByaWNlAAAAAAAACwAAAAAAAAAJdGltZXN0YW1wAAAAAAAABg==',
        'AAAAAgAAAApBc3NldCB0eXBlAAAAAAAAAAAABUFzc2V0AAAAAAAAAgAAAAEAAAAAAAAAB1N0ZWxsYXIAAAAAAQAAABMAAAABAAAAAAAAAAVPdGhlcgAAAAAAAAEAAAAR',
        'AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAAAwAAAAAAAAATQW5vdGhlckFjdGlvbkFjdGl2ZQAAAAtaAAAAAAAAAA5Ob0FjdGlvbkFjdGl2ZQAAAAALWwAAAAAAAAARQWN0aW9uTm90UmVhZHlZZXQAAAAAAAtc',
        'AAAABAAAAAAAAAAAAAAACU1hdGhFcnJvcgAAAAAAAAkAAAAZTWF0aEVycm9yOiBOdW1iZXJPdmVyZmxvdwAAAAAAAA5OdW1iZXJPdmVyZmxvdwAAAAAB/gAAAB1NYXRoRXJyb3I6IEdlbmVyaWMgbWF0aCBlcnJvcgAAAAAAAAlNYXRoRXJyb3IAAAAAAAH/AAAALU1hdGhFcnJvcjogQWRkaXRpb24gb3BlcmF0aW9uIGNhdXNlZCBvdmVyZmxvdwAAAAAAABBBZGRpdGlvbk92ZXJmbG93AAACAAAAADFNYXRoRXJyb3I6IFN1YnRyYWN0aW9uIG9wZXJhdGlvbiBjYXVzZWQgdW5kZXJmbG93AAAAAAAAFFN1YnRyYWN0aW9uVW5kZXJmbG93AAACAQAAADNNYXRoRXJyb3I6IE11bHRpcGxpY2F0aW9uIG9wZXJhdGlvbiBjYXVzZWQgb3ZlcmZsb3cAAAAAFk11bHRpcGxpY2F0aW9uT3ZlcmZsb3cAAAAAAgIAAAAbTWF0aEVycm9yOiBEaXZpc2lvbiBieSB6ZXJvAAAAAA5EaXZpc2lvbkJ5WmVybwAAAAACAwAAACNNYXRoRXJyb3I6IFR5cGUgY29udmVyc2lvbiBvdmVyZmxvdwAAAAASQ29udmVyc2lvbk92ZXJmbG93AAAAAAIEAAAAP01hdGhFcnJvcjogQXR0ZW1wdGVkIHRvIGNvbnZlcnQgbmVnYXRpdmUgdmFsdWUgdG8gdW5zaWduZWQgdHlwZQAAAAASTmVnYXRpdmVUb1Vuc2lnbmVkAAAAAAIFAAAAKk1hdGhFcnJvcjogRml4ZWQtcG9pbnQgYXJpdGhtZXRpYyBvdmVyZmxvdwAAAAAAEkZpeGVkUG9pbnRPdmVyZmxvdwAAAAACBg==',
        'AAAABAAAAAAAAAAAAAAAC09yYWNsZUVycm9yAAAAAAMAAAAeT3JhY2xlRXJyb3I6IE9yYWNsZU5vblBvc2l0aXZlAAAAAAART3JhY2xlTm9uUG9zaXRpdmUAAAAAAAJZAAAAAAAAABFPcmFjbGVUb29Wb2xhdGlsZQAAAAAAAloAAAAAAAAAEk9yYWNsZVN0YWxlRm9yUG9vbAAAAAACWw==',
        'AAAABAAAAAAAAAAAAAAADFN0b3JhZ2VFcnJvcgAAAAQAAAAMU3RvcmFnZUVycm9yAAAAEkFscmVhZHlJbml0aWFsaXplZAAAAAAAyQAAAAAAAAATVmFsdWVOb3RJbml0aWFsaXplZAAAAAH1AAAAAAAAAAxWYWx1ZU1pc3NpbmcAAAH2AAAAAAAAABRWYWx1ZUNvbnZlcnNpb25FcnJvcgAAAfc=',
        'AAAABAAAAAAAAAAAAAAAD1ZhbGlkYXRpb25FcnJvcgAAAAADAAAAD1ZhbGlkYXRpb25FcnJvcgAAAAAMSW52YWxpZFRva2VuAAADIQAAAAAAAAARSW52YWxpZFBlcmNlbnRhZ2UAAAAAAAMiAAAAAAAAAApaZXJvQW1vdW50AAAAAAMk',
        'AAAAAQAAAAAAAAAAAAAAD09yYWNsZVByaWNlRGF0YQAAAAACAAAAAAAAAAVkZWxheQAAAAAAB9AAAAAFRGVsYXkAAAAAAAAAAAAABXByaWNlAAAAAAAACg==',
        'AAAAAQAAAAAAAAAAAAAAGVByaWNlRGl2ZXJnZW5jZUd1YXJkUmFpbHMAAAAAAAABAAAAAAAAAB5vcmFjbGVfdHdhcF9wZXJjZW50X2RpdmVyZ2VuY2UAAAAAAAY=',
        'AAAAAQAAAAAAAAAAAAAAElZhbGlkaXR5R3VhcmRSYWlscwAAAAAAAgAAAAAAAAAdc2Vjb25kc19iZWZvcmVfc3RhbGVfZm9yX3Bvb2wAAAAAAAAGAAAAAAAAABJ0b29fdm9sYXRpbGVfcmF0aW8AAAAAAAY=',
        'AAAAAQAAAAAAAAAAAAAAEE9yYWNsZUd1YXJkUmFpbHMAAAACAAAAAAAAABBwcmljZV9kaXZlcmdlbmNlAAAH0AAAABlQcmljZURpdmVyZ2VuY2VHdWFyZFJhaWxzAAAAAAAAAAAAAAh2YWxpZGl0eQAAB9AAAAASVmFsaWRpdHlHdWFyZFJhaWxzAAA=',
        'AAAAAgAAAAAAAAAAAAAADk9yYWNsZVZhbGlkaXR5AAAAAAAFAAAAAAAAAAAAAAALTm9uUG9zaXRpdmUAAAAAAAAAAAAAAAALVG9vVm9sYXRpbGUAAAAAAAAAAAAAAAAMU3RhbGVGb3JQb29sAAAAAAAAAAAAAAAGRnJvemVuAAAAAAAAAAAAAAAAAAVWYWxpZAAAAA==',
        'AAAAAQAAAAAAAAAAAAAAFEhpc3RvcmljYWxPcmFjbGVEYXRhAAAAAwAAAAAAAAAKbGFzdF9wcmljZQAAAAAACgAAAAAAAAAPbGFzdF9wcmljZV90d2FwAAAAAAoAAAAAAAAADmxhc3RfdXBkYXRlX3RzAAAAAAAG',
        'AAAAAQAAAAAAAAAAAAAABURlbGF5AAAAAAAAAQAAAAAAAAABMAAAAAAAAAY=',
      ]),
      options,
    )
  }
  public readonly fromJSON = {
    initialize_all: this.txFromJSON<null>,
    pool_type: this.txFromJSON<string>,
    initialize: this.txFromJSON<null>,
    share_id: this.txFromJSON<string>,
    get_total_shares: this.txFromJSON<u128>,
    get_tokens: this.txFromJSON<Array<string>>,
    deposit: this.txFromJSON<readonly [Array<u128>, u128]>,
    swap: this.txFromJSON<u128>,
    estimate_swap: this.txFromJSON<u128>,
    swap_strict_receive: this.txFromJSON<u128>,
    estimate_swap_strict_receive: this.txFromJSON<u128>,
    withdraw: this.txFromJSON<Array<u128>>,
    get_reserves: this.txFromJSON<Array<u128>>,
    get_fee_fraction: this.txFromJSON<u32>,
    get_protocol_fee_fraction: this.txFromJSON<u32>,
    get_info: this.txFromJSON<Map<string, any>>,
    set_privileged_addrs: this.txFromJSON<null>,
    get_privileged_addrs: this.txFromJSON<Map<string, Array<string>>>,
    set_oracle_guard_rails: this.txFromJSON<null>,
    get_oracle_guard_rails: this.txFromJSON<OracleGuardRails>,
    kill_deposit: this.txFromJSON<null>,
    kill_swap: this.txFromJSON<null>,
    kill_claim: this.txFromJSON<null>,
    kill_tax: this.txFromJSON<null>,
    kill_bonus: this.txFromJSON<null>,
    unkill_deposit: this.txFromJSON<null>,
    unkill_swap: this.txFromJSON<null>,
    unkill_claim: this.txFromJSON<null>,
    unkill_tax: this.txFromJSON<null>,
    unkill_bonus: this.txFromJSON<null>,
    get_is_killed_deposit: this.txFromJSON<boolean>,
    get_is_killed_swap: this.txFromJSON<boolean>,
    get_is_killed_claim: this.txFromJSON<boolean>,
    get_is_killed_tax: this.txFromJSON<boolean>,
    get_is_killed_bonus: this.txFromJSON<boolean>,
    set_protocol_fee_fraction: this.txFromJSON<null>,
    get_protocol_fees: this.txFromJSON<Array<u128>>,
    claim_protocol_fees: this.txFromJSON<Array<u128>>,
    set_fee_rebate_fraction: this.txFromJSON<null>,
    set_base_tax_fraction: this.txFromJSON<null>,
    set_tax_incline: this.txFromJSON<null>,
    set_max_tax_fraction: this.txFromJSON<null>,
    get_tax_config: this.txFromJSON<readonly [u32, u32, u32]>,
    claim_protocol_tax: this.txFromJSON<u128>,
    version: this.txFromJSON<u32>,
    contract_name: this.txFromJSON<string>,
    commit_upgrade: this.txFromJSON<null>,
    apply_upgrade: this.txFromJSON<readonly [Buffer, Buffer]>,
    revert_upgrade: this.txFromJSON<null>,
    set_emergency_mode: this.txFromJSON<null>,
    get_emergency_mode: this.txFromJSON<boolean>,
    initialize_rewards_config: this.txFromJSON<null>,
    set_rewards_config: this.txFromJSON<null>,
    get_unused_reward: this.txFromJSON<u128>,
    return_unused_reward: this.txFromJSON<u128>,
    get_rewards_info: this.txFromJSON<Map<string, i128>>,
    get_user_reward: this.txFromJSON<u128>,
    checkpoint_reward: this.txFromJSON<null>,
    checkpoint_working_balance: this.txFromJSON<null>,
    get_total_accumulated_reward: this.txFromJSON<u128>,
    get_total_configured_reward: this.txFromJSON<u128>,
    adjust_total_accumulated_reward: this.txFromJSON<null>,
    get_total_claimed_reward: this.txFromJSON<u128>,
    claim: this.txFromJSON<u128>,
    gauge_add: this.txFromJSON<null>,
    gauge_remove: this.txFromJSON<null>,
    gauge_schedule_reward: this.txFromJSON<null>,
    kill_gauges_claim: this.txFromJSON<null>,
    unkill_gauges_claim: this.txFromJSON<null>,
    get_gauges: this.txFromJSON<Map<string, string>>,
    gauges_claim: this.txFromJSON<Map<string, u128>>,
    gauges_get_reward_info: this.txFromJSON<Map<string, Map<string, i128>>>,
    init_pools_plane: this.txFromJSON<null>,
    set_pools_plane: this.txFromJSON<null>,
    get_pools_plane: this.txFromJSON<string>,
    backfill_plane_data: this.txFromJSON<null>,
    commit_transfer_ownership: this.txFromJSON<null>,
    apply_transfer_ownership: this.txFromJSON<null>,
    revert_transfer_ownership: this.txFromJSON<null>,
    get_future_address: this.txFromJSON<string>,
    init_config_storage: this.txFromJSON<null>,
  }
}

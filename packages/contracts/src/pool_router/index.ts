import type { i128, Option, u128, u256, u32, u64 } from '@stellar/stellar-sdk/contract'
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

export const PoolRouterError = {
  301: { message: 'PoolNotFound' },
  302: { message: 'BadFee' },
  303: { message: 'ElasticHashMissing' },
  305: { message: 'PoolsOverMax' },
  306: { message: 'ElasticPoolsOverMax' },
  307: { message: 'PathIsEmpty' },
  308: { message: 'TokensAreNotForReward' },
  309: { message: 'LiquidityNotFilled' },
  310: { message: 'LiquidityAlreadyFilled' },
  311: { message: 'VotingShareExceedsMax' },
  312: { message: 'LiquidityCalculationError' },
  313: { message: 'RewardsNotConfigured' },
  314: { message: 'RewardsAlreadyConfigured' },
  315: { message: 'DuplicatesNotAllowed' },
  316: { message: 'InvalidPoolType' },
  317: { message: 'RewardDurationTooShort' },
  318: { message: 'RewardAmountTooLow' },
  319: { message: 'GaugeRewardsDisabledForPool' },
  320: { message: 'UnsupportedTokensNum' },
  321: { message: 'PathMustEndWithRewardToken' },
  2002: { message: 'TokensNotSorted' },
  2020: { message: 'InMaxNotSatisfied' },
}

export enum LiquidityPoolType {
  MissingPool = 0,
  ConstantProduct = 1,
  ElasticSupply = 2,
  Custom = 3,
}

export interface LiquidityPoolData {
  address: string
  pool_type: LiquidityPoolType
}

export interface GlobalRewardsConfig {
  expired_at: u64
  tps: u128
}

export interface LiquidityPoolRewardInfo {
  processed: boolean
  total_liquidity: u256
  voting_share: u32
}

export const PoolError = {
  401: { message: 'PoolAlreadyExists' },
  404: { message: 'PoolNotFound' },
}

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
   * Construct and simulate a pool_type transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  pool_type: (
    { tokens, pool_index }: { tokens: Array<string>; pool_index: Buffer },
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
   * Construct and simulate a get_info transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_info: (
    { tokens, pool_index }: { tokens: Array<string>; pool_index: Buffer },
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
  ) => Promise<AssembledTransaction<Map<string, any>>>

  /**
   * Construct and simulate a get_pool transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_pool: (
    { tokens, pool_index }: { tokens: Array<string>; pool_index: Buffer },
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
   * Construct and simulate a share_id transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  share_id: (
    { tokens, pool_index }: { tokens: Array<string>; pool_index: Buffer },
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
   * Construct and simulate a get_total_shares transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_shares: (
    { tokens, pool_index }: { tokens: Array<string>; pool_index: Buffer },
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
   * Construct and simulate a get_reserves transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_reserves: (
    { tokens, pool_index }: { tokens: Array<string>; pool_index: Buffer },
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
   * Construct and simulate a deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  deposit: (
    {
      user,
      tokens,
      pool_index,
      desired_amounts,
      min_shares,
    }: { user: string; tokens: Array<string>; pool_index: Buffer; desired_amounts: Array<u128>; min_shares: u128 },
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
      tokens,
      token_in,
      token_out,
      pool_index,
      in_amount,
      out_min,
    }: {
      user: string
      tokens: Array<string>
      token_in: string
      token_out: string
      pool_index: Buffer
      in_amount: u128
      out_min: u128
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
  ) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a estimate_swap transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  estimate_swap: (
    {
      tokens,
      token_in,
      token_out,
      pool_index,
      in_amount,
    }: { tokens: Array<string>; token_in: string; token_out: string; pool_index: Buffer; in_amount: u128 },
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
    {
      user,
      tokens,
      pool_index,
      share_amount,
      min_amounts,
    }: { user: string; tokens: Array<string>; pool_index: Buffer; share_amount: u128; min_amounts: Array<u128> },
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
   * Construct and simulate a get_liquidity transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_liquidity: (
    { tokens, pool_index }: { tokens: Array<string>; pool_index: Buffer },
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
  ) => Promise<AssembledTransaction<u256>>

  /**
   * Construct and simulate a get_liquidity_calculator transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_liquidity_calculator: (options?: {
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
   * Construct and simulate a set_liquidity_calculator transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_liquidity_calculator: (
    { admin, calculator }: { admin: string; calculator: string },
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
   * Construct and simulate a init_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  init_admin: (
    { account }: { account: string },
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
   * Construct and simulate a set_token_hash transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_token_hash: (
    { admin, new_hash }: { admin: string; new_hash: Buffer },
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
   * Construct and simulate a set_pool_hash transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_pool_hash: (
    { admin, new_hash }: { admin: string; new_hash: Buffer },
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
   * Construct and simulate a set_elastic_pool_hash transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_elastic_pool_hash: (
    { admin, new_hash }: { admin: string; new_hash: Buffer },
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
   * Construct and simulate a set_rewards_gauge_hash transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_rewards_gauge_hash: (
    { admin, new_hash }: { admin: string; new_hash: Buffer },
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
   * Construct and simulate a set_reward_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_reward_token: (
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
   * Construct and simulate a get_rewards_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_rewards_config: (options?: {
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
  }) => Promise<AssembledTransaction<Map<string, i128>>>

  /**
   * Construct and simulate a get_tokens_for_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_tokens_for_reward: (options?: {
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
  }) => Promise<AssembledTransaction<Map<Array<string>, readonly [u32, boolean, u256]>>>

  /**
   * Construct and simulate a get_total_liquidity transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_liquidity: (
    { tokens }: { tokens: Array<string> },
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
  ) => Promise<AssembledTransaction<u256>>

  /**
   * Construct and simulate a config_global_rewards transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  config_global_rewards: (
    {
      user,
      reward_tps,
      expired_at,
      tokens_votes,
    }: { user: string; reward_tps: u128; expired_at: u64; tokens_votes: Array<readonly [Array<string>, u32]> },
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
   * Construct and simulate a fill_liquidity transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  fill_liquidity: (
    { admin, tokens }: { admin: string; tokens: Array<string> },
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
   * Construct and simulate a config_pool_rewards transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  config_pool_rewards: (
    { admin, tokens, pool_index }: { admin: string; tokens: Array<string>; pool_index: Buffer },
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
    { user, tokens, pool_index }: { user: string; tokens: Array<string>; pool_index: Buffer },
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
    { user, tokens, pool_index }: { user: string; tokens: Array<string>; pool_index: Buffer },
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
   * Construct and simulate a get_total_accumulated_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_accumulated_reward: (
    { tokens, pool_index }: { tokens: Array<string>; pool_index: Buffer },
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
   * Construct and simulate a get_total_configured_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_configured_reward: (
    { tokens, pool_index }: { tokens: Array<string>; pool_index: Buffer },
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
   * Construct and simulate a get_total_claimed_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_claimed_reward: (
    { tokens, pool_index }: { tokens: Array<string>; pool_index: Buffer },
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
   * Construct and simulate a get_total_outstanding_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_outstanding_reward: (
    { tokens, pool_index }: { tokens: Array<string>; pool_index: Buffer },
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
   * Construct and simulate a distribute_outstanding_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  distribute_outstanding_reward: (
    { user, from, tokens, pool_index }: { user: string; from: string; tokens: Array<string>; pool_index: Buffer },
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
   * Construct and simulate a claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  claim: (
    { user, tokens, pool_index }: { user: string; tokens: Array<string>; pool_index: Buffer },
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
   * Construct and simulate a init_standard_pool transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  init_standard_pool: (
    { user, tokens, fee_fraction }: { user: string; tokens: Array<string>; fee_fraction: u32 },
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
  ) => Promise<AssembledTransaction<readonly [Buffer, string]>>

  /**
   * Construct and simulate a init_elastic_pool transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  init_elastic_pool: (
    {
      user,
      tokens,
      fee_fraction,
      oracle,
      assets_config,
    }: {
      user: string
      tokens: Array<string>
      fee_fraction: u32
      oracle: string
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
  ) => Promise<AssembledTransaction<readonly [Buffer, string]>>

  /**
   * Construct and simulate a get_pools transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_pools: (
    { tokens }: { tokens: Array<string> },
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
  ) => Promise<AssembledTransaction<Map<Buffer, string>>>

  /**
   * Construct and simulate a remove_pool transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  remove_pool: (
    { user, tokens, pool_hash }: { user: string; tokens: Array<string>; pool_hash: Buffer },
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
   * Construct and simulate a get_tokens_sets_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_tokens_sets_count: (options?: {
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
  get_tokens: (
    { index }: { index: u128 },
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
  ) => Promise<AssembledTransaction<Array<string>>>

  /**
   * Construct and simulate a get_pools_for_tokens_range transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_pools_for_tokens_range: (
    { start, end }: { start: u128; end: u128 },
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
  ) => Promise<AssembledTransaction<Array<readonly [Array<string>, Map<Buffer, string>]>>>

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
   * Construct and simulate a pool_gauge_set_reward_thresholds transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  pool_gauge_set_reward_thresholds: (
    {
      admin,
      min_reward_equivalent_day,
      min_duration_seconds,
    }: { admin: string; min_reward_equivalent_day: u128; min_duration_seconds: u64 },
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
   * Construct and simulate a pool_gauge_get_min_daily_amount transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  pool_gauge_get_min_daily_amount: (options?: {
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
   * Construct and simulate a pool_gauge_get_min_duration transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  pool_gauge_get_min_duration: (options?: {
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
   * Construct and simulate a pool_gauge_switch_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  pool_gauge_switch_token: (
    { admin, token, enabled }: { admin: string; token: string; enabled: boolean },
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
   * Construct and simulate a pool_gauge_token_enabled transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  pool_gauge_token_enabled: (
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
  ) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a pool_gauge_schedule_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  pool_gauge_schedule_reward: (
    {
      distributor,
      pool_tokens,
      pool_hash,
      distribute_token,
      tps,
      start_at,
      duration,
      swaps_chain_proof,
    }: {
      distributor: string
      pool_tokens: Array<string>
      pool_hash: Buffer
      distribute_token: string
      tps: u128
      start_at: Option<u64>
      duration: u64
      swaps_chain_proof: Array<readonly [Array<string>, Buffer, string]>
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
  ) => Promise<AssembledTransaction<string>>

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
   * Construct and simulate a get_plane transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_plane: (options?: {
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
        'AAAAAAAAAAAAAAAJcG9vbF90eXBlAAAAAAAAAgAAAAAAAAAGdG9rZW5zAAAAAAPqAAAAEwAAAAAAAAAKcG9vbF9pbmRleAAAAAAD7gAAACAAAAABAAAAEQ==',
        'AAAAAAAAAAAAAAAIZ2V0X2luZm8AAAACAAAAAAAAAAZ0b2tlbnMAAAAAA+oAAAATAAAAAAAAAApwb29sX2luZGV4AAAAAAPuAAAAIAAAAAEAAAPsAAAAEQAAAAA=',
        'AAAAAAAAAAAAAAAIZ2V0X3Bvb2wAAAACAAAAAAAAAAZ0b2tlbnMAAAAAA+oAAAATAAAAAAAAAApwb29sX2luZGV4AAAAAAPuAAAAIAAAAAEAAAAT',
        'AAAAAAAAAAAAAAAIc2hhcmVfaWQAAAACAAAAAAAAAAZ0b2tlbnMAAAAAA+oAAAATAAAAAAAAAApwb29sX2luZGV4AAAAAAPuAAAAIAAAAAEAAAAT',
        'AAAAAAAAAAAAAAAQZ2V0X3RvdGFsX3NoYXJlcwAAAAIAAAAAAAAABnRva2VucwAAAAAD6gAAABMAAAAAAAAACnBvb2xfaW5kZXgAAAAAA+4AAAAgAAAAAQAAAAo=',
        'AAAAAAAAAAAAAAAMZ2V0X3Jlc2VydmVzAAAAAgAAAAAAAAAGdG9rZW5zAAAAAAPqAAAAEwAAAAAAAAAKcG9vbF9pbmRleAAAAAAD7gAAACAAAAABAAAD6gAAAAo=',
        'AAAAAAAAAAAAAAAHZGVwb3NpdAAAAAAFAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAGdG9rZW5zAAAAAAPqAAAAEwAAAAAAAAAKcG9vbF9pbmRleAAAAAAD7gAAACAAAAAAAAAAD2Rlc2lyZWRfYW1vdW50cwAAAAPqAAAACgAAAAAAAAAKbWluX3NoYXJlcwAAAAAACgAAAAEAAAPtAAAAAgAAA+oAAAAKAAAACg==',
        'AAAAAAAAAAAAAAAEc3dhcAAAAAcAAAAAAAAABHVzZXIAAAATAAAAAAAAAAZ0b2tlbnMAAAAAA+oAAAATAAAAAAAAAAh0b2tlbl9pbgAAABMAAAAAAAAACXRva2VuX291dAAAAAAAABMAAAAAAAAACnBvb2xfaW5kZXgAAAAAA+4AAAAgAAAAAAAAAAlpbl9hbW91bnQAAAAAAAAKAAAAAAAAAAdvdXRfbWluAAAAAAoAAAABAAAACg==',
        'AAAAAAAAAAAAAAANZXN0aW1hdGVfc3dhcAAAAAAAAAUAAAAAAAAABnRva2VucwAAAAAD6gAAABMAAAAAAAAACHRva2VuX2luAAAAEwAAAAAAAAAJdG9rZW5fb3V0AAAAAAAAEwAAAAAAAAAKcG9vbF9pbmRleAAAAAAD7gAAACAAAAAAAAAACWluX2Ftb3VudAAAAAAAAAoAAAABAAAACg==',
        'AAAAAAAAAAAAAAAId2l0aGRyYXcAAAAFAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAGdG9rZW5zAAAAAAPqAAAAEwAAAAAAAAAKcG9vbF9pbmRleAAAAAAD7gAAACAAAAAAAAAADHNoYXJlX2Ftb3VudAAAAAoAAAAAAAAAC21pbl9hbW91bnRzAAAAA+oAAAAKAAAAAQAAA+oAAAAK',
        'AAAAAAAAAAAAAAANZ2V0X2xpcXVpZGl0eQAAAAAAAAIAAAAAAAAABnRva2VucwAAAAAD6gAAABMAAAAAAAAACnBvb2xfaW5kZXgAAAAAA+4AAAAgAAAAAQAAAAw=',
        'AAAAAAAAAAAAAAAYZ2V0X2xpcXVpZGl0eV9jYWxjdWxhdG9yAAAAAAAAAAEAAAAT',
        'AAAAAAAAAAAAAAAYc2V0X2xpcXVpZGl0eV9jYWxjdWxhdG9yAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAApjYWxjdWxhdG9yAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAAHdmVyc2lvbgAAAAAAAAAAAQAAAAQ=',
        'AAAAAAAAAAAAAAANY29udHJhY3RfbmFtZQAAAAAAAAAAAAABAAAAEQ==',
        'AAAAAAAAAAAAAAAOY29tbWl0X3VwZ3JhZGUAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAANbmV3X3dhc21faGFzaAAAAAAAA+4AAAAgAAAAAA==',
        'AAAAAAAAAAAAAAANYXBwbHlfdXBncmFkZQAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAEAAAPuAAAAIA==',
        'AAAAAAAAAAAAAAAOcmV2ZXJ0X3VwZ3JhZGUAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAASc2V0X2VtZXJnZW5jeV9tb2RlAAAAAAACAAAAAAAAAA9lbWVyZ2VuY3lfYWRtaW4AAAAAEwAAAAAAAAAFdmFsdWUAAAAAAAABAAAAAA==',
        'AAAAAAAAAAAAAAASZ2V0X2VtZXJnZW5jeV9tb2RlAAAAAAAAAAAAAQAAAAE=',
        'AAAAAAAAAAAAAAAKaW5pdF9hZG1pbgAAAAAAAQAAAAAAAAAHYWNjb3VudAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAAUc2V0X3ByaXZpbGVnZWRfYWRkcnMAAAAGAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAADXJld2FyZHNfYWRtaW4AAAAAAAATAAAAAAAAABBvcGVyYXRpb25zX2FkbWluAAAAEwAAAAAAAAALcGF1c2VfYWRtaW4AAAAAEwAAAAAAAAAWZW1lcmdlbmN5X3BhdXNlX2FkbWlucwAAAAAD6gAAABMAAAAAAAAAEHN5c3RlbV9mZWVfYWRtaW4AAAATAAAAAA==',
        'AAAAAAAAAAAAAAAUZ2V0X3ByaXZpbGVnZWRfYWRkcnMAAAAAAAAAAQAAA+wAAAARAAAD6gAAABM=',
        'AAAAAAAAAAAAAAAOc2V0X3Rva2VuX2hhc2gAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAIbmV3X2hhc2gAAAPuAAAAIAAAAAA=',
        'AAAAAAAAAAAAAAANc2V0X3Bvb2xfaGFzaAAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAIbmV3X2hhc2gAAAPuAAAAIAAAAAA=',
        'AAAAAAAAAAAAAAAVc2V0X2VsYXN0aWNfcG9vbF9oYXNoAAAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAhuZXdfaGFzaAAAA+4AAAAgAAAAAA==',
        'AAAAAAAAAAAAAAAWc2V0X3Jld2FyZHNfZ2F1Z2VfaGFzaAAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAhuZXdfaGFzaAAAA+4AAAAgAAAAAA==',
        'AAAAAAAAAAAAAAAQc2V0X3Jld2FyZF90b2tlbgAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAMcmV3YXJkX3Rva2VuAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAAZc2V0X3Byb3RvY29sX2ZlZV9mcmFjdGlvbgAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAMbmV3X2ZyYWN0aW9uAAAABAAAAAA=',
        'AAAAAAAAAAAAAAASZ2V0X3Jld2FyZHNfY29uZmlnAAAAAAAAAAAAAQAAA+wAAAARAAAACw==',
        'AAAAAAAAAAAAAAAVZ2V0X3Rva2Vuc19mb3JfcmV3YXJkAAAAAAAAAAAAAAEAAAPsAAAD6gAAABMAAAPtAAAAAwAAAAQAAAABAAAADA==',
        'AAAAAAAAAAAAAAATZ2V0X3RvdGFsX2xpcXVpZGl0eQAAAAABAAAAAAAAAAZ0b2tlbnMAAAAAA+oAAAATAAAAAQAAAAw=',
        'AAAAAAAAAAAAAAAVY29uZmlnX2dsb2JhbF9yZXdhcmRzAAAAAAAABAAAAAAAAAAEdXNlcgAAABMAAAAAAAAACnJld2FyZF90cHMAAAAAAAoAAAAAAAAACmV4cGlyZWRfYXQAAAAAAAYAAAAAAAAADHRva2Vuc192b3RlcwAAA+oAAAPtAAAAAgAAA+oAAAATAAAABAAAAAA=',
        'AAAAAAAAAAAAAAAOZmlsbF9saXF1aWRpdHkAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAGdG9rZW5zAAAAAAPqAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAATY29uZmlnX3Bvb2xfcmV3YXJkcwAAAAADAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABnRva2VucwAAAAAD6gAAABMAAAAAAAAACnBvb2xfaW5kZXgAAAAAA+4AAAAgAAAAAQAAAAo=',
        'AAAAAAAAAAAAAAAQZ2V0X3Jld2FyZHNfaW5mbwAAAAMAAAAAAAAABHVzZXIAAAATAAAAAAAAAAZ0b2tlbnMAAAAAA+oAAAATAAAAAAAAAApwb29sX2luZGV4AAAAAAPuAAAAIAAAAAEAAAPsAAAAEQAAAAs=',
        'AAAAAAAAAAAAAAAPZ2V0X3VzZXJfcmV3YXJkAAAAAAMAAAAAAAAABHVzZXIAAAATAAAAAAAAAAZ0b2tlbnMAAAAAA+oAAAATAAAAAAAAAApwb29sX2luZGV4AAAAAAPuAAAAIAAAAAEAAAAK',
        'AAAAAAAAAAAAAAAcZ2V0X3RvdGFsX2FjY3VtdWxhdGVkX3Jld2FyZAAAAAIAAAAAAAAABnRva2VucwAAAAAD6gAAABMAAAAAAAAACnBvb2xfaW5kZXgAAAAAA+4AAAAgAAAAAQAAAAo=',
        'AAAAAAAAAAAAAAAbZ2V0X3RvdGFsX2NvbmZpZ3VyZWRfcmV3YXJkAAAAAAIAAAAAAAAABnRva2VucwAAAAAD6gAAABMAAAAAAAAACnBvb2xfaW5kZXgAAAAAA+4AAAAgAAAAAQAAAAo=',
        'AAAAAAAAAAAAAAAYZ2V0X3RvdGFsX2NsYWltZWRfcmV3YXJkAAAAAgAAAAAAAAAGdG9rZW5zAAAAAAPqAAAAEwAAAAAAAAAKcG9vbF9pbmRleAAAAAAD7gAAACAAAAABAAAACg==',
        'AAAAAAAAAAAAAAAcZ2V0X3RvdGFsX291dHN0YW5kaW5nX3Jld2FyZAAAAAIAAAAAAAAABnRva2VucwAAAAAD6gAAABMAAAAAAAAACnBvb2xfaW5kZXgAAAAAA+4AAAAgAAAAAQAAAAo=',
        'AAAAAAAAAAAAAAAdZGlzdHJpYnV0ZV9vdXRzdGFuZGluZ19yZXdhcmQAAAAAAAAEAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAEZnJvbQAAABMAAAAAAAAABnRva2VucwAAAAAD6gAAABMAAAAAAAAACnBvb2xfaW5kZXgAAAAAA+4AAAAgAAAAAQAAAAo=',
        'AAAAAAAAAAAAAAAFY2xhaW0AAAAAAAADAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAGdG9rZW5zAAAAAAPqAAAAEwAAAAAAAAAKcG9vbF9pbmRleAAAAAAD7gAAACAAAAABAAAACg==',
        'AAAAAAAAAAAAAAASaW5pdF9zdGFuZGFyZF9wb29sAAAAAAADAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAGdG9rZW5zAAAAAAPqAAAAEwAAAAAAAAAMZmVlX2ZyYWN0aW9uAAAABAAAAAEAAAPtAAAAAgAAA+4AAAAgAAAAEw==',
        'AAAAAAAAAAAAAAARaW5pdF9lbGFzdGljX3Bvb2wAAAAAAAAFAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAGdG9rZW5zAAAAAAPqAAAAEwAAAAAAAAAMZmVlX2ZyYWN0aW9uAAAABAAAAAAAAAAGb3JhY2xlAAAAAAATAAAAAAAAAA1hc3NldHNfY29uZmlnAAAAAAAD7QAAAAIAAAARAAAAEQAAAAEAAAPtAAAAAgAAA+4AAAAgAAAAEw==',
        'AAAAAAAAAAAAAAAJZ2V0X3Bvb2xzAAAAAAAAAQAAAAAAAAAGdG9rZW5zAAAAAAPqAAAAEwAAAAEAAAPsAAAD7gAAACAAAAAT',
        'AAAAAAAAAAAAAAALcmVtb3ZlX3Bvb2wAAAAAAwAAAAAAAAAEdXNlcgAAABMAAAAAAAAABnRva2VucwAAAAAD6gAAABMAAAAAAAAACXBvb2xfaGFzaAAAAAAAA+4AAAAgAAAAAA==',
        'AAAAAAAAAAAAAAAVZ2V0X3Rva2Vuc19zZXRzX2NvdW50AAAAAAAAAAAAAAEAAAAK',
        'AAAAAAAAAAAAAAAKZ2V0X3Rva2VucwAAAAAAAQAAAAAAAAAFaW5kZXgAAAAAAAAKAAAAAQAAA+oAAAAT',
        'AAAAAAAAAAAAAAAaZ2V0X3Bvb2xzX2Zvcl90b2tlbnNfcmFuZ2UAAAAAAAIAAAAAAAAABXN0YXJ0AAAAAAAACgAAAAAAAAADZW5kAAAAAAoAAAABAAAD6gAAA+0AAAACAAAD6gAAABMAAAPsAAAD7gAAACAAAAAT',
        'AAAAAAAAAAAAAAAZZ2V0X3Byb3RvY29sX2ZlZV9mcmFjdGlvbgAAAAAAAAAAAAABAAAABA==',
        'AAAAAAAAAAAAAAAgcG9vbF9nYXVnZV9zZXRfcmV3YXJkX3RocmVzaG9sZHMAAAADAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAGW1pbl9yZXdhcmRfZXF1aXZhbGVudF9kYXkAAAAAAAAKAAAAAAAAABRtaW5fZHVyYXRpb25fc2Vjb25kcwAAAAYAAAAA',
        'AAAAAAAAAAAAAAAfcG9vbF9nYXVnZV9nZXRfbWluX2RhaWx5X2Ftb3VudAAAAAAAAAAAAQAAAAo=',
        'AAAAAAAAAAAAAAAbcG9vbF9nYXVnZV9nZXRfbWluX2R1cmF0aW9uAAAAAAAAAAABAAAABg==',
        'AAAAAAAAAAAAAAAXcG9vbF9nYXVnZV9zd2l0Y2hfdG9rZW4AAAAAAwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAV0b2tlbgAAAAAAABMAAAAAAAAAB2VuYWJsZWQAAAAAAQAAAAA=',
        'AAAAAAAAAAAAAAAYcG9vbF9nYXVnZV90b2tlbl9lbmFibGVkAAAAAQAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAQAAAAE=',
        'AAAAAAAAAAAAAAAacG9vbF9nYXVnZV9zY2hlZHVsZV9yZXdhcmQAAAAAAAgAAAAAAAAAC2Rpc3RyaWJ1dG9yAAAAABMAAAAAAAAAC3Bvb2xfdG9rZW5zAAAAA+oAAAATAAAAAAAAAAlwb29sX2hhc2gAAAAAAAPuAAAAIAAAAAAAAAAQZGlzdHJpYnV0ZV90b2tlbgAAABMAAAAAAAAAA3RwcwAAAAAKAAAAAAAAAAhzdGFydF9hdAAAA+gAAAAGAAAAAAAAAAhkdXJhdGlvbgAAAAYAAAAAAAAAEXN3YXBzX2NoYWluX3Byb29mAAAAAAAD6gAAA+0AAAADAAAD6gAAABMAAAPuAAAAIAAAABMAAAABAAAAEw==',
        'AAAAAAAAAAAAAAAPc2V0X3Bvb2xzX3BsYW5lAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAFcGxhbmUAAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAAJZ2V0X3BsYW5lAAAAAAAAAAAAAAEAAAAT',
        'AAAAAAAAAAAAAAAZY29tbWl0X3RyYW5zZmVyX293bmVyc2hpcAAAAAAAAAMAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAJcm9sZV9uYW1lAAAAAAAAEQAAAAAAAAALbmV3X2FkZHJlc3MAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAAYYXBwbHlfdHJhbnNmZXJfb3duZXJzaGlwAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAlyb2xlX25hbWUAAAAAAAARAAAAAA==',
        'AAAAAAAAAAAAAAAZcmV2ZXJ0X3RyYW5zZmVyX293bmVyc2hpcAAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAJcm9sZV9uYW1lAAAAAAAAEQAAAAA=',
        'AAAAAAAAAAAAAAASZ2V0X2Z1dHVyZV9hZGRyZXNzAAAAAAABAAAAAAAAAAlyb2xlX25hbWUAAAAAAAARAAAAAQAAABM=',
        'AAAAAAAAAAAAAAATaW5pdF9jb25maWdfc3RvcmFnZQAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAADmNvbmZpZ19zdG9yYWdlAAAAAAATAAAAAA==',
        'AAAABAAAAAAAAAAAAAAAD1Bvb2xSb3V0ZXJFcnJvcgAAAAAWAAAAAAAAAAxQb29sTm90Rm91bmQAAAEtAAAAAAAAAAZCYWRGZWUAAAAAAS4AAAAAAAAAEkVsYXN0aWNIYXNoTWlzc2luZwAAAAABLwAAAAAAAAAMUG9vbHNPdmVyTWF4AAABMQAAAAAAAAATRWxhc3RpY1Bvb2xzT3Zlck1heAAAAAEyAAAAAAAAAAtQYXRoSXNFbXB0eQAAAAEzAAAAAAAAABVUb2tlbnNBcmVOb3RGb3JSZXdhcmQAAAAAAAE0AAAAAAAAABJMaXF1aWRpdHlOb3RGaWxsZWQAAAAAATUAAAAAAAAAFkxpcXVpZGl0eUFscmVhZHlGaWxsZWQAAAAAATYAAAAAAAAAFVZvdGluZ1NoYXJlRXhjZWVkc01heAAAAAAAATcAAAAAAAAAGUxpcXVpZGl0eUNhbGN1bGF0aW9uRXJyb3IAAAAAAAE4AAAAAAAAABRSZXdhcmRzTm90Q29uZmlndXJlZAAAATkAAAAAAAAAGFJld2FyZHNBbHJlYWR5Q29uZmlndXJlZAAAAToAAAAAAAAAFER1cGxpY2F0ZXNOb3RBbGxvd2VkAAABOwAAAAAAAAAPSW52YWxpZFBvb2xUeXBlAAAAATwAAAAAAAAAFlJld2FyZER1cmF0aW9uVG9vU2hvcnQAAAAAAT0AAAAAAAAAElJld2FyZEFtb3VudFRvb0xvdwAAAAABPgAAAAAAAAAbR2F1Z2VSZXdhcmRzRGlzYWJsZWRGb3JQb29sAAAAAT8AAAAAAAAAFFVuc3VwcG9ydGVkVG9rZW5zTnVtAAABQAAAAAAAAAAaUGF0aE11c3RFbmRXaXRoUmV3YXJkVG9rZW4AAAAAAUEAAAAAAAAAD1Rva2Vuc05vdFNvcnRlZAAAAAfSAAAAAAAAABFJbk1heE5vdFNhdGlzZmllZAAAAAAAB+Q=',
        'AAAAAwAAAAAAAAAAAAAAEUxpcXVpZGl0eVBvb2xUeXBlAAAAAAAABAAAAAAAAAALTWlzc2luZ1Bvb2wAAAAAAAAAAAAAAAAPQ29uc3RhbnRQcm9kdWN0AAAAAAEAAAAAAAAADUVsYXN0aWNTdXBwbHkAAAAAAAACAAAAAAAAAAZDdXN0b20AAAAAAAM=',
        'AAAAAQAAAAAAAAAAAAAAEUxpcXVpZGl0eVBvb2xEYXRhAAAAAAAAAgAAAAAAAAAHYWRkcmVzcwAAAAATAAAAAAAAAAlwb29sX3R5cGUAAAAAAAfQAAAAEUxpcXVpZGl0eVBvb2xUeXBlAAAA',
        'AAAAAQAAAAAAAAAAAAAAE0dsb2JhbFJld2FyZHNDb25maWcAAAAAAgAAAAAAAAAKZXhwaXJlZF9hdAAAAAAABgAAAAAAAAADdHBzAAAAAAo=',
        'AAAAAQAAAAAAAAAAAAAAF0xpcXVpZGl0eVBvb2xSZXdhcmRJbmZvAAAAAAMAAAAAAAAACXByb2Nlc3NlZAAAAAAAAAEAAAAAAAAAD3RvdGFsX2xpcXVpZGl0eQAAAAAMAAAAAAAAAAx2b3Rpbmdfc2hhcmUAAAAE',
        'AAAABAAAAAAAAAAAAAAACVBvb2xFcnJvcgAAAAAAAAIAAAAAAAAAEVBvb2xBbHJlYWR5RXhpc3RzAAAAAAABkQAAAAAAAAAMUG9vbE5vdEZvdW5kAAABlA==',
        'AAAABAAAAAAAAAAAAAAAEkFjY2Vzc0NvbnRyb2xFcnJvcgAAAAAABwAAAAAAAAAMUm9sZU5vdEZvdW5kAAAAZQAAAAAAAAAMVW5hdXRob3JpemVkAAAAZgAAAAAAAAAPQWRtaW5BbHJlYWR5U2V0AAAAAGcAAAAAAAAADEJhZFJvbGVVc2FnZQAAAGgAAAAAAAAAE0Fub3RoZXJBY3Rpb25BY3RpdmUAAAALWgAAAAAAAAAOTm9BY3Rpb25BY3RpdmUAAAAAC1sAAAAAAAAAEUFjdGlvbk5vdFJlYWR5WWV0AAAAAAALXA==',
        'AAAAAgAAAAAAAAAAAAAAC1dBU01EYXRhS2V5AAAAAAYAAAAAAAAAAAAAAAlUb2tlbkhhc2gAAAAAAAAAAAAAAAAAAA9Ub2tlbkZ1dHVyZVdBU00AAAAAAAAAAAAAAAAJR2F1Z2VXQVNNAAAAAAAAAAAAAAAAAAAPRnV0dXJlR2F1Z2VXQVNNAAAAAAAAAAAAAAAAEENvbnN0YW50UG9vbEhhc2gAAAAAAAAAAAAAAA9FbGFzdGljUG9vbEhhc2gA',
        'AAAABAAAAAAAAAAAAAAADFJld2FyZHNFcnJvcgAAAAIAAAAAAAAAElBhc3RUaW1lTm90QWxsb3dlZAAAAAACvQAAAAAAAAARU2FtZVJld2FyZHNDb25maWcAAAAAAAK+',
        'AAAAAQAAAAAAAAAAAAAAEFBvb2xSZXdhcmRDb25maWcAAAACAAAAAAAAAApleHBpcmVkX2F0AAAAAAAGAAAAAAAAAAN0cHMAAAAACg==',
        'AAAAAQAAAAAAAAAAAAAADlBvb2xSZXdhcmREYXRhAAAAAAAEAAAAAAAAAAthY2N1bXVsYXRlZAAAAAAKAAAAAAAAAAVibG9jawAAAAAAAAYAAAAAAAAAB2NsYWltZWQAAAAACgAAAAAAAAAJbGFzdF90aW1lAAAAAAAABg==',
        'AAAAAQAAAAAAAAAAAAAADlVzZXJSZXdhcmREYXRhAAAAAAADAAAAAAAAAApsYXN0X2Jsb2NrAAAAAAAGAAAAAAAAABBwb29sX2FjY3VtdWxhdGVkAAAACgAAAAAAAAAIdG9fY2xhaW0AAAAK',
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
    pool_type: this.txFromJSON<string>,
    get_info: this.txFromJSON<Map<string, any>>,
    get_pool: this.txFromJSON<string>,
    share_id: this.txFromJSON<string>,
    get_total_shares: this.txFromJSON<u128>,
    get_reserves: this.txFromJSON<Array<u128>>,
    deposit: this.txFromJSON<readonly [Array<u128>, u128]>,
    swap: this.txFromJSON<u128>,
    estimate_swap: this.txFromJSON<u128>,
    withdraw: this.txFromJSON<Array<u128>>,
    get_liquidity: this.txFromJSON<u256>,
    get_liquidity_calculator: this.txFromJSON<string>,
    set_liquidity_calculator: this.txFromJSON<null>,
    version: this.txFromJSON<u32>,
    contract_name: this.txFromJSON<string>,
    commit_upgrade: this.txFromJSON<null>,
    apply_upgrade: this.txFromJSON<Buffer>,
    revert_upgrade: this.txFromJSON<null>,
    set_emergency_mode: this.txFromJSON<null>,
    get_emergency_mode: this.txFromJSON<boolean>,
    init_admin: this.txFromJSON<null>,
    set_privileged_addrs: this.txFromJSON<null>,
    get_privileged_addrs: this.txFromJSON<Map<string, Array<string>>>,
    set_token_hash: this.txFromJSON<null>,
    set_pool_hash: this.txFromJSON<null>,
    set_elastic_pool_hash: this.txFromJSON<null>,
    set_rewards_gauge_hash: this.txFromJSON<null>,
    set_reward_token: this.txFromJSON<null>,
    set_protocol_fee_fraction: this.txFromJSON<null>,
    get_rewards_config: this.txFromJSON<Map<string, i128>>,
    get_tokens_for_reward: this.txFromJSON<Map<Array<string>, readonly [u32, boolean, u256]>>,
    get_total_liquidity: this.txFromJSON<u256>,
    config_global_rewards: this.txFromJSON<null>,
    fill_liquidity: this.txFromJSON<null>,
    config_pool_rewards: this.txFromJSON<u128>,
    get_rewards_info: this.txFromJSON<Map<string, i128>>,
    get_user_reward: this.txFromJSON<u128>,
    get_total_accumulated_reward: this.txFromJSON<u128>,
    get_total_configured_reward: this.txFromJSON<u128>,
    get_total_claimed_reward: this.txFromJSON<u128>,
    get_total_outstanding_reward: this.txFromJSON<u128>,
    distribute_outstanding_reward: this.txFromJSON<u128>,
    claim: this.txFromJSON<u128>,
    init_standard_pool: this.txFromJSON<readonly [Buffer, string]>,
    init_elastic_pool: this.txFromJSON<readonly [Buffer, string]>,
    get_pools: this.txFromJSON<Map<Buffer, string>>,
    remove_pool: this.txFromJSON<null>,
    get_tokens_sets_count: this.txFromJSON<u128>,
    get_tokens: this.txFromJSON<Array<string>>,
    get_pools_for_tokens_range: this.txFromJSON<Array<readonly [Array<string>, Map<Buffer, string>]>>,
    get_protocol_fee_fraction: this.txFromJSON<u32>,
    pool_gauge_set_reward_thresholds: this.txFromJSON<null>,
    pool_gauge_get_min_daily_amount: this.txFromJSON<u128>,
    pool_gauge_get_min_duration: this.txFromJSON<u64>,
    pool_gauge_switch_token: this.txFromJSON<null>,
    pool_gauge_token_enabled: this.txFromJSON<boolean>,
    pool_gauge_schedule_reward: this.txFromJSON<string>,
    set_pools_plane: this.txFromJSON<null>,
    get_plane: this.txFromJSON<string>,
    commit_transfer_ownership: this.txFromJSON<null>,
    apply_transfer_ownership: this.txFromJSON<null>,
    revert_transfer_ownership: this.txFromJSON<null>,
    get_future_address: this.txFromJSON<string>,
    init_config_storage: this.txFromJSON<null>,
  }
}

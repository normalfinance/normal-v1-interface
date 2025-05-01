import { Buffer } from "buffer";
import { Address } from '@stellar/stellar-sdk';
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from '@stellar/stellar-sdk/contract';
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Typepoint,
  Duration,
} from '@stellar/stellar-sdk/contract';
export * from '@stellar/stellar-sdk'
export * as contract from '@stellar/stellar-sdk/contract'
export * as rpc from '@stellar/stellar-sdk/rpc'

if (typeof window !== 'undefined') {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CDKHW2DSABADOE3LB7UFJADES5OH6O7CZIHBTRNVU4UYWE3WWNKR7SMM",
  }
} as const

export const LiquidityPoolRouterError = {
  /**
   * LiquidityPoolRouterError: PoolNotFound
   */
  301: {message:"PoolNotFound"},

  302: {message:"BadFee"},

  303: {message:"StableswapHashMissing"},

  305: {message:"PoolsOverMax"},

  306: {message:"StableswapPoolsOverMax"},

  307: {message:"PathIsEmpty"},

  308: {message:"TokensAreNotForReward"},

  309: {message:"LiquidityNotFilled"},

  310: {message:"LiquidityAlreadyFilled"},

  311: {message:"VotingShareExceedsMax"},

  312: {message:"LiquidityCalculationError"},

  313: {message:"RewardsNotConfigured"},

  314: {message:"RewardsAlreadyConfigured"},

  315: {message:"DuplicatesNotAllowed"},

  316: {message:"InvalidPoolType"},

  2002: {message:"TokensNotSorted"},

  2020: {message:"InMaxNotSatisfied"}
}
export enum LiquidityPoolType {
  MissingPool = 0,
  ConstantProduct = 1,
  Custom = 3,
}


export interface LiquidityPoolData {
  address: string;
  pool_type: LiquidityPoolType;
}


export interface GlobalRewardsConfig {
  expired_at: u64;
  tps: u128;
}


export interface LiquidityPoolRewardInfo {
  processed: boolean;
  total_liquidity: u256;
  voting_share: u32;
}

export const PoolError = {
  /**
   * PoolError: PoolAlreadyExists
   */
  401: {message:"PoolAlreadyExists"},

  404: {message:"PoolNotFound"}
}
export const AccessControlError = {
  /**
   * AccessControlError: RoleNotFound
   */
  101: {message:"RoleNotFound"},

  102: {message:"Unauthorized"},

  103: {message:"AdminAlreadySet"},

  104: {message:"BadRoleUsage"},

  2906: {message:"AnotherActionActive"},

  2907: {message:"NoActionActive"},

  2908: {message:"ActionNotReadyYet"}
}
export const RewardsError = {
  /**
   * RewardsError: PastTimeNotAllowed
   */
  701: {message:"PastTimeNotAllowed"},

  702: {message:"SameRewardsConfig"}
}

export interface PoolRewardConfig {
  expired_at: u64;
  tps: u128;
}


export interface PoolRewardData {
  accumulated: u128;
  block: u64;
  claimed: u128;
  last_time: u64;
}


export interface UserRewardData {
  last_block: u64;
  pool_accumulated: u128;
  to_claim: u128;
}


/**
 * Price data for an asset at a specific timestamp
 */
export interface PriceData {
  price: i128;
  timestamp: u64;
}

/**
 * Asset type
 */
export type Asset = {tag: "Stellar", values: readonly [string]} | {tag: "Other", values: readonly [string]};

export const UpgradeError = {
  /**
   * UpgradeError: AnotherActionActive
   */
  2906: {message:"AnotherActionActive"},

  2907: {message:"NoActionActive"},

  2908: {message:"ActionNotReadyYet"}
}
export const MathError = {
  /**
   * MathError: NumberOverflow
   */
  510: {message:"NumberOverflow"}
}
export const StorageError = {
  /**
   * StorageError: NumbValueNotInitializederOverflow
   */
  501: {message:"ValueNotInitialized"},

  502: {message:"ValueMissing"}
}

export interface Client {
  /**
   * Construct and simulate a pool_type transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  pool_type: ({tokens, pool_index}: {tokens: Array<string>, pool_index: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a get_info transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_info: ({tokens, pool_index}: {tokens: Array<string>, pool_index: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Map<string, any>>>

  /**
   * Construct and simulate a get_pool transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_pool: ({tokens, pool_index}: {tokens: Array<string>, pool_index: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a share_id transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  share_id: ({tokens, pool_index}: {tokens: Array<string>, pool_index: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a get_total_shares transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_shares: ({tokens, pool_index}: {tokens: Array<string>, pool_index: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a get_reserves transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_reserves: ({tokens, pool_index}: {tokens: Array<string>, pool_index: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Array<u128>>>

  /**
   * Construct and simulate a deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  deposit: ({user, tokens, pool_index, desired_amount, min_shares}: {user: string, tokens: Array<string>, pool_index: Buffer, desired_amount: u128, min_shares: u128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<readonly [u128, u128]>>

  /**
   * Construct and simulate a swap transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  swap: ({user, tokens, token_in, token_out, pool_index, in_amount, out_min}: {user: string, tokens: Array<string>, token_in: string, token_out: string, pool_index: Buffer, in_amount: u128, out_min: u128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a estimate_swap transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  estimate_swap: ({tokens, token_in, token_out, pool_index, in_amount}: {tokens: Array<string>, token_in: string, token_out: string, pool_index: Buffer, in_amount: u128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  withdraw: ({user, tokens, pool_index, share_amount, min_amount}: {user: string, tokens: Array<string>, pool_index: Buffer, share_amount: u128, min_amount: u128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a get_liquidity transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_liquidity: ({tokens, pool_index}: {tokens: Array<string>, pool_index: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u256>>

  /**
   * Construct and simulate a get_liquidity_calculator transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_liquidity_calculator: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a set_liquidity_calculator transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_liquidity_calculator: ({admin, calculator}: {admin: string, calculator: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a version transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  version: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a commit_upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  commit_upgrade: ({admin, new_wasm_hash}: {admin: string, new_wasm_hash: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a apply_upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  apply_upgrade: ({admin}: {admin: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Buffer>>

  /**
   * Construct and simulate a revert_upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  revert_upgrade: ({admin}: {admin: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_emergency_mode transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_emergency_mode: ({emergency_admin, value}: {emergency_admin: string, value: boolean}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_emergency_mode transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_emergency_mode: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a init_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  init_admin: ({account}: {account: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_privileged_addrs transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_privileged_addrs: ({admin, rewards_admin, operations_admin, pause_admin, emergency_pause_admins}: {admin: string, rewards_admin: string, operations_admin: string, pause_admin: string, emergency_pause_admins: Array<string>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_privileged_addrs transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_privileged_addrs: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Map<string, Array<string>>>>

  /**
   * Construct and simulate a set_token_hash transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_token_hash: ({admin, new_hash}: {admin: string, new_hash: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_pool_hash transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_pool_hash: ({admin, new_hash}: {admin: string, new_hash: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a configure_init_pool_payment transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  configure_init_pool_payment: ({admin, token, standard_pool_amount, to}: {admin: string, token: string, standard_pool_amount: u128, to: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_init_pool_payment_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_init_pool_payment_token: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a get_init_pool_payment_address transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_init_pool_payment_address: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a get_standard_pool_payment_amount transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_standard_pool_payment_amount: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a set_reward_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_reward_token: ({admin, reward_token}: {admin: string, reward_token: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_reward_boost_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_reward_boost_config: ({admin, reward_boost_token, reward_boost_feed}: {admin: string, reward_boost_token: string, reward_boost_feed: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_rewards_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_rewards_config: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Map<string, i128>>>

  /**
   * Construct and simulate a get_tokens_for_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_tokens_for_reward: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Map<Array<string>, readonly [u32, boolean, u256]>>>

  /**
   * Construct and simulate a get_total_liquidity transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_liquidity: ({tokens}: {tokens: Array<string>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u256>>

  /**
   * Construct and simulate a config_global_rewards transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  config_global_rewards: ({user, reward_tps, expired_at, tokens_votes}: {user: string, reward_tps: u128, expired_at: u64, tokens_votes: Array<readonly [Array<string>, u32]>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a fill_liquidity transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  fill_liquidity: ({tokens}: {tokens: Array<string>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a config_pool_rewards transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  config_pool_rewards: ({tokens, pool_index}: {tokens: Array<string>, pool_index: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a get_rewards_info transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_rewards_info: ({user, tokens, pool_index}: {user: string, tokens: Array<string>, pool_index: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Map<string, i128>>>

  /**
   * Construct and simulate a get_user_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_user_reward: ({user, tokens, pool_index}: {user: string, tokens: Array<string>, pool_index: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a get_total_accumulated_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_accumulated_reward: ({tokens, pool_index}: {tokens: Array<string>, pool_index: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a get_total_configured_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_configured_reward: ({tokens, pool_index}: {tokens: Array<string>, pool_index: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a get_total_claimed_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_claimed_reward: ({tokens, pool_index}: {tokens: Array<string>, pool_index: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a get_total_outstanding_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_outstanding_reward: ({tokens, pool_index}: {tokens: Array<string>, pool_index: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a distribute_outstanding_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  distribute_outstanding_reward: ({user, from, tokens, pool_index}: {user: string, from: string, tokens: Array<string>, pool_index: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  claim: ({user, tokens, pool_index}: {user: string, tokens: Array<string>, pool_index: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a init_standard_pool transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  init_standard_pool: ({user, tokens, oracle, target_asset, fee_fraction}: {user: string, tokens: Array<string>, oracle: string, target_asset: Asset, fee_fraction: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<readonly [Buffer, string]>>

  /**
   * Construct and simulate a get_pools transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_pools: ({tokens}: {tokens: Array<string>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Map<Buffer, string>>>

  /**
   * Construct and simulate a remove_pool transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  remove_pool: ({user, tokens, pool_hash}: {user: string, tokens: Array<string>, pool_hash: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_tokens_sets_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_tokens_sets_count: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a get_tokens transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_tokens: ({index}: {index: u128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Array<string>>>

  /**
   * Construct and simulate a get_pools_for_tokens_range transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_pools_for_tokens_range: ({start, end}: {start: u128, end: u128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Array<readonly [Array<string>, Map<Buffer, string>]>>>

  /**
   * Construct and simulate a set_pools_plane transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_pools_plane: ({admin, plane}: {admin: string, plane: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_plane transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_plane: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a commit_transfer_ownership transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  commit_transfer_ownership: ({admin, role_name, new_address}: {admin: string, role_name: string, new_address: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a apply_transfer_ownership transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  apply_transfer_ownership: ({admin, role_name}: {admin: string, role_name: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a revert_transfer_ownership transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  revert_transfer_ownership: ({admin, role_name}: {admin: string, role_name: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_future_address transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_future_address: ({role_name}: {role_name: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<string>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initalizing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    // return ContractClient.
    // return ContractClient.deploy(null, options)
    return undefined as any;
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAAAAAAAAJcG9vbF90eXBlAAAAAAAAAgAAAAAAAAAGdG9rZW5zAAAAAAPqAAAAEwAAAAAAAAAKcG9vbF9pbmRleAAAAAAD7gAAACAAAAABAAAAEQ==",
        "AAAAAAAAAAAAAAAIZ2V0X2luZm8AAAACAAAAAAAAAAZ0b2tlbnMAAAAAA+oAAAATAAAAAAAAAApwb29sX2luZGV4AAAAAAPuAAAAIAAAAAEAAAPsAAAAEQAAAAA=",
        "AAAAAAAAAAAAAAAIZ2V0X3Bvb2wAAAACAAAAAAAAAAZ0b2tlbnMAAAAAA+oAAAATAAAAAAAAAApwb29sX2luZGV4AAAAAAPuAAAAIAAAAAEAAAAT",
        "AAAAAAAAAAAAAAAIc2hhcmVfaWQAAAACAAAAAAAAAAZ0b2tlbnMAAAAAA+oAAAATAAAAAAAAAApwb29sX2luZGV4AAAAAAPuAAAAIAAAAAEAAAAT",
        "AAAAAAAAAAAAAAAQZ2V0X3RvdGFsX3NoYXJlcwAAAAIAAAAAAAAABnRva2VucwAAAAAD6gAAABMAAAAAAAAACnBvb2xfaW5kZXgAAAAAA+4AAAAgAAAAAQAAAAo=",
        "AAAAAAAAAAAAAAAMZ2V0X3Jlc2VydmVzAAAAAgAAAAAAAAAGdG9rZW5zAAAAAAPqAAAAEwAAAAAAAAAKcG9vbF9pbmRleAAAAAAD7gAAACAAAAABAAAD6gAAAAo=",
        "AAAAAAAAAAAAAAAHZGVwb3NpdAAAAAAFAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAGdG9rZW5zAAAAAAPqAAAAEwAAAAAAAAAKcG9vbF9pbmRleAAAAAAD7gAAACAAAAAAAAAADmRlc2lyZWRfYW1vdW50AAAAAAAKAAAAAAAAAAptaW5fc2hhcmVzAAAAAAAKAAAAAQAAA+0AAAACAAAACgAAAAo=",
        "AAAAAAAAAAAAAAAEc3dhcAAAAAcAAAAAAAAABHVzZXIAAAATAAAAAAAAAAZ0b2tlbnMAAAAAA+oAAAATAAAAAAAAAAh0b2tlbl9pbgAAABMAAAAAAAAACXRva2VuX291dAAAAAAAABMAAAAAAAAACnBvb2xfaW5kZXgAAAAAA+4AAAAgAAAAAAAAAAlpbl9hbW91bnQAAAAAAAAKAAAAAAAAAAdvdXRfbWluAAAAAAoAAAABAAAACg==",
        "AAAAAAAAAAAAAAANZXN0aW1hdGVfc3dhcAAAAAAAAAUAAAAAAAAABnRva2VucwAAAAAD6gAAABMAAAAAAAAACHRva2VuX2luAAAAEwAAAAAAAAAJdG9rZW5fb3V0AAAAAAAAEwAAAAAAAAAKcG9vbF9pbmRleAAAAAAD7gAAACAAAAAAAAAACWluX2Ftb3VudAAAAAAAAAoAAAABAAAACg==",
        "AAAAAAAAAAAAAAAId2l0aGRyYXcAAAAFAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAGdG9rZW5zAAAAAAPqAAAAEwAAAAAAAAAKcG9vbF9pbmRleAAAAAAD7gAAACAAAAAAAAAADHNoYXJlX2Ftb3VudAAAAAoAAAAAAAAACm1pbl9hbW91bnQAAAAAAAoAAAABAAAACg==",
        "AAAAAAAAAAAAAAANZ2V0X2xpcXVpZGl0eQAAAAAAAAIAAAAAAAAABnRva2VucwAAAAAD6gAAABMAAAAAAAAACnBvb2xfaW5kZXgAAAAAA+4AAAAgAAAAAQAAAAw=",
        "AAAAAAAAAAAAAAAYZ2V0X2xpcXVpZGl0eV9jYWxjdWxhdG9yAAAAAAAAAAEAAAAT",
        "AAAAAAAAAAAAAAAYc2V0X2xpcXVpZGl0eV9jYWxjdWxhdG9yAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAApjYWxjdWxhdG9yAAAAAAATAAAAAA==",
        "AAAAAAAAAAAAAAAHdmVyc2lvbgAAAAAAAAAAAQAAAAQ=",
        "AAAAAAAAAAAAAAAOY29tbWl0X3VwZ3JhZGUAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAANbmV3X3dhc21faGFzaAAAAAAAA+4AAAAgAAAAAA==",
        "AAAAAAAAAAAAAAANYXBwbHlfdXBncmFkZQAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAEAAAPuAAAAIA==",
        "AAAAAAAAAAAAAAAOcmV2ZXJ0X3VwZ3JhZGUAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAASc2V0X2VtZXJnZW5jeV9tb2RlAAAAAAACAAAAAAAAAA9lbWVyZ2VuY3lfYWRtaW4AAAAAEwAAAAAAAAAFdmFsdWUAAAAAAAABAAAAAA==",
        "AAAAAAAAAAAAAAASZ2V0X2VtZXJnZW5jeV9tb2RlAAAAAAAAAAAAAQAAAAE=",
        "AAAAAAAAAAAAAAAKaW5pdF9hZG1pbgAAAAAAAQAAAAAAAAAHYWNjb3VudAAAAAATAAAAAA==",
        "AAAAAAAAAAAAAAAUc2V0X3ByaXZpbGVnZWRfYWRkcnMAAAAFAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAADXJld2FyZHNfYWRtaW4AAAAAAAATAAAAAAAAABBvcGVyYXRpb25zX2FkbWluAAAAEwAAAAAAAAALcGF1c2VfYWRtaW4AAAAAEwAAAAAAAAAWZW1lcmdlbmN5X3BhdXNlX2FkbWlucwAAAAAD6gAAABMAAAAA",
        "AAAAAAAAAAAAAAAUZ2V0X3ByaXZpbGVnZWRfYWRkcnMAAAAAAAAAAQAAA+wAAAARAAAD6gAAABM=",
        "AAAAAAAAAAAAAAAOc2V0X3Rva2VuX2hhc2gAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAIbmV3X2hhc2gAAAPuAAAAIAAAAAA=",
        "AAAAAAAAAAAAAAANc2V0X3Bvb2xfaGFzaAAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAIbmV3X2hhc2gAAAPuAAAAIAAAAAA=",
        "AAAAAAAAAAAAAAAbY29uZmlndXJlX2luaXRfcG9vbF9wYXltZW50AAAAAAQAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAAAAABRzdGFuZGFyZF9wb29sX2Ftb3VudAAAAAoAAAAAAAAAAnRvAAAAAAATAAAAAA==",
        "AAAAAAAAAAAAAAAbZ2V0X2luaXRfcG9vbF9wYXltZW50X3Rva2VuAAAAAAAAAAABAAAAEw==",
        "AAAAAAAAAAAAAAAdZ2V0X2luaXRfcG9vbF9wYXltZW50X2FkZHJlc3MAAAAAAAAAAAAAAQAAABM=",
        "AAAAAAAAAAAAAAAgZ2V0X3N0YW5kYXJkX3Bvb2xfcGF5bWVudF9hbW91bnQAAAAAAAAAAQAAAAo=",
        "AAAAAAAAAAAAAAAQc2V0X3Jld2FyZF90b2tlbgAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAMcmV3YXJkX3Rva2VuAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAXc2V0X3Jld2FyZF9ib29zdF9jb25maWcAAAAAAwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAABJyZXdhcmRfYm9vc3RfdG9rZW4AAAAAABMAAAAAAAAAEXJld2FyZF9ib29zdF9mZWVkAAAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAASZ2V0X3Jld2FyZHNfY29uZmlnAAAAAAAAAAAAAQAAA+wAAAARAAAACw==",
        "AAAAAAAAAAAAAAAVZ2V0X3Rva2Vuc19mb3JfcmV3YXJkAAAAAAAAAAAAAAEAAAPsAAAD6gAAABMAAAPtAAAAAwAAAAQAAAABAAAADA==",
        "AAAAAAAAAAAAAAATZ2V0X3RvdGFsX2xpcXVpZGl0eQAAAAABAAAAAAAAAAZ0b2tlbnMAAAAAA+oAAAATAAAAAQAAAAw=",
        "AAAAAAAAAAAAAAAVY29uZmlnX2dsb2JhbF9yZXdhcmRzAAAAAAAABAAAAAAAAAAEdXNlcgAAABMAAAAAAAAACnJld2FyZF90cHMAAAAAAAoAAAAAAAAACmV4cGlyZWRfYXQAAAAAAAYAAAAAAAAADHRva2Vuc192b3RlcwAAA+oAAAPtAAAAAgAAA+oAAAATAAAABAAAAAA=",
        "AAAAAAAAAAAAAAAOZmlsbF9saXF1aWRpdHkAAAAAAAEAAAAAAAAABnRva2VucwAAAAAD6gAAABMAAAAA",
        "AAAAAAAAAAAAAAATY29uZmlnX3Bvb2xfcmV3YXJkcwAAAAACAAAAAAAAAAZ0b2tlbnMAAAAAA+oAAAATAAAAAAAAAApwb29sX2luZGV4AAAAAAPuAAAAIAAAAAEAAAAK",
        "AAAAAAAAAAAAAAAQZ2V0X3Jld2FyZHNfaW5mbwAAAAMAAAAAAAAABHVzZXIAAAATAAAAAAAAAAZ0b2tlbnMAAAAAA+oAAAATAAAAAAAAAApwb29sX2luZGV4AAAAAAPuAAAAIAAAAAEAAAPsAAAAEQAAAAs=",
        "AAAAAAAAAAAAAAAPZ2V0X3VzZXJfcmV3YXJkAAAAAAMAAAAAAAAABHVzZXIAAAATAAAAAAAAAAZ0b2tlbnMAAAAAA+oAAAATAAAAAAAAAApwb29sX2luZGV4AAAAAAPuAAAAIAAAAAEAAAAK",
        "AAAAAAAAAAAAAAAcZ2V0X3RvdGFsX2FjY3VtdWxhdGVkX3Jld2FyZAAAAAIAAAAAAAAABnRva2VucwAAAAAD6gAAABMAAAAAAAAACnBvb2xfaW5kZXgAAAAAA+4AAAAgAAAAAQAAAAo=",
        "AAAAAAAAAAAAAAAbZ2V0X3RvdGFsX2NvbmZpZ3VyZWRfcmV3YXJkAAAAAAIAAAAAAAAABnRva2VucwAAAAAD6gAAABMAAAAAAAAACnBvb2xfaW5kZXgAAAAAA+4AAAAgAAAAAQAAAAo=",
        "AAAAAAAAAAAAAAAYZ2V0X3RvdGFsX2NsYWltZWRfcmV3YXJkAAAAAgAAAAAAAAAGdG9rZW5zAAAAAAPqAAAAEwAAAAAAAAAKcG9vbF9pbmRleAAAAAAD7gAAACAAAAABAAAACg==",
        "AAAAAAAAAAAAAAAcZ2V0X3RvdGFsX291dHN0YW5kaW5nX3Jld2FyZAAAAAIAAAAAAAAABnRva2VucwAAAAAD6gAAABMAAAAAAAAACnBvb2xfaW5kZXgAAAAAA+4AAAAgAAAAAQAAAAo=",
        "AAAAAAAAAAAAAAAdZGlzdHJpYnV0ZV9vdXRzdGFuZGluZ19yZXdhcmQAAAAAAAAEAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAEZnJvbQAAABMAAAAAAAAABnRva2VucwAAAAAD6gAAABMAAAAAAAAACnBvb2xfaW5kZXgAAAAAA+4AAAAgAAAAAQAAAAo=",
        "AAAAAAAAAAAAAAAFY2xhaW0AAAAAAAADAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAGdG9rZW5zAAAAAAPqAAAAEwAAAAAAAAAKcG9vbF9pbmRleAAAAAAD7gAAACAAAAABAAAACg==",
        "AAAAAAAAAAAAAAASaW5pdF9zdGFuZGFyZF9wb29sAAAAAAAFAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAGdG9rZW5zAAAAAAPqAAAAEwAAAAAAAAAGb3JhY2xlAAAAAAATAAAAAAAAAAx0YXJnZXRfYXNzZXQAAAfQAAAABUFzc2V0AAAAAAAAAAAAAAxmZWVfZnJhY3Rpb24AAAAEAAAAAQAAA+0AAAACAAAD7gAAACAAAAAT",
        "AAAAAAAAAAAAAAAJZ2V0X3Bvb2xzAAAAAAAAAQAAAAAAAAAGdG9rZW5zAAAAAAPqAAAAEwAAAAEAAAPsAAAD7gAAACAAAAAT",
        "AAAAAAAAAAAAAAALcmVtb3ZlX3Bvb2wAAAAAAwAAAAAAAAAEdXNlcgAAABMAAAAAAAAABnRva2VucwAAAAAD6gAAABMAAAAAAAAACXBvb2xfaGFzaAAAAAAAA+4AAAAgAAAAAA==",
        "AAAAAAAAAAAAAAAVZ2V0X3Rva2Vuc19zZXRzX2NvdW50AAAAAAAAAAAAAAEAAAAK",
        "AAAAAAAAAAAAAAAKZ2V0X3Rva2VucwAAAAAAAQAAAAAAAAAFaW5kZXgAAAAAAAAKAAAAAQAAA+oAAAAT",
        "AAAAAAAAAAAAAAAaZ2V0X3Bvb2xzX2Zvcl90b2tlbnNfcmFuZ2UAAAAAAAIAAAAAAAAABXN0YXJ0AAAAAAAACgAAAAAAAAADZW5kAAAAAAoAAAABAAAD6gAAA+0AAAACAAAD6gAAABMAAAPsAAAD7gAAACAAAAAT",
        "AAAAAAAAAAAAAAAPc2V0X3Bvb2xzX3BsYW5lAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAFcGxhbmUAAAAAAAATAAAAAA==",
        "AAAAAAAAAAAAAAAJZ2V0X3BsYW5lAAAAAAAAAAAAAAEAAAAT",
        "AAAAAAAAAAAAAAAZY29tbWl0X3RyYW5zZmVyX293bmVyc2hpcAAAAAAAAAMAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAJcm9sZV9uYW1lAAAAAAAAEQAAAAAAAAALbmV3X2FkZHJlc3MAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAYYXBwbHlfdHJhbnNmZXJfb3duZXJzaGlwAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAlyb2xlX25hbWUAAAAAAAARAAAAAA==",
        "AAAAAAAAAAAAAAAZcmV2ZXJ0X3RyYW5zZmVyX293bmVyc2hpcAAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAJcm9sZV9uYW1lAAAAAAAAEQAAAAA=",
        "AAAAAAAAAAAAAAASZ2V0X2Z1dHVyZV9hZGRyZXNzAAAAAAABAAAAAAAAAAlyb2xlX25hbWUAAAAAAAARAAAAAQAAABM=",
        "AAAABAAAAAAAAAAAAAAAGExpcXVpZGl0eVBvb2xSb3V0ZXJFcnJvcgAAABEAAAAmTGlxdWlkaXR5UG9vbFJvdXRlckVycm9yOiBQb29sTm90Rm91bmQAAAAAAAxQb29sTm90Rm91bmQAAAEtAAAAAAAAAAZCYWRGZWUAAAAAAS4AAAAAAAAAFVN0YWJsZXN3YXBIYXNoTWlzc2luZwAAAAAAAS8AAAAAAAAADFBvb2xzT3Zlck1heAAAATEAAAAAAAAAFlN0YWJsZXN3YXBQb29sc092ZXJNYXgAAAAAATIAAAAAAAAAC1BhdGhJc0VtcHR5AAAAATMAAAAAAAAAFVRva2Vuc0FyZU5vdEZvclJld2FyZAAAAAAAATQAAAAAAAAAEkxpcXVpZGl0eU5vdEZpbGxlZAAAAAABNQAAAAAAAAAWTGlxdWlkaXR5QWxyZWFkeUZpbGxlZAAAAAABNgAAAAAAAAAVVm90aW5nU2hhcmVFeGNlZWRzTWF4AAAAAAABNwAAAAAAAAAZTGlxdWlkaXR5Q2FsY3VsYXRpb25FcnJvcgAAAAAAATgAAAAAAAAAFFJld2FyZHNOb3RDb25maWd1cmVkAAABOQAAAAAAAAAYUmV3YXJkc0FscmVhZHlDb25maWd1cmVkAAABOgAAAAAAAAAURHVwbGljYXRlc05vdEFsbG93ZWQAAAE7AAAAAAAAAA9JbnZhbGlkUG9vbFR5cGUAAAABPAAAAAAAAAAPVG9rZW5zTm90U29ydGVkAAAAB9IAAAAAAAAAEUluTWF4Tm90U2F0aXNmaWVkAAAAAAAH5A==",
        "AAAAAwAAAAAAAAAAAAAAEUxpcXVpZGl0eVBvb2xUeXBlAAAAAAAAAwAAAAAAAAALTWlzc2luZ1Bvb2wAAAAAAAAAAAAAAAAPQ29uc3RhbnRQcm9kdWN0AAAAAAEAAAAAAAAABkN1c3RvbQAAAAAAAw==",
        "AAAAAQAAAAAAAAAAAAAAEUxpcXVpZGl0eVBvb2xEYXRhAAAAAAAAAgAAAAAAAAAHYWRkcmVzcwAAAAATAAAAAAAAAAlwb29sX3R5cGUAAAAAAAfQAAAAEUxpcXVpZGl0eVBvb2xUeXBlAAAA",
        "AAAAAQAAAAAAAAAAAAAAE0dsb2JhbFJld2FyZHNDb25maWcAAAAAAgAAAAAAAAAKZXhwaXJlZF9hdAAAAAAABgAAAAAAAAADdHBzAAAAAAo=",
        "AAAAAQAAAAAAAAAAAAAAF0xpcXVpZGl0eVBvb2xSZXdhcmRJbmZvAAAAAAMAAAAAAAAACXByb2Nlc3NlZAAAAAAAAAEAAAAAAAAAD3RvdGFsX2xpcXVpZGl0eQAAAAAMAAAAAAAAAAx2b3Rpbmdfc2hhcmUAAAAE",
        "AAAABAAAAAAAAAAAAAAACVBvb2xFcnJvcgAAAAAAAAIAAAAcUG9vbEVycm9yOiBQb29sQWxyZWFkeUV4aXN0cwAAABFQb29sQWxyZWFkeUV4aXN0cwAAAAAAAZEAAAAAAAAADFBvb2xOb3RGb3VuZAAAAZQ=",
        "AAAABAAAAAAAAAAAAAAAEkFjY2Vzc0NvbnRyb2xFcnJvcgAAAAAABwAAACBBY2Nlc3NDb250cm9sRXJyb3I6IFJvbGVOb3RGb3VuZAAAAAxSb2xlTm90Rm91bmQAAABlAAAAAAAAAAxVbmF1dGhvcml6ZWQAAABmAAAAAAAAAA9BZG1pbkFscmVhZHlTZXQAAAAAZwAAAAAAAAAMQmFkUm9sZVVzYWdlAAAAaAAAAAAAAAATQW5vdGhlckFjdGlvbkFjdGl2ZQAAAAtaAAAAAAAAAA5Ob0FjdGlvbkFjdGl2ZQAAAAALWwAAAAAAAAARQWN0aW9uTm90UmVhZHlZZXQAAAAAAAtc",
        "AAAABAAAAAAAAAAAAAAADFJld2FyZHNFcnJvcgAAAAIAAAAgUmV3YXJkc0Vycm9yOiBQYXN0VGltZU5vdEFsbG93ZWQAAAASUGFzdFRpbWVOb3RBbGxvd2VkAAAAAAK9AAAAAAAAABFTYW1lUmV3YXJkc0NvbmZpZwAAAAAAAr4=",
        "AAAAAQAAAAAAAAAAAAAAEFBvb2xSZXdhcmRDb25maWcAAAACAAAAAAAAAApleHBpcmVkX2F0AAAAAAAGAAAAAAAAAAN0cHMAAAAACg==",
        "AAAAAQAAAAAAAAAAAAAADlBvb2xSZXdhcmREYXRhAAAAAAAEAAAAAAAAAAthY2N1bXVsYXRlZAAAAAAKAAAAAAAAAAVibG9jawAAAAAAAAYAAAAAAAAAB2NsYWltZWQAAAAACgAAAAAAAAAJbGFzdF90aW1lAAAAAAAABg==",
        "AAAAAQAAAAAAAAAAAAAADlVzZXJSZXdhcmREYXRhAAAAAAADAAAAAAAAAApsYXN0X2Jsb2NrAAAAAAAGAAAAAAAAABBwb29sX2FjY3VtdWxhdGVkAAAACgAAAAAAAAAIdG9fY2xhaW0AAAAK",
        "AAAAAQAAAC9QcmljZSBkYXRhIGZvciBhbiBhc3NldCBhdCBhIHNwZWNpZmljIHRpbWVzdGFtcAAAAAAAAAAACVByaWNlRGF0YQAAAAAAAAIAAAAAAAAABXByaWNlAAAAAAAACwAAAAAAAAAJdGltZXN0YW1wAAAAAAAABg==",
        "AAAAAgAAAApBc3NldCB0eXBlAAAAAAAAAAAABUFzc2V0AAAAAAAAAgAAAAEAAAAAAAAAB1N0ZWxsYXIAAAAAAQAAABMAAAABAAAAAAAAAAVPdGhlcgAAAAAAAAEAAAAR",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAAAwAAACFVcGdyYWRlRXJyb3I6IEFub3RoZXJBY3Rpb25BY3RpdmUAAAAAAAATQW5vdGhlckFjdGlvbkFjdGl2ZQAAAAtaAAAAAAAAAA5Ob0FjdGlvbkFjdGl2ZQAAAAALWwAAAAAAAAARQWN0aW9uTm90UmVhZHlZZXQAAAAAAAtc",
        "AAAABAAAAAAAAAAAAAAACU1hdGhFcnJvcgAAAAAAAAEAAAAZTWF0aEVycm9yOiBOdW1iZXJPdmVyZmxvdwAAAAAAAA5OdW1iZXJPdmVyZmxvdwAAAAAB/g==",
        "AAAABAAAAAAAAAAAAAAADFN0b3JhZ2VFcnJvcgAAAAIAAAAvU3RvcmFnZUVycm9yOiBOdW1iVmFsdWVOb3RJbml0aWFsaXplZGVyT3ZlcmZsb3cAAAAAE1ZhbHVlTm90SW5pdGlhbGl6ZWQAAAAB9QAAAAAAAAAMVmFsdWVNaXNzaW5nAAAB9g==" ]),
      options
    )
  }
  public readonly fromJSON = {
    pool_type: this.txFromJSON<string>,
        get_info: this.txFromJSON<Map<string, any>>,
        get_pool: this.txFromJSON<string>,
        share_id: this.txFromJSON<string>,
        get_total_shares: this.txFromJSON<u128>,
        get_reserves: this.txFromJSON<Array<u128>>,
        deposit: this.txFromJSON<readonly [u128, u128]>,
        swap: this.txFromJSON<u128>,
        estimate_swap: this.txFromJSON<u128>,
        withdraw: this.txFromJSON<u128>,
        get_liquidity: this.txFromJSON<u256>,
        get_liquidity_calculator: this.txFromJSON<string>,
        set_liquidity_calculator: this.txFromJSON<null>,
        version: this.txFromJSON<u32>,
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
        configure_init_pool_payment: this.txFromJSON<null>,
        get_init_pool_payment_token: this.txFromJSON<string>,
        get_init_pool_payment_address: this.txFromJSON<string>,
        get_standard_pool_payment_amount: this.txFromJSON<u128>,
        set_reward_token: this.txFromJSON<null>,
        set_reward_boost_config: this.txFromJSON<null>,
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
        get_pools: this.txFromJSON<Map<Buffer, string>>,
        remove_pool: this.txFromJSON<null>,
        get_tokens_sets_count: this.txFromJSON<u128>,
        get_tokens: this.txFromJSON<Array<string>>,
        get_pools_for_tokens_range: this.txFromJSON<Array<readonly [Array<string>, Map<Buffer, string>]>>,
        set_pools_plane: this.txFromJSON<null>,
        get_plane: this.txFromJSON<string>,
        commit_transfer_ownership: this.txFromJSON<null>,
        apply_transfer_ownership: this.txFromJSON<null>,
        revert_transfer_ownership: this.txFromJSON<null>,
        get_future_address: this.txFromJSON<string>
  }
}

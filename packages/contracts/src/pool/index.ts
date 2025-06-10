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
    contractId: "CD3VWPTROVAUJENTOOXCVSEEYAYXCA2RUXLTRKLTBTGWR7MR3NBYR7OE",
  }
} as const

export const PoolError = {
  /**
   * PoolError: AlreadyInitialized
   */
  201: {message:"AlreadyInitialized"},

  202: {message:"PlaneAlreadyInitialized"},

  203: {message:"RewardsAlreadyInitialized"},

  204: {message:"InvariantDoesNotHold"},

  205: {message:"PoolDepositKilled"},

  206: {message:"PoolSwapKilled"},

  207: {message:"PoolClaimKilled"},

  208: {message:"FutureShareIdNotSet"},

  209: {message:"PoolWithdrawKilled"},

  210: {message:"InvalidOracle"},

  211: {message:"InvalidExpiryTimestamp"},

  212: {message:"LiquidityDeficitBelowThreshold"},

  213: {message:"PoolActionPaused"}
}
export const PoolValidationError = {
  /**
   * PoolValidationError: WrongInputVecSize
   */
  2001: {message:"WrongInputVecSize"},

  2003: {message:"FeeOutOfBounds"},

  2004: {message:"AllCoinsRequired"},

  2005: {message:"InMinNotSatisfied"},

  2006: {message:"OutMinNotSatisfied"},

  2007: {message:"CannotSwapSameToken"},

  2008: {message:"InTokenOutOfBounds"},

  2009: {message:"OutTokenOutOfBounds"},

  2010: {message:"EmptyPool"},

  2011: {message:"InvalidDepositAmount"},

  2012: {message:"AdminFeeOutOfBounds"},

  2013: {message:"UnknownPoolType"},

  2014: {message:"ZeroSharesBurned"},

  2015: {message:"TooManySharesBurned"},

  2017: {message:"CannotComparePools"},

  2018: {message:"ZeroAmount"},

  2019: {message:"InsufficientBalance"},

  2020: {message:"InMaxNotSatisfied"}
}

export interface Pool {
  asset: string;
  base_asset_id: string;
  expiry_ts: u64;
  fee_fraction: u32;
  insurance_claim: InsuranceClaim;
  liquidity_max_imbalance: u128;
  quote_asset_id: string;
  status: PoolStatus;
  tier: PoolTier;
  token_b: string;
}


export interface InsuranceClaim {
  last_revenue_withdraw_ts: u64;
  quote_max_insurance: u128;
  quote_settled_insurance: u128;
  rev_withdraw_since_last_settle: i128;
}

export const AccessControlError = {
  /**
   * AccessControlError
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
   * RewardsError
   */
  701: {message:"PastTimeNotAllowed"},

  702: {message:"SameIncentivesConfig"}
}

export interface PoolIncentiveConfig {
  reward_expired_at: u64;
  reward_tps: u128;
}


export interface PoolIncentiveData {
  accumulated_rewards: u128;
  block: u64;
  claimed_rewards: u128;
  fee_growth_a_per_lp: u128;
  fee_growth_b_per_lp: u128;
  rewards_last_time: u64;
}


export interface UserIncentiveData {
  fee_checkpoint_a: u128;
  fee_checkpoint_b: u128;
  last_block: u64;
  pool_accumulated_rewards: u128;
  rewards_to_claim: u128;
}

export const UpgradeError = {
  /**
   * UpgradeError
   */
  2906: {message:"AnotherActionActive"},

  2907: {message:"NoActionActive"},

  2908: {message:"ActionNotReadyYet"}
}

export interface OraclePriceData {
  delay: u64;
  price: u128;
}

export type PoolStatus = {tag: "Initialized", values: void} | {tag: "Active", values: void} | {tag: "Frozen", values: void} | {tag: "ReduceOnly", values: void} | {tag: "Settlement", values: void} | {tag: "Delisted", values: void};

export type PoolTier = {tag: "A", values: void} | {tag: "B", values: void} | {tag: "C", values: void} | {tag: "Speculative", values: void} | {tag: "HighlySpeculative", values: void} | {tag: "Isolated", values: void};


export interface TokenInitInfo {
  name: string;
  symbol: string;
  token_wasm_hash: Buffer;
}


export interface PrivilegedAddresses {
  emergency_admin: string;
  emergency_pause_admins: Array<string>;
  operations_admin: string;
  pause_admin: string;
  rewards_admin: string;
}


export interface OraclePair {
  base_oracle: string;
  quote_oracle: string;
}


export interface RewardConfig {
  reward_token: string;
}


export interface InitializeParams {
  admin: string;
  asset: string;
  base_asset_id: string;
  fee_fraction: u32;
  lp_token_info: TokenInitInfo;
  oracle_registry: string;
  privileged_addrs: PrivilegedAddresses;
  quote_asset_id: string;
  quote_max_insurance: u128;
  router: string;
  tier: PoolTier;
  tokens: Array<string>;
}


export interface InitializeAllParams {
  base: InitializeParams;
  reward_config: RewardConfig;
}


export interface AddressAndAmount {
  address: string;
  amount: u128;
}


export interface PoolResponse {
  asset_a: AddressAndAmount;
  asset_b: AddressAndAmount;
  asset_lp_share: AddressAndAmount;
}


export interface PoolInfo {
  pool_address: string;
  pool_response: PoolResponse;
  total_fee_bps: u32;
}


export interface OracleInfo {
  asset: string;
  decimals: u32;
  frozen: boolean;
  last_updated: u64;
  oracle_address: string;
}

export const MathError = {
  /**
   * MathError: NumberOverflow
   */
  510: {message:"NumberOverflow"},

  511: {message:"MathError"}
}
export const OracleError = {
  /**
   * OracleError: OracleNonPositive
   */
  601: {message:"OracleNonPositive"},

  602: {message:"OracleTooVolatile"},

  603: {message:"OracleTooUncertain"},

  604: {message:"OracleStaleForMargin"},

  605: {message:"OracleInsufficientDataPoints"},

  606: {message:"OracleStaleForPool"}
}
export const StorageError = {
  /**
   * StorageError
   */
  501: {message:"ValueNotInitialized"},

  502: {message:"ValueMissing"}
}

export interface Client {
  /**
   * Construct and simulate a initialize_all transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize_all: ({params}: {params: InitializeAllParams}, options?: {
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
   * Construct and simulate a pool_type transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  pool_type: (options?: {
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
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize: ({params}: {params: InitializeParams}, options?: {
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
   * Construct and simulate a share_id transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  share_id: (options?: {
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
  get_total_shares: (options?: {
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
  get_tokens: (options?: {
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
   * Construct and simulate a deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  deposit: ({user, token_b_amount}: {user: string, token_b_amount: u128}, options?: {
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
  swap: ({user, in_idx, out_idx, in_amount, out_min}: {user: string, in_idx: u32, out_idx: u32, in_amount: u128, out_min: u128}, options?: {
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
  estimate_swap: ({in_idx, out_idx, in_amount}: {in_idx: u32, out_idx: u32, in_amount: u128}, options?: {
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
   * Construct and simulate a swap_strict_receive transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  swap_strict_receive: ({user, in_idx, out_idx, out_amount, in_max}: {user: string, in_idx: u32, out_idx: u32, out_amount: u128, in_max: u128}, options?: {
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
   * Construct and simulate a estimate_swap_strict_receive transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  estimate_swap_strict_receive: ({in_idx, out_idx, out_amount}: {in_idx: u32, out_idx: u32, out_amount: u128}, options?: {
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
  withdraw: ({user, share_amount}: {user: string, share_amount: u128}, options?: {
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
  get_reserves: (options?: {
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
   * Construct and simulate a get_fee_fraction transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_fee_fraction: (options?: {
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
   * Construct and simulate a get_info transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_info: (options?: {
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
  }) => Promise<AssembledTransaction<PoolInfo>>

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
   * Construct and simulate a set_tier transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_tier: ({admin, tier}: {admin: string, tier: PoolTier}, options?: {
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
   * Construct and simulate a set_status transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_status: ({admin, status}: {admin: string, status: PoolStatus}, options?: {
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
   * Construct and simulate a set_max_imbalances transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_max_imbalances: ({admin, liquidity_max_imbalance, quote_max_insurance}: {admin: string, liquidity_max_imbalance: u128, quote_max_insurance: u128}, options?: {
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
   * Construct and simulate a rebalance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  rebalance: ({admin}: {admin: string}, options?: {
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
   * Construct and simulate a get_pay_from_insurance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_pay_from_insurance: ({sender, insurance_vault_amount}: {sender: string, insurance_vault_amount: u128}, options?: {
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
   * Construct and simulate a pay_insurance_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  pay_insurance_claim: ({sender, amount}: {sender: string, amount: u128}, options?: {
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
   * Construct and simulate a kill_deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  kill_deposit: ({admin}: {admin: string}, options?: {
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
   * Construct and simulate a kill_withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  kill_withdraw: ({admin}: {admin: string}, options?: {
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
   * Construct and simulate a kill_swap transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  kill_swap: ({admin}: {admin: string}, options?: {
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
   * Construct and simulate a kill_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  kill_claim: ({admin}: {admin: string}, options?: {
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
   * Construct and simulate a unkill_deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  unkill_deposit: ({admin}: {admin: string}, options?: {
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
   * Construct and simulate a unkill_withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  unkill_withdraw: ({admin}: {admin: string}, options?: {
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
   * Construct and simulate a unkill_swap transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  unkill_swap: ({admin}: {admin: string}, options?: {
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
   * Construct and simulate a unkill_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  unkill_claim: ({admin}: {admin: string}, options?: {
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
   * Construct and simulate a get_is_killed_deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_is_killed_deposit: (options?: {
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
   * Construct and simulate a get_is_killed_withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_is_killed_withdraw: (options?: {
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
   * Construct and simulate a get_is_killed_swap transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_is_killed_swap: (options?: {
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
   * Construct and simulate a get_is_killed_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_is_killed_claim: (options?: {
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
  commit_upgrade: ({admin, new_wasm_hash, token_new_wasm_hash}: {admin: string, new_wasm_hash: Buffer, token_new_wasm_hash: Buffer}, options?: {
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
  }) => Promise<AssembledTransaction<readonly [Buffer, Buffer]>>

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
   * Construct and simulate a upgrade_token_legacy transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  upgrade_token_legacy: ({admin, new_token_wasm}: {admin: string, new_token_wasm: Buffer}, options?: {
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
   * Construct and simulate a initialize_incentives_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize_incentives_config: ({reward_token}: {reward_token: string}, options?: {
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
   * Construct and simulate a set_incentives_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_incentives_config: ({admin, expired_at, tps}: {admin: string, expired_at: u64, tps: u128}, options?: {
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
   * Construct and simulate a get_unused_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_unused_reward: (options?: {
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
   * Construct and simulate a return_unused_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  return_unused_reward: ({admin}: {admin: string}, options?: {
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
   * Construct and simulate a get_incentives_info transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_incentives_info: ({user}: {user: string}, options?: {
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
  get_user_reward: ({user}: {user: string}, options?: {
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
   * Construct and simulate a get_user_fees transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_user_fees: ({user}: {user: string}, options?: {
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
   * Construct and simulate a checkpoint_incentive transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  checkpoint_incentive: ({token_contract, user, user_shares}: {token_contract: string, user: string, user_shares: u128}, options?: {
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
   * Construct and simulate a checkpoint_working_balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  checkpoint_working_balance: ({token_contract, user, user_shares}: {token_contract: string, user: string, user_shares: u128}, options?: {
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
   * Construct and simulate a get_total_accumulated_reward transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_accumulated_reward: (options?: {
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
  get_total_configured_reward: (options?: {
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
  get_total_claimed_reward: (options?: {
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
  claim: ({user}: {user: string}, options?: {
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
  }) => Promise<AssembledTransaction<readonly [u128, u128, u128]>>

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
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAAAAAAAAOaW5pdGlhbGl6ZV9hbGwAAAAAAAEAAAAAAAAABnBhcmFtcwAAAAAH0AAAABNJbml0aWFsaXplQWxsUGFyYW1zAAAAAAA=",
        "AAAAAAAAAAAAAAAJcG9vbF90eXBlAAAAAAAAAAAAAAEAAAAR",
        "AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAAAQAAAAAAAAAGcGFyYW1zAAAAAAfQAAAAEEluaXRpYWxpemVQYXJhbXMAAAAA",
        "AAAAAAAAAAAAAAAIc2hhcmVfaWQAAAAAAAAAAQAAABM=",
        "AAAAAAAAAAAAAAAQZ2V0X3RvdGFsX3NoYXJlcwAAAAAAAAABAAAACg==",
        "AAAAAAAAAAAAAAAKZ2V0X3Rva2VucwAAAAAAAAAAAAEAAAPqAAAAEw==",
        "AAAAAAAAAAAAAAAHZGVwb3NpdAAAAAACAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAOdG9rZW5fYl9hbW91bnQAAAAAAAoAAAABAAAD7QAAAAIAAAAKAAAACg==",
        "AAAAAAAAAAAAAAAEc3dhcAAAAAUAAAAAAAAABHVzZXIAAAATAAAAAAAAAAZpbl9pZHgAAAAAAAQAAAAAAAAAB291dF9pZHgAAAAABAAAAAAAAAAJaW5fYW1vdW50AAAAAAAACgAAAAAAAAAHb3V0X21pbgAAAAAKAAAAAQAAAAo=",
        "AAAAAAAAAAAAAAANZXN0aW1hdGVfc3dhcAAAAAAAAAMAAAAAAAAABmluX2lkeAAAAAAABAAAAAAAAAAHb3V0X2lkeAAAAAAEAAAAAAAAAAlpbl9hbW91bnQAAAAAAAAKAAAAAQAAAAo=",
        "AAAAAAAAAAAAAAATc3dhcF9zdHJpY3RfcmVjZWl2ZQAAAAAFAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAGaW5faWR4AAAAAAAEAAAAAAAAAAdvdXRfaWR4AAAAAAQAAAAAAAAACm91dF9hbW91bnQAAAAAAAoAAAAAAAAABmluX21heAAAAAAACgAAAAEAAAAK",
        "AAAAAAAAAAAAAAAcZXN0aW1hdGVfc3dhcF9zdHJpY3RfcmVjZWl2ZQAAAAMAAAAAAAAABmluX2lkeAAAAAAABAAAAAAAAAAHb3V0X2lkeAAAAAAEAAAAAAAAAApvdXRfYW1vdW50AAAAAAAKAAAAAQAAAAo=",
        "AAAAAAAAAAAAAAAId2l0aGRyYXcAAAACAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAMc2hhcmVfYW1vdW50AAAACgAAAAEAAAAK",
        "AAAAAAAAAAAAAAAMZ2V0X3Jlc2VydmVzAAAAAAAAAAEAAAPqAAAACg==",
        "AAAAAAAAAAAAAAAQZ2V0X2ZlZV9mcmFjdGlvbgAAAAAAAAABAAAABA==",
        "AAAAAAAAAAAAAAAIZ2V0X2luZm8AAAAAAAAAAQAAB9AAAAAIUG9vbEluZm8=",
        "AAAAAAAAAAAAAAAUc2V0X3ByaXZpbGVnZWRfYWRkcnMAAAAFAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAADXJld2FyZHNfYWRtaW4AAAAAAAATAAAAAAAAABBvcGVyYXRpb25zX2FkbWluAAAAEwAAAAAAAAALcGF1c2VfYWRtaW4AAAAAEwAAAAAAAAAWZW1lcmdlbmN5X3BhdXNlX2FkbWlucwAAAAAD6gAAABMAAAAA",
        "AAAAAAAAAAAAAAAUZ2V0X3ByaXZpbGVnZWRfYWRkcnMAAAAAAAAAAQAAA+wAAAARAAAD6gAAABM=",
        "AAAAAAAAAAAAAAAIc2V0X3RpZXIAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABHRpZXIAAAfQAAAACFBvb2xUaWVyAAAAAA==",
        "AAAAAAAAAAAAAAAKc2V0X3N0YXR1cwAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAZzdGF0dXMAAAAAB9AAAAAKUG9vbFN0YXR1cwAAAAAAAA==",
        "AAAAAAAAAAAAAAASc2V0X21heF9pbWJhbGFuY2VzAAAAAAADAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAF2xpcXVpZGl0eV9tYXhfaW1iYWxhbmNlAAAAAAoAAAAAAAAAE3F1b3RlX21heF9pbnN1cmFuY2UAAAAACgAAAAA=",
        "AAAAAAAAAAAAAAAJcmViYWxhbmNlAAAAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==",
        "AAAAAAAAAAAAAAAWZ2V0X3BheV9mcm9tX2luc3VyYW5jZQAAAAAAAgAAAAAAAAAGc2VuZGVyAAAAAAATAAAAAAAAABZpbnN1cmFuY2VfdmF1bHRfYW1vdW50AAAAAAAKAAAAAQAAAAo=",
        "AAAAAAAAAAAAAAATcGF5X2luc3VyYW5jZV9jbGFpbQAAAAACAAAAAAAAAAZzZW5kZXIAAAAAABMAAAAAAAAABmFtb3VudAAAAAAACgAAAAEAAAAK",
        "AAAAAAAAAAAAAAAMa2lsbF9kZXBvc2l0AAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==",
        "AAAAAAAAAAAAAAANa2lsbF93aXRoZHJhdwAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAJa2lsbF9zd2FwAAAAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==",
        "AAAAAAAAAAAAAAAKa2lsbF9jbGFpbQAAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==",
        "AAAAAAAAAAAAAAAOdW5raWxsX2RlcG9zaXQAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAPdW5raWxsX3dpdGhkcmF3AAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAALdW5raWxsX3N3YXAAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==",
        "AAAAAAAAAAAAAAAMdW5raWxsX2NsYWltAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==",
        "AAAAAAAAAAAAAAAVZ2V0X2lzX2tpbGxlZF9kZXBvc2l0AAAAAAAAAAAAAAEAAAAB",
        "AAAAAAAAAAAAAAAWZ2V0X2lzX2tpbGxlZF93aXRoZHJhdwAAAAAAAAAAAAEAAAAB",
        "AAAAAAAAAAAAAAASZ2V0X2lzX2tpbGxlZF9zd2FwAAAAAAAAAAAAAQAAAAE=",
        "AAAAAAAAAAAAAAATZ2V0X2lzX2tpbGxlZF9jbGFpbQAAAAAAAAAAAQAAAAE=",
        "AAAAAAAAAAAAAAAHdmVyc2lvbgAAAAAAAAAAAQAAAAQ=",
        "AAAAAAAAAAAAAAAOY29tbWl0X3VwZ3JhZGUAAAAAAAMAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAANbmV3X3dhc21faGFzaAAAAAAAA+4AAAAgAAAAAAAAABN0b2tlbl9uZXdfd2FzbV9oYXNoAAAAA+4AAAAgAAAAAA==",
        "AAAAAAAAAAAAAAANYXBwbHlfdXBncmFkZQAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAEAAAPtAAAAAgAAA+4AAAAgAAAD7gAAACA=",
        "AAAAAAAAAAAAAAAOcmV2ZXJ0X3VwZ3JhZGUAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAASc2V0X2VtZXJnZW5jeV9tb2RlAAAAAAACAAAAAAAAAA9lbWVyZ2VuY3lfYWRtaW4AAAAAEwAAAAAAAAAFdmFsdWUAAAAAAAABAAAAAA==",
        "AAAAAAAAAAAAAAASZ2V0X2VtZXJnZW5jeV9tb2RlAAAAAAAAAAAAAQAAAAE=",
        "AAAAAAAAAAAAAAAUdXBncmFkZV90b2tlbl9sZWdhY3kAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAADm5ld190b2tlbl93YXNtAAAAAAPuAAAAIAAAAAA=",
        "AAAAAAAAAAAAAAAcaW5pdGlhbGl6ZV9pbmNlbnRpdmVzX2NvbmZpZwAAAAEAAAAAAAAADHJld2FyZF90b2tlbgAAABMAAAAA",
        "AAAAAAAAAAAAAAAVc2V0X2luY2VudGl2ZXNfY29uZmlnAAAAAAAAAwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAApleHBpcmVkX2F0AAAAAAAGAAAAAAAAAAN0cHMAAAAACgAAAAA=",
        "AAAAAAAAAAAAAAARZ2V0X3VudXNlZF9yZXdhcmQAAAAAAAAAAAAAAQAAAAo=",
        "AAAAAAAAAAAAAAAUcmV0dXJuX3VudXNlZF9yZXdhcmQAAAABAAAAAAAAAAVhZG1pbgAAAAAAABMAAAABAAAACg==",
        "AAAAAAAAAAAAAAATZ2V0X2luY2VudGl2ZXNfaW5mbwAAAAABAAAAAAAAAAR1c2VyAAAAEwAAAAEAAAPsAAAAEQAAAAs=",
        "AAAAAAAAAAAAAAAPZ2V0X3VzZXJfcmV3YXJkAAAAAAEAAAAAAAAABHVzZXIAAAATAAAAAQAAAAo=",
        "AAAAAAAAAAAAAAANZ2V0X3VzZXJfZmVlcwAAAAAAAAEAAAAAAAAABHVzZXIAAAATAAAAAQAAA+0AAAACAAAACgAAAAo=",
        "AAAAAAAAAAAAAAAUY2hlY2twb2ludF9pbmNlbnRpdmUAAAADAAAAAAAAAA50b2tlbl9jb250cmFjdAAAAAAAEwAAAAAAAAAEdXNlcgAAABMAAAAAAAAAC3VzZXJfc2hhcmVzAAAAAAoAAAAA",
        "AAAAAAAAAAAAAAAaY2hlY2twb2ludF93b3JraW5nX2JhbGFuY2UAAAAAAAMAAAAAAAAADnRva2VuX2NvbnRyYWN0AAAAAAATAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAALdXNlcl9zaGFyZXMAAAAACgAAAAA=",
        "AAAAAAAAAAAAAAAcZ2V0X3RvdGFsX2FjY3VtdWxhdGVkX3Jld2FyZAAAAAAAAAABAAAACg==",
        "AAAAAAAAAAAAAAAbZ2V0X3RvdGFsX2NvbmZpZ3VyZWRfcmV3YXJkAAAAAAAAAAABAAAACg==",
        "AAAAAAAAAAAAAAAYZ2V0X3RvdGFsX2NsYWltZWRfcmV3YXJkAAAAAAAAAAEAAAAK",
        "AAAAAAAAAAAAAAAFY2xhaW0AAAAAAAABAAAAAAAAAAR1c2VyAAAAEwAAAAEAAAPtAAAAAwAAAAoAAAAKAAAACg==",
        "AAAAAAAAAAAAAAAZY29tbWl0X3RyYW5zZmVyX293bmVyc2hpcAAAAAAAAAMAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAJcm9sZV9uYW1lAAAAAAAAEQAAAAAAAAALbmV3X2FkZHJlc3MAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAYYXBwbHlfdHJhbnNmZXJfb3duZXJzaGlwAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAlyb2xlX25hbWUAAAAAAAARAAAAAA==",
        "AAAAAAAAAAAAAAAZcmV2ZXJ0X3RyYW5zZmVyX293bmVyc2hpcAAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAJcm9sZV9uYW1lAAAAAAAAEQAAAAA=",
        "AAAAAAAAAAAAAAASZ2V0X2Z1dHVyZV9hZGRyZXNzAAAAAAABAAAAAAAAAAlyb2xlX25hbWUAAAAAAAARAAAAAQAAABM=",
        "AAAABAAAAAAAAAAAAAAACVBvb2xFcnJvcgAAAAAAAA0AAAAdUG9vbEVycm9yOiBBbHJlYWR5SW5pdGlhbGl6ZWQAAAAAAAASQWxyZWFkeUluaXRpYWxpemVkAAAAAADJAAAAAAAAABdQbGFuZUFscmVhZHlJbml0aWFsaXplZAAAAADKAAAAAAAAABlSZXdhcmRzQWxyZWFkeUluaXRpYWxpemVkAAAAAAAAywAAAAAAAAAUSW52YXJpYW50RG9lc05vdEhvbGQAAADMAAAAAAAAABFQb29sRGVwb3NpdEtpbGxlZAAAAAAAAM0AAAAAAAAADlBvb2xTd2FwS2lsbGVkAAAAAADOAAAAAAAAAA9Qb29sQ2xhaW1LaWxsZWQAAAAAzwAAAAAAAAATRnV0dXJlU2hhcmVJZE5vdFNldAAAAADQAAAAAAAAABJQb29sV2l0aGRyYXdLaWxsZWQAAAAAANEAAAAAAAAADUludmFsaWRPcmFjbGUAAAAAAADSAAAAAAAAABZJbnZhbGlkRXhwaXJ5VGltZXN0YW1wAAAAAADTAAAAAAAAAB5MaXF1aWRpdHlEZWZpY2l0QmVsb3dUaHJlc2hvbGQAAAAAANQAAAAAAAAAEFBvb2xBY3Rpb25QYXVzZWQAAADV",
        "AAAABAAAAAAAAAAAAAAAE1Bvb2xWYWxpZGF0aW9uRXJyb3IAAAAAEgAAACZQb29sVmFsaWRhdGlvbkVycm9yOiBXcm9uZ0lucHV0VmVjU2l6ZQAAAAAAEVdyb25nSW5wdXRWZWNTaXplAAAAAAAH0QAAAAAAAAAORmVlT3V0T2ZCb3VuZHMAAAAAB9MAAAAAAAAAEEFsbENvaW5zUmVxdWlyZWQAAAfUAAAAAAAAABFJbk1pbk5vdFNhdGlzZmllZAAAAAAAB9UAAAAAAAAAEk91dE1pbk5vdFNhdGlzZmllZAAAAAAH1gAAAAAAAAATQ2Fubm90U3dhcFNhbWVUb2tlbgAAAAfXAAAAAAAAABJJblRva2VuT3V0T2ZCb3VuZHMAAAAAB9gAAAAAAAAAE091dFRva2VuT3V0T2ZCb3VuZHMAAAAH2QAAAAAAAAAJRW1wdHlQb29sAAAAAAAH2gAAAAAAAAAUSW52YWxpZERlcG9zaXRBbW91bnQAAAfbAAAAAAAAABNBZG1pbkZlZU91dE9mQm91bmRzAAAAB9wAAAAAAAAAD1Vua25vd25Qb29sVHlwZQAAAAfdAAAAAAAAABBaZXJvU2hhcmVzQnVybmVkAAAH3gAAAAAAAAATVG9vTWFueVNoYXJlc0J1cm5lZAAAAAffAAAAAAAAABJDYW5ub3RDb21wYXJlUG9vbHMAAAAAB+EAAAAAAAAAClplcm9BbW91bnQAAAAAB+IAAAAAAAAAE0luc3VmZmljaWVudEJhbGFuY2UAAAAH4wAAAAAAAAARSW5NYXhOb3RTYXRpc2ZpZWQAAAAAAAfk",
        "AAAAAQAAAAAAAAAAAAAABFBvb2wAAAAKAAAAAAAAAAVhc3NldAAAAAAAABMAAAAAAAAADWJhc2VfYXNzZXRfaWQAAAAAAAARAAAAAAAAAAlleHBpcnlfdHMAAAAAAAAGAAAAAAAAAAxmZWVfZnJhY3Rpb24AAAAEAAAAAAAAAA9pbnN1cmFuY2VfY2xhaW0AAAAH0AAAAA5JbnN1cmFuY2VDbGFpbQAAAAAAAAAAABdsaXF1aWRpdHlfbWF4X2ltYmFsYW5jZQAAAAAKAAAAAAAAAA5xdW90ZV9hc3NldF9pZAAAAAAAEQAAAAAAAAAGc3RhdHVzAAAAAAfQAAAAClBvb2xTdGF0dXMAAAAAAAAAAAAEdGllcgAAB9AAAAAIUG9vbFRpZXIAAAAAAAAAB3Rva2VuX2IAAAAAEw==",
        "AAAAAQAAAAAAAAAAAAAADkluc3VyYW5jZUNsYWltAAAAAAAEAAAAAAAAABhsYXN0X3JldmVudWVfd2l0aGRyYXdfdHMAAAAGAAAAAAAAABNxdW90ZV9tYXhfaW5zdXJhbmNlAAAAAAoAAAAAAAAAF3F1b3RlX3NldHRsZWRfaW5zdXJhbmNlAAAAAAoAAAAAAAAAHnJldl93aXRoZHJhd19zaW5jZV9sYXN0X3NldHRsZQAAAAAACw==",
        "AAAABAAAAAAAAAAAAAAAEkFjY2Vzc0NvbnRyb2xFcnJvcgAAAAAABwAAABJBY2Nlc3NDb250cm9sRXJyb3IAAAAAAAxSb2xlTm90Rm91bmQAAABlAAAAAAAAAAxVbmF1dGhvcml6ZWQAAABmAAAAAAAAAA9BZG1pbkFscmVhZHlTZXQAAAAAZwAAAAAAAAAMQmFkUm9sZVVzYWdlAAAAaAAAAAAAAAATQW5vdGhlckFjdGlvbkFjdGl2ZQAAAAtaAAAAAAAAAA5Ob0FjdGlvbkFjdGl2ZQAAAAALWwAAAAAAAAARQWN0aW9uTm90UmVhZHlZZXQAAAAAAAtc",
        "AAAABAAAAAAAAAAAAAAADFJld2FyZHNFcnJvcgAAAAIAAAAMUmV3YXJkc0Vycm9yAAAAElBhc3RUaW1lTm90QWxsb3dlZAAAAAACvQAAAAAAAAAUU2FtZUluY2VudGl2ZXNDb25maWcAAAK+",
        "AAAAAQAAAAAAAAAAAAAAE1Bvb2xJbmNlbnRpdmVDb25maWcAAAAAAgAAAAAAAAARcmV3YXJkX2V4cGlyZWRfYXQAAAAAAAAGAAAAAAAAAApyZXdhcmRfdHBzAAAAAAAK",
        "AAAAAQAAAAAAAAAAAAAAEVBvb2xJbmNlbnRpdmVEYXRhAAAAAAAABgAAAAAAAAATYWNjdW11bGF0ZWRfcmV3YXJkcwAAAAAKAAAAAAAAAAVibG9jawAAAAAAAAYAAAAAAAAAD2NsYWltZWRfcmV3YXJkcwAAAAAKAAAAAAAAABNmZWVfZ3Jvd3RoX2FfcGVyX2xwAAAAAAoAAAAAAAAAE2ZlZV9ncm93dGhfYl9wZXJfbHAAAAAACgAAAAAAAAARcmV3YXJkc19sYXN0X3RpbWUAAAAAAAAG",
        "AAAAAQAAAAAAAAAAAAAAEVVzZXJJbmNlbnRpdmVEYXRhAAAAAAAABQAAAAAAAAAQZmVlX2NoZWNrcG9pbnRfYQAAAAoAAAAAAAAAEGZlZV9jaGVja3BvaW50X2IAAAAKAAAAAAAAAApsYXN0X2Jsb2NrAAAAAAAGAAAAAAAAABhwb29sX2FjY3VtdWxhdGVkX3Jld2FyZHMAAAAKAAAAAAAAABByZXdhcmRzX3RvX2NsYWltAAAACg==",
        "AAAABAAAAAAAAAAAAAAADFVwZ3JhZGVFcnJvcgAAAAMAAAAMVXBncmFkZUVycm9yAAAAE0Fub3RoZXJBY3Rpb25BY3RpdmUAAAALWgAAAAAAAAAOTm9BY3Rpb25BY3RpdmUAAAAAC1sAAAAAAAAAEUFjdGlvbk5vdFJlYWR5WWV0AAAAAAALXA==",
        "AAAAAQAAAAAAAAAAAAAAD09yYWNsZVByaWNlRGF0YQAAAAACAAAAAAAAAAVkZWxheQAAAAAAAAYAAAAAAAAABXByaWNlAAAAAAAACg==",
        "AAAAAgAAAAAAAAAAAAAAClBvb2xTdGF0dXMAAAAAAAYAAAAAAAAAAAAAAAtJbml0aWFsaXplZAAAAAAAAAAAAAAAAAZBY3RpdmUAAAAAAAAAAAAAAAAABkZyb3plbgAAAAAAAAAAAAAAAAAKUmVkdWNlT25seQAAAAAAAAAAAAAAAAAKU2V0dGxlbWVudAAAAAAAAAAAAAAAAAAIRGVsaXN0ZWQ=",
        "AAAAAgAAAAAAAAAAAAAACFBvb2xUaWVyAAAABgAAAAAAAAAAAAAAAUEAAAAAAAAAAAAAAAAAAAFCAAAAAAAAAAAAAAAAAAABQwAAAAAAAAAAAAAAAAAAC1NwZWN1bGF0aXZlAAAAAAAAAAAAAAAAEUhpZ2hseVNwZWN1bGF0aXZlAAAAAAAAAAAAAAAAAAAISXNvbGF0ZWQ=",
        "AAAAAQAAAAAAAAAAAAAADVRva2VuSW5pdEluZm8AAAAAAAADAAAAAAAAAARuYW1lAAAAEAAAAAAAAAAGc3ltYm9sAAAAAAAQAAAAAAAAAA90b2tlbl93YXNtX2hhc2gAAAAD7gAAACA=",
        "AAAAAQAAAAAAAAAAAAAAE1ByaXZpbGVnZWRBZGRyZXNzZXMAAAAABQAAAAAAAAAPZW1lcmdlbmN5X2FkbWluAAAAABMAAAAAAAAAFmVtZXJnZW5jeV9wYXVzZV9hZG1pbnMAAAAAA+oAAAATAAAAAAAAABBvcGVyYXRpb25zX2FkbWluAAAAEwAAAAAAAAALcGF1c2VfYWRtaW4AAAAAEwAAAAAAAAANcmV3YXJkc19hZG1pbgAAAAAAABM=",
        "AAAAAQAAAAAAAAAAAAAACk9yYWNsZVBhaXIAAAAAAAIAAAAAAAAAC2Jhc2Vfb3JhY2xlAAAAABMAAAAAAAAADHF1b3RlX29yYWNsZQAAABM=",
        "AAAAAQAAAAAAAAAAAAAADFJld2FyZENvbmZpZwAAAAEAAAAAAAAADHJld2FyZF90b2tlbgAAABM=",
        "AAAAAQAAAAAAAAAAAAAAEEluaXRpYWxpemVQYXJhbXMAAAAMAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABWFzc2V0AAAAAAAAEwAAAAAAAAANYmFzZV9hc3NldF9pZAAAAAAAABEAAAAAAAAADGZlZV9mcmFjdGlvbgAAAAQAAAAAAAAADWxwX3Rva2VuX2luZm8AAAAAAAfQAAAADVRva2VuSW5pdEluZm8AAAAAAAAAAAAAD29yYWNsZV9yZWdpc3RyeQAAAAATAAAAAAAAABBwcml2aWxlZ2VkX2FkZHJzAAAH0AAAABNQcml2aWxlZ2VkQWRkcmVzc2VzAAAAAAAAAAAOcXVvdGVfYXNzZXRfaWQAAAAAABEAAAAAAAAAE3F1b3RlX21heF9pbnN1cmFuY2UAAAAACgAAAAAAAAAGcm91dGVyAAAAAAATAAAAAAAAAAR0aWVyAAAH0AAAAAhQb29sVGllcgAAAAAAAAAGdG9rZW5zAAAAAAPqAAAAEw==",
        "AAAAAQAAAAAAAAAAAAAAE0luaXRpYWxpemVBbGxQYXJhbXMAAAAAAgAAAAAAAAAEYmFzZQAAB9AAAAAQSW5pdGlhbGl6ZVBhcmFtcwAAAAAAAAANcmV3YXJkX2NvbmZpZwAAAAAAB9AAAAAMUmV3YXJkQ29uZmln",
        "AAAAAQAAAAAAAAAAAAAAEEFkZHJlc3NBbmRBbW91bnQAAAACAAAAAAAAAAdhZGRyZXNzAAAAABMAAAAAAAAABmFtb3VudAAAAAAACg==",
        "AAAAAQAAAAAAAAAAAAAADFBvb2xSZXNwb25zZQAAAAMAAAAAAAAAB2Fzc2V0X2EAAAAH0AAAABBBZGRyZXNzQW5kQW1vdW50AAAAAAAAAAdhc3NldF9iAAAAB9AAAAAQQWRkcmVzc0FuZEFtb3VudAAAAAAAAAAOYXNzZXRfbHBfc2hhcmUAAAAAB9AAAAAQQWRkcmVzc0FuZEFtb3VudA==",
        "AAAAAQAAAAAAAAAAAAAACFBvb2xJbmZvAAAAAwAAAAAAAAAMcG9vbF9hZGRyZXNzAAAAEwAAAAAAAAANcG9vbF9yZXNwb25zZQAAAAAAB9AAAAAMUG9vbFJlc3BvbnNlAAAAAAAAAA10b3RhbF9mZWVfYnBzAAAAAAAABA==",
        "AAAAAQAAAAAAAAAAAAAACk9yYWNsZUluZm8AAAAAAAUAAAAAAAAABWFzc2V0AAAAAAAAEwAAAAAAAAAIZGVjaW1hbHMAAAAEAAAAAAAAAAZmcm96ZW4AAAAAAAEAAAAAAAAADGxhc3RfdXBkYXRlZAAAAAYAAAAAAAAADm9yYWNsZV9hZGRyZXNzAAAAAAAT",
        "AAAABAAAAAAAAAAAAAAACU1hdGhFcnJvcgAAAAAAAAIAAAAZTWF0aEVycm9yOiBOdW1iZXJPdmVyZmxvdwAAAAAAAA5OdW1iZXJPdmVyZmxvdwAAAAAB/gAAAAAAAAAJTWF0aEVycm9yAAAAAAAB/w==",
        "AAAABAAAAAAAAAAAAAAAC09yYWNsZUVycm9yAAAAAAYAAAAeT3JhY2xlRXJyb3I6IE9yYWNsZU5vblBvc2l0aXZlAAAAAAART3JhY2xlTm9uUG9zaXRpdmUAAAAAAAJZAAAAAAAAABFPcmFjbGVUb29Wb2xhdGlsZQAAAAAAAloAAAAAAAAAEk9yYWNsZVRvb1VuY2VydGFpbgAAAAACWwAAAAAAAAAUT3JhY2xlU3RhbGVGb3JNYXJnaW4AAAJcAAAAAAAAABxPcmFjbGVJbnN1ZmZpY2llbnREYXRhUG9pbnRzAAACXQAAAAAAAAAST3JhY2xlU3RhbGVGb3JQb29sAAAAAAJe",
        "AAAABAAAAAAAAAAAAAAADFN0b3JhZ2VFcnJvcgAAAAIAAAAMU3RvcmFnZUVycm9yAAAAE1ZhbHVlTm90SW5pdGlhbGl6ZWQAAAAB9QAAAAAAAAAMVmFsdWVNaXNzaW5nAAAB9g==" ]),
      options
    )
  }
  public readonly fromJSON = {
    initialize_all: this.txFromJSON<null>,
        pool_type: this.txFromJSON<string>,
        initialize: this.txFromJSON<null>,
        share_id: this.txFromJSON<string>,
        get_total_shares: this.txFromJSON<u128>,
        get_tokens: this.txFromJSON<Array<string>>,
        deposit: this.txFromJSON<readonly [u128, u128]>,
        swap: this.txFromJSON<u128>,
        estimate_swap: this.txFromJSON<u128>,
        swap_strict_receive: this.txFromJSON<u128>,
        estimate_swap_strict_receive: this.txFromJSON<u128>,
        withdraw: this.txFromJSON<u128>,
        get_reserves: this.txFromJSON<Array<u128>>,
        get_fee_fraction: this.txFromJSON<u32>,
        get_info: this.txFromJSON<PoolInfo>,
        set_privileged_addrs: this.txFromJSON<null>,
        get_privileged_addrs: this.txFromJSON<Map<string, Array<string>>>,
        set_tier: this.txFromJSON<null>,
        set_status: this.txFromJSON<null>,
        set_max_imbalances: this.txFromJSON<null>,
        rebalance: this.txFromJSON<null>,
        get_pay_from_insurance: this.txFromJSON<u128>,
        pay_insurance_claim: this.txFromJSON<u128>,
        kill_deposit: this.txFromJSON<null>,
        kill_withdraw: this.txFromJSON<null>,
        kill_swap: this.txFromJSON<null>,
        kill_claim: this.txFromJSON<null>,
        unkill_deposit: this.txFromJSON<null>,
        unkill_withdraw: this.txFromJSON<null>,
        unkill_swap: this.txFromJSON<null>,
        unkill_claim: this.txFromJSON<null>,
        get_is_killed_deposit: this.txFromJSON<boolean>,
        get_is_killed_withdraw: this.txFromJSON<boolean>,
        get_is_killed_swap: this.txFromJSON<boolean>,
        get_is_killed_claim: this.txFromJSON<boolean>,
        version: this.txFromJSON<u32>,
        commit_upgrade: this.txFromJSON<null>,
        apply_upgrade: this.txFromJSON<readonly [Buffer, Buffer]>,
        revert_upgrade: this.txFromJSON<null>,
        set_emergency_mode: this.txFromJSON<null>,
        get_emergency_mode: this.txFromJSON<boolean>,
        upgrade_token_legacy: this.txFromJSON<null>,
        initialize_incentives_config: this.txFromJSON<null>,
        set_incentives_config: this.txFromJSON<null>,
        get_unused_reward: this.txFromJSON<u128>,
        return_unused_reward: this.txFromJSON<u128>,
        get_incentives_info: this.txFromJSON<Map<string, i128>>,
        get_user_reward: this.txFromJSON<u128>,
        get_user_fees: this.txFromJSON<readonly [u128, u128]>,
        checkpoint_incentive: this.txFromJSON<null>,
        checkpoint_working_balance: this.txFromJSON<null>,
        get_total_accumulated_reward: this.txFromJSON<u128>,
        get_total_configured_reward: this.txFromJSON<u128>,
        get_total_claimed_reward: this.txFromJSON<u128>,
        claim: this.txFromJSON<readonly [u128, u128, u128]>,
        commit_transfer_ownership: this.txFromJSON<null>,
        apply_transfer_ownership: this.txFromJSON<null>,
        revert_transfer_ownership: this.txFromJSON<null>,
        get_future_address: this.txFromJSON<string>
  }
}

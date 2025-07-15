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
    contractId: "CCSDXS6FGH3OCLSO5EM54LMTSS52I4BLAGYAUFVOTMHB34LR6QUPCWPR",
  }
} as const

export const PoolProviderSwapFeeError = {
  /**
   * PoolProviderSwapFeeError
   */
  2006: {message:"OutMinNotSatisfied"}
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
  fee_growth_per_lp: u128;
  rewards_last_time: u64;
}


export interface UserIncentiveData {
  fee_checkpoint: u128;
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
export const ValidationError = {
  /**
   * ValidationError
   */
  801: {message:"InvalidToken"}
}

export interface PrivilegedAddresses {
  emergency_admin: string;
  emergency_pause_admins: Array<string>;
  operations_admin: string;
  pause_admin: string;
  rewards_admin: string;
}


export interface OraclePriceData {
  delay: u64;
  price: u128;
}


export interface OracleInfo {
  address: string;
  decimals: u32;
  frozen: boolean;
  last_updated: u64;
  sanitize_clamp_denominator: i64;
}


export interface MutableOracleInfo {
  address: Option<string>;
  decimals: Option<u32>;
  frozen: Option<boolean>;
  sanitize_clamp_denominator: Option<i64>;
}

export type NormalAction = {tag: "AddLiquidity", values: void} | {tag: "RemoveLiquidity", values: void} | {tag: "Swap", values: void} | {tag: "UpdateTwap", values: void} | {tag: "Rebalance", values: void} | {tag: "ClaimInsurance", values: void};


export interface Pool {
  base_asset: string;
  expiry_price: u128;
  expiry_ts: u64;
  fee_fraction: u32;
  insurance_claim: InsuranceClaim;
  liquidity_max_imbalance: u128;
  quote_asset: string;
  status: PoolStatus;
  tier: PoolTier;
  token_b: string;
}

export type PoolStatus = {tag: "Initialized", values: void} | {tag: "Active", values: void} | {tag: "Frozen", values: void} | {tag: "ReduceOnly", values: void} | {tag: "Settlement", values: void} | {tag: "Delisted", values: void};

export type PoolTier = {tag: "A", values: void} | {tag: "B", values: void} | {tag: "C", values: void} | {tag: "Speculative", values: void} | {tag: "HighlySpeculative", values: void} | {tag: "Isolated", values: void};


export interface InsuranceClaim {
  last_revenue_withdraw_ts: u64;
  quote_max_insurance: u128;
  quote_settled_insurance: u128;
  rev_withdraw_since_last_settle: i128;
}


export interface PoolResponse {
  pool: Pool;
  token_a: AddressAndAmount;
  token_b: AddressAndAmount;
  token_share: AddressAndAmount;
}


export interface PoolInfo {
  pool_address: string;
  pool_response: PoolResponse;
}


export interface RewardConfig {
  reward_token: string;
}


export interface InitializeParams {
  admin: string;
  assets: readonly [string, string];
  fee_fraction: u32;
  lp_token_info: TokenInitInfo;
  privileged_addrs: PrivilegedAddresses;
  quote_max_insurance: u128;
  router: string;
  tier: PoolTier;
  tokens: Array<string>;
}


export interface InitializeAllParams {
  base: InitializeParams;
  plane: string;
  reward_config: RewardConfig;
}


export interface TokenInitInfo {
  name: string;
  symbol: string;
  token_wasm_hash: Buffer;
}


export interface AddressAndAmount {
  address: string;
  amount: u128;
}


export interface Client {
  /**
   * Construct and simulate a swap transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Executes a token swap through a delegated pool contract with integrated fee routing, rewards, and accounting.
   * 
   * This function facilitates the user swapping one token for another using the appropriate pool
   * linked to a synthetic asset symbol. It handles:
   * - Token transfer from user to router
   * - Routing the swap to the pool via the router contract
   * - Applying protocol-level fees
   * - Distributing LP revenue, buffer reserves, and insurance fund premiums
   * - Tracking long-term metrics like volume and incentives
   * 
   * # Arguments
   * * `e` - The Soroban environment.
   * * `user` - The address of the user performing the swap.
   * * `tokens` - A vector of token addresses, typically [Token A, Token B].
   * * `token_in` - The address of the input token (sold by the user).
   * * `token_out` - The address of the output token (received by the user).
   * * `asset` - The synthetic asset symbol tied to the pool.
   * * `in_amount` - Amount of the input token being swapped.
   * * `out_min` - Minimum acceptable output token amount (slippage protection).
   * 
   * # Returns
   * * `u128`
   */
  swap: ({user, tokens, token_in, token_out, asset, in_amount, out_min}: {user: string, tokens: Array<string>, token_in: string, token_out: string, asset: string, in_amount: u128, out_min: u128}, options?: {
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
   * Construct and simulate a get_router transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_router: (options?: {
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
   * Construct and simulate a get_buffer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_buffer: (options?: {
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
   * Construct and simulate a get_fee_destination transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_fee_destination: (options?: {
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
   * Construct and simulate a get_buffer_fraction transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_buffer_fraction: (options?: {
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
   * Construct and simulate a get_lp_revenue_fraction transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_lp_revenue_fraction: (options?: {
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
   * Construct and simulate a init_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  init_admin: ({admin, emergency_admin}: {admin: string, emergency_admin: string}, options?: {
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
   * Construct and simulate a claim_fees transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Claims and transfers all accumulated protocol fees of a given token to the fee destination.
   * 
   * This function is restricted to the admin and is used to move all collected fees (in `token`)
   * from the contract's balance to the designated fee recipient address.
   * 
   * # Arguments
   * * `e` - The Soroban environment.
   * * `admin` - The admin address authorized to claim fees.
   * * `token` - The token address representing the asset whose fees are being claimed.
   * 
   * # Returns
   * * `u128` - The total amount of the token transferred to the fee destination.
   * 
   * # Panics
   * * If the caller is not authorized as admin.
   * 
   * # Side Effects
   * * Transfers the full token balance from the contract to the `fee_destination`.
   * * Emits a `claim_fee` event recording the token and amount.
   */
  claim_fees: ({admin, token}: {admin: string, token: string}, options?: {
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
   * Construct and simulate a set_router transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_router: ({admin, router}: {admin: string, router: string}, options?: {
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
   * Construct and simulate a set_buffer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_buffer: ({admin, buffer}: {admin: string, buffer: string}, options?: {
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
   * Construct and simulate a set_insurance_fund transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_insurance_fund: ({admin, insurance_fund}: {admin: string, insurance_fund: string}, options?: {
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
   * Construct and simulate a set_fee_destination transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_fee_destination: ({admin, fee_destination}: {admin: string, fee_destination: string}, options?: {
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
   * Construct and simulate a set_buffer_fraction transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_buffer_fraction: ({admin, fraction}: {admin: string, fraction: u32}, options?: {
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
   * Construct and simulate a set_lp_revenue_fraction transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_lp_revenue_fraction: ({admin, fraction}: {admin: string, fraction: u32}, options?: {
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
      new ContractSpec([ "AAAAAAAABABFeGVjdXRlcyBhIHRva2VuIHN3YXAgdGhyb3VnaCBhIGRlbGVnYXRlZCBwb29sIGNvbnRyYWN0IHdpdGggaW50ZWdyYXRlZCBmZWUgcm91dGluZywgcmV3YXJkcywgYW5kIGFjY291bnRpbmcuCgpUaGlzIGZ1bmN0aW9uIGZhY2lsaXRhdGVzIHRoZSB1c2VyIHN3YXBwaW5nIG9uZSB0b2tlbiBmb3IgYW5vdGhlciB1c2luZyB0aGUgYXBwcm9wcmlhdGUgcG9vbApsaW5rZWQgdG8gYSBzeW50aGV0aWMgYXNzZXQgc3ltYm9sLiBJdCBoYW5kbGVzOgotIFRva2VuIHRyYW5zZmVyIGZyb20gdXNlciB0byByb3V0ZXIKLSBSb3V0aW5nIHRoZSBzd2FwIHRvIHRoZSBwb29sIHZpYSB0aGUgcm91dGVyIGNvbnRyYWN0Ci0gQXBwbHlpbmcgcHJvdG9jb2wtbGV2ZWwgZmVlcwotIERpc3RyaWJ1dGluZyBMUCByZXZlbnVlLCBidWZmZXIgcmVzZXJ2ZXMsIGFuZCBpbnN1cmFuY2UgZnVuZCBwcmVtaXVtcwotIFRyYWNraW5nIGxvbmctdGVybSBtZXRyaWNzIGxpa2Ugdm9sdW1lIGFuZCBpbmNlbnRpdmVzCgojIEFyZ3VtZW50cwoqIGBlYCAtIFRoZSBTb3JvYmFuIGVudmlyb25tZW50LgoqIGB1c2VyYCAtIFRoZSBhZGRyZXNzIG9mIHRoZSB1c2VyIHBlcmZvcm1pbmcgdGhlIHN3YXAuCiogYHRva2Vuc2AgLSBBIHZlY3RvciBvZiB0b2tlbiBhZGRyZXNzZXMsIHR5cGljYWxseSBbVG9rZW4gQSwgVG9rZW4gQl0uCiogYHRva2VuX2luYCAtIFRoZSBhZGRyZXNzIG9mIHRoZSBpbnB1dCB0b2tlbiAoc29sZCBieSB0aGUgdXNlcikuCiogYHRva2VuX291dGAgLSBUaGUgYWRkcmVzcyBvZiB0aGUgb3V0cHV0IHRva2VuIChyZWNlaXZlZCBieSB0aGUgdXNlcikuCiogYGFzc2V0YCAtIFRoZSBzeW50aGV0aWMgYXNzZXQgc3ltYm9sIHRpZWQgdG8gdGhlIHBvb2wuCiogYGluX2Ftb3VudGAgLSBBbW91bnQgb2YgdGhlIGlucHV0IHRva2VuIGJlaW5nIHN3YXBwZWQuCiogYG91dF9taW5gIC0gTWluaW11bSBhY2NlcHRhYmxlIG91dHB1dCB0b2tlbiBhbW91bnQgKHNsaXBwYWdlIHByb3RlY3Rpb24pLgoKIyBSZXR1cm5zCiogYHUxMjhgAAAABHN3YXAAAAAHAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAGdG9rZW5zAAAAAAPqAAAAEwAAAAAAAAAIdG9rZW5faW4AAAATAAAAAAAAAAl0b2tlbl9vdXQAAAAAAAATAAAAAAAAAAVhc3NldAAAAAAAABEAAAAAAAAACWluX2Ftb3VudAAAAAAAAAoAAAAAAAAAB291dF9taW4AAAAACgAAAAEAAAAK",
        "AAAAAAAAAAAAAAAKZ2V0X3JvdXRlcgAAAAAAAAAAAAEAAAAT",
        "AAAAAAAAAAAAAAAKZ2V0X2J1ZmZlcgAAAAAAAAAAAAEAAAAT",
        "AAAAAAAAAAAAAAATZ2V0X2ZlZV9kZXN0aW5hdGlvbgAAAAAAAAAAAQAAABM=",
        "AAAAAAAAAAAAAAATZ2V0X2J1ZmZlcl9mcmFjdGlvbgAAAAAAAAAAAQAAAAQ=",
        "AAAAAAAAAAAAAAAXZ2V0X2xwX3JldmVudWVfZnJhY3Rpb24AAAAAAAAAAAEAAAAE",
        "AAAAAAAAAAAAAAAKaW5pdF9hZG1pbgAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAA9lbWVyZ2VuY3lfYWRtaW4AAAAAEwAAAAA=",
        "AAAAAAAAAuBDbGFpbXMgYW5kIHRyYW5zZmVycyBhbGwgYWNjdW11bGF0ZWQgcHJvdG9jb2wgZmVlcyBvZiBhIGdpdmVuIHRva2VuIHRvIHRoZSBmZWUgZGVzdGluYXRpb24uCgpUaGlzIGZ1bmN0aW9uIGlzIHJlc3RyaWN0ZWQgdG8gdGhlIGFkbWluIGFuZCBpcyB1c2VkIHRvIG1vdmUgYWxsIGNvbGxlY3RlZCBmZWVzIChpbiBgdG9rZW5gKQpmcm9tIHRoZSBjb250cmFjdCdzIGJhbGFuY2UgdG8gdGhlIGRlc2lnbmF0ZWQgZmVlIHJlY2lwaWVudCBhZGRyZXNzLgoKIyBBcmd1bWVudHMKKiBgZWAgLSBUaGUgU29yb2JhbiBlbnZpcm9ubWVudC4KKiBgYWRtaW5gIC0gVGhlIGFkbWluIGFkZHJlc3MgYXV0aG9yaXplZCB0byBjbGFpbSBmZWVzLgoqIGB0b2tlbmAgLSBUaGUgdG9rZW4gYWRkcmVzcyByZXByZXNlbnRpbmcgdGhlIGFzc2V0IHdob3NlIGZlZXMgYXJlIGJlaW5nIGNsYWltZWQuCgojIFJldHVybnMKKiBgdTEyOGAgLSBUaGUgdG90YWwgYW1vdW50IG9mIHRoZSB0b2tlbiB0cmFuc2ZlcnJlZCB0byB0aGUgZmVlIGRlc3RpbmF0aW9uLgoKIyBQYW5pY3MKKiBJZiB0aGUgY2FsbGVyIGlzIG5vdCBhdXRob3JpemVkIGFzIGFkbWluLgoKIyBTaWRlIEVmZmVjdHMKKiBUcmFuc2ZlcnMgdGhlIGZ1bGwgdG9rZW4gYmFsYW5jZSBmcm9tIHRoZSBjb250cmFjdCB0byB0aGUgYGZlZV9kZXN0aW5hdGlvbmAuCiogRW1pdHMgYSBgY2xhaW1fZmVlYCBldmVudCByZWNvcmRpbmcgdGhlIHRva2VuIGFuZCBhbW91bnQuAAAACmNsYWltX2ZlZXMAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAQAAAAo=",
        "AAAAAAAAAAAAAAAKc2V0X3JvdXRlcgAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAZyb3V0ZXIAAAAAABMAAAAA",
        "AAAAAAAAAAAAAAAKc2V0X2J1ZmZlcgAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAZidWZmZXIAAAAAABMAAAAA",
        "AAAAAAAAAAAAAAASc2V0X2luc3VyYW5jZV9mdW5kAAAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAADmluc3VyYW5jZV9mdW5kAAAAAAATAAAAAA==",
        "AAAAAAAAAAAAAAATc2V0X2ZlZV9kZXN0aW5hdGlvbgAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAD2ZlZV9kZXN0aW5hdGlvbgAAAAATAAAAAA==",
        "AAAAAAAAAAAAAAATc2V0X2J1ZmZlcl9mcmFjdGlvbgAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAACGZyYWN0aW9uAAAABAAAAAA=",
        "AAAAAAAAAAAAAAAXc2V0X2xwX3JldmVudWVfZnJhY3Rpb24AAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAhmcmFjdGlvbgAAAAQAAAAA",
        "AAAAAAAAAAAAAAAHdmVyc2lvbgAAAAAAAAAAAQAAAAQ=",
        "AAAAAAAAAAAAAAAOY29tbWl0X3VwZ3JhZGUAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAANbmV3X3dhc21faGFzaAAAAAAAA+4AAAAgAAAAAA==",
        "AAAAAAAAAAAAAAANYXBwbHlfdXBncmFkZQAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAEAAAPuAAAAIA==",
        "AAAAAAAAAAAAAAAOcmV2ZXJ0X3VwZ3JhZGUAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAASc2V0X2VtZXJnZW5jeV9tb2RlAAAAAAACAAAAAAAAAA9lbWVyZ2VuY3lfYWRtaW4AAAAAEwAAAAAAAAAFdmFsdWUAAAAAAAABAAAAAA==",
        "AAAAAAAAAAAAAAASZ2V0X2VtZXJnZW5jeV9tb2RlAAAAAAAAAAAAAQAAAAE=",
        "AAAAAAAAAAAAAAAZY29tbWl0X3RyYW5zZmVyX293bmVyc2hpcAAAAAAAAAMAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAJcm9sZV9uYW1lAAAAAAAAEQAAAAAAAAALbmV3X2FkZHJlc3MAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAYYXBwbHlfdHJhbnNmZXJfb3duZXJzaGlwAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAlyb2xlX25hbWUAAAAAAAARAAAAAA==",
        "AAAAAAAAAAAAAAAZcmV2ZXJ0X3RyYW5zZmVyX293bmVyc2hpcAAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAJcm9sZV9uYW1lAAAAAAAAEQAAAAA=",
        "AAAAAAAAAAAAAAASZ2V0X2Z1dHVyZV9hZGRyZXNzAAAAAAABAAAAAAAAAAlyb2xlX25hbWUAAAAAAAARAAAAAQAAABM=",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAAAQAAABhQb29sUHJvdmlkZXJTd2FwRmVlRXJyb3IAAAAST3V0TWluTm90U2F0aXNmaWVkAAAAAAfW",
        "AAAABAAAAAAAAAAAAAAAEkFjY2Vzc0NvbnRyb2xFcnJvcgAAAAAABwAAABJBY2Nlc3NDb250cm9sRXJyb3IAAAAAAAxSb2xlTm90Rm91bmQAAABlAAAAAAAAAAxVbmF1dGhvcml6ZWQAAABmAAAAAAAAAA9BZG1pbkFscmVhZHlTZXQAAAAAZwAAAAAAAAAMQmFkUm9sZVVzYWdlAAAAaAAAAAAAAAATQW5vdGhlckFjdGlvbkFjdGl2ZQAAAAtaAAAAAAAAAA5Ob0FjdGlvbkFjdGl2ZQAAAAALWwAAAAAAAAARQWN0aW9uTm90UmVhZHlZZXQAAAAAAAtc",
        "AAAABAAAAAAAAAAAAAAADFJld2FyZHNFcnJvcgAAAAIAAAAMUmV3YXJkc0Vycm9yAAAAElBhc3RUaW1lTm90QWxsb3dlZAAAAAACvQAAAAAAAAAUU2FtZUluY2VudGl2ZXNDb25maWcAAAK+",
        "AAAAAQAAAAAAAAAAAAAAE1Bvb2xJbmNlbnRpdmVDb25maWcAAAAAAgAAAAAAAAARcmV3YXJkX2V4cGlyZWRfYXQAAAAAAAAGAAAAAAAAAApyZXdhcmRfdHBzAAAAAAAK",
        "AAAAAQAAAAAAAAAAAAAAEVBvb2xJbmNlbnRpdmVEYXRhAAAAAAAABQAAAAAAAAATYWNjdW11bGF0ZWRfcmV3YXJkcwAAAAAKAAAAAAAAAAVibG9jawAAAAAAAAYAAAAAAAAAD2NsYWltZWRfcmV3YXJkcwAAAAAKAAAAAAAAABFmZWVfZ3Jvd3RoX3Blcl9scAAAAAAAAAoAAAAAAAAAEXJld2FyZHNfbGFzdF90aW1lAAAAAAAABg==",
        "AAAAAQAAAAAAAAAAAAAAEVVzZXJJbmNlbnRpdmVEYXRhAAAAAAAABAAAAAAAAAAOZmVlX2NoZWNrcG9pbnQAAAAAAAoAAAAAAAAACmxhc3RfYmxvY2sAAAAAAAYAAAAAAAAAGHBvb2xfYWNjdW11bGF0ZWRfcmV3YXJkcwAAAAoAAAAAAAAAEHJld2FyZHNfdG9fY2xhaW0AAAAK",
        "AAAABAAAAAAAAAAAAAAADFVwZ3JhZGVFcnJvcgAAAAMAAAAMVXBncmFkZUVycm9yAAAAE0Fub3RoZXJBY3Rpb25BY3RpdmUAAAALWgAAAAAAAAAOTm9BY3Rpb25BY3RpdmUAAAAAC1sAAAAAAAAAEUFjdGlvbk5vdFJlYWR5WWV0AAAAAAALXA==",
        "AAAABAAAAAAAAAAAAAAACU1hdGhFcnJvcgAAAAAAAAIAAAAZTWF0aEVycm9yOiBOdW1iZXJPdmVyZmxvdwAAAAAAAA5OdW1iZXJPdmVyZmxvdwAAAAAB/gAAAAAAAAAJTWF0aEVycm9yAAAAAAAB/w==",
        "AAAABAAAAAAAAAAAAAAAC09yYWNsZUVycm9yAAAAAAYAAAAeT3JhY2xlRXJyb3I6IE9yYWNsZU5vblBvc2l0aXZlAAAAAAART3JhY2xlTm9uUG9zaXRpdmUAAAAAAAJZAAAAAAAAABFPcmFjbGVUb29Wb2xhdGlsZQAAAAAAAloAAAAAAAAAEk9yYWNsZVRvb1VuY2VydGFpbgAAAAACWwAAAAAAAAAUT3JhY2xlU3RhbGVGb3JNYXJnaW4AAAJcAAAAAAAAABxPcmFjbGVJbnN1ZmZpY2llbnREYXRhUG9pbnRzAAACXQAAAAAAAAAST3JhY2xlU3RhbGVGb3JQb29sAAAAAAJe",
        "AAAABAAAAAAAAAAAAAAADFN0b3JhZ2VFcnJvcgAAAAIAAAAMU3RvcmFnZUVycm9yAAAAE1ZhbHVlTm90SW5pdGlhbGl6ZWQAAAAB9QAAAAAAAAAMVmFsdWVNaXNzaW5nAAAB9g==",
        "AAAABAAAAAAAAAAAAAAAD1ZhbGlkYXRpb25FcnJvcgAAAAABAAAAD1ZhbGlkYXRpb25FcnJvcgAAAAAMSW52YWxpZFRva2VuAAADIQ==",
        "AAAAAQAAAAAAAAAAAAAAE1ByaXZpbGVnZWRBZGRyZXNzZXMAAAAABQAAAAAAAAAPZW1lcmdlbmN5X2FkbWluAAAAABMAAAAAAAAAFmVtZXJnZW5jeV9wYXVzZV9hZG1pbnMAAAAAA+oAAAATAAAAAAAAABBvcGVyYXRpb25zX2FkbWluAAAAEwAAAAAAAAALcGF1c2VfYWRtaW4AAAAAEwAAAAAAAAANcmV3YXJkc19hZG1pbgAAAAAAABM=",
        "AAAAAQAAAAAAAAAAAAAAD09yYWNsZVByaWNlRGF0YQAAAAACAAAAAAAAAAVkZWxheQAAAAAAAAYAAAAAAAAABXByaWNlAAAAAAAACg==",
        "AAAAAQAAAAAAAAAAAAAACk9yYWNsZUluZm8AAAAAAAUAAAAAAAAAB2FkZHJlc3MAAAAAEwAAAAAAAAAIZGVjaW1hbHMAAAAEAAAAAAAAAAZmcm96ZW4AAAAAAAEAAAAAAAAADGxhc3RfdXBkYXRlZAAAAAYAAAAAAAAAGnNhbml0aXplX2NsYW1wX2Rlbm9taW5hdG9yAAAAAAAH",
        "AAAAAQAAAAAAAAAAAAAAEU11dGFibGVPcmFjbGVJbmZvAAAAAAAABAAAAAAAAAAHYWRkcmVzcwAAAAPoAAAAEwAAAAAAAAAIZGVjaW1hbHMAAAPoAAAABAAAAAAAAAAGZnJvemVuAAAAAAPoAAAAAQAAAAAAAAAac2FuaXRpemVfY2xhbXBfZGVub21pbmF0b3IAAAAAA+gAAAAH",
        "AAAAAgAAAAAAAAAAAAAADE5vcm1hbEFjdGlvbgAAAAYAAAAAAAAAAAAAAAxBZGRMaXF1aWRpdHkAAAAAAAAAAAAAAA9SZW1vdmVMaXF1aWRpdHkAAAAAAAAAAAAAAAAEU3dhcAAAAAAAAAAAAAAAClVwZGF0ZVR3YXAAAAAAAAAAAAAAAAAACVJlYmFsYW5jZQAAAAAAAAAAAAAAAAAADkNsYWltSW5zdXJhbmNlAAA=",
        "AAAAAQAAAAAAAAAAAAAABFBvb2wAAAAKAAAAAAAAAApiYXNlX2Fzc2V0AAAAAAARAAAAAAAAAAxleHBpcnlfcHJpY2UAAAAKAAAAAAAAAAlleHBpcnlfdHMAAAAAAAAGAAAAAAAAAAxmZWVfZnJhY3Rpb24AAAAEAAAAAAAAAA9pbnN1cmFuY2VfY2xhaW0AAAAH0AAAAA5JbnN1cmFuY2VDbGFpbQAAAAAAAAAAABdsaXF1aWRpdHlfbWF4X2ltYmFsYW5jZQAAAAAKAAAAAAAAAAtxdW90ZV9hc3NldAAAAAARAAAAAAAAAAZzdGF0dXMAAAAAB9AAAAAKUG9vbFN0YXR1cwAAAAAAAAAAAAR0aWVyAAAH0AAAAAhQb29sVGllcgAAAAAAAAAHdG9rZW5fYgAAAAAT",
        "AAAAAgAAAAAAAAAAAAAAClBvb2xTdGF0dXMAAAAAAAYAAAAAAAAAAAAAAAtJbml0aWFsaXplZAAAAAAAAAAAAAAAAAZBY3RpdmUAAAAAAAAAAAAAAAAABkZyb3plbgAAAAAAAAAAAAAAAAAKUmVkdWNlT25seQAAAAAAAAAAAAAAAAAKU2V0dGxlbWVudAAAAAAAAAAAAAAAAAAIRGVsaXN0ZWQ=",
        "AAAAAgAAAAAAAAAAAAAACFBvb2xUaWVyAAAABgAAAAAAAAAAAAAAAUEAAAAAAAAAAAAAAAAAAAFCAAAAAAAAAAAAAAAAAAABQwAAAAAAAAAAAAAAAAAAC1NwZWN1bGF0aXZlAAAAAAAAAAAAAAAAEUhpZ2hseVNwZWN1bGF0aXZlAAAAAAAAAAAAAAAAAAAISXNvbGF0ZWQ=",
        "AAAAAQAAAAAAAAAAAAAADkluc3VyYW5jZUNsYWltAAAAAAAEAAAAAAAAABhsYXN0X3JldmVudWVfd2l0aGRyYXdfdHMAAAAGAAAAAAAAABNxdW90ZV9tYXhfaW5zdXJhbmNlAAAAAAoAAAAAAAAAF3F1b3RlX3NldHRsZWRfaW5zdXJhbmNlAAAAAAoAAAAAAAAAHnJldl93aXRoZHJhd19zaW5jZV9sYXN0X3NldHRsZQAAAAAACw==",
        "AAAAAQAAAAAAAAAAAAAADFBvb2xSZXNwb25zZQAAAAQAAAAAAAAABHBvb2wAAAfQAAAABFBvb2wAAAAAAAAAB3Rva2VuX2EAAAAH0AAAABBBZGRyZXNzQW5kQW1vdW50AAAAAAAAAAd0b2tlbl9iAAAAB9AAAAAQQWRkcmVzc0FuZEFtb3VudAAAAAAAAAALdG9rZW5fc2hhcmUAAAAH0AAAABBBZGRyZXNzQW5kQW1vdW50",
        "AAAAAQAAAAAAAAAAAAAACFBvb2xJbmZvAAAAAgAAAAAAAAAMcG9vbF9hZGRyZXNzAAAAEwAAAAAAAAANcG9vbF9yZXNwb25zZQAAAAAAB9AAAAAMUG9vbFJlc3BvbnNl",
        "AAAAAQAAAAAAAAAAAAAADFJld2FyZENvbmZpZwAAAAEAAAAAAAAADHJld2FyZF90b2tlbgAAABM=",
        "AAAAAQAAAAAAAAAAAAAAEEluaXRpYWxpemVQYXJhbXMAAAAJAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABmFzc2V0cwAAAAAD7QAAAAIAAAARAAAAEQAAAAAAAAAMZmVlX2ZyYWN0aW9uAAAABAAAAAAAAAANbHBfdG9rZW5faW5mbwAAAAAAB9AAAAANVG9rZW5Jbml0SW5mbwAAAAAAAAAAAAAQcHJpdmlsZWdlZF9hZGRycwAAB9AAAAATUHJpdmlsZWdlZEFkZHJlc3NlcwAAAAAAAAAAE3F1b3RlX21heF9pbnN1cmFuY2UAAAAACgAAAAAAAAAGcm91dGVyAAAAAAATAAAAAAAAAAR0aWVyAAAH0AAAAAhQb29sVGllcgAAAAAAAAAGdG9rZW5zAAAAAAPqAAAAEw==",
        "AAAAAQAAAAAAAAAAAAAAE0luaXRpYWxpemVBbGxQYXJhbXMAAAAAAwAAAAAAAAAEYmFzZQAAB9AAAAAQSW5pdGlhbGl6ZVBhcmFtcwAAAAAAAAAFcGxhbmUAAAAAAAATAAAAAAAAAA1yZXdhcmRfY29uZmlnAAAAAAAH0AAAAAxSZXdhcmRDb25maWc=",
        "AAAAAQAAAAAAAAAAAAAADVRva2VuSW5pdEluZm8AAAAAAAADAAAAAAAAAARuYW1lAAAAEAAAAAAAAAAGc3ltYm9sAAAAAAAQAAAAAAAAAA90b2tlbl93YXNtX2hhc2gAAAAD7gAAACA=",
        "AAAAAQAAAAAAAAAAAAAAEEFkZHJlc3NBbmRBbW91bnQAAAACAAAAAAAAAAdhZGRyZXNzAAAAABMAAAAAAAAABmFtb3VudAAAAAAACg==" ]),
      options
    )
  }
  public readonly fromJSON = {
    swap: this.txFromJSON<u128>,
        get_router: this.txFromJSON<string>,
        get_buffer: this.txFromJSON<string>,
        get_fee_destination: this.txFromJSON<string>,
        get_buffer_fraction: this.txFromJSON<u32>,
        get_lp_revenue_fraction: this.txFromJSON<u32>,
        init_admin: this.txFromJSON<null>,
        claim_fees: this.txFromJSON<u128>,
        set_router: this.txFromJSON<null>,
        set_buffer: this.txFromJSON<null>,
        set_insurance_fund: this.txFromJSON<null>,
        set_fee_destination: this.txFromJSON<null>,
        set_buffer_fraction: this.txFromJSON<null>,
        set_lp_revenue_fraction: this.txFromJSON<null>,
        version: this.txFromJSON<u32>,
        commit_upgrade: this.txFromJSON<null>,
        apply_upgrade: this.txFromJSON<Buffer>,
        revert_upgrade: this.txFromJSON<null>,
        set_emergency_mode: this.txFromJSON<null>,
        get_emergency_mode: this.txFromJSON<boolean>,
        commit_transfer_ownership: this.txFromJSON<null>,
        apply_transfer_ownership: this.txFromJSON<null>,
        revert_transfer_ownership: this.txFromJSON<null>,
        get_future_address: this.txFromJSON<string>
  }
}

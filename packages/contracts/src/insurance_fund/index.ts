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
    contractId: "CDS4YPHIHDS7GGPVRCZ4AOJ25GU7BB3KZL5NELF5E3HGK4Y5O62DG7P6",
  }
} as const

export const InsuranceFundError = {
  /**
   * InsuranceFundError: MaxIFWithdrawReached
   */
  0: {message:"MaxIFWithdrawReached"},

  1: {message:"NoIFWithdrawAvailable"},

  2: {message:"InvalidIFUnstake"},

  3: {message:"InvalidIFUnstakeSize"},

  4: {message:"InvalidIFUnstakeCancel"},

  5: {message:"InvalidIFForNewStakes"},

  6: {message:"InvalidIFRebase"},

  7: {message:"InvalidInsuranceUnstakeSize"},

  9: {message:"IFWithdrawRequestInProgress"},

  10: {message:"NoIFWithdrawRequestInProgress"},

  11: {message:"IFWithdrawRequestTooSmall"},

  12: {message:"InvalidIFSharesDetected"},

  13: {message:"InsufficientIFShares"},

  14: {message:"TryingToRemoveLiquidityTooFast"},

  15: {message:"AlreadyInitialized"},

  16: {message:"NotAuthorized"},

  17: {message:"AdminNotSet"},

  18: {message:"InsufficientCollateral"},

  19: {message:"InvalidIFDetected"},

  20: {message:"TooMuchInsurance"},

  30: {message:"FundDepositKilled"},

  31: {message:"FundRequestWithdrawKilled"},

  32: {message:"FundWithdrawKilled"}
}
export type StakeAction = {tag: "Deposit", values: void} | {tag: "WithdrawRequest", values: void} | {tag: "WithdrawCancelRequest", values: void} | {tag: "Withdraw", values: void};


export interface Stake {
  cost_basis: u128;
  if_base: u128;
  if_shares: u128;
  last_valid_ts: u64;
  last_withdraw_request_shares: u128;
  last_withdraw_request_ts: u64;
  last_withdraw_request_value: u128;
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
   * Construct and simulate a deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  deposit: ({user, amount}: {user: string, amount: u128}, options?: {
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
   * Construct and simulate a request_withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  request_withdraw: ({user, amount}: {user: string, amount: u128}, options?: {
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
   * Construct and simulate a cancel_request_withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  cancel_request_withdraw: ({user}: {user: string}, options?: {
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
   * Construct and simulate a withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  withdraw: ({user}: {user: string}, options?: {
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
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize: ({admin, token}: {admin: string, token: string}, options?: {
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
   * Construct and simulate a set_unstaking_period transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_unstaking_period: ({admin, unstaking_period}: {admin: string, unstaking_period: u64}, options?: {
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
   * Construct and simulate a set_max_shares transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_max_shares: ({admin, max_shares}: {admin: string, max_shares: u128}, options?: {
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
   * Construct and simulate a resolve_liquidity_deficit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  resolve_liquidity_deficit: ({admin, pool_address}: {admin: string, pool_address: string}, options?: {
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
   * Construct and simulate a kill_request_withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  kill_request_withdraw: ({admin}: {admin: string}, options?: {
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
   * Construct and simulate a unkill_request_withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  unkill_request_withdraw: ({admin}: {admin: string}, options?: {
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
   * Construct and simulate a get_is_killed_request_withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_is_killed_request_withdraw: (options?: {
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
      new ContractSpec([ "AAAAAAAAAAAAAAAHZGVwb3NpdAAAAAACAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAGYW1vdW50AAAAAAAKAAAAAA==",
        "AAAAAAAAAAAAAAAQcmVxdWVzdF93aXRoZHJhdwAAAAIAAAAAAAAABHVzZXIAAAATAAAAAAAAAAZhbW91bnQAAAAAAAoAAAAA",
        "AAAAAAAAAAAAAAAXY2FuY2VsX3JlcXVlc3Rfd2l0aGRyYXcAAAAAAQAAAAAAAAAEdXNlcgAAABMAAAAA",
        "AAAAAAAAAAAAAAAId2l0aGRyYXcAAAABAAAAAAAAAAR1c2VyAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAHdmVyc2lvbgAAAAAAAAAAAQAAAAQ=",
        "AAAAAAAAAAAAAAAOY29tbWl0X3VwZ3JhZGUAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAANbmV3X3dhc21faGFzaAAAAAAAA+4AAAAgAAAAAA==",
        "AAAAAAAAAAAAAAANYXBwbHlfdXBncmFkZQAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAEAAAPuAAAAIA==",
        "AAAAAAAAAAAAAAAOcmV2ZXJ0X3VwZ3JhZGUAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAASc2V0X2VtZXJnZW5jeV9tb2RlAAAAAAACAAAAAAAAAA9lbWVyZ2VuY3lfYWRtaW4AAAAAEwAAAAAAAAAFdmFsdWUAAAAAAAABAAAAAA==",
        "AAAAAAAAAAAAAAASZ2V0X2VtZXJnZW5jeV9tb2RlAAAAAAAAAAAAAQAAAAE=",
        "AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAV0b2tlbgAAAAAAABMAAAAA",
        "AAAAAAAAAAAAAAAUc2V0X3Vuc3Rha2luZ19wZXJpb2QAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAEHVuc3Rha2luZ19wZXJpb2QAAAAGAAAAAA==",
        "AAAAAAAAAAAAAAAOc2V0X21heF9zaGFyZXMAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAKbWF4X3NoYXJlcwAAAAAACgAAAAA=",
        "AAAAAAAAAAAAAAAZcmVzb2x2ZV9saXF1aWRpdHlfZGVmaWNpdAAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAMcG9vbF9hZGRyZXNzAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAMa2lsbF9kZXBvc2l0AAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==",
        "AAAAAAAAAAAAAAAVa2lsbF9yZXF1ZXN0X3dpdGhkcmF3AAAAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==",
        "AAAAAAAAAAAAAAANa2lsbF93aXRoZHJhdwAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAOdW5raWxsX2RlcG9zaXQAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAXdW5raWxsX3JlcXVlc3Rfd2l0aGRyYXcAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==",
        "AAAAAAAAAAAAAAAPdW5raWxsX3dpdGhkcmF3AAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAVZ2V0X2lzX2tpbGxlZF9kZXBvc2l0AAAAAAAAAAAAAAEAAAAB",
        "AAAAAAAAAAAAAAAeZ2V0X2lzX2tpbGxlZF9yZXF1ZXN0X3dpdGhkcmF3AAAAAAAAAAAAAQAAAAE=",
        "AAAAAAAAAAAAAAAWZ2V0X2lzX2tpbGxlZF93aXRoZHJhdwAAAAAAAAAAAAEAAAAB",
        "AAAAAAAAAAAAAAAZY29tbWl0X3RyYW5zZmVyX293bmVyc2hpcAAAAAAAAAMAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAJcm9sZV9uYW1lAAAAAAAAEQAAAAAAAAALbmV3X2FkZHJlc3MAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAYYXBwbHlfdHJhbnNmZXJfb3duZXJzaGlwAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAlyb2xlX25hbWUAAAAAAAARAAAAAA==",
        "AAAAAAAAAAAAAAAZcmV2ZXJ0X3RyYW5zZmVyX293bmVyc2hpcAAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAJcm9sZV9uYW1lAAAAAAAAEQAAAAA=",
        "AAAAAAAAAAAAAAASZ2V0X2Z1dHVyZV9hZGRyZXNzAAAAAAABAAAAAAAAAAlyb2xlX25hbWUAAAAAAAARAAAAAQAAABM=",
        "AAAABAAAAAAAAAAAAAAAEkluc3VyYW5jZUZ1bmRFcnJvcgAAAAAAFwAAAChJbnN1cmFuY2VGdW5kRXJyb3I6IE1heElGV2l0aGRyYXdSZWFjaGVkAAAAFE1heElGV2l0aGRyYXdSZWFjaGVkAAAAAAAAAAAAAAAVTm9JRldpdGhkcmF3QXZhaWxhYmxlAAAAAAAAAQAAAAAAAAAQSW52YWxpZElGVW5zdGFrZQAAAAIAAAAAAAAAFEludmFsaWRJRlVuc3Rha2VTaXplAAAAAwAAAAAAAAAWSW52YWxpZElGVW5zdGFrZUNhbmNlbAAAAAAABAAAAAAAAAAVSW52YWxpZElGRm9yTmV3U3Rha2VzAAAAAAAABQAAAAAAAAAPSW52YWxpZElGUmViYXNlAAAAAAYAAAAAAAAAG0ludmFsaWRJbnN1cmFuY2VVbnN0YWtlU2l6ZQAAAAAHAAAAAAAAABtJRldpdGhkcmF3UmVxdWVzdEluUHJvZ3Jlc3MAAAAACQAAAAAAAAAdTm9JRldpdGhkcmF3UmVxdWVzdEluUHJvZ3Jlc3MAAAAAAAAKAAAAAAAAABlJRldpdGhkcmF3UmVxdWVzdFRvb1NtYWxsAAAAAAAACwAAAAAAAAAXSW52YWxpZElGU2hhcmVzRGV0ZWN0ZWQAAAAADAAAAAAAAAAUSW5zdWZmaWNpZW50SUZTaGFyZXMAAAANAAAAAAAAAB5UcnlpbmdUb1JlbW92ZUxpcXVpZGl0eVRvb0Zhc3QAAAAAAA4AAAAAAAAAEkFscmVhZHlJbml0aWFsaXplZAAAAAAADwAAAAAAAAANTm90QXV0aG9yaXplZAAAAAAAABAAAAAAAAAAC0FkbWluTm90U2V0AAAAABEAAAAAAAAAFkluc3VmZmljaWVudENvbGxhdGVyYWwAAAAAABIAAAAAAAAAEUludmFsaWRJRkRldGVjdGVkAAAAAAAAEwAAAAAAAAAQVG9vTXVjaEluc3VyYW5jZQAAABQAAAAAAAAAEUZ1bmREZXBvc2l0S2lsbGVkAAAAAAAAHgAAAAAAAAAZRnVuZFJlcXVlc3RXaXRoZHJhd0tpbGxlZAAAAAAAAB8AAAAAAAAAEkZ1bmRXaXRoZHJhd0tpbGxlZAAAAAAAIA==",
        "AAAAAgAAAAAAAAAAAAAAC1N0YWtlQWN0aW9uAAAAAAQAAAAAAAAAAAAAAAdEZXBvc2l0AAAAAAAAAAAAAAAAD1dpdGhkcmF3UmVxdWVzdAAAAAAAAAAAAAAAABVXaXRoZHJhd0NhbmNlbFJlcXVlc3QAAAAAAAAAAAAAAAAAAAhXaXRoZHJhdw==",
        "AAAAAQAAAAAAAAAAAAAABVN0YWtlAAAAAAAABwAAAAAAAAAKY29zdF9iYXNpcwAAAAAACgAAAAAAAAAHaWZfYmFzZQAAAAAKAAAAAAAAAAlpZl9zaGFyZXMAAAAAAAAKAAAAAAAAAA1sYXN0X3ZhbGlkX3RzAAAAAAAABgAAAAAAAAAcbGFzdF93aXRoZHJhd19yZXF1ZXN0X3NoYXJlcwAAAAoAAAAAAAAAGGxhc3Rfd2l0aGRyYXdfcmVxdWVzdF90cwAAAAYAAAAAAAAAG2xhc3Rfd2l0aGRyYXdfcmVxdWVzdF92YWx1ZQAAAAAK",
        "AAAABAAAAAAAAAAAAAAAEkFjY2Vzc0NvbnRyb2xFcnJvcgAAAAAABwAAABJBY2Nlc3NDb250cm9sRXJyb3IAAAAAAAxSb2xlTm90Rm91bmQAAABlAAAAAAAAAAxVbmF1dGhvcml6ZWQAAABmAAAAAAAAAA9BZG1pbkFscmVhZHlTZXQAAAAAZwAAAAAAAAAMQmFkUm9sZVVzYWdlAAAAaAAAAAAAAAATQW5vdGhlckFjdGlvbkFjdGl2ZQAAAAtaAAAAAAAAAA5Ob0FjdGlvbkFjdGl2ZQAAAAALWwAAAAAAAAARQWN0aW9uTm90UmVhZHlZZXQAAAAAAAtc",
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
    deposit: this.txFromJSON<null>,
        request_withdraw: this.txFromJSON<null>,
        cancel_request_withdraw: this.txFromJSON<null>,
        withdraw: this.txFromJSON<null>,
        version: this.txFromJSON<u32>,
        commit_upgrade: this.txFromJSON<null>,
        apply_upgrade: this.txFromJSON<Buffer>,
        revert_upgrade: this.txFromJSON<null>,
        set_emergency_mode: this.txFromJSON<null>,
        get_emergency_mode: this.txFromJSON<boolean>,
        initialize: this.txFromJSON<null>,
        set_unstaking_period: this.txFromJSON<null>,
        set_max_shares: this.txFromJSON<null>,
        resolve_liquidity_deficit: this.txFromJSON<null>,
        kill_deposit: this.txFromJSON<null>,
        kill_request_withdraw: this.txFromJSON<null>,
        kill_withdraw: this.txFromJSON<null>,
        unkill_deposit: this.txFromJSON<null>,
        unkill_request_withdraw: this.txFromJSON<null>,
        unkill_withdraw: this.txFromJSON<null>,
        get_is_killed_deposit: this.txFromJSON<boolean>,
        get_is_killed_request_withdraw: this.txFromJSON<boolean>,
        get_is_killed_withdraw: this.txFromJSON<boolean>,
        commit_transfer_ownership: this.txFromJSON<null>,
        apply_transfer_ownership: this.txFromJSON<null>,
        revert_transfer_ownership: this.txFromJSON<null>,
        get_future_address: this.txFromJSON<string>
  }
}

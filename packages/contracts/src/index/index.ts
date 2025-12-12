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

export const IndexError = {
  /**
   * IndexError
   */
  29: { message: 'PathIsEmpty' },
  30: { message: 'IndexMintKilled' },
  31: { message: 'IndexRedeemKilled' },
  32: { message: 'IndexRebalanceKilled' },
  33: { message: 'ManagerNotSet' },
  34: { message: 'ProtocolRecipientNotSet' },
  35: { message: 'InvalidSharesDetected' },
  37: { message: 'RebalanceTooSoon' },
  38: { message: 'UnauthorizedRebalance' },
  39: { message: 'PublicRebalanceRequiresProposal' },
  40: { message: 'InvalidWeightSum' },
  41: { message: 'ComponentNotFound' },
  42: { message: 'InvalidComponentAction' },
  46: { message: 'RebalanceNotAllowed' },
  45: { message: 'UnauthorizedRefactor' },
  43: { message: 'NotWhitelisted' },
  44: { message: 'Blacklisted' },
  47: { message: 'InvalidAmount' },
  48: { message: 'InsufficientBalance' },
}

export type DexProvider = { tag: 'Normal'; values: void } | { tag: 'Soroswap'; values: void }

export interface SwapUtilityParams {
  amount_in: u128
  amount_out_min: u128
  asset: string
  fee_enabled: Option<boolean>
  provider: Option<string>
  to: string
  token_in: string
  token_out: string
}

export interface SwapParams {
  amount_in: u128
  amount_out_min: u128
  provider: Option<string>
  to: string
  token_in: string
  token_out: string
}

export interface SwapResult {
  amount_in: u128
  amount_out: u128
  provider_used: DexProvider
  success: boolean
}

export enum SwapError {
  ProviderNotSupported = 100,
  ProviderNotConfigured = 101,
  InvalidTokenPair = 200,
  InvalidAmount = 201,
  InvalidSlippage = 202,
  InsufficientLiquidity = 300,
  SlippageExceeded = 301,
  SwapFailed = 302,
  NormalDexFailed = 400,
  SoroswapSwapFailed = 401,
  SoroswapAggregatorUnavailable = 402,
  InvalidProviderConfig = 500,
  UnauthorizedAccess = 501,
  ContractNotInitialized = 502,
}

export interface DexDistribution {
  parts: u32
  path: Array<string>
  protocol_id: string
}

// export type DexProvider = { tag: 'Normal'; values: void } | { tag: 'Soroswap'; values: void }

export interface IndexInfo {
  address: string
  base_nav: u128
  initial_price: u128
  is_public: boolean
  last_rebalance_ts: u64
  last_updated_ts: u64
  manager_address: string
  token_address: string
  total_mints: u128
  total_redemptions: u128
  total_shares: u128
}

export interface IndexMetrics {
  current_nav: u128
  share_price: u128
  total_mints: u128
  total_redemptions: u128
  total_shares: u128
}

export interface IndexStatus {
  can_rebalance: boolean
  is_public: boolean
  last_rebalance_ts: u64
  rebalance_threshold: u64
}

export type ComponentAction =
  | { tag: 'Add'; values: void }
  | { tag: 'Remove'; values: void }
  | { tag: 'UpdateWeight'; values: void }

export interface ComponentUpdate {
  action: ComponentAction
  new_weight: u128
  token: string
}

export interface RefactorParams {
  component_updates: Array<ComponentUpdate>
}

export interface RebalanceParams {
  target_nav: Option<i128>
}

export interface ComponentAllocation {
  component: Component
  current_balance: u128
  percentage_of_nav: u128
  target_balance: u128
}

export interface RebalanceStatus {
  authorized_rebalancers: Array<string>
  can_rebalance: boolean
  is_public: boolean
  last_rebalance_ts: u64
  rebalance_threshold: u64
  time_until_next_rebalance: u64
}

export interface Component {
  asset: string
  weight: u128
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
}

export interface PrivilegedAddresses {
  emergency_admin: string
  emergency_pause_admins: Array<string>
  operations_admin: string
  pause_admin: string
  rewards_admin: string
}

export interface IndexParams {
  admin: string
  base_nav: u128
  blacklist_accounts: Array<string>
  components: Array<string>
  description: string
  initial_deposit: u128
  initial_price: u128
  is_public: boolean
  manager_fee_amount: u128
  name: string
  rebalance_authorities: Array<string>
  token_symbol: string
  whitelist_accounts: Array<string>
}

export interface Client {
  /**
   * Construct and simulate a mint transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  mint: (
    {
      user,
      token,
      amount,
      destination,
      _max_slippage,
    }: { user: string; token: string; amount: u128; destination: Option<string>; _max_slippage: Option<u64> },
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
   * Construct and simulate a redeem transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  redeem: (
    { user, share_amount }: { user: string; share_amount: u128 },
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
   * Construct and simulate a get_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_token: (options?: {
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
   * Construct and simulate a get_factory transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_factory: (options?: {
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
   * Construct and simulate a get_base_nav transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_base_nav: (options?: {
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
   * Construct and simulate a get_initial_price transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_initial_price: (options?: {
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
   * Construct and simulate a get_nav transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_nav: (options?: {
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
  }) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a get_price transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_price: (options?: {
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
  }) => Promise<AssembledTransaction<i128>>

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
   * Construct and simulate a get_public_status transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_public_status: (options?: {
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
   * Construct and simulate a get_whitelist_status transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_whitelist_status: (
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
   * Construct and simulate a get_blacklist_status transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_blacklist_status: (
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
   * Construct and simulate a get_rebalance_threshold transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_rebalance_threshold: (options?: {
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
   * Construct and simulate a get_last_rebalance_timestamp transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_last_rebalance_timestamp: (options?: {
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
   * Construct and simulate a get_last_updated_timestamp transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_last_updated_timestamp: (options?: {
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
   * Construct and simulate a get_total_mints transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_mints: (options?: {
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
   * Construct and simulate a get_total_redemptions transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_redemptions: (options?: {
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
   * Construct and simulate a get_component transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_component: (
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
  ) => Promise<AssembledTransaction<Component>>

  /**
   * Construct and simulate a get_component_balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_component_balance: (
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
  ) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a transfer_shares transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Transfer shares between users
   */
  transfer_shares: (
    { from, to, amount }: { from: string; to: string; amount: u128 },
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
   * Construct and simulate a transfer_shares_from transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Transfer shares from allowance
   */
  transfer_shares_from: (
    { spender, from, to, amount }: { spender: string; from: string; to: string; amount: u128 },
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
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize: (
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
   * Construct and simulate a refactor transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  refactor: (
    { caller, params }: { caller: string; params: RefactorParams },
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
   * Construct and simulate a rebalance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  rebalance: (
    { caller, params }: { caller: string; params: RebalanceParams },
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
   * Construct and simulate a set_rebalance_authority transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_rebalance_authority: (
    { admin, authority, status }: { admin: string; authority: string; status: boolean },
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
   * Construct and simulate a set_manager_address transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_manager_address: (
    { admin, manager }: { admin: string; manager: string },
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
   * Construct and simulate a set_factory transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_factory: (
    { admin, factory }: { admin: string; factory: string },
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
   * Construct and simulate a set_base_nav transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_base_nav: (
    { admin, base_nav }: { admin: string; base_nav: u128 },
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
   * Construct and simulate a set_initial_price transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_initial_price: (
    { admin, initial_price }: { admin: string; initial_price: u128 },
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
   * Construct and simulate a set_public_status transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_public_status: (
    { admin, is_public }: { admin: string; is_public: boolean },
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
   * Construct and simulate a set_whitelist_status transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_whitelist_status: (
    { admin, address, status }: { admin: string; address: string; status: boolean },
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
   * Construct and simulate a set_blacklist_status transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_blacklist_status: (
    { admin, address, status }: { admin: string; address: string; status: boolean },
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
   * Construct and simulate a set_rebalance_threshold transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_rebalance_threshold: (
    { admin, threshold }: { admin: string; threshold: u64 },
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
   * Construct and simulate a get_index_info transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_index_info: (options?: {
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
  }) => Promise<AssembledTransaction<IndexInfo>>

  /**
   * Construct and simulate a get_all_components transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_all_components: (options?: {
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
  }) => Promise<AssembledTransaction<Map<string, Component>>>

  /**
   * Construct and simulate a get_component_info transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_component_info: (
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
  ) => Promise<AssembledTransaction<Component>>

  /**
   * Construct and simulate a get_all_component_balances transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_all_component_balances: (options?: {
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
  }) => Promise<AssembledTransaction<Map<string, u128>>>

  /**
   * Construct and simulate a get_total_index_value transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_index_value: (options?: {
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
   * Construct and simulate a get_index_metrics transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_index_metrics: (options?: {
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
  }) => Promise<AssembledTransaction<IndexMetrics>>

  /**
   * Construct and simulate a get_share_price transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_share_price: (options?: {
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
   * Construct and simulate a get_current_nav transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_current_nav: (options?: {
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
   * Construct and simulate a get_index_status transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_index_status: (options?: {
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
  }) => Promise<AssembledTransaction<IndexStatus>>

  /**
   * Construct and simulate a can_rebalance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  can_rebalance: (options?: {
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
   * Construct and simulate a get_rebalance_status transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_rebalance_status: (options?: {
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
  }) => Promise<AssembledTransaction<RebalanceStatus>>

  /**
   * Construct and simulate a can_address_rebalance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  can_address_rebalance: (
    { caller }: { caller: string },
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
   * Construct and simulate a get_component_allocation transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_component_allocation: (options?: {
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
  }) => Promise<AssembledTransaction<Map<string, ComponentAllocation>>>

  /**
   * Construct and simulate a get_rebalance_authorities transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_rebalance_authorities: (options?: {
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
        'AAAAAAAAAAAAAAAEbWludAAAAAUAAAAAAAAABHVzZXIAAAATAAAAAAAAAAV0b2tlbgAAAAAAABMAAAAAAAAABmFtb3VudAAAAAAACgAAAAAAAAALZGVzdGluYXRpb24AAAAD6AAAABMAAAAAAAAADV9tYXhfc2xpcHBhZ2UAAAAAAAPoAAAABgAAAAA=',
        'AAAAAAAAAAAAAAAGcmVkZWVtAAAAAAACAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAMc2hhcmVfYW1vdW50AAAACgAAAAA=',
        'AAAAAAAAAAAAAAAJZ2V0X3Rva2VuAAAAAAAAAAAAAAEAAAAT',
        'AAAAAAAAAAAAAAALZ2V0X2ZhY3RvcnkAAAAAAAAAAAEAAAAT',
        'AAAAAAAAAAAAAAAMZ2V0X2Jhc2VfbmF2AAAAAAAAAAEAAAAK',
        'AAAAAAAAAAAAAAARZ2V0X2luaXRpYWxfcHJpY2UAAAAAAAAAAAAAAQAAAAo=',
        'AAAAAAAAAAAAAAAHZ2V0X25hdgAAAAAAAAAAAQAAAAs=',
        'AAAAAAAAAAAAAAAJZ2V0X3ByaWNlAAAAAAAAAAAAAAEAAAAL',
        'AAAAAAAAAAAAAAAQZ2V0X3RvdGFsX3NoYXJlcwAAAAAAAAABAAAACg==',
        'AAAAAAAAAAAAAAARZ2V0X3B1YmxpY19zdGF0dXMAAAAAAAAAAAAAAQAAAAE=',
        'AAAAAAAAAAAAAAAUZ2V0X3doaXRlbGlzdF9zdGF0dXMAAAABAAAAAAAAAAdhZGRyZXNzAAAAABMAAAABAAAAAQ==',
        'AAAAAAAAAAAAAAAUZ2V0X2JsYWNrbGlzdF9zdGF0dXMAAAABAAAAAAAAAAdhZGRyZXNzAAAAABMAAAABAAAAAQ==',
        'AAAAAAAAAAAAAAAXZ2V0X3JlYmFsYW5jZV90aHJlc2hvbGQAAAAAAAAAAAEAAAAG',
        'AAAAAAAAAAAAAAAcZ2V0X2xhc3RfcmViYWxhbmNlX3RpbWVzdGFtcAAAAAAAAAABAAAABg==',
        'AAAAAAAAAAAAAAAaZ2V0X2xhc3RfdXBkYXRlZF90aW1lc3RhbXAAAAAAAAAAAAABAAAABg==',
        'AAAAAAAAAAAAAAAPZ2V0X3RvdGFsX21pbnRzAAAAAAAAAAABAAAACg==',
        'AAAAAAAAAAAAAAAVZ2V0X3RvdGFsX3JlZGVtcHRpb25zAAAAAAAAAAAAAAEAAAAK',
        'AAAAAAAAAAAAAAANZ2V0X2NvbXBvbmVudAAAAAAAAAEAAAAAAAAABXRva2VuAAAAAAAAEwAAAAEAAAfQAAAACUNvbXBvbmVudAAAAA==',
        'AAAAAAAAAAAAAAAVZ2V0X2NvbXBvbmVudF9iYWxhbmNlAAAAAAAAAQAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAQAAAAo=',
        'AAAAAAAAAB1UcmFuc2ZlciBzaGFyZXMgYmV0d2VlbiB1c2VycwAAAAAAAA90cmFuc2Zlcl9zaGFyZXMAAAAAAwAAAAAAAAAEZnJvbQAAABMAAAAAAAAAAnRvAAAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAoAAAAA',
        'AAAAAAAAAB5UcmFuc2ZlciBzaGFyZXMgZnJvbSBhbGxvd2FuY2UAAAAAABR0cmFuc2Zlcl9zaGFyZXNfZnJvbQAAAAQAAAAAAAAAB3NwZW5kZXIAAAAAEwAAAAAAAAAEZnJvbQAAABMAAAAAAAAAAnRvAAAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAoAAAAA',
        'AAAAAAAAAAAAAAAHdmVyc2lvbgAAAAAAAAAAAQAAAAQ=',
        'AAAAAAAAAAAAAAAOY29tbWl0X3VwZ3JhZGUAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAANbmV3X3dhc21faGFzaAAAAAAAA+4AAAAgAAAAAA==',
        'AAAAAAAAAAAAAAANYXBwbHlfdXBncmFkZQAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAEAAAPuAAAAIA==',
        'AAAAAAAAAAAAAAAOcmV2ZXJ0X3VwZ3JhZGUAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAASc2V0X2VtZXJnZW5jeV9tb2RlAAAAAAACAAAAAAAAAA9lbWVyZ2VuY3lfYWRtaW4AAAAAEwAAAAAAAAAFdmFsdWUAAAAAAAABAAAAAA==',
        'AAAAAAAAAAAAAAASZ2V0X2VtZXJnZW5jeV9tb2RlAAAAAAAAAAAAAQAAAAE=',
        'AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAV0b2tlbgAAAAAAABMAAAAA',
        'AAAAAAAAAAAAAAAIcmVmYWN0b3IAAAACAAAAAAAAAAZjYWxsZXIAAAAAABMAAAAAAAAABnBhcmFtcwAAAAAH0AAAAA5SZWZhY3RvclBhcmFtcwAAAAAAAA==',
        'AAAAAAAAAAAAAAAJcmViYWxhbmNlAAAAAAAAAgAAAAAAAAAGY2FsbGVyAAAAAAATAAAAAAAAAAZwYXJhbXMAAAAAB9AAAAAPUmViYWxhbmNlUGFyYW1zAAAAAAA=',
        'AAAAAAAAAAAAAAAXc2V0X3JlYmFsYW5jZV9hdXRob3JpdHkAAAAAAwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAlhdXRob3JpdHkAAAAAAAATAAAAAAAAAAZzdGF0dXMAAAAAAAEAAAAA',
        'AAAAAAAAAAAAAAATc2V0X21hbmFnZXJfYWRkcmVzcwAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAB21hbmFnZXIAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAALc2V0X2ZhY3RvcnkAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAdmYWN0b3J5AAAAABMAAAAA',
        'AAAAAAAAAAAAAAAMc2V0X2Jhc2VfbmF2AAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAhiYXNlX25hdgAAAAoAAAAA',
        'AAAAAAAAAAAAAAARc2V0X2luaXRpYWxfcHJpY2UAAAAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAADWluaXRpYWxfcHJpY2UAAAAAAAAKAAAAAA==',
        'AAAAAAAAAAAAAAARc2V0X3B1YmxpY19zdGF0dXMAAAAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAACWlzX3B1YmxpYwAAAAAAAAEAAAAA',
        'AAAAAAAAAAAAAAAUc2V0X3doaXRlbGlzdF9zdGF0dXMAAAADAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAB2FkZHJlc3MAAAAAEwAAAAAAAAAGc3RhdHVzAAAAAAABAAAAAA==',
        'AAAAAAAAAAAAAAAUc2V0X2JsYWNrbGlzdF9zdGF0dXMAAAADAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAB2FkZHJlc3MAAAAAEwAAAAAAAAAGc3RhdHVzAAAAAAABAAAAAA==',
        'AAAAAAAAAAAAAAAXc2V0X3JlYmFsYW5jZV90aHJlc2hvbGQAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAl0aHJlc2hvbGQAAAAAAAAGAAAAAA==',
        'AAAAAAAAAAAAAAAZY29tbWl0X3RyYW5zZmVyX293bmVyc2hpcAAAAAAAAAMAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAJcm9sZV9uYW1lAAAAAAAAEQAAAAAAAAALbmV3X2FkZHJlc3MAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAAYYXBwbHlfdHJhbnNmZXJfb3duZXJzaGlwAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAlyb2xlX25hbWUAAAAAAAARAAAAAA==',
        'AAAAAAAAAAAAAAAZcmV2ZXJ0X3RyYW5zZmVyX293bmVyc2hpcAAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAJcm9sZV9uYW1lAAAAAAAAEQAAAAA=',
        'AAAAAAAAAAAAAAASZ2V0X2Z1dHVyZV9hZGRyZXNzAAAAAAABAAAAAAAAAAlyb2xlX25hbWUAAAAAAAARAAAAAQAAABM=',
        'AAAAAAAAAAAAAAAOZ2V0X2luZGV4X2luZm8AAAAAAAAAAAABAAAH0AAAAAlJbmRleEluZm8AAAA=',
        'AAAAAAAAAAAAAAASZ2V0X2FsbF9jb21wb25lbnRzAAAAAAAAAAAAAQAAA+wAAAATAAAH0AAAAAlDb21wb25lbnQAAAA=',
        'AAAAAAAAAAAAAAASZ2V0X2NvbXBvbmVudF9pbmZvAAAAAAABAAAAAAAAAAV0b2tlbgAAAAAAABMAAAABAAAH0AAAAAlDb21wb25lbnQAAAA=',
        'AAAAAAAAAAAAAAAaZ2V0X2FsbF9jb21wb25lbnRfYmFsYW5jZXMAAAAAAAAAAAABAAAD7AAAABMAAAAK',
        'AAAAAAAAAAAAAAAVZ2V0X3RvdGFsX2luZGV4X3ZhbHVlAAAAAAAAAAAAAAEAAAAK',
        'AAAAAAAAAAAAAAARZ2V0X2luZGV4X21ldHJpY3MAAAAAAAAAAAAAAQAAB9AAAAAMSW5kZXhNZXRyaWNz',
        'AAAAAAAAAAAAAAAPZ2V0X3NoYXJlX3ByaWNlAAAAAAAAAAABAAAACg==',
        'AAAAAAAAAAAAAAAPZ2V0X2N1cnJlbnRfbmF2AAAAAAAAAAABAAAACg==',
        'AAAAAAAAAAAAAAAQZ2V0X2luZGV4X3N0YXR1cwAAAAAAAAABAAAH0AAAAAtJbmRleFN0YXR1cwA=',
        'AAAAAAAAAAAAAAANY2FuX3JlYmFsYW5jZQAAAAAAAAAAAAABAAAAAQ==',
        'AAAAAAAAAAAAAAAUZ2V0X3JlYmFsYW5jZV9zdGF0dXMAAAAAAAAAAQAAB9AAAAAPUmViYWxhbmNlU3RhdHVzAA==',
        'AAAAAAAAAAAAAAAVY2FuX2FkZHJlc3NfcmViYWxhbmNlAAAAAAAAAQAAAAAAAAAGY2FsbGVyAAAAAAATAAAAAQAAAAE=',
        'AAAAAAAAAAAAAAAYZ2V0X2NvbXBvbmVudF9hbGxvY2F0aW9uAAAAAAAAAAEAAAPsAAAAEwAAB9AAAAATQ29tcG9uZW50QWxsb2NhdGlvbgA=',
        'AAAAAAAAAAAAAAAZZ2V0X3JlYmFsYW5jZV9hdXRob3JpdGllcwAAAAAAAAAAAAABAAAD6gAAABM=',
        'AAAABAAAAAAAAAAAAAAACkluZGV4RXJyb3IAAAAAABMAAAAKSW5kZXhFcnJvcgAAAAAAC1BhdGhJc0VtcHR5AAAAAB0AAAAAAAAAD0luZGV4TWludEtpbGxlZAAAAAAeAAAAAAAAABFJbmRleFJlZGVlbUtpbGxlZAAAAAAAAB8AAAAAAAAAFEluZGV4UmViYWxhbmNlS2lsbGVkAAAAIAAAAAAAAAANTWFuYWdlck5vdFNldAAAAAAAACEAAAAAAAAAF1Byb3RvY29sUmVjaXBpZW50Tm90U2V0AAAAACIAAAAAAAAAFUludmFsaWRTaGFyZXNEZXRlY3RlZAAAAAAAACMAAAAAAAAAEFJlYmFsYW5jZVRvb1Nvb24AAAAlAAAAAAAAABVVbmF1dGhvcml6ZWRSZWJhbGFuY2UAAAAAAAAmAAAAAAAAAB9QdWJsaWNSZWJhbGFuY2VSZXF1aXJlc1Byb3Bvc2FsAAAAACcAAAAAAAAAEEludmFsaWRXZWlnaHRTdW0AAAAoAAAAAAAAABFDb21wb25lbnROb3RGb3VuZAAAAAAAACkAAAAAAAAAFkludmFsaWRDb21wb25lbnRBY3Rpb24AAAAAACoAAAAAAAAAE1JlYmFsYW5jZU5vdEFsbG93ZWQAAAAALgAAAAAAAAAUVW5hdXRob3JpemVkUmVmYWN0b3IAAAAtAAAAAAAAAA5Ob3RXaGl0ZWxpc3RlZAAAAAAAKwAAAAAAAAALQmxhY2tsaXN0ZWQAAAAALAAAAAAAAAANSW52YWxpZEFtb3VudAAAAAAAAC8AAAAAAAAAE0luc3VmZmljaWVudEJhbGFuY2UAAAAAMA==',
        'AAAAAgAAAAAAAAAAAAAAC0RleFByb3ZpZGVyAAAAAAIAAAAAAAAAAAAAAAZOb3JtYWwAAAAAAAAAAAAAAAAACFNvcm9zd2Fw',
        'AAAAAQAAAAAAAAAAAAAAEVN3YXBVdGlsaXR5UGFyYW1zAAAAAAAACAAAAAAAAAAJYW1vdW50X2luAAAAAAAACgAAAAAAAAAOYW1vdW50X291dF9taW4AAAAAAAoAAAAAAAAABWFzc2V0AAAAAAAAEQAAAAAAAAALZmVlX2VuYWJsZWQAAAAD6AAAAAEAAAAAAAAACHByb3ZpZGVyAAAD6AAAABAAAAAAAAAAAnRvAAAAAAATAAAAAAAAAAh0b2tlbl9pbgAAABMAAAAAAAAACXRva2VuX291dAAAAAAAABM=',
        'AAAAAQAAAAAAAAAAAAAAClN3YXBQYXJhbXMAAAAAAAYAAAAAAAAACWFtb3VudF9pbgAAAAAAAAoAAAAAAAAADmFtb3VudF9vdXRfbWluAAAAAAAKAAAAAAAAAAhwcm92aWRlcgAAA+gAAAAQAAAAAAAAAAJ0bwAAAAAAEwAAAAAAAAAIdG9rZW5faW4AAAATAAAAAAAAAAl0b2tlbl9vdXQAAAAAAAAT',
        'AAAAAQAAAAAAAAAAAAAAClN3YXBSZXN1bHQAAAAAAAQAAAAAAAAACWFtb3VudF9pbgAAAAAAAAoAAAAAAAAACmFtb3VudF9vdXQAAAAAAAoAAAAAAAAADXByb3ZpZGVyX3VzZWQAAAAAAAfQAAAAC0RleFByb3ZpZGVyAAAAAAAAAAAHc3VjY2VzcwAAAAAB',
        'AAAAAwAAAAAAAAAAAAAACVN3YXBFcnJvcgAAAAAAAA4AAAAAAAAAFFByb3ZpZGVyTm90U3VwcG9ydGVkAAAAZAAAAAAAAAAVUHJvdmlkZXJOb3RDb25maWd1cmVkAAAAAAAAZQAAAAAAAAAQSW52YWxpZFRva2VuUGFpcgAAAMgAAAAAAAAADUludmFsaWRBbW91bnQAAAAAAADJAAAAAAAAAA9JbnZhbGlkU2xpcHBhZ2UAAAAAygAAAAAAAAAVSW5zdWZmaWNpZW50TGlxdWlkaXR5AAAAAAABLAAAAAAAAAAQU2xpcHBhZ2VFeGNlZWRlZAAAAS0AAAAAAAAAClN3YXBGYWlsZWQAAAAAAS4AAAAAAAAAD05vcm1hbERleEZhaWxlZAAAAAGQAAAAAAAAABJTb3Jvc3dhcFN3YXBGYWlsZWQAAAAAAZEAAAAAAAAAHVNvcm9zd2FwQWdncmVnYXRvclVuYXZhaWxhYmxlAAAAAAABkgAAAAAAAAAVSW52YWxpZFByb3ZpZGVyQ29uZmlnAAAAAAAB9AAAAAAAAAASVW5hdXRob3JpemVkQWNjZXNzAAAAAAH1AAAAAAAAABZDb250cmFjdE5vdEluaXRpYWxpemVkAAAAAAH2',
        'AAAAAQAAAAAAAAAAAAAAD0RleERpc3RyaWJ1dGlvbgAAAAADAAAAAAAAAAVwYXJ0cwAAAAAAAAQAAAAAAAAABHBhdGgAAAPqAAAAEwAAAAAAAAALcHJvdG9jb2xfaWQAAAAAEA==',
        'AAAAAgAAAAAAAAAAAAAAC0RleFByb3ZpZGVyAAAAAAIAAAAAAAAAAAAAAAZOb3JtYWwAAAAAAAAAAAAAAAAACFNvcm9zd2Fw',
        'AAAAAQAAAAAAAAAAAAAACUluZGV4SW5mbwAAAAAAAAsAAAAAAAAAB2FkZHJlc3MAAAAAEwAAAAAAAAAIYmFzZV9uYXYAAAAKAAAAAAAAAA1pbml0aWFsX3ByaWNlAAAAAAAACgAAAAAAAAAJaXNfcHVibGljAAAAAAAAAQAAAAAAAAARbGFzdF9yZWJhbGFuY2VfdHMAAAAAAAAGAAAAAAAAAA9sYXN0X3VwZGF0ZWRfdHMAAAAABgAAAAAAAAAPbWFuYWdlcl9hZGRyZXNzAAAAABMAAAAAAAAADXRva2VuX2FkZHJlc3MAAAAAAAATAAAAAAAAAAt0b3RhbF9taW50cwAAAAAKAAAAAAAAABF0b3RhbF9yZWRlbXB0aW9ucwAAAAAAAAoAAAAAAAAADHRvdGFsX3NoYXJlcwAAAAo=',
        'AAAAAQAAAAAAAAAAAAAADEluZGV4TWV0cmljcwAAAAUAAAAAAAAAC2N1cnJlbnRfbmF2AAAAAAoAAAAAAAAAC3NoYXJlX3ByaWNlAAAAAAoAAAAAAAAAC3RvdGFsX21pbnRzAAAAAAoAAAAAAAAAEXRvdGFsX3JlZGVtcHRpb25zAAAAAAAACgAAAAAAAAAMdG90YWxfc2hhcmVzAAAACg==',
        'AAAAAQAAAAAAAAAAAAAAC0luZGV4U3RhdHVzAAAAAAQAAAAAAAAADWNhbl9yZWJhbGFuY2UAAAAAAAABAAAAAAAAAAlpc19wdWJsaWMAAAAAAAABAAAAAAAAABFsYXN0X3JlYmFsYW5jZV90cwAAAAAAAAYAAAAAAAAAE3JlYmFsYW5jZV90aHJlc2hvbGQAAAAABg==',
        'AAAAAgAAAAAAAAAAAAAAD0NvbXBvbmVudEFjdGlvbgAAAAADAAAAAAAAAAAAAAADQWRkAAAAAAAAAAAAAAAABlJlbW92ZQAAAAAAAAAAAAAAAAAMVXBkYXRlV2VpZ2h0',
        'AAAAAQAAAAAAAAAAAAAAD0NvbXBvbmVudFVwZGF0ZQAAAAADAAAAAAAAAAZhY3Rpb24AAAAAB9AAAAAPQ29tcG9uZW50QWN0aW9uAAAAAAAAAAAKbmV3X3dlaWdodAAAAAAACgAAAAAAAAAFdG9rZW4AAAAAAAAT',
        'AAAAAQAAAAAAAAAAAAAADlJlZmFjdG9yUGFyYW1zAAAAAAABAAAAAAAAABFjb21wb25lbnRfdXBkYXRlcwAAAAAAA+oAAAfQAAAAD0NvbXBvbmVudFVwZGF0ZQA=',
        'AAAAAQAAAAAAAAAAAAAAD1JlYmFsYW5jZVBhcmFtcwAAAAABAAAAAAAAAAp0YXJnZXRfbmF2AAAAAAPoAAAACw==',
        'AAAAAQAAAAAAAAAAAAAAE0NvbXBvbmVudEFsbG9jYXRpb24AAAAABAAAAAAAAAAJY29tcG9uZW50AAAAAAAH0AAAAAlDb21wb25lbnQAAAAAAAAAAAAAD2N1cnJlbnRfYmFsYW5jZQAAAAAKAAAAAAAAABFwZXJjZW50YWdlX29mX25hdgAAAAAAAAoAAAAAAAAADnRhcmdldF9iYWxhbmNlAAAAAAAK',
        'AAAAAQAAAAAAAAAAAAAAD1JlYmFsYW5jZVN0YXR1cwAAAAAGAAAAAAAAABZhdXRob3JpemVkX3JlYmFsYW5jZXJzAAAAAAPqAAAAEwAAAAAAAAANY2FuX3JlYmFsYW5jZQAAAAAAAAEAAAAAAAAACWlzX3B1YmxpYwAAAAAAAAEAAAAAAAAAEWxhc3RfcmViYWxhbmNlX3RzAAAAAAAABgAAAAAAAAATcmViYWxhbmNlX3RocmVzaG9sZAAAAAAGAAAAAAAAABl0aW1lX3VudGlsX25leHRfcmViYWxhbmNlAAAAAAAABg==',
        'AAAAAQAAAAAAAAAAAAAACUNvbXBvbmVudAAAAAAAAAIAAAAAAAAABWFzc2V0AAAAAAAAEQAAAAAAAAAGd2VpZ2h0AAAAAAAK',
        'AAAABAAAAAAAAAAAAAAAEkFjY2Vzc0NvbnRyb2xFcnJvcgAAAAAABwAAABJBY2Nlc3NDb250cm9sRXJyb3IAAAAAAAxSb2xlTm90Rm91bmQAAABlAAAAAAAAAAxVbmF1dGhvcml6ZWQAAABmAAAAAAAAAA9BZG1pbkFscmVhZHlTZXQAAAAAZwAAAAAAAAAMQmFkUm9sZVVzYWdlAAAAaAAAAAAAAAATQW5vdGhlckFjdGlvbkFjdGl2ZQAAAAtaAAAAAAAAAA5Ob0FjdGlvbkFjdGl2ZQAAAAALWwAAAAAAAAARQWN0aW9uTm90UmVhZHlZZXQAAAAAAAtc',
        'AAAABAAAAAAAAAAAAAAADFVwZ3JhZGVFcnJvcgAAAAMAAAAMVXBncmFkZUVycm9yAAAAE0Fub3RoZXJBY3Rpb25BY3RpdmUAAAALWgAAAAAAAAAOTm9BY3Rpb25BY3RpdmUAAAAAC1sAAAAAAAAAEUFjdGlvbk5vdFJlYWR5WWV0AAAAAAALXA==',
        'AAAABAAAAAAAAAAAAAAACU1hdGhFcnJvcgAAAAAAAAIAAAAZTWF0aEVycm9yOiBOdW1iZXJPdmVyZmxvdwAAAAAAAA5OdW1iZXJPdmVyZmxvdwAAAAAB/gAAAAAAAAAJTWF0aEVycm9yAAAAAAAB/w==',
        'AAAABAAAAAAAAAAAAAAADFN0b3JhZ2VFcnJvcgAAAAIAAAAMU3RvcmFnZUVycm9yAAAAE1ZhbHVlTm90SW5pdGlhbGl6ZWQAAAAB9QAAAAAAAAAMVmFsdWVNaXNzaW5nAAAB9g==',
        'AAAABAAAAAAAAAAAAAAAD1ZhbGlkYXRpb25FcnJvcgAAAAABAAAAD1ZhbGlkYXRpb25FcnJvcgAAAAAMSW52YWxpZFRva2VuAAADIQ==',
        'AAAAAQAAAAAAAAAAAAAAE1ByaXZpbGVnZWRBZGRyZXNzZXMAAAAABQAAAAAAAAAPZW1lcmdlbmN5X2FkbWluAAAAABMAAAAAAAAAFmVtZXJnZW5jeV9wYXVzZV9hZG1pbnMAAAAAA+oAAAATAAAAAAAAABBvcGVyYXRpb25zX2FkbWluAAAAEwAAAAAAAAALcGF1c2VfYWRtaW4AAAAAEwAAAAAAAAANcmV3YXJkc19hZG1pbgAAAAAAABM=',
        'AAAAAQAAAAAAAAAAAAAAC0luZGV4UGFyYW1zAAAAAA0AAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAIYmFzZV9uYXYAAAAKAAAAAAAAABJibGFja2xpc3RfYWNjb3VudHMAAAAAA+oAAAATAAAAAAAAAApjb21wb25lbnRzAAAAAAPqAAAAEwAAAAAAAAALZGVzY3JpcHRpb24AAAAAEAAAAAAAAAAPaW5pdGlhbF9kZXBvc2l0AAAAAAoAAAAAAAAADWluaXRpYWxfcHJpY2UAAAAAAAAKAAAAAAAAAAlpc19wdWJsaWMAAAAAAAABAAAAAAAAABJtYW5hZ2VyX2ZlZV9hbW91bnQAAAAAAAoAAAAAAAAABG5hbWUAAAAQAAAAAAAAABVyZWJhbGFuY2VfYXV0aG9yaXRpZXMAAAAAAAPqAAAAEwAAAAAAAAAMdG9rZW5fc3ltYm9sAAAAEAAAAAAAAAASd2hpdGVsaXN0X2FjY291bnRzAAAAAAPqAAAAEw==',
      ]),
      options,
    )
  }
  public readonly fromJSON = {
    mint: this.txFromJSON<null>,
    redeem: this.txFromJSON<null>,
    get_token: this.txFromJSON<string>,
    get_factory: this.txFromJSON<string>,
    get_base_nav: this.txFromJSON<u128>,
    get_initial_price: this.txFromJSON<u128>,
    get_nav: this.txFromJSON<i128>,
    get_price: this.txFromJSON<i128>,
    get_total_shares: this.txFromJSON<u128>,
    get_public_status: this.txFromJSON<boolean>,
    get_whitelist_status: this.txFromJSON<boolean>,
    get_blacklist_status: this.txFromJSON<boolean>,
    get_rebalance_threshold: this.txFromJSON<u64>,
    get_last_rebalance_timestamp: this.txFromJSON<u64>,
    get_last_updated_timestamp: this.txFromJSON<u64>,
    get_total_mints: this.txFromJSON<u128>,
    get_total_redemptions: this.txFromJSON<u128>,
    get_component: this.txFromJSON<Component>,
    get_component_balance: this.txFromJSON<u128>,
    transfer_shares: this.txFromJSON<null>,
    transfer_shares_from: this.txFromJSON<null>,
    version: this.txFromJSON<u32>,
    commit_upgrade: this.txFromJSON<null>,
    apply_upgrade: this.txFromJSON<Buffer>,
    revert_upgrade: this.txFromJSON<null>,
    set_emergency_mode: this.txFromJSON<null>,
    get_emergency_mode: this.txFromJSON<boolean>,
    initialize: this.txFromJSON<null>,
    refactor: this.txFromJSON<null>,
    rebalance: this.txFromJSON<null>,
    set_rebalance_authority: this.txFromJSON<null>,
    set_manager_address: this.txFromJSON<null>,
    set_factory: this.txFromJSON<null>,
    set_base_nav: this.txFromJSON<null>,
    set_initial_price: this.txFromJSON<null>,
    set_public_status: this.txFromJSON<null>,
    set_whitelist_status: this.txFromJSON<null>,
    set_blacklist_status: this.txFromJSON<null>,
    set_rebalance_threshold: this.txFromJSON<null>,
    commit_transfer_ownership: this.txFromJSON<null>,
    apply_transfer_ownership: this.txFromJSON<null>,
    revert_transfer_ownership: this.txFromJSON<null>,
    get_future_address: this.txFromJSON<string>,
    get_index_info: this.txFromJSON<IndexInfo>,
    get_all_components: this.txFromJSON<Map<string, Component>>,
    get_component_info: this.txFromJSON<Component>,
    get_all_component_balances: this.txFromJSON<Map<string, u128>>,
    get_total_index_value: this.txFromJSON<u128>,
    get_index_metrics: this.txFromJSON<IndexMetrics>,
    get_share_price: this.txFromJSON<u128>,
    get_current_nav: this.txFromJSON<u128>,
    get_index_status: this.txFromJSON<IndexStatus>,
    can_rebalance: this.txFromJSON<boolean>,
    get_rebalance_status: this.txFromJSON<RebalanceStatus>,
    can_address_rebalance: this.txFromJSON<boolean>,
    get_component_allocation: this.txFromJSON<Map<string, ComponentAllocation>>,
    get_rebalance_authorities: this.txFromJSON<Array<string>>,
  }
}

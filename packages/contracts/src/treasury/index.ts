import type { u128, u32, u64 } from '@stellar/stellar-sdk/contract'
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

export const TreasuryError = {
  201: { message: 'AlreadyInitialized' },
  202: { message: 'WrongInputVecSize' },
  203: { message: 'InvalidOracle' },
  204: { message: 'InvalidInput' },
  207: { message: 'FailedToGetCalculatorPercent' },
  209: { message: 'FailedToGetOraclePrice' },
  212: { message: 'InvalidCalculatorValue' },
  213: { message: 'ActionPaused' },
  214: { message: 'ZeroTvl' },
  215: { message: 'InsufficientInventory' },
  216: { message: 'Slippage' },
  217: { message: 'InsufficientShares' },
}

export interface TreasuryPairDetails {
  pair: string
  token_long: string
  token_quote: string
  token_short: string
}

export interface TreasuryPairBalances {
  token_long: u128
  token_quote: u128
  token_short: u128
}

export interface TreasuryPairSummary {
  balances: TreasuryPairBalances
  details: TreasuryPairDetails
  fee: u128
  prices: readonly [u128, u128]
  total_shares: u128
  tvl: u128
}

export interface TreasuryUserPairSummary {
  pair_summary: TreasuryPairSummary
  user_shares: u128
}

export type DataKey =
  | { tag: 'PairDetails'; values: readonly [string] }
  | { tag: 'PairBalances'; values: readonly [string] }
  | { tag: 'TotalShares'; values: readonly [string] }
  | { tag: 'UserShares'; values: readonly [string, string] }
  | { tag: 'PairFee'; values: readonly [string] }
  | { tag: 'ProtocolFees'; values: readonly [string] }
  | { tag: 'IsKilledDeposit'; values: void }
  | { tag: 'IsKilledWithdraw'; values: void }
  | { tag: 'IsKilledTrade'; values: void }

export const AccessControlError = {
  101: { message: 'RoleNotFound' },
  102: { message: 'Unauthorized' },
  103: { message: 'AdminAlreadySet' },
  104: { message: 'BadRoleUsage' },
  2906: { message: 'AnotherActionActive' },
  2907: { message: 'NoActionActive' },
  2908: { message: 'ActionNotReadyYet' },
}

export interface OraclePriceData {
  delay: Delay
  price: u128
}

export type OracleSource = { tag: 'Reflector'; values: void }

export interface PairParams {
  admin: string
  asset: string
  collateral_per_pair: u128
  collateral_token: string
  long_token: string
  lower_bound: u128
  oracle: string
  pair_calculator: string
  short_token: string
  upper_bound: u128
}

export type Direction = { tag: 'Long'; values: void } | { tag: 'Short'; values: void }

export interface LinearLongShortPairParameters {
  lower_bound: u128
  upper_bound: u128
}

export type PairStatus =
  | { tag: 'Active'; values: void }
  | { tag: 'Settlement'; values: void }
  | { tag: 'Inactive'; values: void }

export interface CollateralInfo {
  collateral_per_pair: u128
  collateral_percent_long: u128
}

export interface PairSummary {
  calculator: string
  collateral: CollateralInfo
  collateral_token: string
  long_token: string
  oracle: string
  price_bounds: readonly [u128, u128]
  status: PairStatus
}

export interface PoolParams {
  admin: string
  assets_config: readonly [string, string]
  direction: Direction
  fees_config: readonly [u32, u32]
  long_short_pair: string
  lp_token_wasm_hash: Buffer
  privileged_addrs: readonly [string, string, string, string, Array<string>, string]
  router: string
  tokens: Array<string>
}

export interface RateTableEntry {
  deviation: u128
  rate: u32
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

export type Delay = readonly [u64]

export interface Client {
  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize: (
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
   * Construct and simulate a deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  deposit: (
    {
      user,
      pair,
      amt_long,
      amt_short,
      amt_usdc,
    }: { user: string; pair: string; amt_long: u128; amt_short: u128; amt_usdc: u128 },
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
      pair,
      shares,
      min_usdc,
      min_long,
      min_short,
    }: { user: string; pair: string; shares: u128; min_usdc: u128; min_long: u128; min_short: u128 },
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
  ) => Promise<AssembledTransaction<readonly [u128, u128, u128]>>

  /**
   * Construct and simulate a buy_long transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * * Trading
   */
  buy_long: (
    { user, pair, usdc_in, min_long_out }: { user: string; pair: string; usdc_in: u128; min_long_out: u128 },
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
   * Construct and simulate a sell_long transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  sell_long: (
    { user, pair, long_in, min_usdc_out }: { user: string; pair: string; long_in: u128; min_usdc_out: u128 },
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
   * Construct and simulate a buy_short transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  buy_short: (
    { user, pair, usdc_in, min_short_out }: { user: string; pair: string; usdc_in: u128; min_short_out: u128 },
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
   * Construct and simulate a sell_short transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  sell_short: (
    { user, pair, short_in, min_usdc_out }: { user: string; pair: string; short_in: u128; min_usdc_out: u128 },
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
   * Construct and simulate a get_pair_details transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_pair_details: (
    { pair }: { pair: string },
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
  ) => Promise<AssembledTransaction<TreasuryPairDetails>>

  /**
   * Construct and simulate a get_tvl transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_tvl: (
    { pair }: { pair: string },
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
   * Construct and simulate a get_prices transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_prices: (
    { pair }: { pair: string },
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
  ) => Promise<AssembledTransaction<readonly [u128, u128]>>

  /**
   * Construct and simulate a get_balances transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_balances: (
    { pair }: { pair: string },
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
  ) => Promise<AssembledTransaction<TreasuryPairBalances>>

  /**
   * Construct and simulate a get_total_shares transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_shares: (
    { pair }: { pair: string },
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
   * Construct and simulate a get_user_shares transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_user_shares: (
    { pair, user }: { pair: string; user: string },
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
   * Construct and simulate a get_pair_fee transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_pair_fee: (
    { pair }: { pair: string },
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
   * Construct and simulate a get_pair_summary transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_pair_summary: (
    { pair }: { pair: string },
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
  ) => Promise<AssembledTransaction<TreasuryPairSummary>>

  /**
   * Construct and simulate a get_user_with_pair_summary transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_user_with_pair_summary: (
    { pair, user }: { pair: string; user: string },
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
  ) => Promise<AssembledTransaction<TreasuryUserPairSummary>>

  /**
   * Construct and simulate a add_pair transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  add_pair: (
    {
      admin,
      pair,
      quote_token,
      long_token,
      short_token,
    }: { admin: string; pair: string; quote_token: string; long_token: string; short_token: string },
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
   * Construct and simulate a set_pair_fee transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_pair_fee: (
    { admin, pair, fee }: { admin: string; pair: string; fee: u128 },
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
  get_protocol_fees: (
    { pair }: { pair: string },
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
   * Construct and simulate a claim_protocol_fees transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  claim_protocol_fees: (
    { admin, pair, destination }: { admin: string; pair: string; destination: string },
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
   * Construct and simulate a kill_trade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  kill_trade: (
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
   * Construct and simulate a unkill_trade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  unkill_trade: (
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
   * Construct and simulate a get_is_killed_trade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_is_killed_trade: (options?: {
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
        'AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAAHZGVwb3NpdAAAAAAFAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAEcGFpcgAAABMAAAAAAAAACGFtdF9sb25nAAAACgAAAAAAAAAJYW10X3Nob3J0AAAAAAAACgAAAAAAAAAIYW10X3VzZGMAAAAKAAAAAQAAAAo=',
        'AAAAAAAAAAAAAAAId2l0aGRyYXcAAAAGAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAEcGFpcgAAABMAAAAAAAAABnNoYXJlcwAAAAAACgAAAAAAAAAIbWluX3VzZGMAAAAKAAAAAAAAAAhtaW5fbG9uZwAAAAoAAAAAAAAACW1pbl9zaG9ydAAAAAAAAAoAAAABAAAD7QAAAAMAAAAKAAAACgAAAAo=',
        'AAAAAAAAAAkqIFRyYWRpbmcAAAAAAAAIYnV5X2xvbmcAAAAEAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAEcGFpcgAAABMAAAAAAAAAB3VzZGNfaW4AAAAACgAAAAAAAAAMbWluX2xvbmdfb3V0AAAACgAAAAEAAAAK',
        'AAAAAAAAAAAAAAAJc2VsbF9sb25nAAAAAAAABAAAAAAAAAAEdXNlcgAAABMAAAAAAAAABHBhaXIAAAATAAAAAAAAAAdsb25nX2luAAAAAAoAAAAAAAAADG1pbl91c2RjX291dAAAAAoAAAABAAAACg==',
        'AAAAAAAAAAAAAAAJYnV5X3Nob3J0AAAAAAAABAAAAAAAAAAEdXNlcgAAABMAAAAAAAAABHBhaXIAAAATAAAAAAAAAAd1c2RjX2luAAAAAAoAAAAAAAAADW1pbl9zaG9ydF9vdXQAAAAAAAAKAAAAAQAAAAo=',
        'AAAAAAAAAAAAAAAKc2VsbF9zaG9ydAAAAAAABAAAAAAAAAAEdXNlcgAAABMAAAAAAAAABHBhaXIAAAATAAAAAAAAAAhzaG9ydF9pbgAAAAoAAAAAAAAADG1pbl91c2RjX291dAAAAAoAAAABAAAACg==',
        'AAAAAAAAAAAAAAAQZ2V0X3BhaXJfZGV0YWlscwAAAAEAAAAAAAAABHBhaXIAAAATAAAAAQAAB9AAAAATVHJlYXN1cnlQYWlyRGV0YWlscwA=',
        'AAAAAAAAAAAAAAAHZ2V0X3R2bAAAAAABAAAAAAAAAARwYWlyAAAAEwAAAAEAAAAK',
        'AAAAAAAAAAAAAAAKZ2V0X3ByaWNlcwAAAAAAAQAAAAAAAAAEcGFpcgAAABMAAAABAAAD7QAAAAIAAAAKAAAACg==',
        'AAAAAAAAAAAAAAAMZ2V0X2JhbGFuY2VzAAAAAQAAAAAAAAAEcGFpcgAAABMAAAABAAAH0AAAABRUcmVhc3VyeVBhaXJCYWxhbmNlcw==',
        'AAAAAAAAAAAAAAAQZ2V0X3RvdGFsX3NoYXJlcwAAAAEAAAAAAAAABHBhaXIAAAATAAAAAQAAAAo=',
        'AAAAAAAAAAAAAAAPZ2V0X3VzZXJfc2hhcmVzAAAAAAIAAAAAAAAABHBhaXIAAAATAAAAAAAAAAR1c2VyAAAAEwAAAAEAAAAK',
        'AAAAAAAAAAAAAAAMZ2V0X3BhaXJfZmVlAAAAAQAAAAAAAAAEcGFpcgAAABMAAAABAAAACg==',
        'AAAAAAAAAAAAAAAQZ2V0X3BhaXJfc3VtbWFyeQAAAAEAAAAAAAAABHBhaXIAAAATAAAAAQAAB9AAAAATVHJlYXN1cnlQYWlyU3VtbWFyeQA=',
        'AAAAAAAAAAAAAAAaZ2V0X3VzZXJfd2l0aF9wYWlyX3N1bW1hcnkAAAAAAAIAAAAAAAAABHBhaXIAAAATAAAAAAAAAAR1c2VyAAAAEwAAAAEAAAfQAAAAF1RyZWFzdXJ5VXNlclBhaXJTdW1tYXJ5AA==',
        'AAAAAAAAAAAAAAAIYWRkX3BhaXIAAAAFAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABHBhaXIAAAATAAAAAAAAAAtxdW90ZV90b2tlbgAAAAATAAAAAAAAAApsb25nX3Rva2VuAAAAAAATAAAAAAAAAAtzaG9ydF90b2tlbgAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAAMc2V0X3BhaXJfZmVlAAAAAwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAARwYWlyAAAAEwAAAAAAAAADZmVlAAAAAAoAAAAA',
        'AAAAAAAAAAAAAAARZ2V0X3Byb3RvY29sX2ZlZXMAAAAAAAABAAAAAAAAAARwYWlyAAAAEwAAAAEAAAAK',
        'AAAAAAAAAAAAAAATY2xhaW1fcHJvdG9jb2xfZmVlcwAAAAADAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABHBhaXIAAAATAAAAAAAAAAtkZXN0aW5hdGlvbgAAAAATAAAAAQAAAAo=',
        'AAAAAAAAAAAAAAAMa2lsbF9kZXBvc2l0AAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAANa2lsbF93aXRoZHJhdwAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAAKa2lsbF90cmFkZQAAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAAOdW5raWxsX2RlcG9zaXQAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAAPdW5raWxsX3dpdGhkcmF3AAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAAMdW5raWxsX3RyYWRlAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAAVZ2V0X2lzX2tpbGxlZF9kZXBvc2l0AAAAAAAAAAAAAAEAAAAB',
        'AAAAAAAAAAAAAAAWZ2V0X2lzX2tpbGxlZF93aXRoZHJhdwAAAAAAAAAAAAEAAAAB',
        'AAAAAAAAAAAAAAATZ2V0X2lzX2tpbGxlZF90cmFkZQAAAAAAAAAAAQAAAAE=',
        'AAAABAAAAAAAAAAAAAAADVRyZWFzdXJ5RXJyb3IAAAAAAAAMAAAAAAAAABJBbHJlYWR5SW5pdGlhbGl6ZWQAAAAAAMkAAAAAAAAAEVdyb25nSW5wdXRWZWNTaXplAAAAAAAAygAAAAAAAAANSW52YWxpZE9yYWNsZQAAAAAAAMsAAAAAAAAADEludmFsaWRJbnB1dAAAAMwAAAAAAAAAHEZhaWxlZFRvR2V0Q2FsY3VsYXRvclBlcmNlbnQAAADPAAAAAAAAABZGYWlsZWRUb0dldE9yYWNsZVByaWNlAAAAAADRAAAAAAAAABZJbnZhbGlkQ2FsY3VsYXRvclZhbHVlAAAAAADUAAAAAAAAAAxBY3Rpb25QYXVzZWQAAADVAAAAAAAAAAdaZXJvVHZsAAAAANYAAAAAAAAAFUluc3VmZmljaWVudEludmVudG9yeQAAAAAAANcAAAAAAAAACFNsaXBwYWdlAAAA2AAAAAAAAAASSW5zdWZmaWNpZW50U2hhcmVzAAAAAADZ',
        'AAAAAQAAAAAAAAAAAAAAE1RyZWFzdXJ5UGFpckRldGFpbHMAAAAABAAAAAAAAAAEcGFpcgAAABMAAAAAAAAACnRva2VuX2xvbmcAAAAAABMAAAAAAAAAC3Rva2VuX3F1b3RlAAAAABMAAAAAAAAAC3Rva2VuX3Nob3J0AAAAABM=',
        'AAAAAQAAAAAAAAAAAAAAFFRyZWFzdXJ5UGFpckJhbGFuY2VzAAAAAwAAAAAAAAAKdG9rZW5fbG9uZwAAAAAACgAAAAAAAAALdG9rZW5fcXVvdGUAAAAACgAAAAAAAAALdG9rZW5fc2hvcnQAAAAACg==',
        'AAAAAQAAAAAAAAAAAAAAE1RyZWFzdXJ5UGFpclN1bW1hcnkAAAAABgAAAAAAAAAIYmFsYW5jZXMAAAfQAAAAFFRyZWFzdXJ5UGFpckJhbGFuY2VzAAAAAAAAAAdkZXRhaWxzAAAAB9AAAAATVHJlYXN1cnlQYWlyRGV0YWlscwAAAAAAAAAAA2ZlZQAAAAAKAAAAAAAAAAZwcmljZXMAAAAAA+0AAAACAAAACgAAAAoAAAAAAAAADHRvdGFsX3NoYXJlcwAAAAoAAAAAAAAAA3R2bAAAAAAK',
        'AAAAAQAAAAAAAAAAAAAAF1RyZWFzdXJ5VXNlclBhaXJTdW1tYXJ5AAAAAAIAAAAAAAAADHBhaXJfc3VtbWFyeQAAB9AAAAATVHJlYXN1cnlQYWlyU3VtbWFyeQAAAAAAAAAAC3VzZXJfc2hhcmVzAAAAAAo=',
        'AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAACQAAAAEAAAAAAAAAC1BhaXJEZXRhaWxzAAAAAAEAAAATAAAAAQAAAAAAAAAMUGFpckJhbGFuY2VzAAAAAQAAABMAAAABAAAAAAAAAAtUb3RhbFNoYXJlcwAAAAABAAAAEwAAAAEAAAAAAAAAClVzZXJTaGFyZXMAAAAAAAIAAAATAAAAEwAAAAEAAAAAAAAAB1BhaXJGZWUAAAAAAQAAABMAAAABAAAAAAAAAAxQcm90b2NvbEZlZXMAAAABAAAAEwAAAAAAAAAAAAAAD0lzS2lsbGVkRGVwb3NpdAAAAAAAAAAAAAAAABBJc0tpbGxlZFdpdGhkcmF3AAAAAAAAAAAAAAANSXNLaWxsZWRUcmFkZQAAAA==',
        'AAAABAAAAAAAAAAAAAAAEkFjY2Vzc0NvbnRyb2xFcnJvcgAAAAAABwAAAAAAAAAMUm9sZU5vdEZvdW5kAAAAZQAAAAAAAAAMVW5hdXRob3JpemVkAAAAZgAAAAAAAAAPQWRtaW5BbHJlYWR5U2V0AAAAAGcAAAAAAAAADEJhZFJvbGVVc2FnZQAAAGgAAAAAAAAAE0Fub3RoZXJBY3Rpb25BY3RpdmUAAAALWgAAAAAAAAAOTm9BY3Rpb25BY3RpdmUAAAAAC1sAAAAAAAAAEUFjdGlvbk5vdFJlYWR5WWV0AAAAAAALXA==',
        'AAAAAQAAAAAAAAAAAAAAD09yYWNsZVByaWNlRGF0YQAAAAACAAAAAAAAAAVkZWxheQAAAAAAB9AAAAAFRGVsYXkAAAAAAAAAAAAABXByaWNlAAAAAAAACg==',
        'AAAAAgAAAAAAAAAAAAAADE9yYWNsZVNvdXJjZQAAAAEAAAAAAAAAAAAAAAlSZWZsZWN0b3IAAAA=',
        'AAAAAQAAAAAAAAAAAAAAClBhaXJQYXJhbXMAAAAAAAoAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAFYXNzZXQAAAAAAAARAAAAAAAAABNjb2xsYXRlcmFsX3Blcl9wYWlyAAAAAAoAAAAAAAAAEGNvbGxhdGVyYWxfdG9rZW4AAAATAAAAAAAAAApsb25nX3Rva2VuAAAAAAATAAAAAAAAAAtsb3dlcl9ib3VuZAAAAAAKAAAAAAAAAAZvcmFjbGUAAAAAABMAAAAAAAAAD3BhaXJfY2FsY3VsYXRvcgAAAAATAAAAAAAAAAtzaG9ydF90b2tlbgAAAAATAAAAAAAAAAt1cHBlcl9ib3VuZAAAAAAK',
        'AAAAAgAAAAAAAAAAAAAACURpcmVjdGlvbgAAAAAAAAIAAAAAAAAAAAAAAARMb25nAAAAAAAAAAAAAAAFU2hvcnQAAAA=',
        'AAAAAQAAAAAAAAAAAAAAHUxpbmVhckxvbmdTaG9ydFBhaXJQYXJhbWV0ZXJzAAAAAAAAAgAAAAAAAAALbG93ZXJfYm91bmQAAAAACgAAAAAAAAALdXBwZXJfYm91bmQAAAAACg==',
        'AAAAAgAAAAAAAAAAAAAAClBhaXJTdGF0dXMAAAAAAAMAAAAAAAAAAAAAAAZBY3RpdmUAAAAAAAAAAAAAAAAAClNldHRsZW1lbnQAAAAAAAAAAAAAAAAACEluYWN0aXZl',
        'AAAAAQAAAAAAAAAAAAAADkNvbGxhdGVyYWxJbmZvAAAAAAACAAAAAAAAABNjb2xsYXRlcmFsX3Blcl9wYWlyAAAAAAoAAAAAAAAAF2NvbGxhdGVyYWxfcGVyY2VudF9sb25nAAAAAAo=',
        'AAAAAQAAAAAAAAAAAAAAC1BhaXJTdW1tYXJ5AAAAAAcAAAAAAAAACmNhbGN1bGF0b3IAAAAAABMAAAAAAAAACmNvbGxhdGVyYWwAAAAAB9AAAAAOQ29sbGF0ZXJhbEluZm8AAAAAAAAAAAAQY29sbGF0ZXJhbF90b2tlbgAAABMAAAAAAAAACmxvbmdfdG9rZW4AAAAAABMAAAAAAAAABm9yYWNsZQAAAAAAEwAAAAAAAAAMcHJpY2VfYm91bmRzAAAD7QAAAAIAAAAKAAAACgAAAAAAAAAGc3RhdHVzAAAAAAfQAAAAClBhaXJTdGF0dXMAAA==',
        'AAAAAQAAAAAAAAAAAAAAClBvb2xQYXJhbXMAAAAAAAkAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAANYXNzZXRzX2NvbmZpZwAAAAAAA+0AAAACAAAAEQAAABEAAAAAAAAACWRpcmVjdGlvbgAAAAAAB9AAAAAJRGlyZWN0aW9uAAAAAAAAAAAAAAtmZWVzX2NvbmZpZwAAAAPtAAAAAgAAAAQAAAAEAAAAAAAAAA9sb25nX3Nob3J0X3BhaXIAAAAAEwAAAAAAAAASbHBfdG9rZW5fd2FzbV9oYXNoAAAAAAPuAAAAIAAAAAAAAAAQcHJpdmlsZWdlZF9hZGRycwAAA+0AAAAGAAAAEwAAABMAAAATAAAAEwAAA+oAAAATAAAAEwAAAAAAAAAGcm91dGVyAAAAAAATAAAAAAAAAAZ0b2tlbnMAAAAAA+oAAAAT',
        'AAAAAQAAAAAAAAAAAAAADlJhdGVUYWJsZUVudHJ5AAAAAAACAAAAAAAAAAlkZXZpYXRpb24AAAAAAAAKAAAAAAAAAARyYXRlAAAABA==',
        'AAAABAAAAAAAAAAAAAAACU1hdGhFcnJvcgAAAAAAAAkAAAAZTWF0aEVycm9yOiBOdW1iZXJPdmVyZmxvdwAAAAAAAA5OdW1iZXJPdmVyZmxvdwAAAAAB/gAAAB1NYXRoRXJyb3I6IEdlbmVyaWMgbWF0aCBlcnJvcgAAAAAAAAlNYXRoRXJyb3IAAAAAAAH/AAAALU1hdGhFcnJvcjogQWRkaXRpb24gb3BlcmF0aW9uIGNhdXNlZCBvdmVyZmxvdwAAAAAAABBBZGRpdGlvbk92ZXJmbG93AAACAAAAADFNYXRoRXJyb3I6IFN1YnRyYWN0aW9uIG9wZXJhdGlvbiBjYXVzZWQgdW5kZXJmbG93AAAAAAAAFFN1YnRyYWN0aW9uVW5kZXJmbG93AAACAQAAADNNYXRoRXJyb3I6IE11bHRpcGxpY2F0aW9uIG9wZXJhdGlvbiBjYXVzZWQgb3ZlcmZsb3cAAAAAFk11bHRpcGxpY2F0aW9uT3ZlcmZsb3cAAAAAAgIAAAAbTWF0aEVycm9yOiBEaXZpc2lvbiBieSB6ZXJvAAAAAA5EaXZpc2lvbkJ5WmVybwAAAAACAwAAACNNYXRoRXJyb3I6IFR5cGUgY29udmVyc2lvbiBvdmVyZmxvdwAAAAASQ29udmVyc2lvbk92ZXJmbG93AAAAAAIEAAAAP01hdGhFcnJvcjogQXR0ZW1wdGVkIHRvIGNvbnZlcnQgbmVnYXRpdmUgdmFsdWUgdG8gdW5zaWduZWQgdHlwZQAAAAASTmVnYXRpdmVUb1Vuc2lnbmVkAAAAAAIFAAAAKk1hdGhFcnJvcjogRml4ZWQtcG9pbnQgYXJpdGhtZXRpYyBvdmVyZmxvdwAAAAAAEkZpeGVkUG9pbnRPdmVyZmxvdwAAAAACBg==',
        'AAAABAAAAAAAAAAAAAAADFN0b3JhZ2VFcnJvcgAAAAQAAAAMU3RvcmFnZUVycm9yAAAAEkFscmVhZHlJbml0aWFsaXplZAAAAAAAyQAAAAAAAAATVmFsdWVOb3RJbml0aWFsaXplZAAAAAH1AAAAAAAAAAxWYWx1ZU1pc3NpbmcAAAH2AAAAAAAAABRWYWx1ZUNvbnZlcnNpb25FcnJvcgAAAfc=',
        'AAAABAAAAAAAAAAAAAAAD1ZhbGlkYXRpb25FcnJvcgAAAAADAAAAD1ZhbGlkYXRpb25FcnJvcgAAAAAMSW52YWxpZFRva2VuAAADIQAAAAAAAAARSW52YWxpZFBlcmNlbnRhZ2UAAAAAAAMiAAAAAAAAAApaZXJvQW1vdW50AAAAAAMk',
        'AAAAAQAAAAAAAAAAAAAABURlbGF5AAAAAAAAAQAAAAAAAAABMAAAAAAAAAY=',
      ]),
      options,
    )
  }
  public readonly fromJSON = {
    initialize: this.txFromJSON<null>,
    deposit: this.txFromJSON<u128>,
    withdraw: this.txFromJSON<readonly [u128, u128, u128]>,
    buy_long: this.txFromJSON<u128>,
    sell_long: this.txFromJSON<u128>,
    buy_short: this.txFromJSON<u128>,
    sell_short: this.txFromJSON<u128>,
    get_pair_details: this.txFromJSON<TreasuryPairDetails>,
    get_tvl: this.txFromJSON<u128>,
    get_prices: this.txFromJSON<readonly [u128, u128]>,
    get_balances: this.txFromJSON<TreasuryPairBalances>,
    get_total_shares: this.txFromJSON<u128>,
    get_user_shares: this.txFromJSON<u128>,
    get_pair_fee: this.txFromJSON<u128>,
    get_pair_summary: this.txFromJSON<TreasuryPairSummary>,
    get_user_with_pair_summary: this.txFromJSON<TreasuryUserPairSummary>,
    add_pair: this.txFromJSON<null>,
    set_pair_fee: this.txFromJSON<null>,
    get_protocol_fees: this.txFromJSON<u128>,
    claim_protocol_fees: this.txFromJSON<u128>,
    kill_deposit: this.txFromJSON<null>,
    kill_withdraw: this.txFromJSON<null>,
    kill_trade: this.txFromJSON<null>,
    unkill_deposit: this.txFromJSON<null>,
    unkill_withdraw: this.txFromJSON<null>,
    unkill_trade: this.txFromJSON<null>,
    get_is_killed_deposit: this.txFromJSON<boolean>,
    get_is_killed_withdraw: this.txFromJSON<boolean>,
    get_is_killed_trade: this.txFromJSON<boolean>,
  }
}

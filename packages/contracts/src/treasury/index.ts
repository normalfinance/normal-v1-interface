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
  204: { message: 'InvalidInput' },
  205: { message: 'InvalidPair' },
  209: { message: 'FailedToCallPairContract' },
  213: { message: 'ActionPaused' },
  215: { message: 'InsufficientInventory' },
  216: { message: 'Slippage' },
  217: { message: 'InsufficientShares' },
  218: { message: 'DepositTooSmall' },
  219: { message: 'WithdrawTooSmall' },
  220: { message: 'InvalidBalance' },
  221: { message: 'CannotPassFloor' },
  222: { message: 'ToxicSideNotAccepted' },
  223: { message: 'FailedToGetOraclePrice' },
  224: { message: 'InvalidFee' },
}

/**
 * Static configuration for a supported LongShortPair.
 *
 * Stored per-pair and used to find the token contracts the Treasury should interact with.
 */
export interface PairConfig {
  /**
   * LONG token contract address.
   */
  long: string
  /**
   * The LongShortPair contract address.
   */
  pair: string
  /**
   * SHORT token contract address.
   */
  short: string
  /**
   * Collateral token contract address (USDC).
   */
  usdc: string
}

/**
 * Convenient aggregation used by frontend/indexers.
 *
 * Note: this is not stored directly; it is assembled from other stored keys.
 */
export interface TreasurySummary {
  /**
   * Treasury inventory (what the Treasury actually holds / accounts for).
   */
  balances: PairAmountsWithUSDC
  config: PairConfig
  fee_config: TreasuryFeeConfig
  /**
   * Quoting inputs (LONG/SHORT settlement fractions + USDC oracle TWAP).
   */
  prices: PairAmountsWithUSDC
  /**
   * Total LP share supply for this pair.
   */
  total_shares: u128
}

/**
 * A per-user view that combines [`TreasurySummary`] plus the user's LP share balance.
 */
export interface TreasuryUserSummary {
  summary: TreasurySummary
  user_shares: u128
}

/**
 * Fee model parameters for a pair.
 *
 * `base_fee` are expressed in `PRICE_PRECISION` units.
 * The remaining parameters are model-specific knobs used by `calculate_fee(...)`.
 */
export interface TreasuryFeeConfig {
  base_fee: u128
}

/**
 * Risk parameters enforced by the Treasury when executing trades.
 *
 * Values are interpreted by `crate::risk::*` checks.
 */
export interface TreasuryRiskParameters {
  /**
   * Maximum fee adjustment (additive or subtractive) driven by whether a trade
   * increases or decreases `abs(net_imbalance)`; expressed in `PRICE_PRECISION`.
   *
   * Example: `50_000` = 0.50% max surcharge/rebate.
   */
  imbalance_fee_max: u128
  /**
   * Hard cap on absolute net inventory imbalance in **token units**:
   * `abs(long_balance - short_balance) <= max_net_imbalance_tokens`.
   *
   * Set to 0 to disable the guard (not recommended).
   */
  max_net_imbalance_tokens: u128
  /**
   * Threshold in `PRICE_PRECISION` units used by toxic-trade logic.
   */
  toxic_threshold: u128
}

/**
 * Composite key for `(pair, user)` LP share balances.
 *
 * Stored under [`TreasuryDataKey::UserShares`].
 */
export interface UserSharesKey {
  pair: string
  user: string
}

/**
 * Persistent storage keys for all per-pair state.
 *
 * Everything here is stored in **persistent** storage and must be TTL-bumped
 * (`bump_persistent`) on read/write to avoid expiry.
 */
export type TreasuryDataKey =
  | { tag: 'Config'; values: readonly [string] }
  | { tag: 'Balances'; values: readonly [string] }
  | { tag: 'RiskParameters'; values: readonly [string] }
  | { tag: 'TotalShares'; values: readonly [string] }
  | { tag: 'UserShares'; values: readonly [UserSharesKey] }
  | { tag: 'FeeConfig'; values: readonly [string] }
  | { tag: 'ProtocolFees'; values: readonly [string] }

export const AccessControlError = {
  101: { message: 'RoleNotFound' },
  102: { message: 'Unauthorized' },
  103: { message: 'AdminAlreadySet' },
  104: { message: 'BadRoleUsage' },
  2906: { message: 'AnotherActionActive' },
  2907: { message: 'NoActionActive' },
  2908: { message: 'ActionNotReadyYet' },
}

export const OracleError = {
  /**
   * OracleError: OracleNonPositive
   */
  601: { message: 'OracleNonPositive' },
  602: { message: 'OracleTooVolatile' },
  603: { message: 'OracleStaleForPair' },
  604: { message: 'OracleInvalid' },
  605: { message: 'FailedToGetOraclePrice' },
  606: { message: 'InvalidInput' },
}

export type OracleValidity =
  | { tag: 'NonPositive'; values: void }
  | { tag: 'TooVolatile'; values: void }
  | { tag: 'StaleForPair'; values: void }
  | { tag: 'Frozen'; values: void }
  | { tag: 'Valid'; values: void }

export interface HistoricalOracleData {
  last_delay_ts: u64
  last_price: u128
  last_price_twap: u128
  last_update_ts: u64
}

export interface OraclePriceData {
  delay: Delay
  price: u128
}

export type OracleSource = { tag: 'Reflector'; values: void }

export interface PairParams {
  admin: string
  asset: string
  calculator: string
  collateral_per_pair: u128
  collateral_token: string
  long_token: string
  lower_bound: u128
  oracle: string
  short_token: string
  upper_bound: u128
}

export type Side = { tag: 'Long'; values: void } | { tag: 'Short'; values: void }

export type Direction = { tag: 'Buy'; values: void } | { tag: 'Sell'; values: void }

export interface PairPriceBounds {
  lower: u128
  upper: u128
}

export interface PairAmounts {
  long: u128
  short: u128
}

export interface PairAmountsWithUSDC {
  long: u128
  short: u128
  usdc: u128
}

export interface PairTokens {
  collateral: string
  long: string
  short: string
}

export type PairStatus =
  | { tag: 'Inactive'; values: void }
  | { tag: 'Active'; values: void }
  | { tag: 'Expired'; values: void }

export interface CollateralInfo {
  collateral_per_pair: u128
  collateral_percent_long: u128
  collateral_token: string
  total_collateral: u128
}

export interface PairSummary {
  asset: string
  calculator: string
  collateral: CollateralInfo
  oracle: string
  price_bounds: PairPriceBounds
  status: PairStatus
  tokens: PairTokens
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
  805: { message: 'InvalidOracleTimestamp' },
}

export type Delay = readonly [u64]

export interface Client {
  /**
   * Construct and simulate a deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Deposits LP collateral into the Treasury in exchange for newly-minted LP shares.
   *
   * A deposit consists of:
   * - `pairs_to_deposit` LONG tokens
   * - `pairs_to_deposit` SHORT tokens
   * - `pairs_to_deposit * collateral_per_pair` USDC
   *
   * Shares are minted proportional to the deposit's NAV relative to the Treasury's total NAV.
   *
   * ### Reverts
   * - [`TreasuryError::InvalidInput`] if `pairs_to_deposit == 0`.
   * - [`TreasuryError::ActionPaused`] if deposits are paused.
   *
   * ### Returns
   * Returns the number of LP shares minted for the depositor.
   */
  deposit: (
    { user, pair, pairs_to_deposit }: { user: string; pair: string; pairs_to_deposit: u128 },
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
   * Withdraws LP collateral from the Treasury by burning LP shares.
   *
   * The caller specifies the number of shares to burn. The Treasury computes the
   * proportional amount of LONG/SHORT/USDC owed, validates safety constraints, and
   * transfers the tokens to the user.
   *
   * ### Reverts
   * - [`TreasuryError::InvalidInput`] if `shares == 0`.
   * - [`TreasuryError::ActionPaused`] if withdrawals are paused.
   * - [`TreasuryError::InsufficientShares`] if `shares > user_shares` or `total_shares == 0`.
   *
   * ### Returns
   * Returns the token amounts withdrawn: `{ long, short, usdc }`.
   */
  withdraw: (
    { user, pair, shares }: { user: string; pair: string; shares: u128 },
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
  ) => Promise<AssembledTransaction<PairAmountsWithUSDC>>

  /**
   * Construct and simulate a get_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the stored token configuration for a given Pair.
   *
   * This includes the contract addresses for the Pair, LONG, SHORT, and collateral (USDC) tokens.
   */
  get_config: (
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
  ) => Promise<AssembledTransaction<PairConfig>>

  /**
   * Construct and simulate a get_prices transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the current oracle prices for the given Pair.
   *
   * Prices are returned in the same precision as `PRICE_PRECISION`.
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
  ) => Promise<AssembledTransaction<PairAmountsWithUSDC>>

  /**
   * Construct and simulate a get_balances transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the Treasury’s internal accounting balances for the given Pair.
   *
   * These balances represent the Treasury’s tracked inventory and may be used for quoting,
   * risk checks, and LP accounting.
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
  ) => Promise<AssembledTransaction<PairAmountsWithUSDC>>

  /**
   * Construct and simulate a get_total_shares transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the total LP shares outstanding for the given Pair.
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
   * Returns the LP share balance for `user` for the given Pair.
   *
   * Missing records default to zero for read-only UX.
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
   * Construct and simulate a get_fee_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the current fee configuration for the given Pair.
   */
  get_fee_config: (
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
  ) => Promise<AssembledTransaction<TreasuryFeeConfig>>

  /**
   * Construct and simulate a get_summary transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns a snapshot of the Treasury state for the given Pair.
   *
   * This is a convenience method for frontends/indexers to avoid multiple round-trips.
   */
  get_summary: (
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
  ) => Promise<AssembledTransaction<TreasurySummary>>

  /**
   * Construct and simulate a get_user_with_summary transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns a snapshot of the Treasury state for a Pair plus the user's share balance.
   *
   * This is a convenience method for frontends/indexers to fetch summary + user position in one call.
   */
  get_user_with_summary: (
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
  ) => Promise<AssembledTransaction<TreasuryUserSummary>>

  /**
   * Construct and simulate a estimate_trade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Estimates a trade output and fee without executing any token transfers.
   *
   * This helper is intended for quoting in UIs and off-chain routing. It uses the same
   * pricing + fee model as the on-chain trade methods.
   *
   * ### Reverts
   * - [`TreasuryError::InvalidInput`] if `amount_in == 0`.
   * - Reverts if `pair` is not configured (via `get_config`).
   *
   * ### Returns
   * Returns `(amount_out, usdc_fee)`.
   */
  estimate_trade: (
    { pair, direction, side, amount_in }: { pair: string; direction: Direction; side: Side; amount_in: u128 },
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
   * Construct and simulate a buy_long transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Buys **LONG** tokens from the Treasury using USDC.
   *
   * The caller supplies `usdc_in` and receives `long_out` quoted from the current
   * oracle price and fee model. This trade is executed **against Treasury inventory**:
   * the Treasury must already hold sufficient LONG to deliver the trade.
   *
   * ### Pricing & Fees
   * - Uses `prices.long` from the oracle.
   * - Computes a dynamic taker fee via `calculate_fee(...)`.
   * - `quote_buy_token` returns `(long_out, usdc_fee)`; `usdc_fee` is retained and tracked.
   *
   * ### Slippage Protection
   * Reverts if `long_out < min_long_out`.
   *
   * ### Reverts
   * - [`TreasuryError::InvalidInput`] if `usdc_in == 0`.
   * - [`TreasuryError::ActionPaused`] if trading is paused.
   * - [`TreasuryError::Slippage`] if output is zero or below `min_long_out`.
   * - [`TreasuryError::InsufficientInventory`] if the Treasury lacks LONG inventory.
   *
   * ### Returns
   * Returns the amount of LONG transferred to the user.
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
  ) => Promise<AssembledTransaction<readonly [u128, u128]>>

  /**
   * Construct and simulate a sell_long transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Sells **LONG** tokens to the Treasury in exchange for USDC.
   *
   * The caller supplies `long_in` and receives `usdc_out` quoted from the current
   * oracle price and fee model. This trade is executed **against Treasury USDC inventory**:
   * the Treasury must have sufficient USDC to pay out.
   *
   * Additional safety checks apply to protect LPs:
   * - LONG-side trades may be blocked as "toxic"
   * - USDC floor constraints prevent draining too much collateral in a single trade
   *
   * ### Slippage Protection
   * Reverts if `usdc_out < min_usdc_out`.
   *
   * ### Reverts
   * - [`TreasuryError::InvalidInput`] if `long_in == 0`.
   * - [`TreasuryError::ActionPaused`] if trading is paused.
   * - [`TreasuryError::ToxicSideNotAccepted`] if risk logic blocks LONG sells.
   * - [`TreasuryError::Slippage`] if output is zero or below `min_usdc_out`.
   * - [`TreasuryError::InsufficientInventory`] if the Treasury lacks USDC to pay out.
   * - [`TreasuryError::CannotPassFloor`] if paying out violates the USDC floor.
   *
   * ### Returns
   * Returns the amount of USDC transferred to the user.
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
  ) => Promise<AssembledTransaction<readonly [u128, u128]>>

  /**
   * Construct and simulate a buy_short transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Buys **SHORT** tokens from the Treasury using USDC.
   *
   * The caller supplies `usdc_in` and receives `short_out` quoted from the current
   * oracle price and fee model. This trade is executed **against Treasury inventory**:
   * the Treasury must already hold sufficient SHORT to deliver the trade.
   *
   * ### Pricing & Fees
   * - Uses `prices.short` from the oracle.
   * - Computes a dynamic taker fee via `calculate_fee(...)`.
   * - `quote_buy_token` returns `(short_out, usdc_fee)`; `usdc_fee` is retained and tracked.
   *
   * ### Slippage Protection
   * Reverts if `short_out < min_short_out`.
   *
   * ### Reverts
   * - [`TreasuryError::InvalidInput`] if `usdc_in == 0`.
   * - [`TreasuryError::ActionPaused`] if trading is paused.
   * - [`TreasuryError::Slippage`] if output is zero or below `min_short_out`.
   * - [`TreasuryError::InsufficientInventory`] if the Treasury lacks SHORT inventory.
   *
   * ### Returns
   * Returns the amount of SHORT transferred to the user.
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
  ) => Promise<AssembledTransaction<readonly [u128, u128]>>

  /**
   * Construct and simulate a sell_short transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Sells **SHORT** tokens to the Treasury in exchange for USDC.
   *
   * The caller supplies `short_in` and receives `usdc_out` quoted from the current
   * oracle price and fee model. This trade is executed **against Treasury USDC inventory**:
   * the Treasury must have sufficient USDC to pay out.
   *
   * Additional safety checks apply to protect LPs:
   * - SHORT-side trades may be blocked as "toxic"
   * - USDC floor constraints prevent draining too much collateral in a single trade
   *
   * ### Slippage Protection
   * Reverts if `usdc_out < min_usdc_out`.
   *
   * ### Reverts
   * - [`TreasuryError::InvalidInput`] if `short_in == 0`.
   * - [`TreasuryError::ActionPaused`] if trading is paused.
   * - [`TreasuryError::ToxicSideNotAccepted`] if risk logic blocks SHORT sells.
   * - [`TreasuryError::Slippage`] if output is zero or below `min_usdc_out`.
   * - [`TreasuryError::InsufficientInventory`] if the Treasury lacks USDC to pay out.
   * - [`TreasuryError::CannotPassFloor`] if paying out violates the USDC floor.
   *
   * ### Returns
   * Returns the amount of USDC transferred to the user.
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
  ) => Promise<AssembledTransaction<readonly [u128, u128]>>

  /**
   * Construct and simulate a add_pair transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Registers a new Pair with the Treasury and initializes its state.
   *
   * This call:
   * - Stores the token addresses for LONG/SHORT/USDC from the Pair contract
   * - Initializes balances, shares, risk parameters, fee config, and protocol fee counters
   *
   * ### Reverts
   * - [`TreasuryError::InvalidInput`] if fee fields are out of range.
   */
  add_pair: (
    { admin, pair, fee_config }: { admin: string; pair: string; fee_config: TreasuryFeeConfig },
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
   * Construct and simulate a set_fee_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Updates the fee configuration for an existing Pair.
   *
   * ### Reverts
   * - [`TreasuryError::InvalidInput`] if any configured fee exceeds its maximum bound.
   */
  set_fee_config: (
    { admin, pair, config }: { admin: string; pair: string; config: TreasuryFeeConfig },
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
   * Construct and simulate a set_usdc_floor transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Sets the global USDC floor fraction used by risk checks.
   *
   * The floor fraction is expressed in `PRICE_PRECISION` units (e.g. `0.10e7` for 10%).
   *
   * ### Reverts
   * - [`TreasuryError::InvalidInput`] if `floor_fraction` is zero or below the minimum allowed.
   */
  set_usdc_floor: (
    { admin, floor_fraction }: { admin: string; floor_fraction: u128 },
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
   * Returns the protocol fees accumulated for the given Pair (denominated in USDC).
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
   * Transfers accumulated protocol fees for `pair` to `destination`.
   *
   * ### Reverts
   * - Reverts if `admin` is not authorized.
   *
   * ### Returns
   * Returns the amount of fees transferred.
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
   * Construct and simulate a kill_withdraw_floor transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  kill_withdraw_floor: (
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
   * Construct and simulate a unkill_withdraw_floor transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  unkill_withdraw_floor: (
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

  /**
   * Construct and simulate a get_is_killed_withdraw_floor transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_is_killed_withdraw_floor: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
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
    /** Constructor/Initialization Args for the contract's `__constructor` method */
    { admin, oracle }: { admin: string; oracle: string },
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
    return ContractClient.deploy({ admin, oracle }, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([
        'AAAAAAAAAhBJbml0aWFsaXplcyB0aGUgVHJlYXN1cnkgY29udHJhY3QuCgpUaGlzIGNvbnN0cnVjdG9yIGlzIGludGVuZGVkIHRvIGJlIGNhbGxlZCBleGFjdGx5IG9uY2UgYXQgZGVwbG95IHRpbWUuIEl0OgotIFNldHMgdXAgY29yZSBhZG1pbiByb2xlcyAoYEFkbWluYCwgYFBhdXNlQWRtaW5gLCBgRW1lcmdlbmN5QWRtaW5gKSB0byB0aGUgcHJvdmlkZWQgYGFkbWluYAotIFN0b3JlcyB0aGUgY2Fub25pY2FsIFVTREMgb3JhY2xlIHVzZWQgYnkgdGhlIFRyZWFzdXJ5CgojIyMgUmV2ZXJ0cwotIFtgVHJlYXN1cnlFcnJvcjo6QWxyZWFkeUluaXRpYWxpemVkYF0gaWYgdGhlIGNvbnRyYWN0IGhhcyBhbHJlYWR5IGJlZW4gaW5pdGlhbGl6ZWQuCgojIyMgQXJndW1lbnRzCi0gYGVgOiBTb3JvYmFuIGVudmlyb25tZW50LgotIGBhZG1pbmA6IEFkZHJlc3MgdG8gYXNzaWduIGFkbWluaXN0cmF0aXZlIHJvbGVzIHRvLgotIGBvcmFjbGVgOiBBZGRyZXNzIG9mIHRoZSBOb3JtYWwgT3JhY2xlIGNvbnRyYWN0IHVzZWQgZm9yIFVTREMgcHJpY2luZy4AAAANX19jb25zdHJ1Y3RvcgAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAGb3JhY2xlAAAAAAATAAAAAA==',
        'AAAAAAAAAgJEZXBvc2l0cyBMUCBjb2xsYXRlcmFsIGludG8gdGhlIFRyZWFzdXJ5IGluIGV4Y2hhbmdlIGZvciBuZXdseS1taW50ZWQgTFAgc2hhcmVzLgoKQSBkZXBvc2l0IGNvbnNpc3RzIG9mOgotIGBwYWlyc190b19kZXBvc2l0YCBMT05HIHRva2VucwotIGBwYWlyc190b19kZXBvc2l0YCBTSE9SVCB0b2tlbnMKLSBgcGFpcnNfdG9fZGVwb3NpdCAqIGNvbGxhdGVyYWxfcGVyX3BhaXJgIFVTREMKClNoYXJlcyBhcmUgbWludGVkIHByb3BvcnRpb25hbCB0byB0aGUgZGVwb3NpdCdzIE5BViByZWxhdGl2ZSB0byB0aGUgVHJlYXN1cnkncyB0b3RhbCBOQVYuCgojIyMgUmV2ZXJ0cwotIFtgVHJlYXN1cnlFcnJvcjo6SW52YWxpZElucHV0YF0gaWYgYHBhaXJzX3RvX2RlcG9zaXQgPT0gMGAuCi0gW2BUcmVhc3VyeUVycm9yOjpBY3Rpb25QYXVzZWRgXSBpZiBkZXBvc2l0cyBhcmUgcGF1c2VkLgoKIyMjIFJldHVybnMKUmV0dXJucyB0aGUgbnVtYmVyIG9mIExQIHNoYXJlcyBtaW50ZWQgZm9yIHRoZSBkZXBvc2l0b3IuAAAAAAAHZGVwb3NpdAAAAAADAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAEcGFpcgAAABMAAAAAAAAAEHBhaXJzX3RvX2RlcG9zaXQAAAAKAAAAAQAAAAo=',
        'AAAAAAAAAiFXaXRoZHJhd3MgTFAgY29sbGF0ZXJhbCBmcm9tIHRoZSBUcmVhc3VyeSBieSBidXJuaW5nIExQIHNoYXJlcy4KClRoZSBjYWxsZXIgc3BlY2lmaWVzIHRoZSBudW1iZXIgb2Ygc2hhcmVzIHRvIGJ1cm4uIFRoZSBUcmVhc3VyeSBjb21wdXRlcyB0aGUKcHJvcG9ydGlvbmFsIGFtb3VudCBvZiBMT05HL1NIT1JUL1VTREMgb3dlZCwgdmFsaWRhdGVzIHNhZmV0eSBjb25zdHJhaW50cywgYW5kCnRyYW5zZmVycyB0aGUgdG9rZW5zIHRvIHRoZSB1c2VyLgoKIyMjIFJldmVydHMKLSBbYFRyZWFzdXJ5RXJyb3I6OkludmFsaWRJbnB1dGBdIGlmIGBzaGFyZXMgPT0gMGAuCi0gW2BUcmVhc3VyeUVycm9yOjpBY3Rpb25QYXVzZWRgXSBpZiB3aXRoZHJhd2FscyBhcmUgcGF1c2VkLgotIFtgVHJlYXN1cnlFcnJvcjo6SW5zdWZmaWNpZW50U2hhcmVzYF0gaWYgYHNoYXJlcyA+IHVzZXJfc2hhcmVzYCBvciBgdG90YWxfc2hhcmVzID09IDBgLgoKIyMjIFJldHVybnMKUmV0dXJucyB0aGUgdG9rZW4gYW1vdW50cyB3aXRoZHJhd246IGB7IGxvbmcsIHNob3J0LCB1c2RjIH1gLgAAAAAAAAh3aXRoZHJhdwAAAAMAAAAAAAAABHVzZXIAAAATAAAAAAAAAARwYWlyAAAAEwAAAAAAAAAGc2hhcmVzAAAAAAAKAAAAAQAAB9AAAAATUGFpckFtb3VudHNXaXRoVVNEQwA=',
        'AAAAAAAAAJdSZXR1cm5zIHRoZSBzdG9yZWQgdG9rZW4gY29uZmlndXJhdGlvbiBmb3IgYSBnaXZlbiBQYWlyLgoKVGhpcyBpbmNsdWRlcyB0aGUgY29udHJhY3QgYWRkcmVzc2VzIGZvciB0aGUgUGFpciwgTE9ORywgU0hPUlQsIGFuZCBjb2xsYXRlcmFsIChVU0RDKSB0b2tlbnMuAAAAAApnZXRfY29uZmlnAAAAAAABAAAAAAAAAARwYWlyAAAAEwAAAAEAAAfQAAAAClBhaXJDb25maWcAAA==',
        'AAAAAAAAAHZSZXR1cm5zIHRoZSBjdXJyZW50IG9yYWNsZSBwcmljZXMgZm9yIHRoZSBnaXZlbiBQYWlyLgoKUHJpY2VzIGFyZSByZXR1cm5lZCBpbiB0aGUgc2FtZSBwcmVjaXNpb24gYXMgYFBSSUNFX1BSRUNJU0lPTmAuAAAAAAAKZ2V0X3ByaWNlcwAAAAAAAQAAAAAAAAAEcGFpcgAAABMAAAABAAAH0AAAABNQYWlyQW1vdW50c1dpdGhVU0RDAA==',
        'AAAAAAAAAMNSZXR1cm5zIHRoZSBUcmVhc3VyeeKAmXMgaW50ZXJuYWwgYWNjb3VudGluZyBiYWxhbmNlcyBmb3IgdGhlIGdpdmVuIFBhaXIuCgpUaGVzZSBiYWxhbmNlcyByZXByZXNlbnQgdGhlIFRyZWFzdXJ54oCZcyB0cmFja2VkIGludmVudG9yeSBhbmQgbWF5IGJlIHVzZWQgZm9yIHF1b3RpbmcsCnJpc2sgY2hlY2tzLCBhbmQgTFAgYWNjb3VudGluZy4AAAAADGdldF9iYWxhbmNlcwAAAAEAAAAAAAAABHBhaXIAAAATAAAAAQAAB9AAAAATUGFpckFtb3VudHNXaXRoVVNEQwA=',
        'AAAAAAAAADtSZXR1cm5zIHRoZSB0b3RhbCBMUCBzaGFyZXMgb3V0c3RhbmRpbmcgZm9yIHRoZSBnaXZlbiBQYWlyLgAAAAAQZ2V0X3RvdGFsX3NoYXJlcwAAAAEAAAAAAAAABHBhaXIAAAATAAAAAQAAAAo=',
        'AAAAAAAAAG5SZXR1cm5zIHRoZSBMUCBzaGFyZSBiYWxhbmNlIGZvciBgdXNlcmAgZm9yIHRoZSBnaXZlbiBQYWlyLgoKTWlzc2luZyByZWNvcmRzIGRlZmF1bHQgdG8gemVybyBmb3IgcmVhZC1vbmx5IFVYLgAAAAAAD2dldF91c2VyX3NoYXJlcwAAAAACAAAAAAAAAARwYWlyAAAAEwAAAAAAAAAEdXNlcgAAABMAAAABAAAACg==',
        'AAAAAAAAADlSZXR1cm5zIHRoZSBjdXJyZW50IGZlZSBjb25maWd1cmF0aW9uIGZvciB0aGUgZ2l2ZW4gUGFpci4AAAAAAAAOZ2V0X2ZlZV9jb25maWcAAAAAAAEAAAAAAAAABHBhaXIAAAATAAAAAQAAB9AAAAARVHJlYXN1cnlGZWVDb25maWcAAAA=',
        'AAAAAAAAAJBSZXR1cm5zIGEgc25hcHNob3Qgb2YgdGhlIFRyZWFzdXJ5IHN0YXRlIGZvciB0aGUgZ2l2ZW4gUGFpci4KClRoaXMgaXMgYSBjb252ZW5pZW5jZSBtZXRob2QgZm9yIGZyb250ZW5kcy9pbmRleGVycyB0byBhdm9pZCBtdWx0aXBsZSByb3VuZC10cmlwcy4AAAALZ2V0X3N1bW1hcnkAAAAAAQAAAAAAAAAEcGFpcgAAABMAAAABAAAH0AAAAA9UcmVhc3VyeVN1bW1hcnkA',
        'AAAAAAAAALVSZXR1cm5zIGEgc25hcHNob3Qgb2YgdGhlIFRyZWFzdXJ5IHN0YXRlIGZvciBhIFBhaXIgcGx1cyB0aGUgdXNlcidzIHNoYXJlIGJhbGFuY2UuCgpUaGlzIGlzIGEgY29udmVuaWVuY2UgbWV0aG9kIGZvciBmcm9udGVuZHMvaW5kZXhlcnMgdG8gZmV0Y2ggc3VtbWFyeSArIHVzZXIgcG9zaXRpb24gaW4gb25lIGNhbGwuAAAAAAAAFWdldF91c2VyX3dpdGhfc3VtbWFyeQAAAAAAAAIAAAAAAAAABHBhaXIAAAATAAAAAAAAAAR1c2VyAAAAEwAAAAEAAAfQAAAAE1RyZWFzdXJ5VXNlclN1bW1hcnkA',
        'AAAAAAAAAXtFc3RpbWF0ZXMgYSB0cmFkZSBvdXRwdXQgYW5kIGZlZSB3aXRob3V0IGV4ZWN1dGluZyBhbnkgdG9rZW4gdHJhbnNmZXJzLgoKVGhpcyBoZWxwZXIgaXMgaW50ZW5kZWQgZm9yIHF1b3RpbmcgaW4gVUlzIGFuZCBvZmYtY2hhaW4gcm91dGluZy4gSXQgdXNlcyB0aGUgc2FtZQpwcmljaW5nICsgZmVlIG1vZGVsIGFzIHRoZSBvbi1jaGFpbiB0cmFkZSBtZXRob2RzLgoKIyMjIFJldmVydHMKLSBbYFRyZWFzdXJ5RXJyb3I6OkludmFsaWRJbnB1dGBdIGlmIGBhbW91bnRfaW4gPT0gMGAuCi0gUmV2ZXJ0cyBpZiBgcGFpcmAgaXMgbm90IGNvbmZpZ3VyZWQgKHZpYSBgZ2V0X2NvbmZpZ2ApLgoKIyMjIFJldHVybnMKUmV0dXJucyBgKGFtb3VudF9vdXQsIHVzZGNfZmVlKWAuAAAAAA5lc3RpbWF0ZV90cmFkZQAAAAAABAAAAAAAAAAEcGFpcgAAABMAAAAAAAAACWRpcmVjdGlvbgAAAAAAB9AAAAAJRGlyZWN0aW9uAAAAAAAAAAAAAARzaWRlAAAH0AAAAARTaWRlAAAAAAAAAAlhbW91bnRfaW4AAAAAAAAKAAAAAQAAA+0AAAACAAAACgAAAAo=',
        'AAAAAAAAA3hCdXlzICoqTE9ORyoqIHRva2VucyBmcm9tIHRoZSBUcmVhc3VyeSB1c2luZyBVU0RDLgoKVGhlIGNhbGxlciBzdXBwbGllcyBgdXNkY19pbmAgYW5kIHJlY2VpdmVzIGBsb25nX291dGAgcXVvdGVkIGZyb20gdGhlIGN1cnJlbnQKb3JhY2xlIHByaWNlIGFuZCBmZWUgbW9kZWwuIFRoaXMgdHJhZGUgaXMgZXhlY3V0ZWQgKiphZ2FpbnN0IFRyZWFzdXJ5IGludmVudG9yeSoqOgp0aGUgVHJlYXN1cnkgbXVzdCBhbHJlYWR5IGhvbGQgc3VmZmljaWVudCBMT05HIHRvIGRlbGl2ZXIgdGhlIHRyYWRlLgoKIyMjIFByaWNpbmcgJiBGZWVzCi0gVXNlcyBgcHJpY2VzLmxvbmdgIGZyb20gdGhlIG9yYWNsZS4KLSBDb21wdXRlcyBhIGR5bmFtaWMgdGFrZXIgZmVlIHZpYSBgY2FsY3VsYXRlX2ZlZSguLi4pYC4KLSBgcXVvdGVfYnV5X3Rva2VuYCByZXR1cm5zIGAobG9uZ19vdXQsIHVzZGNfZmVlKWA7IGB1c2RjX2ZlZWAgaXMgcmV0YWluZWQgYW5kIHRyYWNrZWQuCgojIyMgU2xpcHBhZ2UgUHJvdGVjdGlvbgpSZXZlcnRzIGlmIGBsb25nX291dCA8IG1pbl9sb25nX291dGAuCgojIyMgUmV2ZXJ0cwotIFtgVHJlYXN1cnlFcnJvcjo6SW52YWxpZElucHV0YF0gaWYgYHVzZGNfaW4gPT0gMGAuCi0gW2BUcmVhc3VyeUVycm9yOjpBY3Rpb25QYXVzZWRgXSBpZiB0cmFkaW5nIGlzIHBhdXNlZC4KLSBbYFRyZWFzdXJ5RXJyb3I6OlNsaXBwYWdlYF0gaWYgb3V0cHV0IGlzIHplcm8gb3IgYmVsb3cgYG1pbl9sb25nX291dGAuCi0gW2BUcmVhc3VyeUVycm9yOjpJbnN1ZmZpY2llbnRJbnZlbnRvcnlgXSBpZiB0aGUgVHJlYXN1cnkgbGFja3MgTE9ORyBpbnZlbnRvcnkuCgojIyMgUmV0dXJucwpSZXR1cm5zIHRoZSBhbW91bnQgb2YgTE9ORyB0cmFuc2ZlcnJlZCB0byB0aGUgdXNlci4AAAAIYnV5X2xvbmcAAAAEAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAEcGFpcgAAABMAAAAAAAAAB3VzZGNfaW4AAAAACgAAAAAAAAAMbWluX2xvbmdfb3V0AAAACgAAAAEAAAPtAAAAAgAAAAoAAAAK',
        'AAAAAAAAA+5TZWxscyAqKkxPTkcqKiB0b2tlbnMgdG8gdGhlIFRyZWFzdXJ5IGluIGV4Y2hhbmdlIGZvciBVU0RDLgoKVGhlIGNhbGxlciBzdXBwbGllcyBgbG9uZ19pbmAgYW5kIHJlY2VpdmVzIGB1c2RjX291dGAgcXVvdGVkIGZyb20gdGhlIGN1cnJlbnQKb3JhY2xlIHByaWNlIGFuZCBmZWUgbW9kZWwuIFRoaXMgdHJhZGUgaXMgZXhlY3V0ZWQgKiphZ2FpbnN0IFRyZWFzdXJ5IFVTREMgaW52ZW50b3J5Kio6CnRoZSBUcmVhc3VyeSBtdXN0IGhhdmUgc3VmZmljaWVudCBVU0RDIHRvIHBheSBvdXQuCgpBZGRpdGlvbmFsIHNhZmV0eSBjaGVja3MgYXBwbHkgdG8gcHJvdGVjdCBMUHM6Ci0gTE9ORy1zaWRlIHRyYWRlcyBtYXkgYmUgYmxvY2tlZCBhcyAidG94aWMiCi0gVVNEQyBmbG9vciBjb25zdHJhaW50cyBwcmV2ZW50IGRyYWluaW5nIHRvbyBtdWNoIGNvbGxhdGVyYWwgaW4gYSBzaW5nbGUgdHJhZGUKCiMjIyBTbGlwcGFnZSBQcm90ZWN0aW9uClJldmVydHMgaWYgYHVzZGNfb3V0IDwgbWluX3VzZGNfb3V0YC4KCiMjIyBSZXZlcnRzCi0gW2BUcmVhc3VyeUVycm9yOjpJbnZhbGlkSW5wdXRgXSBpZiBgbG9uZ19pbiA9PSAwYC4KLSBbYFRyZWFzdXJ5RXJyb3I6OkFjdGlvblBhdXNlZGBdIGlmIHRyYWRpbmcgaXMgcGF1c2VkLgotIFtgVHJlYXN1cnlFcnJvcjo6VG94aWNTaWRlTm90QWNjZXB0ZWRgXSBpZiByaXNrIGxvZ2ljIGJsb2NrcyBMT05HIHNlbGxzLgotIFtgVHJlYXN1cnlFcnJvcjo6U2xpcHBhZ2VgXSBpZiBvdXRwdXQgaXMgemVybyBvciBiZWxvdyBgbWluX3VzZGNfb3V0YC4KLSBbYFRyZWFzdXJ5RXJyb3I6Okluc3VmZmljaWVudEludmVudG9yeWBdIGlmIHRoZSBUcmVhc3VyeSBsYWNrcyBVU0RDIHRvIHBheSBvdXQuCi0gW2BUcmVhc3VyeUVycm9yOjpDYW5ub3RQYXNzRmxvb3JgXSBpZiBwYXlpbmcgb3V0IHZpb2xhdGVzIHRoZSBVU0RDIGZsb29yLgoKIyMjIFJldHVybnMKUmV0dXJucyB0aGUgYW1vdW50IG9mIFVTREMgdHJhbnNmZXJyZWQgdG8gdGhlIHVzZXIuAAAAAAAJc2VsbF9sb25nAAAAAAAABAAAAAAAAAAEdXNlcgAAABMAAAAAAAAABHBhaXIAAAATAAAAAAAAAAdsb25nX2luAAAAAAoAAAAAAAAADG1pbl91c2RjX291dAAAAAoAAAABAAAD7QAAAAIAAAAKAAAACg==',
        'AAAAAAAAA4JCdXlzICoqU0hPUlQqKiB0b2tlbnMgZnJvbSB0aGUgVHJlYXN1cnkgdXNpbmcgVVNEQy4KClRoZSBjYWxsZXIgc3VwcGxpZXMgYHVzZGNfaW5gIGFuZCByZWNlaXZlcyBgc2hvcnRfb3V0YCBxdW90ZWQgZnJvbSB0aGUgY3VycmVudApvcmFjbGUgcHJpY2UgYW5kIGZlZSBtb2RlbC4gVGhpcyB0cmFkZSBpcyBleGVjdXRlZCAqKmFnYWluc3QgVHJlYXN1cnkgaW52ZW50b3J5Kio6CnRoZSBUcmVhc3VyeSBtdXN0IGFscmVhZHkgaG9sZCBzdWZmaWNpZW50IFNIT1JUIHRvIGRlbGl2ZXIgdGhlIHRyYWRlLgoKIyMjIFByaWNpbmcgJiBGZWVzCi0gVXNlcyBgcHJpY2VzLnNob3J0YCBmcm9tIHRoZSBvcmFjbGUuCi0gQ29tcHV0ZXMgYSBkeW5hbWljIHRha2VyIGZlZSB2aWEgYGNhbGN1bGF0ZV9mZWUoLi4uKWAuCi0gYHF1b3RlX2J1eV90b2tlbmAgcmV0dXJucyBgKHNob3J0X291dCwgdXNkY19mZWUpYDsgYHVzZGNfZmVlYCBpcyByZXRhaW5lZCBhbmQgdHJhY2tlZC4KCiMjIyBTbGlwcGFnZSBQcm90ZWN0aW9uClJldmVydHMgaWYgYHNob3J0X291dCA8IG1pbl9zaG9ydF9vdXRgLgoKIyMjIFJldmVydHMKLSBbYFRyZWFzdXJ5RXJyb3I6OkludmFsaWRJbnB1dGBdIGlmIGB1c2RjX2luID09IDBgLgotIFtgVHJlYXN1cnlFcnJvcjo6QWN0aW9uUGF1c2VkYF0gaWYgdHJhZGluZyBpcyBwYXVzZWQuCi0gW2BUcmVhc3VyeUVycm9yOjpTbGlwcGFnZWBdIGlmIG91dHB1dCBpcyB6ZXJvIG9yIGJlbG93IGBtaW5fc2hvcnRfb3V0YC4KLSBbYFRyZWFzdXJ5RXJyb3I6Okluc3VmZmljaWVudEludmVudG9yeWBdIGlmIHRoZSBUcmVhc3VyeSBsYWNrcyBTSE9SVCBpbnZlbnRvcnkuCgojIyMgUmV0dXJucwpSZXR1cm5zIHRoZSBhbW91bnQgb2YgU0hPUlQgdHJhbnNmZXJyZWQgdG8gdGhlIHVzZXIuAAAAAAAJYnV5X3Nob3J0AAAAAAAABAAAAAAAAAAEdXNlcgAAABMAAAAAAAAABHBhaXIAAAATAAAAAAAAAAd1c2RjX2luAAAAAAoAAAAAAAAADW1pbl9zaG9ydF9vdXQAAAAAAAAKAAAAAQAAA+0AAAACAAAACgAAAAo=',
        'AAAAAAAAA/NTZWxscyAqKlNIT1JUKiogdG9rZW5zIHRvIHRoZSBUcmVhc3VyeSBpbiBleGNoYW5nZSBmb3IgVVNEQy4KClRoZSBjYWxsZXIgc3VwcGxpZXMgYHNob3J0X2luYCBhbmQgcmVjZWl2ZXMgYHVzZGNfb3V0YCBxdW90ZWQgZnJvbSB0aGUgY3VycmVudApvcmFjbGUgcHJpY2UgYW5kIGZlZSBtb2RlbC4gVGhpcyB0cmFkZSBpcyBleGVjdXRlZCAqKmFnYWluc3QgVHJlYXN1cnkgVVNEQyBpbnZlbnRvcnkqKjoKdGhlIFRyZWFzdXJ5IG11c3QgaGF2ZSBzdWZmaWNpZW50IFVTREMgdG8gcGF5IG91dC4KCkFkZGl0aW9uYWwgc2FmZXR5IGNoZWNrcyBhcHBseSB0byBwcm90ZWN0IExQczoKLSBTSE9SVC1zaWRlIHRyYWRlcyBtYXkgYmUgYmxvY2tlZCBhcyAidG94aWMiCi0gVVNEQyBmbG9vciBjb25zdHJhaW50cyBwcmV2ZW50IGRyYWluaW5nIHRvbyBtdWNoIGNvbGxhdGVyYWwgaW4gYSBzaW5nbGUgdHJhZGUKCiMjIyBTbGlwcGFnZSBQcm90ZWN0aW9uClJldmVydHMgaWYgYHVzZGNfb3V0IDwgbWluX3VzZGNfb3V0YC4KCiMjIyBSZXZlcnRzCi0gW2BUcmVhc3VyeUVycm9yOjpJbnZhbGlkSW5wdXRgXSBpZiBgc2hvcnRfaW4gPT0gMGAuCi0gW2BUcmVhc3VyeUVycm9yOjpBY3Rpb25QYXVzZWRgXSBpZiB0cmFkaW5nIGlzIHBhdXNlZC4KLSBbYFRyZWFzdXJ5RXJyb3I6OlRveGljU2lkZU5vdEFjY2VwdGVkYF0gaWYgcmlzayBsb2dpYyBibG9ja3MgU0hPUlQgc2VsbHMuCi0gW2BUcmVhc3VyeUVycm9yOjpTbGlwcGFnZWBdIGlmIG91dHB1dCBpcyB6ZXJvIG9yIGJlbG93IGBtaW5fdXNkY19vdXRgLgotIFtgVHJlYXN1cnlFcnJvcjo6SW5zdWZmaWNpZW50SW52ZW50b3J5YF0gaWYgdGhlIFRyZWFzdXJ5IGxhY2tzIFVTREMgdG8gcGF5IG91dC4KLSBbYFRyZWFzdXJ5RXJyb3I6OkNhbm5vdFBhc3NGbG9vcmBdIGlmIHBheWluZyBvdXQgdmlvbGF0ZXMgdGhlIFVTREMgZmxvb3IuCgojIyMgUmV0dXJucwpSZXR1cm5zIHRoZSBhbW91bnQgb2YgVVNEQyB0cmFuc2ZlcnJlZCB0byB0aGUgdXNlci4AAAAACnNlbGxfc2hvcnQAAAAAAAQAAAAAAAAABHVzZXIAAAATAAAAAAAAAARwYWlyAAAAEwAAAAAAAAAIc2hvcnRfaW4AAAAKAAAAAAAAAAxtaW5fdXNkY19vdXQAAAAKAAAAAQAAA+0AAAACAAAACgAAAAo=',
        'AAAAAAAAATtSZWdpc3RlcnMgYSBuZXcgUGFpciB3aXRoIHRoZSBUcmVhc3VyeSBhbmQgaW5pdGlhbGl6ZXMgaXRzIHN0YXRlLgoKVGhpcyBjYWxsOgotIFN0b3JlcyB0aGUgdG9rZW4gYWRkcmVzc2VzIGZvciBMT05HL1NIT1JUL1VTREMgZnJvbSB0aGUgUGFpciBjb250cmFjdAotIEluaXRpYWxpemVzIGJhbGFuY2VzLCBzaGFyZXMsIHJpc2sgcGFyYW1ldGVycywgZmVlIGNvbmZpZywgYW5kIHByb3RvY29sIGZlZSBjb3VudGVycwoKIyMjIFJldmVydHMKLSBbYFRyZWFzdXJ5RXJyb3I6OkludmFsaWRJbnB1dGBdIGlmIGZlZSBmaWVsZHMgYXJlIG91dCBvZiByYW5nZS4AAAAACGFkZF9wYWlyAAAAAwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAARwYWlyAAAAEwAAAAAAAAAKZmVlX2NvbmZpZwAAAAAH0AAAABFUcmVhc3VyeUZlZUNvbmZpZwAAAAAAAAA=',
        'AAAAAAAAAJNVcGRhdGVzIHRoZSBmZWUgY29uZmlndXJhdGlvbiBmb3IgYW4gZXhpc3RpbmcgUGFpci4KCiMjIyBSZXZlcnRzCi0gW2BUcmVhc3VyeUVycm9yOjpJbnZhbGlkSW5wdXRgXSBpZiBhbnkgY29uZmlndXJlZCBmZWUgZXhjZWVkcyBpdHMgbWF4aW11bSBib3VuZC4AAAAADnNldF9mZWVfY29uZmlnAAAAAAADAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABHBhaXIAAAATAAAAAAAAAAZjb25maWcAAAAAB9AAAAARVHJlYXN1cnlGZWVDb25maWcAAAAAAAAA',
        'AAAAAAAAAPZTZXRzIHRoZSBnbG9iYWwgVVNEQyBmbG9vciBmcmFjdGlvbiB1c2VkIGJ5IHJpc2sgY2hlY2tzLgoKVGhlIGZsb29yIGZyYWN0aW9uIGlzIGV4cHJlc3NlZCBpbiBgUFJJQ0VfUFJFQ0lTSU9OYCB1bml0cyAoZS5nLiBgMC4xMGU3YCBmb3IgMTAlKS4KCiMjIyBSZXZlcnRzCi0gW2BUcmVhc3VyeUVycm9yOjpJbnZhbGlkSW5wdXRgXSBpZiBgZmxvb3JfZnJhY3Rpb25gIGlzIHplcm8gb3IgYmVsb3cgdGhlIG1pbmltdW0gYWxsb3dlZC4AAAAAAA5zZXRfdXNkY19mbG9vcgAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAA5mbG9vcl9mcmFjdGlvbgAAAAAACgAAAAA=',
        'AAAAAAAAAE9SZXR1cm5zIHRoZSBwcm90b2NvbCBmZWVzIGFjY3VtdWxhdGVkIGZvciB0aGUgZ2l2ZW4gUGFpciAoZGVub21pbmF0ZWQgaW4gVVNEQykuAAAAABFnZXRfcHJvdG9jb2xfZmVlcwAAAAAAAAEAAAAAAAAABHBhaXIAAAATAAAAAQAAAAo=',
        'AAAAAAAAAKpUcmFuc2ZlcnMgYWNjdW11bGF0ZWQgcHJvdG9jb2wgZmVlcyBmb3IgYHBhaXJgIHRvIGBkZXN0aW5hdGlvbmAuCgojIyMgUmV2ZXJ0cwotIFJldmVydHMgaWYgYGFkbWluYCBpcyBub3QgYXV0aG9yaXplZC4KCiMjIyBSZXR1cm5zClJldHVybnMgdGhlIGFtb3VudCBvZiBmZWVzIHRyYW5zZmVycmVkLgAAAAAAE2NsYWltX3Byb3RvY29sX2ZlZXMAAAAAAwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAARwYWlyAAAAEwAAAAAAAAALZGVzdGluYXRpb24AAAAAEwAAAAEAAAAK',
        'AAAAAAAAAAAAAAAMa2lsbF9kZXBvc2l0AAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAANa2lsbF93aXRoZHJhdwAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAAKa2lsbF90cmFkZQAAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAATa2lsbF93aXRoZHJhd19mbG9vcgAAAAABAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAA',
        'AAAAAAAAAAAAAAAOdW5raWxsX2RlcG9zaXQAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAAPdW5raWxsX3dpdGhkcmF3AAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAAMdW5raWxsX3RyYWRlAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAAVdW5raWxsX3dpdGhkcmF3X2Zsb29yAAAAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAAVZ2V0X2lzX2tpbGxlZF9kZXBvc2l0AAAAAAAAAAAAAAEAAAAB',
        'AAAAAAAAAAAAAAAWZ2V0X2lzX2tpbGxlZF93aXRoZHJhdwAAAAAAAAAAAAEAAAAB',
        'AAAAAAAAAAAAAAATZ2V0X2lzX2tpbGxlZF90cmFkZQAAAAAAAAAAAQAAAAE=',
        'AAAAAAAAAAAAAAAcZ2V0X2lzX2tpbGxlZF93aXRoZHJhd19mbG9vcgAAAAAAAAABAAAAAQ==',
        'AAAAAAAAAAAAAAAHdmVyc2lvbgAAAAAAAAAAAQAAAAQ=',
        'AAAAAAAAAAAAAAANY29udHJhY3RfbmFtZQAAAAAAAAAAAAABAAAAEQ==',
        'AAAAAAAAAAAAAAAOY29tbWl0X3VwZ3JhZGUAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAANbmV3X3dhc21faGFzaAAAAAAAA+4AAAAgAAAAAA==',
        'AAAAAAAAAAAAAAANYXBwbHlfdXBncmFkZQAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAEAAAPuAAAAIA==',
        'AAAAAAAAAAAAAAAOcmV2ZXJ0X3VwZ3JhZGUAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAASc2V0X2VtZXJnZW5jeV9tb2RlAAAAAAACAAAAAAAAAA9lbWVyZ2VuY3lfYWRtaW4AAAAAEwAAAAAAAAAFdmFsdWUAAAAAAAABAAAAAA==',
        'AAAAAAAAAAAAAAASZ2V0X2VtZXJnZW5jeV9tb2RlAAAAAAAAAAAAAQAAAAE=',
        'AAAAAAAAAAAAAAAZY29tbWl0X3RyYW5zZmVyX293bmVyc2hpcAAAAAAAAAMAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAJcm9sZV9uYW1lAAAAAAAAEQAAAAAAAAALbmV3X2FkZHJlc3MAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAAYYXBwbHlfdHJhbnNmZXJfb3duZXJzaGlwAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAlyb2xlX25hbWUAAAAAAAARAAAAAA==',
        'AAAAAAAAAAAAAAAZcmV2ZXJ0X3RyYW5zZmVyX293bmVyc2hpcAAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAJcm9sZV9uYW1lAAAAAAAAEQAAAAA=',
        'AAAAAAAAAAAAAAASZ2V0X2Z1dHVyZV9hZGRyZXNzAAAAAAABAAAAAAAAAAlyb2xlX25hbWUAAAAAAAARAAAAAQAAABM=',
        'AAAABAAAAAAAAAAAAAAADVRyZWFzdXJ5RXJyb3IAAAAAAAAPAAAAAAAAABJBbHJlYWR5SW5pdGlhbGl6ZWQAAAAAAMkAAAAAAAAADEludmFsaWRJbnB1dAAAAMwAAAAAAAAAC0ludmFsaWRQYWlyAAAAAM0AAAAAAAAAGEZhaWxlZFRvQ2FsbFBhaXJDb250cmFjdAAAANEAAAAAAAAADEFjdGlvblBhdXNlZAAAANUAAAAAAAAAFUluc3VmZmljaWVudEludmVudG9yeQAAAAAAANcAAAAAAAAACFNsaXBwYWdlAAAA2AAAAAAAAAASSW5zdWZmaWNpZW50U2hhcmVzAAAAAADZAAAAAAAAAA9EZXBvc2l0VG9vU21hbGwAAAAA2gAAAAAAAAAQV2l0aGRyYXdUb29TbWFsbAAAANsAAAAAAAAADkludmFsaWRCYWxhbmNlAAAAAADcAAAAAAAAAA9DYW5ub3RQYXNzRmxvb3IAAAAA3QAAAAAAAAAUVG94aWNTaWRlTm90QWNjZXB0ZWQAAADeAAAAAAAAABZGYWlsZWRUb0dldE9yYWNsZVByaWNlAAAAAADfAAAAAAAAAApJbnZhbGlkRmVlAAAAAADg',
        'AAAAAQAAAIxTdGF0aWMgY29uZmlndXJhdGlvbiBmb3IgYSBzdXBwb3J0ZWQgTG9uZ1Nob3J0UGFpci4KClN0b3JlZCBwZXItcGFpciBhbmQgdXNlZCB0byBmaW5kIHRoZSB0b2tlbiBjb250cmFjdHMgdGhlIFRyZWFzdXJ5IHNob3VsZCBpbnRlcmFjdCB3aXRoLgAAAAAAAAAKUGFpckNvbmZpZwAAAAAABAAAABxMT05HIHRva2VuIGNvbnRyYWN0IGFkZHJlc3MuAAAABGxvbmcAAAATAAAAI1RoZSBMb25nU2hvcnRQYWlyIGNvbnRyYWN0IGFkZHJlc3MuAAAAAARwYWlyAAAAEwAAAB1TSE9SVCB0b2tlbiBjb250cmFjdCBhZGRyZXNzLgAAAAAAAAVzaG9ydAAAAAAAABMAAAApQ29sbGF0ZXJhbCB0b2tlbiBjb250cmFjdCBhZGRyZXNzIChVU0RDKS4AAAAAAAAEdXNkYwAAABM=',
        'AAAAAQAAAH1Db252ZW5pZW50IGFnZ3JlZ2F0aW9uIHVzZWQgYnkgZnJvbnRlbmQvaW5kZXhlcnMuCgpOb3RlOiB0aGlzIGlzIG5vdCBzdG9yZWQgZGlyZWN0bHk7IGl0IGlzIGFzc2VtYmxlZCBmcm9tIG90aGVyIHN0b3JlZCBrZXlzLgAAAAAAAAAAAAAPVHJlYXN1cnlTdW1tYXJ5AAAAAAUAAABFVHJlYXN1cnkgaW52ZW50b3J5ICh3aGF0IHRoZSBUcmVhc3VyeSBhY3R1YWxseSBob2xkcyAvIGFjY291bnRzIGZvcikuAAAAAAAACGJhbGFuY2VzAAAH0AAAABNQYWlyQW1vdW50c1dpdGhVU0RDAAAAAAAAAAAGY29uZmlnAAAAAAfQAAAAClBhaXJDb25maWcAAAAAAAAAAAAKZmVlX2NvbmZpZwAAAAAH0AAAABFUcmVhc3VyeUZlZUNvbmZpZwAAAAAAAERRdW90aW5nIGlucHV0cyAoTE9ORy9TSE9SVCBzZXR0bGVtZW50IGZyYWN0aW9ucyArIFVTREMgb3JhY2xlIFRXQVApLgAAAAZwcmljZXMAAAAAB9AAAAATUGFpckFtb3VudHNXaXRoVVNEQwAAAAAkVG90YWwgTFAgc2hhcmUgc3VwcGx5IGZvciB0aGlzIHBhaXIuAAAADHRvdGFsX3NoYXJlcwAAAAo=',
        'AAAAAQAAAFNBIHBlci11c2VyIHZpZXcgdGhhdCBjb21iaW5lcyBbYFRyZWFzdXJ5U3VtbWFyeWBdIHBsdXMgdGhlIHVzZXIncyBMUCBzaGFyZSBiYWxhbmNlLgAAAAAAAAAAE1RyZWFzdXJ5VXNlclN1bW1hcnkAAAAAAgAAAAAAAAAHc3VtbWFyeQAAAAfQAAAAD1RyZWFzdXJ5U3VtbWFyeQAAAAAAAAAAC3VzZXJfc2hhcmVzAAAAAAo=',
        'AAAAAQAAAKZGZWUgbW9kZWwgcGFyYW1ldGVycyBmb3IgYSBwYWlyLgoKYGJhc2VfZmVlYCBhcmUgZXhwcmVzc2VkIGluIGBQUklDRV9QUkVDSVNJT05gIHVuaXRzLgpUaGUgcmVtYWluaW5nIHBhcmFtZXRlcnMgYXJlIG1vZGVsLXNwZWNpZmljIGtub2JzIHVzZWQgYnkgYGNhbGN1bGF0ZV9mZWUoLi4uKWAuAAAAAAAAAAAAEVRyZWFzdXJ5RmVlQ29uZmlnAAAAAAAAAQAAAAAAAAAIYmFzZV9mZWUAAAAK',
        'AAAAAQAAAHNSaXNrIHBhcmFtZXRlcnMgZW5mb3JjZWQgYnkgdGhlIFRyZWFzdXJ5IHdoZW4gZXhlY3V0aW5nIHRyYWRlcy4KClZhbHVlcyBhcmUgaW50ZXJwcmV0ZWQgYnkgYGNyYXRlOjpyaXNrOjoqYCBjaGVja3MuAAAAAAAAAAAWVHJlYXN1cnlSaXNrUGFyYW1ldGVycwAAAAAAAwAAAMhNYXhpbXVtIGZlZSBhZGp1c3RtZW50IChhZGRpdGl2ZSBvciBzdWJ0cmFjdGl2ZSkgZHJpdmVuIGJ5IHdoZXRoZXIgYSB0cmFkZQppbmNyZWFzZXMgb3IgZGVjcmVhc2VzIGBhYnMobmV0X2ltYmFsYW5jZSlgOyBleHByZXNzZWQgaW4gYFBSSUNFX1BSRUNJU0lPTmAuCgpFeGFtcGxlOiBgNTBfMDAwYCA9IDAuNTAlIG1heCBzdXJjaGFyZ2UvcmViYXRlLgAAABFpbWJhbGFuY2VfZmVlX21heAAAAAAAAAoAAACzSGFyZCBjYXAgb24gYWJzb2x1dGUgbmV0IGludmVudG9yeSBpbWJhbGFuY2UgaW4gKip0b2tlbiB1bml0cyoqOgpgYWJzKGxvbmdfYmFsYW5jZSAtIHNob3J0X2JhbGFuY2UpIDw9IG1heF9uZXRfaW1iYWxhbmNlX3Rva2Vuc2AuCgpTZXQgdG8gMCB0byBkaXNhYmxlIHRoZSBndWFyZCAobm90IHJlY29tbWVuZGVkKS4AAAAAGG1heF9uZXRfaW1iYWxhbmNlX3Rva2VucwAAAAoAAAA/VGhyZXNob2xkIGluIGBQUklDRV9QUkVDSVNJT05gIHVuaXRzIHVzZWQgYnkgdG94aWMtdHJhZGUgbG9naWMuAAAAAA90b3hpY190aHJlc2hvbGQAAAAACg==',
        'AAAAAQAAAGJDb21wb3NpdGUga2V5IGZvciBgKHBhaXIsIHVzZXIpYCBMUCBzaGFyZSBiYWxhbmNlcy4KClN0b3JlZCB1bmRlciBbYFRyZWFzdXJ5RGF0YUtleTo6VXNlclNoYXJlc2BdLgAAAAAAAAAAAA1Vc2VyU2hhcmVzS2V5AAAAAAAAAgAAAAAAAAAEcGFpcgAAABMAAAAAAAAABHVzZXIAAAAT',
        'AAAAAgAAAK5QZXJzaXN0ZW50IHN0b3JhZ2Uga2V5cyBmb3IgYWxsIHBlci1wYWlyIHN0YXRlLgoKRXZlcnl0aGluZyBoZXJlIGlzIHN0b3JlZCBpbiAqKnBlcnNpc3RlbnQqKiBzdG9yYWdlIGFuZCBtdXN0IGJlIFRUTC1idW1wZWQKKGBidW1wX3BlcnNpc3RlbnRgKSBvbiByZWFkL3dyaXRlIHRvIGF2b2lkIGV4cGlyeS4AAAAAAAAAAAAPVHJlYXN1cnlEYXRhS2V5AAAAAAcAAAABAAAAH1BhaXIgLT4gdG9rZW4vY29uZmlnIGFkZHJlc3Nlcy4AAAAABkNvbmZpZwAAAAAAAQAAABMAAAABAAAAI1BhaXIgLT4gVHJlYXN1cnkgaW52ZW50b3J5IGFtb3VudHMuAAAAAAhCYWxhbmNlcwAAAAEAAAATAAAAAQAAAC5QYWlyIC0+IHJpc2sga25vYnMgKHRveGljaXR5IHRocmVzaG9sZCwgZXRjLikuAAAAAAAOUmlza1BhcmFtZXRlcnMAAAAAAAEAAAATAAAAAQAAAB5QYWlyIC0+IHRvdGFsIExQIHNoYXJlIHN1cHBseS4AAAAAAAtUb3RhbFNoYXJlcwAAAAABAAAAEwAAAAEAAAAoKFBhaXIsIFVzZXIpIC0+IHVzZXIncyBMUCBzaGFyZSBiYWxhbmNlLgAAAApVc2VyU2hhcmVzAAAAAAABAAAH0AAAAA1Vc2VyU2hhcmVzS2V5AAAAAAAAAQAAABpQYWlyIC0+IGZlZSBjb25maWd1cmF0aW9uLgAAAAAACUZlZUNvbmZpZwAAAAAAAAEAAAATAAAAAQAAADJQYWlyIC0+IGFjY3VtdWxhdGVkIHByb3RvY29sIGZlZXMgKGluIFVTREMgdW5pdHMpLgAAAAAADFByb3RvY29sRmVlcwAAAAEAAAAT',
        'AAAABAAAAAAAAAAAAAAAEkFjY2Vzc0NvbnRyb2xFcnJvcgAAAAAABwAAAAAAAAAMUm9sZU5vdEZvdW5kAAAAZQAAAAAAAAAMVW5hdXRob3JpemVkAAAAZgAAAAAAAAAPQWRtaW5BbHJlYWR5U2V0AAAAAGcAAAAAAAAADEJhZFJvbGVVc2FnZQAAAGgAAAAAAAAAE0Fub3RoZXJBY3Rpb25BY3RpdmUAAAALWgAAAAAAAAAOTm9BY3Rpb25BY3RpdmUAAAAAC1sAAAAAAAAAEUFjdGlvbk5vdFJlYWR5WWV0AAAAAAALXA==',
        'AAAABAAAAAAAAAAAAAAAC09yYWNsZUVycm9yAAAAAAYAAAAeT3JhY2xlRXJyb3I6IE9yYWNsZU5vblBvc2l0aXZlAAAAAAART3JhY2xlTm9uUG9zaXRpdmUAAAAAAAJZAAAAAAAAABFPcmFjbGVUb29Wb2xhdGlsZQAAAAAAAloAAAAAAAAAEk9yYWNsZVN0YWxlRm9yUGFpcgAAAAACWwAAAAAAAAANT3JhY2xlSW52YWxpZAAAAAAAAlwAAAAAAAAAFkZhaWxlZFRvR2V0T3JhY2xlUHJpY2UAAAAAAl0AAAAAAAAADEludmFsaWRJbnB1dAAAAl4=',
        'AAAAAgAAAAAAAAAAAAAADk9yYWNsZVZhbGlkaXR5AAAAAAAFAAAAAAAAAAAAAAALTm9uUG9zaXRpdmUAAAAAAAAAAAAAAAALVG9vVm9sYXRpbGUAAAAAAAAAAAAAAAAMU3RhbGVGb3JQYWlyAAAAAAAAAAAAAAAGRnJvemVuAAAAAAAAAAAAAAAAAAVWYWxpZAAAAA==',
        'AAAAAQAAAAAAAAAAAAAAFEhpc3RvcmljYWxPcmFjbGVEYXRhAAAABAAAAAAAAAANbGFzdF9kZWxheV90cwAAAAAAAAYAAAAAAAAACmxhc3RfcHJpY2UAAAAAAAoAAAAAAAAAD2xhc3RfcHJpY2VfdHdhcAAAAAAKAAAAAAAAAA5sYXN0X3VwZGF0ZV90cwAAAAAABg==',
        'AAAAAQAAAAAAAAAAAAAAD09yYWNsZVByaWNlRGF0YQAAAAACAAAAAAAAAAVkZWxheQAAAAAAB9AAAAAFRGVsYXkAAAAAAAAAAAAABXByaWNlAAAAAAAACg==',
        'AAAAAgAAAAAAAAAAAAAADE9yYWNsZVNvdXJjZQAAAAEAAAAAAAAAAAAAAAlSZWZsZWN0b3IAAAA=',
        'AAAAAQAAAAAAAAAAAAAAClBhaXJQYXJhbXMAAAAAAAoAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAFYXNzZXQAAAAAAAARAAAAAAAAAApjYWxjdWxhdG9yAAAAAAATAAAAAAAAABNjb2xsYXRlcmFsX3Blcl9wYWlyAAAAAAoAAAAAAAAAEGNvbGxhdGVyYWxfdG9rZW4AAAATAAAAAAAAAApsb25nX3Rva2VuAAAAAAATAAAAAAAAAAtsb3dlcl9ib3VuZAAAAAAKAAAAAAAAAAZvcmFjbGUAAAAAABMAAAAAAAAAC3Nob3J0X3Rva2VuAAAAABMAAAAAAAAAC3VwcGVyX2JvdW5kAAAAAAo=',
        'AAAAAgAAAAAAAAAAAAAABFNpZGUAAAACAAAAAAAAAAAAAAAETG9uZwAAAAAAAAAAAAAABVNob3J0AAAA',
        'AAAAAgAAAAAAAAAAAAAACURpcmVjdGlvbgAAAAAAAAIAAAAAAAAAAAAAAANCdXkAAAAAAAAAAAAAAAAEU2VsbA==',
        'AAAAAQAAAAAAAAAAAAAAD1BhaXJQcmljZUJvdW5kcwAAAAACAAAAAAAAAAVsb3dlcgAAAAAAAAoAAAAAAAAABXVwcGVyAAAAAAAACg==',
        'AAAAAQAAAAAAAAAAAAAAC1BhaXJBbW91bnRzAAAAAAIAAAAAAAAABGxvbmcAAAAKAAAAAAAAAAVzaG9ydAAAAAAAAAo=',
        'AAAAAQAAAAAAAAAAAAAAE1BhaXJBbW91bnRzV2l0aFVTREMAAAAAAwAAAAAAAAAEbG9uZwAAAAoAAAAAAAAABXNob3J0AAAAAAAACgAAAAAAAAAEdXNkYwAAAAo=',
        'AAAAAQAAAAAAAAAAAAAAClBhaXJUb2tlbnMAAAAAAAMAAAAAAAAACmNvbGxhdGVyYWwAAAAAABMAAAAAAAAABGxvbmcAAAATAAAAAAAAAAVzaG9ydAAAAAAAABM=',
        'AAAAAgAAAAAAAAAAAAAAClBhaXJTdGF0dXMAAAAAAAMAAAAAAAAAAAAAAAhJbmFjdGl2ZQAAAAAAAAAAAAAABkFjdGl2ZQAAAAAAAAAAAAAAAAAHRXhwaXJlZAA=',
        'AAAAAQAAAAAAAAAAAAAADkNvbGxhdGVyYWxJbmZvAAAAAAAEAAAAAAAAABNjb2xsYXRlcmFsX3Blcl9wYWlyAAAAAAoAAAAAAAAAF2NvbGxhdGVyYWxfcGVyY2VudF9sb25nAAAAAAoAAAAAAAAAEGNvbGxhdGVyYWxfdG9rZW4AAAATAAAAAAAAABB0b3RhbF9jb2xsYXRlcmFsAAAACg==',
        'AAAAAQAAAAAAAAAAAAAAC1BhaXJTdW1tYXJ5AAAAAAcAAAAAAAAABWFzc2V0AAAAAAAAEQAAAAAAAAAKY2FsY3VsYXRvcgAAAAAAEwAAAAAAAAAKY29sbGF0ZXJhbAAAAAAH0AAAAA5Db2xsYXRlcmFsSW5mbwAAAAAAAAAAAAZvcmFjbGUAAAAAABMAAAAAAAAADHByaWNlX2JvdW5kcwAAB9AAAAAPUGFpclByaWNlQm91bmRzAAAAAAAAAAAGc3RhdHVzAAAAAAfQAAAAClBhaXJTdGF0dXMAAAAAAAAAAAAGdG9rZW5zAAAAAAfQAAAAClBhaXJUb2tlbnMAAA==',
        'AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAAAwAAAAAAAAATQW5vdGhlckFjdGlvbkFjdGl2ZQAAAAtaAAAAAAAAAA5Ob0FjdGlvbkFjdGl2ZQAAAAALWwAAAAAAAAARQWN0aW9uTm90UmVhZHlZZXQAAAAAAAtc',
        'AAAABAAAAAAAAAAAAAAACU1hdGhFcnJvcgAAAAAAAAkAAAAZTWF0aEVycm9yOiBOdW1iZXJPdmVyZmxvdwAAAAAAAA5OdW1iZXJPdmVyZmxvdwAAAAAB/gAAAB1NYXRoRXJyb3I6IEdlbmVyaWMgbWF0aCBlcnJvcgAAAAAAAAlNYXRoRXJyb3IAAAAAAAH/AAAALU1hdGhFcnJvcjogQWRkaXRpb24gb3BlcmF0aW9uIGNhdXNlZCBvdmVyZmxvdwAAAAAAABBBZGRpdGlvbk92ZXJmbG93AAACAAAAADFNYXRoRXJyb3I6IFN1YnRyYWN0aW9uIG9wZXJhdGlvbiBjYXVzZWQgdW5kZXJmbG93AAAAAAAAFFN1YnRyYWN0aW9uVW5kZXJmbG93AAACAQAAADNNYXRoRXJyb3I6IE11bHRpcGxpY2F0aW9uIG9wZXJhdGlvbiBjYXVzZWQgb3ZlcmZsb3cAAAAAFk11bHRpcGxpY2F0aW9uT3ZlcmZsb3cAAAAAAgIAAAAbTWF0aEVycm9yOiBEaXZpc2lvbiBieSB6ZXJvAAAAAA5EaXZpc2lvbkJ5WmVybwAAAAACAwAAACNNYXRoRXJyb3I6IFR5cGUgY29udmVyc2lvbiBvdmVyZmxvdwAAAAASQ29udmVyc2lvbk92ZXJmbG93AAAAAAIEAAAAP01hdGhFcnJvcjogQXR0ZW1wdGVkIHRvIGNvbnZlcnQgbmVnYXRpdmUgdmFsdWUgdG8gdW5zaWduZWQgdHlwZQAAAAASTmVnYXRpdmVUb1Vuc2lnbmVkAAAAAAIFAAAAKk1hdGhFcnJvcjogRml4ZWQtcG9pbnQgYXJpdGhtZXRpYyBvdmVyZmxvdwAAAAAAEkZpeGVkUG9pbnRPdmVyZmxvdwAAAAACBg==',
        'AAAABAAAAAAAAAAAAAAADFN0b3JhZ2VFcnJvcgAAAAQAAAAMU3RvcmFnZUVycm9yAAAAEkFscmVhZHlJbml0aWFsaXplZAAAAAAAyQAAAAAAAAATVmFsdWVOb3RJbml0aWFsaXplZAAAAAH1AAAAAAAAAAxWYWx1ZU1pc3NpbmcAAAH2AAAAAAAAABRWYWx1ZUNvbnZlcnNpb25FcnJvcgAAAfc=',
        'AAAABAAAAAAAAAAAAAAAD1ZhbGlkYXRpb25FcnJvcgAAAAAEAAAAD1ZhbGlkYXRpb25FcnJvcgAAAAAMSW52YWxpZFRva2VuAAADIQAAAAAAAAARSW52YWxpZFBlcmNlbnRhZ2UAAAAAAAMiAAAAAAAAAApaZXJvQW1vdW50AAAAAAMkAAAAAAAAABZJbnZhbGlkT3JhY2xlVGltZXN0YW1wAAAAAAMl',
        'AAAAAQAAAAAAAAAAAAAABURlbGF5AAAAAAAAAQAAAAAAAAABMAAAAAAAAAY=',
      ]),
      options,
    )
  }
  public readonly fromJSON = {
    deposit: this.txFromJSON<u128>,
    withdraw: this.txFromJSON<PairAmountsWithUSDC>,
    get_config: this.txFromJSON<PairConfig>,
    get_prices: this.txFromJSON<PairAmountsWithUSDC>,
    get_balances: this.txFromJSON<PairAmountsWithUSDC>,
    get_total_shares: this.txFromJSON<u128>,
    get_user_shares: this.txFromJSON<u128>,
    get_fee_config: this.txFromJSON<TreasuryFeeConfig>,
    get_summary: this.txFromJSON<TreasurySummary>,
    get_user_with_summary: this.txFromJSON<TreasuryUserSummary>,
    estimate_trade: this.txFromJSON<readonly [u128, u128]>,
    buy_long: this.txFromJSON<readonly [u128, u128]>,
    sell_long: this.txFromJSON<readonly [u128, u128]>,
    buy_short: this.txFromJSON<readonly [u128, u128]>,
    sell_short: this.txFromJSON<readonly [u128, u128]>,
    add_pair: this.txFromJSON<null>,
    set_fee_config: this.txFromJSON<null>,
    set_usdc_floor: this.txFromJSON<null>,
    get_protocol_fees: this.txFromJSON<u128>,
    claim_protocol_fees: this.txFromJSON<u128>,
    kill_deposit: this.txFromJSON<null>,
    kill_withdraw: this.txFromJSON<null>,
    kill_trade: this.txFromJSON<null>,
    kill_withdraw_floor: this.txFromJSON<null>,
    unkill_deposit: this.txFromJSON<null>,
    unkill_withdraw: this.txFromJSON<null>,
    unkill_trade: this.txFromJSON<null>,
    unkill_withdraw_floor: this.txFromJSON<null>,
    get_is_killed_deposit: this.txFromJSON<boolean>,
    get_is_killed_withdraw: this.txFromJSON<boolean>,
    get_is_killed_trade: this.txFromJSON<boolean>,
    get_is_killed_withdraw_floor: this.txFromJSON<boolean>,
    version: this.txFromJSON<u32>,
    contract_name: this.txFromJSON<string>,
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

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

export const LongShortPairError = {
  201: { message: 'AlreadyInitialized' },
  203: { message: 'InvalidOracle' },
  204: { message: 'InvalidInput' },
  206: { message: 'FailedToGetPoolReserves' },
  207: { message: 'FailedToGetCalculatorPercent' },
  208: { message: 'FailedToUpdateTokenScalingFactor' },
  209: { message: 'FailedToGetOraclePrice' },
  210: { message: 'PoolsNotSet' },
  211: { message: 'FundingRateRequiresPoolLiquidity' },
  212: { message: 'InvalidCalculatorValue' },
  213: { message: 'MintingDisabled' },
  214: { message: 'InvalidStatus' },
  215: { message: 'InsufficientInventory' },
  216: { message: 'ActionPaused' },
  217: { message: 'PairExpired' },
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
   * Construct and simulate a mint transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Mints equal amounts of LONG and SHORT tokens by depositing collateral.
   *
   * For `tokens_to_mint`, the contract:
   * 1. Calculates `collateral_used = tokens_to_mint * collateral_per_pair`
   * 2. Transfers `collateral_used` of collateral from `user` into the Pair contract
   * 3. Mints `tokens_to_mint` LONG and `tokens_to_mint` SHORT to the user
   * 4. Increments the tracked `total_collateral`
   *
   * This is the primary entry mechanism for creating new synthetic exposure.
   *
   * ### Reverts
   * - [`LongShortPairError::InvalidInput`] if `tokens_to_mint == 0`.
   * - [`LongShortPairError::ActionPaused`] if minting is paused.
   * - [`LongShortPairError::MintingDisabled`] if the pair is not [`PairStatus::Active`].
   *
   * ### Returns
   * Returns the amount of collateral transferred in (`collateral_used`).
   */
  mint: (
    { user, tokens_to_mint }: { user: string; tokens_to_mint: u128 },
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
   * Construct and simulate a redeem transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Redeems equal amounts of LONG and SHORT tokens for collateral.
   *
   * For `tokens_to_redeem`, the contract:
   * 1. Synchronizes internal collateral accounting (`sync_collateral`)
   * 2. Burns `tokens_to_redeem` LONG and `tokens_to_redeem` SHORT from the user
   * 3. Calculates `collateral_returned = tokens_to_redeem * collateral_per_pair`
   * 4. Transfers `collateral_returned` of collateral back to the user
   * 5. Decrements the tracked `total_collateral`
   *
   * This redemption path requires burning *both* legs (LONG and SHORT) in equal quantity.
   *
   * ### Reverts
   * - [`LongShortPairError::InvalidInput`] if `tokens_to_redeem == 0`.
   * - [`LongShortPairError::ActionPaused`] if redeeming is paused.
   * - [`LongShortPairError::InsufficientInventory`] if the contract does not have enough collateral.
   *
   * ### Returns
   * Returns the amount of collateral returned (`collateral_returned`).
   */
  redeem: (
    { user, tokens_to_redeem }: { user: string; tokens_to_redeem: u128 },
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
   * Construct and simulate a redeem_one transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Redeems a single side (LONG *or* SHORT) for collateral after expiration.
   *
   * This method is only enabled when the pair status is [`PairStatus::Expired`]. At expiry,
   * settlement determines the collateral split between LONG and SHORT using
   * `collateral_percent_long` (and `1 - collateral_percent_long` for SHORT).
   *
   * The contract:
   * 1. Synchronizes internal collateral accounting (`sync_collateral`)
   * 2. Requires the pair to be expired
   * 3. Determines the payout percent for `side`
   * 4. Burns `tokens_to_redeem` of the chosen `side`
   * 5. Pays out `tokens_to_redeem * collateral_per_pair * side_pct`
   * 6. Decrements tracked `total_collateral`
   *
   * ### Notes
   * - Redeeming a worthless side is forbidden (e.g., side percent is 0).
   * - A computed payout of 0 is rejected (e.g., tiny redemption amount).
   *
   * ### Reverts
   * - [`LongShortPairError::InvalidInput`] if `tokens_to_redeem == 0` or payout would be 0.
   * - [`LongShortPairError::ActionPaused`] if redeeming is paused.
   * - [`LongShortPairError::InvalidStatus`] if the pair is not expired.
   * - [`LongShortPairErro
   */
  redeem_one: (
    { user, side, tokens_to_redeem }: { user: string; side: Side; tokens_to_redeem: u128 },
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
   * Construct and simulate a sync_collateral_with_price transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Updates the Pair's settlement allocation (`collateral_percent_long`) using the oracle TWAP.
   *
   * This is a passthrough to `crate::utils::sync_collateral(&e)`.
   *
   * Despite the name, this does **not** transfer collateral or reconcile balances. It only:
   * - Queries the oracle TWAP
   * - Computes a new `collateral_percent_long` via the calculator
   * - Updates `last_update_ts` and `collateral_percent_long`
   * - Potentially marks the Pair as [`PairStatus::Expired`] and sets `expiration_ts`
   * if the TWAP reaches or crosses the configured bounds.
   *
   * This function is useful for keepers/frontends that want to “poke” the Pair so that
   * settlement state is fresh before mint/redeem flows or UI display.
   */
  sync_collateral_with_price: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
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
   * Returns the token contract addresses for the Pair: LONG, SHORT, and collateral.
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
  }) => Promise<AssembledTransaction<PairTokens>>

  /**
   * Construct and simulate a get_price_bounds transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the current configured price bounds for the Pair.
   *
   * These bounds define the linear mapping used to convert settlement percent into a scaled price.
   */
  get_price_bounds: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean
  }) => Promise<AssembledTransaction<PairPriceBounds>>

  /**
   * Construct and simulate a get_user_token_balances transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the user's balances of LONG and SHORT tokens.
   */
  get_user_token_balances: (
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
  ) => Promise<AssembledTransaction<PairAmounts>>

  /**
   * Construct and simulate a get_total_token_supplies transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the total supply of LONG and SHORT tokens.
   */
  get_total_token_supplies: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean
  }) => Promise<AssembledTransaction<PairAmounts>>

  /**
   * Construct and simulate a get_collateral_info transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns current collateral configuration and settlement information.
   *
   * `collateral_percent_long` is the settlement allocation to LONG in `PRICE_PRECISION` units.
   * SHORT receives `PRICE_PRECISION - collateral_percent_long`.
   */
  get_collateral_info: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean
  }) => Promise<AssembledTransaction<CollateralInfo>>

  /**
   * Construct and simulate a get_summary transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns an aggregated snapshot of the Pair state.
   *
   * This is a convenience method for frontends/indexers to avoid multiple round-trips.
   */
  get_summary: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean
  }) => Promise<AssembledTransaction<PairSummary>>

  /**
   * Construct and simulate a get_status transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the current pair status.
   */
  get_status: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean
  }) => Promise<AssembledTransaction<PairStatus>>

  /**
   * Construct and simulate a set_calculator transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Updates the calculator address used by this Pair.
   *
   * ### Reverts
   * - Reverts if `admin` is not authorized.
   */
  set_calculator: (
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
   * Construct and simulate a set_oracle transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Updates the oracle address used by this Pair.
   *
   * ### Reverts
   * - Reverts if `admin` is not authorized.
   */
  set_oracle: (
    { admin, oracle }: { admin: string; oracle: string },
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
   * Construct and simulate a kill_mint transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  kill_mint: (
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
   * Construct and simulate a kill_redeem transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  kill_redeem: (
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
   * Construct and simulate a unkill_mint transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  unkill_mint: (
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
   * Construct and simulate a unkill_redeem transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  unkill_redeem: (
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
   * Construct and simulate a get_is_killed_mint transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_is_killed_mint: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
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
   * Construct and simulate a get_is_killed_redeem transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_is_killed_redeem: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
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
   * Construct and simulate a get_price transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the current settlement allocation to LONG in `PRICE_PRECISION` units.
   *
   * This is not a spot price. It is the settlement fraction of collateral assigned to LONG.
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
  }) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a get_scaled_price transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the "scaled price" implied by the current settlement allocation.
   *
   * This maps `collateral_percent_long` linearly into the configured `[lower_bound, upper_bound]` range:
   *
   * ```text
   * scaled_price = lower_bound + (upper_bound - lower_bound) * collateral_percent_long / PRICE_PRECISION
   * ```
   *
   * ### Returns
   * Returns the scaled price in the same units as the configured bounds.
   */
  get_scaled_price: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
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
    { params }: { params: PairParams },
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
    return ContractClient.deploy({ params }, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([
        'AAAAAAAAAtxJbml0aWFsaXplcyB0aGUgTG9uZ1Nob3J0UGFpciBjb250cmFjdC4KClRoaXMgY29uc3RydWN0b3IgaXMgaW50ZW5kZWQgdG8gYmUgY2FsbGVkIGV4YWN0bHkgb25jZSBhdCBkZXBsb3kgdGltZS4gSXQ6Ci0gU2V0cyBjb3JlIGFkbWluIHJvbGVzIChgQWRtaW5gLCBgUGF1c2VBZG1pbmAsIGBFbWVyZ2VuY3lBZG1pbmApIHRvIGBwYXJhbXMuYWRtaW5gCi0gU3RvcmVzIGltbXV0YWJsZS1pc2ggcGFpciBjb25maWd1cmF0aW9uIHN1Y2ggYXMgdGhlIHVuZGVybHlpbmcgYGFzc2V0YAotIFN0b3JlcyBjb2xsYXRlcmFsIGNvbmZpZ3VyYXRpb24gKGBjb2xsYXRlcmFsX3Rva2VuYCwgYGNvbGxhdGVyYWxfcGVyX3BhaXJgKQotIFN0b3JlcyB0b2tlbiBjb250cmFjdCBhZGRyZXNzZXMgZm9yIHRoZSBMT05HIGFuZCBTSE9SVCB0b2tlbnMKLSBTdG9yZXMgb3JhY2xlIGFuZCBjYWxjdWxhdG9yIGFkZHJlc3NlcwotIEluaXRpYWxpemVzIHByaWNlIGJvdW5kcyAoYGxvd2VyX2JvdW5kYCwgYHVwcGVyX2JvdW5kYCkKCiMjIyBSZXZlcnRzCi0gW2BMb25nU2hvcnRQYWlyRXJyb3I6OkFscmVhZHlJbml0aWFsaXplZGBdIGlmIHRoZSBjb250cmFjdCBoYXMgYWxyZWFkeSBiZWVuIGluaXRpYWxpemVkLgoKIyMjIEFyZ3VtZW50cwotIGBlYDogU29yb2JhbiBlbnZpcm9ubWVudC4KLSBgcGFyYW1zYDogRnVsbCBzZXQgb2YgcGFpciBwYXJhbWV0ZXJzIHVzZWQgdG8gYm9vdHN0cmFwIHRoZSBjb250cmFjdC4AAAANX19jb25zdHJ1Y3RvcgAAAAAAAAEAAAAAAAAABnBhcmFtcwAAAAAH0AAAAApQYWlyUGFyYW1zAAAAAAAA',
        'AAAAAAAAAvFNaW50cyBlcXVhbCBhbW91bnRzIG9mIExPTkcgYW5kIFNIT1JUIHRva2VucyBieSBkZXBvc2l0aW5nIGNvbGxhdGVyYWwuCgpGb3IgYHRva2Vuc190b19taW50YCwgdGhlIGNvbnRyYWN0OgoxLiBDYWxjdWxhdGVzIGBjb2xsYXRlcmFsX3VzZWQgPSB0b2tlbnNfdG9fbWludCAqIGNvbGxhdGVyYWxfcGVyX3BhaXJgCjIuIFRyYW5zZmVycyBgY29sbGF0ZXJhbF91c2VkYCBvZiBjb2xsYXRlcmFsIGZyb20gYHVzZXJgIGludG8gdGhlIFBhaXIgY29udHJhY3QKMy4gTWludHMgYHRva2Vuc190b19taW50YCBMT05HIGFuZCBgdG9rZW5zX3RvX21pbnRgIFNIT1JUIHRvIHRoZSB1c2VyCjQuIEluY3JlbWVudHMgdGhlIHRyYWNrZWQgYHRvdGFsX2NvbGxhdGVyYWxgCgpUaGlzIGlzIHRoZSBwcmltYXJ5IGVudHJ5IG1lY2hhbmlzbSBmb3IgY3JlYXRpbmcgbmV3IHN5bnRoZXRpYyBleHBvc3VyZS4KCiMjIyBSZXZlcnRzCi0gW2BMb25nU2hvcnRQYWlyRXJyb3I6OkludmFsaWRJbnB1dGBdIGlmIGB0b2tlbnNfdG9fbWludCA9PSAwYC4KLSBbYExvbmdTaG9ydFBhaXJFcnJvcjo6QWN0aW9uUGF1c2VkYF0gaWYgbWludGluZyBpcyBwYXVzZWQuCi0gW2BMb25nU2hvcnRQYWlyRXJyb3I6Ok1pbnRpbmdEaXNhYmxlZGBdIGlmIHRoZSBwYWlyIGlzIG5vdCBbYFBhaXJTdGF0dXM6OkFjdGl2ZWBdLgoKIyMjIFJldHVybnMKUmV0dXJucyB0aGUgYW1vdW50IG9mIGNvbGxhdGVyYWwgdHJhbnNmZXJyZWQgaW4gKGBjb2xsYXRlcmFsX3VzZWRgKS4AAAAAAAAEbWludAAAAAIAAAAAAAAABHVzZXIAAAATAAAAAAAAAA50b2tlbnNfdG9fbWludAAAAAAACgAAAAEAAAAK',
        'AAAAAAAAA0dSZWRlZW1zIGVxdWFsIGFtb3VudHMgb2YgTE9ORyBhbmQgU0hPUlQgdG9rZW5zIGZvciBjb2xsYXRlcmFsLgoKRm9yIGB0b2tlbnNfdG9fcmVkZWVtYCwgdGhlIGNvbnRyYWN0OgoxLiBTeW5jaHJvbml6ZXMgaW50ZXJuYWwgY29sbGF0ZXJhbCBhY2NvdW50aW5nIChgc3luY19jb2xsYXRlcmFsYCkKMi4gQnVybnMgYHRva2Vuc190b19yZWRlZW1gIExPTkcgYW5kIGB0b2tlbnNfdG9fcmVkZWVtYCBTSE9SVCBmcm9tIHRoZSB1c2VyCjMuIENhbGN1bGF0ZXMgYGNvbGxhdGVyYWxfcmV0dXJuZWQgPSB0b2tlbnNfdG9fcmVkZWVtICogY29sbGF0ZXJhbF9wZXJfcGFpcmAKNC4gVHJhbnNmZXJzIGBjb2xsYXRlcmFsX3JldHVybmVkYCBvZiBjb2xsYXRlcmFsIGJhY2sgdG8gdGhlIHVzZXIKNS4gRGVjcmVtZW50cyB0aGUgdHJhY2tlZCBgdG90YWxfY29sbGF0ZXJhbGAKClRoaXMgcmVkZW1wdGlvbiBwYXRoIHJlcXVpcmVzIGJ1cm5pbmcgKmJvdGgqIGxlZ3MgKExPTkcgYW5kIFNIT1JUKSBpbiBlcXVhbCBxdWFudGl0eS4KCiMjIyBSZXZlcnRzCi0gW2BMb25nU2hvcnRQYWlyRXJyb3I6OkludmFsaWRJbnB1dGBdIGlmIGB0b2tlbnNfdG9fcmVkZWVtID09IDBgLgotIFtgTG9uZ1Nob3J0UGFpckVycm9yOjpBY3Rpb25QYXVzZWRgXSBpZiByZWRlZW1pbmcgaXMgcGF1c2VkLgotIFtgTG9uZ1Nob3J0UGFpckVycm9yOjpJbnN1ZmZpY2llbnRJbnZlbnRvcnlgXSBpZiB0aGUgY29udHJhY3QgZG9lcyBub3QgaGF2ZSBlbm91Z2ggY29sbGF0ZXJhbC4KCiMjIyBSZXR1cm5zClJldHVybnMgdGhlIGFtb3VudCBvZiBjb2xsYXRlcmFsIHJldHVybmVkIChgY29sbGF0ZXJhbF9yZXR1cm5lZGApLgAAAAAGcmVkZWVtAAAAAAACAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAQdG9rZW5zX3RvX3JlZGVlbQAAAAoAAAABAAAACg==',
        'AAAAAAAABABSZWRlZW1zIGEgc2luZ2xlIHNpZGUgKExPTkcgKm9yKiBTSE9SVCkgZm9yIGNvbGxhdGVyYWwgYWZ0ZXIgZXhwaXJhdGlvbi4KClRoaXMgbWV0aG9kIGlzIG9ubHkgZW5hYmxlZCB3aGVuIHRoZSBwYWlyIHN0YXR1cyBpcyBbYFBhaXJTdGF0dXM6OkV4cGlyZWRgXS4gQXQgZXhwaXJ5LApzZXR0bGVtZW50IGRldGVybWluZXMgdGhlIGNvbGxhdGVyYWwgc3BsaXQgYmV0d2VlbiBMT05HIGFuZCBTSE9SVCB1c2luZwpgY29sbGF0ZXJhbF9wZXJjZW50X2xvbmdgIChhbmQgYDEgLSBjb2xsYXRlcmFsX3BlcmNlbnRfbG9uZ2AgZm9yIFNIT1JUKS4KClRoZSBjb250cmFjdDoKMS4gU3luY2hyb25pemVzIGludGVybmFsIGNvbGxhdGVyYWwgYWNjb3VudGluZyAoYHN5bmNfY29sbGF0ZXJhbGApCjIuIFJlcXVpcmVzIHRoZSBwYWlyIHRvIGJlIGV4cGlyZWQKMy4gRGV0ZXJtaW5lcyB0aGUgcGF5b3V0IHBlcmNlbnQgZm9yIGBzaWRlYAo0LiBCdXJucyBgdG9rZW5zX3RvX3JlZGVlbWAgb2YgdGhlIGNob3NlbiBgc2lkZWAKNS4gUGF5cyBvdXQgYHRva2Vuc190b19yZWRlZW0gKiBjb2xsYXRlcmFsX3Blcl9wYWlyICogc2lkZV9wY3RgCjYuIERlY3JlbWVudHMgdHJhY2tlZCBgdG90YWxfY29sbGF0ZXJhbGAKCiMjIyBOb3RlcwotIFJlZGVlbWluZyBhIHdvcnRobGVzcyBzaWRlIGlzIGZvcmJpZGRlbiAoZS5nLiwgc2lkZSBwZXJjZW50IGlzIDApLgotIEEgY29tcHV0ZWQgcGF5b3V0IG9mIDAgaXMgcmVqZWN0ZWQgKGUuZy4sIHRpbnkgcmVkZW1wdGlvbiBhbW91bnQpLgoKIyMjIFJldmVydHMKLSBbYExvbmdTaG9ydFBhaXJFcnJvcjo6SW52YWxpZElucHV0YF0gaWYgYHRva2Vuc190b19yZWRlZW0gPT0gMGAgb3IgcGF5b3V0IHdvdWxkIGJlIDAuCi0gW2BMb25nU2hvcnRQYWlyRXJyb3I6OkFjdGlvblBhdXNlZGBdIGlmIHJlZGVlbWluZyBpcyBwYXVzZWQuCi0gW2BMb25nU2hvcnRQYWlyRXJyb3I6OkludmFsaWRTdGF0dXNgXSBpZiB0aGUgcGFpciBpcyBub3QgZXhwaXJlZC4KLSBbYExvbmdTaG9ydFBhaXJFcnJvAAAACnJlZGVlbV9vbmUAAAAAAAMAAAAAAAAABHVzZXIAAAATAAAAAAAAAARzaWRlAAAH0AAAAARTaWRlAAAAAAAAABB0b2tlbnNfdG9fcmVkZWVtAAAACgAAAAEAAAAK',
        'AAAAAAAAAqVVcGRhdGVzIHRoZSBQYWlyJ3Mgc2V0dGxlbWVudCBhbGxvY2F0aW9uIChgY29sbGF0ZXJhbF9wZXJjZW50X2xvbmdgKSB1c2luZyB0aGUgb3JhY2xlIFRXQVAuCgpUaGlzIGlzIGEgcGFzc3Rocm91Z2ggdG8gYGNyYXRlOjp1dGlsczo6c3luY19jb2xsYXRlcmFsKCZlKWAuCgpEZXNwaXRlIHRoZSBuYW1lLCB0aGlzIGRvZXMgKipub3QqKiB0cmFuc2ZlciBjb2xsYXRlcmFsIG9yIHJlY29uY2lsZSBiYWxhbmNlcy4gSXQgb25seToKLSBRdWVyaWVzIHRoZSBvcmFjbGUgVFdBUAotIENvbXB1dGVzIGEgbmV3IGBjb2xsYXRlcmFsX3BlcmNlbnRfbG9uZ2AgdmlhIHRoZSBjYWxjdWxhdG9yCi0gVXBkYXRlcyBgbGFzdF91cGRhdGVfdHNgIGFuZCBgY29sbGF0ZXJhbF9wZXJjZW50X2xvbmdgCi0gUG90ZW50aWFsbHkgbWFya3MgdGhlIFBhaXIgYXMgW2BQYWlyU3RhdHVzOjpFeHBpcmVkYF0gYW5kIHNldHMgYGV4cGlyYXRpb25fdHNgCmlmIHRoZSBUV0FQIHJlYWNoZXMgb3IgY3Jvc3NlcyB0aGUgY29uZmlndXJlZCBib3VuZHMuCgpUaGlzIGZ1bmN0aW9uIGlzIHVzZWZ1bCBmb3Iga2VlcGVycy9mcm9udGVuZHMgdGhhdCB3YW50IHRvIOKAnHBva2XigJ0gdGhlIFBhaXIgc28gdGhhdApzZXR0bGVtZW50IHN0YXRlIGlzIGZyZXNoIGJlZm9yZSBtaW50L3JlZGVlbSBmbG93cyBvciBVSSBkaXNwbGF5LgAAAAAAABpzeW5jX2NvbGxhdGVyYWxfd2l0aF9wcmljZQAAAAAAAAAAAAEAAAAK',
        'AAAAAAAAAE9SZXR1cm5zIHRoZSB0b2tlbiBjb250cmFjdCBhZGRyZXNzZXMgZm9yIHRoZSBQYWlyOiBMT05HLCBTSE9SVCwgYW5kIGNvbGxhdGVyYWwuAAAAAApnZXRfdG9rZW5zAAAAAAAAAAAAAQAAB9AAAAAKUGFpclRva2VucwAA',
        'AAAAAAAAAJlSZXR1cm5zIHRoZSBjdXJyZW50IGNvbmZpZ3VyZWQgcHJpY2UgYm91bmRzIGZvciB0aGUgUGFpci4KClRoZXNlIGJvdW5kcyBkZWZpbmUgdGhlIGxpbmVhciBtYXBwaW5nIHVzZWQgdG8gY29udmVydCBzZXR0bGVtZW50IHBlcmNlbnQgaW50byBhIHNjYWxlZCBwcmljZS4AAAAAAAAQZ2V0X3ByaWNlX2JvdW5kcwAAAAAAAAABAAAH0AAAAA9QYWlyUHJpY2VCb3VuZHMA',
        'AAAAAAAAADVSZXR1cm5zIHRoZSB1c2VyJ3MgYmFsYW5jZXMgb2YgTE9ORyBhbmQgU0hPUlQgdG9rZW5zLgAAAAAAABdnZXRfdXNlcl90b2tlbl9iYWxhbmNlcwAAAAABAAAAAAAAAAR1c2VyAAAAEwAAAAEAAAfQAAAAC1BhaXJBbW91bnRzAA==',
        'AAAAAAAAADJSZXR1cm5zIHRoZSB0b3RhbCBzdXBwbHkgb2YgTE9ORyBhbmQgU0hPUlQgdG9rZW5zLgAAAAAAGGdldF90b3RhbF90b2tlbl9zdXBwbGllcwAAAAAAAAABAAAH0AAAAAtQYWlyQW1vdW50cwA=',
        'AAAAAAAAANxSZXR1cm5zIGN1cnJlbnQgY29sbGF0ZXJhbCBjb25maWd1cmF0aW9uIGFuZCBzZXR0bGVtZW50IGluZm9ybWF0aW9uLgoKYGNvbGxhdGVyYWxfcGVyY2VudF9sb25nYCBpcyB0aGUgc2V0dGxlbWVudCBhbGxvY2F0aW9uIHRvIExPTkcgaW4gYFBSSUNFX1BSRUNJU0lPTmAgdW5pdHMuClNIT1JUIHJlY2VpdmVzIGBQUklDRV9QUkVDSVNJT04gLSBjb2xsYXRlcmFsX3BlcmNlbnRfbG9uZ2AuAAAAE2dldF9jb2xsYXRlcmFsX2luZm8AAAAAAAAAAAEAAAfQAAAADkNvbGxhdGVyYWxJbmZvAAA=',
        'AAAAAAAAAIVSZXR1cm5zIGFuIGFnZ3JlZ2F0ZWQgc25hcHNob3Qgb2YgdGhlIFBhaXIgc3RhdGUuCgpUaGlzIGlzIGEgY29udmVuaWVuY2UgbWV0aG9kIGZvciBmcm9udGVuZHMvaW5kZXhlcnMgdG8gYXZvaWQgbXVsdGlwbGUgcm91bmQtdHJpcHMuAAAAAAAAC2dldF9zdW1tYXJ5AAAAAAAAAAABAAAH0AAAAAtQYWlyU3VtbWFyeQA=',
        'AAAAAAAAACBSZXR1cm5zIHRoZSBjdXJyZW50IHBhaXIgc3RhdHVzLgAAAApnZXRfc3RhdHVzAAAAAAAAAAAAAQAAB9AAAAAKUGFpclN0YXR1cwAA',
        'AAAAAAAAAGZVcGRhdGVzIHRoZSBjYWxjdWxhdG9yIGFkZHJlc3MgdXNlZCBieSB0aGlzIFBhaXIuCgojIyMgUmV2ZXJ0cwotIFJldmVydHMgaWYgYGFkbWluYCBpcyBub3QgYXV0aG9yaXplZC4AAAAAAA5zZXRfY2FsY3VsYXRvcgAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAApjYWxjdWxhdG9yAAAAAAATAAAAAA==',
        'AAAAAAAAAGJVcGRhdGVzIHRoZSBvcmFjbGUgYWRkcmVzcyB1c2VkIGJ5IHRoaXMgUGFpci4KCiMjIyBSZXZlcnRzCi0gUmV2ZXJ0cyBpZiBgYWRtaW5gIGlzIG5vdCBhdXRob3JpemVkLgAAAAAACnNldF9vcmFjbGUAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAGb3JhY2xlAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAAJa2lsbF9taW50AAAAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAALa2lsbF9yZWRlZW0AAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAALdW5raWxsX21pbnQAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAANdW5raWxsX3JlZGVlbQAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAASZ2V0X2lzX2tpbGxlZF9taW50AAAAAAAAAAAAAQAAAAE=',
        'AAAAAAAAAAAAAAAUZ2V0X2lzX2tpbGxlZF9yZWRlZW0AAAAAAAAAAQAAAAE=',
        'AAAAAAAAAKZSZXR1cm5zIHRoZSBjdXJyZW50IHNldHRsZW1lbnQgYWxsb2NhdGlvbiB0byBMT05HIGluIGBQUklDRV9QUkVDSVNJT05gIHVuaXRzLgoKVGhpcyBpcyBub3QgYSBzcG90IHByaWNlLiBJdCBpcyB0aGUgc2V0dGxlbWVudCBmcmFjdGlvbiBvZiBjb2xsYXRlcmFsIGFzc2lnbmVkIHRvIExPTkcuAAAAAAAJZ2V0X3ByaWNlAAAAAAAAAAAAAAEAAAAK',
        'AAAAAAAAAXJSZXR1cm5zIHRoZSAic2NhbGVkIHByaWNlIiBpbXBsaWVkIGJ5IHRoZSBjdXJyZW50IHNldHRsZW1lbnQgYWxsb2NhdGlvbi4KClRoaXMgbWFwcyBgY29sbGF0ZXJhbF9wZXJjZW50X2xvbmdgIGxpbmVhcmx5IGludG8gdGhlIGNvbmZpZ3VyZWQgYFtsb3dlcl9ib3VuZCwgdXBwZXJfYm91bmRdYCByYW5nZToKCmBgYHRleHQKc2NhbGVkX3ByaWNlID0gbG93ZXJfYm91bmQgKyAodXBwZXJfYm91bmQgLSBsb3dlcl9ib3VuZCkgKiBjb2xsYXRlcmFsX3BlcmNlbnRfbG9uZyAvIFBSSUNFX1BSRUNJU0lPTgpgYGAKCiMjIyBSZXR1cm5zClJldHVybnMgdGhlIHNjYWxlZCBwcmljZSBpbiB0aGUgc2FtZSB1bml0cyBhcyB0aGUgY29uZmlndXJlZCBib3VuZHMuAAAAAAAQZ2V0X3NjYWxlZF9wcmljZQAAAAAAAAABAAAACg==',
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
        'AAAABAAAAAAAAAAAAAAAEkxvbmdTaG9ydFBhaXJFcnJvcgAAAAAADwAAAAAAAAASQWxyZWFkeUluaXRpYWxpemVkAAAAAADJAAAAAAAAAA1JbnZhbGlkT3JhY2xlAAAAAAAAywAAAAAAAAAMSW52YWxpZElucHV0AAAAzAAAAAAAAAAXRmFpbGVkVG9HZXRQb29sUmVzZXJ2ZXMAAAAAzgAAAAAAAAAcRmFpbGVkVG9HZXRDYWxjdWxhdG9yUGVyY2VudAAAAM8AAAAAAAAAIEZhaWxlZFRvVXBkYXRlVG9rZW5TY2FsaW5nRmFjdG9yAAAA0AAAAAAAAAAWRmFpbGVkVG9HZXRPcmFjbGVQcmljZQAAAAAA0QAAAAAAAAALUG9vbHNOb3RTZXQAAAAA0gAAAAAAAAAgRnVuZGluZ1JhdGVSZXF1aXJlc1Bvb2xMaXF1aWRpdHkAAADTAAAAAAAAABZJbnZhbGlkQ2FsY3VsYXRvclZhbHVlAAAAAADUAAAAAAAAAA9NaW50aW5nRGlzYWJsZWQAAAAA1QAAAAAAAAANSW52YWxpZFN0YXR1cwAAAAAAANYAAAAAAAAAFUluc3VmZmljaWVudEludmVudG9yeQAAAAAAANcAAAAAAAAADEFjdGlvblBhdXNlZAAAANgAAAAAAAAAC1BhaXJFeHBpcmVkAAAAANk=',
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
    mint: this.txFromJSON<u128>,
    redeem: this.txFromJSON<u128>,
    redeem_one: this.txFromJSON<u128>,
    sync_collateral_with_price: this.txFromJSON<u128>,
    get_tokens: this.txFromJSON<PairTokens>,
    get_price_bounds: this.txFromJSON<PairPriceBounds>,
    get_user_token_balances: this.txFromJSON<PairAmounts>,
    get_total_token_supplies: this.txFromJSON<PairAmounts>,
    get_collateral_info: this.txFromJSON<CollateralInfo>,
    get_summary: this.txFromJSON<PairSummary>,
    get_status: this.txFromJSON<PairStatus>,
    set_calculator: this.txFromJSON<null>,
    set_oracle: this.txFromJSON<null>,
    kill_mint: this.txFromJSON<null>,
    kill_redeem: this.txFromJSON<null>,
    unkill_mint: this.txFromJSON<null>,
    unkill_redeem: this.txFromJSON<null>,
    get_is_killed_mint: this.txFromJSON<boolean>,
    get_is_killed_redeem: this.txFromJSON<boolean>,
    get_price: this.txFromJSON<u128>,
    get_scaled_price: this.txFromJSON<u128>,
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

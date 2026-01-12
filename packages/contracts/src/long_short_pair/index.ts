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
}

export type DataKey =
  | { tag: 'Asset'; values: void }
  | { tag: 'Status'; values: void }
  | { tag: 'LowerBound'; values: void }
  | { tag: 'UpperBound'; values: void }
  | { tag: 'CollateralToken'; values: void }
  | { tag: 'TotalCollateral'; values: void }
  | { tag: 'CollateralPerPair'; values: void }
  | { tag: 'CollateralPercentLong'; values: void }
  | { tag: 'Calculator'; values: void }
  | { tag: 'Oracle'; values: void }
  | { tag: 'MaxPriceDivergence'; values: void }
  | { tag: 'LastUpdateTs'; values: void }
  | { tag: 'ExpirationTs'; values: void }
  | { tag: 'IsKilledMint'; values: void }
  | { tag: 'IsKilledRedeem'; values: void }

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
  calculator: string
  collateral_per_pair: u128
  collateral_token: string
  long_token: string
  lower_bound: u128
  oracle: string
  short_token: string
  upper_bound: u128
}

export type Direction = { tag: 'Long'; values: void } | { tag: 'Short'; values: void }

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
  long_token: string
  oracle: string
  price_bounds: readonly [u128, u128]
  short_token: string
  status: PairStatus
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
}

export type Delay = readonly [u64]

export interface Client {
  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize: (
    { params }: { params: PairParams },
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
   * Construct and simulate a mint transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Creates a pair of long and short tokens equal in number to tokens_to_mint. Pulls the required collateral
   * amount into this contract, defined by the collateral_per_pair value.
   *
   * @param tokens_to_mint number of long and short synthetic tokens to create.
   * @return collateral_used total collateral used to mint the synthetics.
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
   * Redeems a pair of long and short tokens equal in number to tokens_to_redeem. Returns the commensurate
   * amount of collateral to the caller for the pair of tokens, defined by the collateralPerPair value.
   * @dev This method can be called either pre or post expiration.
   * @param tokens_to_redeem number of long and short synthetic tokens to redeem.
   * @return collateral_returned total collateral returned in exchange for the pair of synthetics.
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
   */
  redeem_one: (
    { user, token, tokens_to_redeem }: { user: string; token: string; tokens_to_redeem: u128 },
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
   * Construct and simulate a sync_collateral transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  sync_collateral: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
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
   * Construct and simulate a get_price_bounds transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
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
  }) => Promise<AssembledTransaction<Array<u128>>>

  /**
   * Construct and simulate a get_user_token_balances transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
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
  ) => Promise<AssembledTransaction<Array<u128>>>

  /**
   * Construct and simulate a get_collateral_info transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
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
   * Construct and simulate a get_pair_summary transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_pair_summary: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
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
   * Construct and simulate a set_calculator transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
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
        'AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAAAQAAAAAAAAAGcGFyYW1zAAAAAAfQAAAAClBhaXJQYXJhbXMAAAAAAAA=',
        'AAAAAAAAAT9DcmVhdGVzIGEgcGFpciBvZiBsb25nIGFuZCBzaG9ydCB0b2tlbnMgZXF1YWwgaW4gbnVtYmVyIHRvIHRva2Vuc190b19taW50LiBQdWxscyB0aGUgcmVxdWlyZWQgY29sbGF0ZXJhbAphbW91bnQgaW50byB0aGlzIGNvbnRyYWN0LCBkZWZpbmVkIGJ5IHRoZSBjb2xsYXRlcmFsX3Blcl9wYWlyIHZhbHVlLgoKQHBhcmFtIHRva2Vuc190b19taW50IG51bWJlciBvZiBsb25nIGFuZCBzaG9ydCBzeW50aGV0aWMgdG9rZW5zIHRvIGNyZWF0ZS4KQHJldHVybiBjb2xsYXRlcmFsX3VzZWQgdG90YWwgY29sbGF0ZXJhbCB1c2VkIHRvIG1pbnQgdGhlIHN5bnRoZXRpY3MuAAAAAARtaW50AAAAAgAAAAAAAAAEdXNlcgAAABMAAAAAAAAADnRva2Vuc190b19taW50AAAAAAAKAAAAAQAAAAo=',
        'AAAAAAAAAbFSZWRlZW1zIGEgcGFpciBvZiBsb25nIGFuZCBzaG9ydCB0b2tlbnMgZXF1YWwgaW4gbnVtYmVyIHRvIHRva2Vuc190b19yZWRlZW0uIFJldHVybnMgdGhlIGNvbW1lbnN1cmF0ZQphbW91bnQgb2YgY29sbGF0ZXJhbCB0byB0aGUgY2FsbGVyIGZvciB0aGUgcGFpciBvZiB0b2tlbnMsIGRlZmluZWQgYnkgdGhlIGNvbGxhdGVyYWxQZXJQYWlyIHZhbHVlLgpAZGV2IFRoaXMgbWV0aG9kIGNhbiBiZSBjYWxsZWQgZWl0aGVyIHByZSBvciBwb3N0IGV4cGlyYXRpb24uCkBwYXJhbSB0b2tlbnNfdG9fcmVkZWVtIG51bWJlciBvZiBsb25nIGFuZCBzaG9ydCBzeW50aGV0aWMgdG9rZW5zIHRvIHJlZGVlbS4KQHJldHVybiBjb2xsYXRlcmFsX3JldHVybmVkIHRvdGFsIGNvbGxhdGVyYWwgcmV0dXJuZWQgaW4gZXhjaGFuZ2UgZm9yIHRoZSBwYWlyIG9mIHN5bnRoZXRpY3MuAAAAAAAABnJlZGVlbQAAAAAAAgAAAAAAAAAEdXNlcgAAABMAAAAAAAAAEHRva2Vuc190b19yZWRlZW0AAAAKAAAAAQAAAAo=',
        'AAAAAAAAAAAAAAAKcmVkZWVtX29uZQAAAAAAAwAAAAAAAAAEdXNlcgAAABMAAAAAAAAABXRva2VuAAAAAAAAEwAAAAAAAAAQdG9rZW5zX3RvX3JlZGVlbQAAAAoAAAABAAAACg==',
        'AAAAAAAAAAAAAAAPc3luY19jb2xsYXRlcmFsAAAAAAAAAAAA',
        'AAAAAAAAAAAAAAAKZ2V0X3Rva2VucwAAAAAAAAAAAAEAAAPqAAAAEw==',
        'AAAAAAAAAAAAAAAQZ2V0X3ByaWNlX2JvdW5kcwAAAAAAAAABAAAD6gAAAAo=',
        'AAAAAAAAAAAAAAAXZ2V0X3VzZXJfdG9rZW5fYmFsYW5jZXMAAAAAAQAAAAAAAAAEdXNlcgAAABMAAAABAAAD6gAAAAo=',
        'AAAAAAAAAAAAAAATZ2V0X2NvbGxhdGVyYWxfaW5mbwAAAAAAAAAAAQAAB9AAAAAOQ29sbGF0ZXJhbEluZm8AAA==',
        'AAAAAAAAAAAAAAAQZ2V0X3BhaXJfc3VtbWFyeQAAAAAAAAABAAAH0AAAAAtQYWlyU3VtbWFyeQA=',
        'AAAAAAAAAAAAAAAOc2V0X2NhbGN1bGF0b3IAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAKY2FsY3VsYXRvcgAAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAAKc2V0X29yYWNsZQAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAZvcmFjbGUAAAAAABMAAAAA',
        'AAAAAAAAAAAAAAAJa2lsbF9taW50AAAAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAALa2lsbF9yZWRlZW0AAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAALdW5raWxsX21pbnQAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAANdW5raWxsX3JlZGVlbQAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAASZ2V0X2lzX2tpbGxlZF9taW50AAAAAAAAAAAAAQAAAAE=',
        'AAAAAAAAAAAAAAAUZ2V0X2lzX2tpbGxlZF9yZWRlZW0AAAAAAAAAAQAAAAE=',
        'AAAAAAAAAAAAAAAJZ2V0X3ByaWNlAAAAAAAAAAAAAAEAAAAK',
        'AAAAAAAAAAAAAAAQZ2V0X3NjYWxlZF9wcmljZQAAAAAAAAABAAAACg==',
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
        'AAAABAAAAAAAAAAAAAAAEkxvbmdTaG9ydFBhaXJFcnJvcgAAAAAADQAAAAAAAAASQWxyZWFkeUluaXRpYWxpemVkAAAAAADJAAAAAAAAAA1JbnZhbGlkT3JhY2xlAAAAAAAAywAAAAAAAAAMSW52YWxpZElucHV0AAAAzAAAAAAAAAAXRmFpbGVkVG9HZXRQb29sUmVzZXJ2ZXMAAAAAzgAAAAAAAAAcRmFpbGVkVG9HZXRDYWxjdWxhdG9yUGVyY2VudAAAAM8AAAAAAAAAIEZhaWxlZFRvVXBkYXRlVG9rZW5TY2FsaW5nRmFjdG9yAAAA0AAAAAAAAAAWRmFpbGVkVG9HZXRPcmFjbGVQcmljZQAAAAAA0QAAAAAAAAALUG9vbHNOb3RTZXQAAAAA0gAAAAAAAAAgRnVuZGluZ1JhdGVSZXF1aXJlc1Bvb2xMaXF1aWRpdHkAAADTAAAAAAAAABZJbnZhbGlkQ2FsY3VsYXRvclZhbHVlAAAAAADUAAAAAAAAAA9NaW50aW5nRGlzYWJsZWQAAAAA1QAAAAAAAAANSW52YWxpZFN0YXR1cwAAAAAAANYAAAAAAAAAFUluc3VmZmljaWVudEludmVudG9yeQAAAAAAANc=',
        'AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAADwAAAAAAAAAAAAAABUFzc2V0AAAAAAAAAAAAAAAAAAAGU3RhdHVzAAAAAAAAAAAAAAAAAApMb3dlckJvdW5kAAAAAAAAAAAAAAAAAApVcHBlckJvdW5kAAAAAAAAAAAAAAAAAA9Db2xsYXRlcmFsVG9rZW4AAAAAAAAAAAAAAAAPVG90YWxDb2xsYXRlcmFsAAAAAAAAAAAAAAAAEUNvbGxhdGVyYWxQZXJQYWlyAAAAAAAAAAAAAAAAAAAVQ29sbGF0ZXJhbFBlcmNlbnRMb25nAAAAAAAAAAAAAAAAAAAKQ2FsY3VsYXRvcgAAAAAAAAAAAAAAAAAGT3JhY2xlAAAAAAAAAAAAAAAAABJNYXhQcmljZURpdmVyZ2VuY2UAAAAAAAAAAAAAAAAADExhc3RVcGRhdGVUcwAAAAAAAAAAAAAADEV4cGlyYXRpb25UcwAAAAAAAAAAAAAADElzS2lsbGVkTWludAAAAAAAAAAAAAAADklzS2lsbGVkUmVkZWVtAAA=',
        'AAAABAAAAAAAAAAAAAAAEkFjY2Vzc0NvbnRyb2xFcnJvcgAAAAAABwAAAAAAAAAMUm9sZU5vdEZvdW5kAAAAZQAAAAAAAAAMVW5hdXRob3JpemVkAAAAZgAAAAAAAAAPQWRtaW5BbHJlYWR5U2V0AAAAAGcAAAAAAAAADEJhZFJvbGVVc2FnZQAAAGgAAAAAAAAAE0Fub3RoZXJBY3Rpb25BY3RpdmUAAAALWgAAAAAAAAAOTm9BY3Rpb25BY3RpdmUAAAAAC1sAAAAAAAAAEUFjdGlvbk5vdFJlYWR5WWV0AAAAAAALXA==',
        'AAAAAQAAAAAAAAAAAAAAD09yYWNsZVByaWNlRGF0YQAAAAACAAAAAAAAAAVkZWxheQAAAAAAB9AAAAAFRGVsYXkAAAAAAAAAAAAABXByaWNlAAAAAAAACg==',
        'AAAAAgAAAAAAAAAAAAAADE9yYWNsZVNvdXJjZQAAAAEAAAAAAAAAAAAAAAlSZWZsZWN0b3IAAAA=',
        'AAAAAQAAAAAAAAAAAAAAClBhaXJQYXJhbXMAAAAAAAoAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAFYXNzZXQAAAAAAAARAAAAAAAAAApjYWxjdWxhdG9yAAAAAAATAAAAAAAAABNjb2xsYXRlcmFsX3Blcl9wYWlyAAAAAAoAAAAAAAAAEGNvbGxhdGVyYWxfdG9rZW4AAAATAAAAAAAAAApsb25nX3Rva2VuAAAAAAATAAAAAAAAAAtsb3dlcl9ib3VuZAAAAAAKAAAAAAAAAAZvcmFjbGUAAAAAABMAAAAAAAAAC3Nob3J0X3Rva2VuAAAAABMAAAAAAAAAC3VwcGVyX2JvdW5kAAAAAAo=',
        'AAAAAgAAAAAAAAAAAAAACURpcmVjdGlvbgAAAAAAAAIAAAAAAAAAAAAAAARMb25nAAAAAAAAAAAAAAAFU2hvcnQAAAA=',
        'AAAAAgAAAAAAAAAAAAAAClBhaXJTdGF0dXMAAAAAAAMAAAAAAAAAAAAAAAhJbmFjdGl2ZQAAAAAAAAAAAAAABkFjdGl2ZQAAAAAAAAAAAAAAAAAHRXhwaXJlZAA=',
        'AAAAAQAAAAAAAAAAAAAADkNvbGxhdGVyYWxJbmZvAAAAAAAEAAAAAAAAABNjb2xsYXRlcmFsX3Blcl9wYWlyAAAAAAoAAAAAAAAAF2NvbGxhdGVyYWxfcGVyY2VudF9sb25nAAAAAAoAAAAAAAAAEGNvbGxhdGVyYWxfdG9rZW4AAAATAAAAAAAAABB0b3RhbF9jb2xsYXRlcmFsAAAACg==',
        'AAAAAQAAAAAAAAAAAAAAC1BhaXJTdW1tYXJ5AAAAAAgAAAAAAAAABWFzc2V0AAAAAAAAEQAAAAAAAAAKY2FsY3VsYXRvcgAAAAAAEwAAAAAAAAAKY29sbGF0ZXJhbAAAAAAH0AAAAA5Db2xsYXRlcmFsSW5mbwAAAAAAAAAAAApsb25nX3Rva2VuAAAAAAATAAAAAAAAAAZvcmFjbGUAAAAAABMAAAAAAAAADHByaWNlX2JvdW5kcwAAA+0AAAACAAAACgAAAAoAAAAAAAAAC3Nob3J0X3Rva2VuAAAAABMAAAAAAAAABnN0YXR1cwAAAAAH0AAAAApQYWlyU3RhdHVzAAA=',
        'AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAAAwAAAAAAAAATQW5vdGhlckFjdGlvbkFjdGl2ZQAAAAtaAAAAAAAAAA5Ob0FjdGlvbkFjdGl2ZQAAAAALWwAAAAAAAAARQWN0aW9uTm90UmVhZHlZZXQAAAAAAAtc',
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
    mint: this.txFromJSON<u128>,
    redeem: this.txFromJSON<u128>,
    redeem_one: this.txFromJSON<u128>,
    sync_collateral: this.txFromJSON<null>,
    get_tokens: this.txFromJSON<Array<string>>,
    get_price_bounds: this.txFromJSON<Array<u128>>,
    get_user_token_balances: this.txFromJSON<Array<u128>>,
    get_collateral_info: this.txFromJSON<CollateralInfo>,
    get_pair_summary: this.txFromJSON<PairSummary>,
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

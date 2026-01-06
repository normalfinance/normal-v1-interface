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

export interface FactoryConfig {
  pair_contract_wasm: Buffer
}

export type DataKey =
  | { tag: 'PairContractWASM'; values: void }
  | { tag: 'AssetPair'; values: readonly [Buffer] }
  | { tag: 'AllDeployedPairs'; values: void }
  | { tag: 'IsKilledCreate'; values: void }

export const FactoryError = {
  401: { message: 'PairAlreadyExists' },
  404: { message: 'PairNotFound' },
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
   * Construct and simulate a deploy_pair_contract transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * * @notice Creates a longShortPair contract and associated long and short tokens.
   *      * @param params Constructor params used to initialize the LSP. Key-valued object with the following structure:
   *      *     - `pairName`: Name of the long short pair contract.
   *      *     - `collateralPerPair`: How many units of collateral are required to mint one pair of synthetic tokens.
   *      *     - `collateralToken`: ERC20 token used as collateral in the LSP.
   *      *     - `calculator`: Contract providing settlement payout logic.
   *      * @return lspAddress the deployed address of the new long short pair contract.
   *      * @notice Created LSP is not registered within the registry as the LSP uses the Optimistic Oracle for settlement.
   *      * @notice The LSP constructor does a number of validations on input params. These are not repeated here.
   */
  deploy_pair_contract: (
    { admin, asset }: { admin: string; asset: string },
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
   * Construct and simulate a mint transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  mint: (
    { user, asset, tokens_to_mint }: { user: string; asset: string; tokens_to_mint: u128 },
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
   */
  redeem: (
    { user, asset, tokens_to_redeem }: { user: string; asset: string; tokens_to_redeem: u128 },
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
    { user, asset, token, tokens_to_redeem }: { user: string; asset: string; token: string; tokens_to_redeem: u128 },
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
   * Construct and simulate a get_factory_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_factory_config: (options?: {
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
  }) => Promise<AssembledTransaction<FactoryConfig>>

  /**
   * Construct and simulate a get_pair_contract_wasm transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_pair_contract_wasm: (options?: {
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
  }) => Promise<AssembledTransaction<Buffer>>

  /**
   * Construct and simulate a get_all_deployed_pairs transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_all_deployed_pairs: (options?: {
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
   * Construct and simulate a get_total_pair_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_pair_count: (options?: {
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
   * Construct and simulate a get_pair_by_asset transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_pair_by_asset: (
    { asset }: { asset: string },
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
   * Construct and simulate a set_pair_contract_wasm transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_pair_contract_wasm: (
    { admin, pair_contract_wasm }: { admin: string; pair_contract_wasm: Buffer },
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
   * Construct and simulate a kill_create transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  kill_create: (
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
   * Construct and simulate a unkill_create transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  unkill_create: (
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
   * Construct and simulate a get_is_killed_create transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_is_killed_create: (options?: {
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
    /** Constructor/Initialization Args for the contract's `__constructor` method */
    { admin, pair_contract_wasm }: { admin: string; pair_contract_wasm: Buffer },
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
    return ContractClient.deploy({ admin, pair_contract_wasm }, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([
        'AAAAAQAAAAAAAAAAAAAADUZhY3RvcnlDb25maWcAAAAAAAABAAAAAAAAABJwYWlyX2NvbnRyYWN0X3dhc20AAAAAA+4AAAAg',
        'AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAScGFpcl9jb250cmFjdF93YXNtAAAAAAPuAAAAIAAAAAA=',
        'AAAAAAAAA0AqIEBub3RpY2UgQ3JlYXRlcyBhIGxvbmdTaG9ydFBhaXIgY29udHJhY3QgYW5kIGFzc29jaWF0ZWQgbG9uZyBhbmQgc2hvcnQgdG9rZW5zLgogICAgICogQHBhcmFtIHBhcmFtcyBDb25zdHJ1Y3RvciBwYXJhbXMgdXNlZCB0byBpbml0aWFsaXplIHRoZSBMU1AuIEtleS12YWx1ZWQgb2JqZWN0IHdpdGggdGhlIGZvbGxvd2luZyBzdHJ1Y3R1cmU6CiAgICAgKiAgICAgLSBgcGFpck5hbWVgOiBOYW1lIG9mIHRoZSBsb25nIHNob3J0IHBhaXIgY29udHJhY3QuCiAgICAgKiAgICAgLSBgY29sbGF0ZXJhbFBlclBhaXJgOiBIb3cgbWFueSB1bml0cyBvZiBjb2xsYXRlcmFsIGFyZSByZXF1aXJlZCB0byBtaW50IG9uZSBwYWlyIG9mIHN5bnRoZXRpYyB0b2tlbnMuCiAgICAgKiAgICAgLSBgY29sbGF0ZXJhbFRva2VuYDogRVJDMjAgdG9rZW4gdXNlZCBhcyBjb2xsYXRlcmFsIGluIHRoZSBMU1AuCiAgICAgKiAgICAgLSBgY2FsY3VsYXRvcmA6IENvbnRyYWN0IHByb3ZpZGluZyBzZXR0bGVtZW50IHBheW91dCBsb2dpYy4KICAgICAqIEByZXR1cm4gbHNwQWRkcmVzcyB0aGUgZGVwbG95ZWQgYWRkcmVzcyBvZiB0aGUgbmV3IGxvbmcgc2hvcnQgcGFpciBjb250cmFjdC4KICAgICAqIEBub3RpY2UgQ3JlYXRlZCBMU1AgaXMgbm90IHJlZ2lzdGVyZWQgd2l0aGluIHRoZSByZWdpc3RyeSBhcyB0aGUgTFNQIHVzZXMgdGhlIE9wdGltaXN0aWMgT3JhY2xlIGZvciBzZXR0bGVtZW50LgogICAgICogQG5vdGljZSBUaGUgTFNQIGNvbnN0cnVjdG9yIGRvZXMgYSBudW1iZXIgb2YgdmFsaWRhdGlvbnMgb24gaW5wdXQgcGFyYW1zLiBUaGVzZSBhcmUgbm90IHJlcGVhdGVkIGhlcmUuAAAAFGRlcGxveV9wYWlyX2NvbnRyYWN0AAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAVhc3NldAAAAAAAABEAAAABAAAAEw==',
        'AAAAAAAAAAAAAAAEbWludAAAAAMAAAAAAAAABHVzZXIAAAATAAAAAAAAAAVhc3NldAAAAAAAABEAAAAAAAAADnRva2Vuc190b19taW50AAAAAAAKAAAAAQAAAAo=',
        'AAAAAAAAAAAAAAAGcmVkZWVtAAAAAAADAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAFYXNzZXQAAAAAAAARAAAAAAAAABB0b2tlbnNfdG9fcmVkZWVtAAAACgAAAAEAAAAK',
        'AAAAAAAAAAAAAAAKcmVkZWVtX29uZQAAAAAABAAAAAAAAAAEdXNlcgAAABMAAAAAAAAABWFzc2V0AAAAAAAAEQAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAAAAABB0b2tlbnNfdG9fcmVkZWVtAAAACgAAAAEAAAAK',
        'AAAAAAAAAAAAAAASZ2V0X2ZhY3RvcnlfY29uZmlnAAAAAAAAAAAAAQAAB9AAAAANRmFjdG9yeUNvbmZpZwAAAA==',
        'AAAAAAAAAAAAAAAWZ2V0X3BhaXJfY29udHJhY3Rfd2FzbQAAAAAAAAAAAAEAAAPuAAAAIA==',
        'AAAAAAAAAAAAAAAWZ2V0X2FsbF9kZXBsb3llZF9wYWlycwAAAAAAAAAAAAEAAAPqAAAAEw==',
        'AAAAAAAAAAAAAAAUZ2V0X3RvdGFsX3BhaXJfY291bnQAAAAAAAAAAQAAAAQ=',
        'AAAAAAAAAAAAAAARZ2V0X3BhaXJfYnlfYXNzZXQAAAAAAAABAAAAAAAAAAVhc3NldAAAAAAAABEAAAABAAAAEw==',
        'AAAAAAAAAAAAAAAWc2V0X3BhaXJfY29udHJhY3Rfd2FzbQAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAABJwYWlyX2NvbnRyYWN0X3dhc20AAAAAA+4AAAAgAAAAAA==',
        'AAAAAAAAAAAAAAALa2lsbF9jcmVhdGUAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAA==',
        'AAAAAAAAAAAAAAANdW5raWxsX2NyZWF0ZQAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=',
        'AAAAAAAAAAAAAAAUZ2V0X2lzX2tpbGxlZF9jcmVhdGUAAAAAAAAAAQAAAAE=',
        'AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABAAAAAAAAAAAAAAAEFBhaXJDb250cmFjdFdBU00AAAABAAAAAAAAAAlBc3NldFBhaXIAAAAAAAABAAAD7gAAACAAAAAAAAAAAAAAABBBbGxEZXBsb3llZFBhaXJzAAAAAAAAAAAAAAAOSXNLaWxsZWRDcmVhdGUAAA==',
        'AAAABAAAAAAAAAAAAAAADEZhY3RvcnlFcnJvcgAAAAIAAAAAAAAAEVBhaXJBbHJlYWR5RXhpc3RzAAAAAAABkQAAAAAAAAAMUGFpck5vdEZvdW5kAAABlA==',
        'AAAABAAAAAAAAAAAAAAAEkFjY2Vzc0NvbnRyb2xFcnJvcgAAAAAABwAAAAAAAAAMUm9sZU5vdEZvdW5kAAAAZQAAAAAAAAAMVW5hdXRob3JpemVkAAAAZgAAAAAAAAAPQWRtaW5BbHJlYWR5U2V0AAAAAGcAAAAAAAAADEJhZFJvbGVVc2FnZQAAAGgAAAAAAAAAE0Fub3RoZXJBY3Rpb25BY3RpdmUAAAALWgAAAAAAAAAOTm9BY3Rpb25BY3RpdmUAAAAAC1sAAAAAAAAAEUFjdGlvbk5vdFJlYWR5WWV0AAAAAAALXA==',
        'AAAABAAAAAAAAAAAAAAACU1hdGhFcnJvcgAAAAAAAAkAAAAZTWF0aEVycm9yOiBOdW1iZXJPdmVyZmxvdwAAAAAAAA5OdW1iZXJPdmVyZmxvdwAAAAAB/gAAAB1NYXRoRXJyb3I6IEdlbmVyaWMgbWF0aCBlcnJvcgAAAAAAAAlNYXRoRXJyb3IAAAAAAAH/AAAALU1hdGhFcnJvcjogQWRkaXRpb24gb3BlcmF0aW9uIGNhdXNlZCBvdmVyZmxvdwAAAAAAABBBZGRpdGlvbk92ZXJmbG93AAACAAAAADFNYXRoRXJyb3I6IFN1YnRyYWN0aW9uIG9wZXJhdGlvbiBjYXVzZWQgdW5kZXJmbG93AAAAAAAAFFN1YnRyYWN0aW9uVW5kZXJmbG93AAACAQAAADNNYXRoRXJyb3I6IE11bHRpcGxpY2F0aW9uIG9wZXJhdGlvbiBjYXVzZWQgb3ZlcmZsb3cAAAAAFk11bHRpcGxpY2F0aW9uT3ZlcmZsb3cAAAAAAgIAAAAbTWF0aEVycm9yOiBEaXZpc2lvbiBieSB6ZXJvAAAAAA5EaXZpc2lvbkJ5WmVybwAAAAACAwAAACNNYXRoRXJyb3I6IFR5cGUgY29udmVyc2lvbiBvdmVyZmxvdwAAAAASQ29udmVyc2lvbk92ZXJmbG93AAAAAAIEAAAAP01hdGhFcnJvcjogQXR0ZW1wdGVkIHRvIGNvbnZlcnQgbmVnYXRpdmUgdmFsdWUgdG8gdW5zaWduZWQgdHlwZQAAAAASTmVnYXRpdmVUb1Vuc2lnbmVkAAAAAAIFAAAAKk1hdGhFcnJvcjogRml4ZWQtcG9pbnQgYXJpdGhtZXRpYyBvdmVyZmxvdwAAAAAAEkZpeGVkUG9pbnRPdmVyZmxvdwAAAAACBg==',
        'AAAABAAAAAAAAAAAAAAADFN0b3JhZ2VFcnJvcgAAAAQAAAAMU3RvcmFnZUVycm9yAAAAEkFscmVhZHlJbml0aWFsaXplZAAAAAAAyQAAAAAAAAATVmFsdWVOb3RJbml0aWFsaXplZAAAAAH1AAAAAAAAAAxWYWx1ZU1pc3NpbmcAAAH2AAAAAAAAABRWYWx1ZUNvbnZlcnNpb25FcnJvcgAAAfc=',
        'AAAABAAAAAAAAAAAAAAAD1ZhbGlkYXRpb25FcnJvcgAAAAADAAAAD1ZhbGlkYXRpb25FcnJvcgAAAAAMSW52YWxpZFRva2VuAAADIQAAAAAAAAARSW52YWxpZFBlcmNlbnRhZ2UAAAAAAAMiAAAAAAAAAApaZXJvQW1vdW50AAAAAAMk',
        'AAAAAQAAAAAAAAAAAAAABURlbGF5AAAAAAAAAQAAAAAAAAABMAAAAAAAAAY=',
      ]),
      options,
    )
  }
  public readonly fromJSON = {
    deploy_pair_contract: this.txFromJSON<string>,
    mint: this.txFromJSON<u128>,
    redeem: this.txFromJSON<u128>,
    redeem_one: this.txFromJSON<u128>,
    get_factory_config: this.txFromJSON<FactoryConfig>,
    get_pair_contract_wasm: this.txFromJSON<Buffer>,
    get_all_deployed_pairs: this.txFromJSON<Array<string>>,
    get_total_pair_count: this.txFromJSON<u32>,
    get_pair_by_asset: this.txFromJSON<string>,
    set_pair_contract_wasm: this.txFromJSON<null>,
    kill_create: this.txFromJSON<null>,
    unkill_create: this.txFromJSON<null>,
    get_is_killed_create: this.txFromJSON<boolean>,
  }
}

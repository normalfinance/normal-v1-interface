export * as events from './events';
export * from './soroban';
export * from './pair';
export * from './treasury';

export class ContractError extends Error {
  /**
   * The type of the error
   */
  public type: ContractErrorType;

  constructor(type: ContractErrorType) {
    super();
    this.type = type;
  }
}

export enum ContractErrorType {
  UnknownError = -1000,

  // Transaction Submission Errors
  txSorobanInvalid = -24,
  txMalformed = -23,
  txBadMinSeqAgeOrGap = -22,
  txBadSponsorship = -21,
  txFeeBumpInnerFailed = -20,
  txNotSupported = -19,
  txInternalError = -18,
  txBadAuthExtra = -17,
  txInsufficientFee = -16,
  txNoAccount = -15,
  txInsufficientBalance = -14,
  txBadAuth = -13,
  txBadSeq = -12,
  txMissingOperation = -11,
  txTooLate = -10,
  txTooEarly = -9,

  // Host Function Errors
  InvokeHostFunctionInsufficientRefundableFee = -5,
  InvokeHostFunctionEntryArchived = -4,
  InvokeHostFunctionResourceLimitExceeded = -3,
  InvokeHostFunctionTrapped = -2,
  InvokeHostFunctionMalformed = -1,

  // Common Errors
  InternalError = 1,
  OperationNotSupportedError = 2,
  AlreadyInitializedError = 3,

  UnauthorizedError = 4,
  AuthenticationError = 5,
  AccountMissingError = 6,
  AccountIsNotClassic = 7,

  NegativeAmountError = 8,
  AllowanceError = 9,
  BalanceError = 10,
  BalanceDeauthorizedError = 11,
  OverflowError = 12,
  TrustlineMissingError = 13,
}

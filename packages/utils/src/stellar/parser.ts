import { ContractError, ContractErrorType } from '@normalfinance/types';
import { rpc } from '@stellar/stellar-sdk';

export function parseError(
  errorResponse:
    | rpc.Api.GetFailedTransactionResponse
    | rpc.Api.SendTransactionResponse
    | rpc.Api.SimulateTransactionErrorResponse
): ContractError {
  // Simulation Error
  if ('id' in errorResponse) {
    const match = errorResponse.error.match(/Error\(Contract, #(\d+)\)/);
    if (match) {
      const errorValue = parseInt(match[1], 10);
      if (errorValue in ContractErrorType)
        return new ContractError(errorValue as ContractErrorType);
    }
    return new ContractError(ContractErrorType.UnknownError);
  }

  // Send Transaction Error
  if (
    errorResponse &&
    typeof errorResponse === 'object' &&
    'errorResult' in errorResponse &&
    errorResponse.errorResult
  ) {
    const txErrorName = errorResponse.errorResult.result().switch().name;
    if (txErrorName == 'txFailed') {
      // Transaction should only contain one operation
      if (errorResponse.errorResult.result().results().length == 1) {
        const hostFunctionError = errorResponse.errorResult
          .result()
          .results()[0]
          .tr()
          .invokeHostFunctionResult()
          .switch().value;
        if (hostFunctionError in ContractErrorType)
          return new ContractError(hostFunctionError as ContractErrorType);
      }
    } else {
      const txErrorValue = errorResponse.errorResult.result().switch().value - 7;
      if (txErrorValue in ContractErrorType) {
        return new ContractError(txErrorValue as ContractErrorType);
      }
    }
  }

  // Get Transaction Error
  if (
    errorResponse &&
    typeof errorResponse === 'object' &&
    'resultXdr' in errorResponse &&
    errorResponse.resultXdr
  ) {
    // Transaction submission failed
    const txResult = errorResponse.resultXdr.result();
    const txErrorName = txResult.switch().name;

    // Use invokeHostFunctionErrors in case of generic `txFailed` error
    if (txErrorName == 'txFailed') {
      // Transaction should only contain one operation
      if (errorResponse.resultXdr.result().results().length == 1) {
        const hostFunctionError = txResult
          .results()[0]
          .tr()
          .invokeHostFunctionResult()
          .switch().value;
        if (hostFunctionError in ContractErrorType)
          return new ContractError(hostFunctionError as ContractErrorType);
      }
    }

    // Shift the error value to avoid collision with invokeHostFunctionErrors
    const txErrorValue = txResult.switch().value - 7;
    // Use TransactionResultCode with more specific errors
    if (txErrorValue in ContractErrorType) {
      return new ContractError(txErrorValue as ContractErrorType);
    }
  }

  // If the error is not recognized, return an unknown error
  return new ContractError(ContractErrorType.UnknownError);
}

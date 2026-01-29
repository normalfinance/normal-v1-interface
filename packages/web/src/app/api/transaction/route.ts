import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';
import { logger, constants } from '@normalfinance/utils';
import { rpc, Keypair, Transaction } from '@stellar/stellar-sdk';
import { getApiConfig, getRateLimitConfig } from '@/lib/edge-config';
import { logWithConfig, createNodeConfigHandler } from '@/lib/edge-config-middleware';

export const runtime = 'nodejs';

async function transactionHandler(req: NextRequest) {
  try {
    const { walletAddress, signedTransactionXDR, transactionType } = await req.json();

    logger.log('[Transaction API] walletAddress: ', walletAddress);
    logger.log('[Transaction API] signedTransactionXDR: ', signedTransactionXDR);
    logger.log('[Transaction API] transactionType: ', transactionType);

    if (!walletAddress || !signedTransactionXDR) {
      await logWithConfig('warn', 'Transaction API called without required parameters');
      return NextResponse.json(
        {
          error: 'Missing walletAddress or signedTransactionXDR',
        },
        { status: 400 }
      );
    }

    // Get Edge Config for rate limiting
    const rateLimitConfig = await getRateLimitConfig('transaction');
    const apiConfig = await getApiConfig('transaction');

    // Get client IP address (prioritize proxy headers like middleware)
    const ip =
      req.headers.get('x-real-ip') || // many reverse proxies
      req.headers.get('X-Forwarded-For')?.split(',')[0] ||
      req.ip;

    // Use Edge Config rate limit override if available
    const effectiveLimit = apiConfig.rateLimitOverride || {
      requests: rateLimitConfig.requests,
      windowMs: rateLimitConfig.windowMs,
    };

    const { success, limit, remaining, reset } = await rateLimiter.limit(walletAddress, ip);

    await logWithConfig('info', `${transactionType || 'Transaction'} rate limit check`, {
      success,
      limit,
      remaining,
      reset,
      walletAddress: walletAddress.substring(0, 8) + '...',
      effectiveLimit,
      transactionType,
    });

    if (!success) {
      await logWithConfig('warn', 'Rate limit exceeded for transaction API', {
        walletAddress,
        transactionType,
      });
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Verify signature
    try {
      const transaction = new Transaction(
        signedTransactionXDR,
        constants.StellarConfig.NETWORK_PASSPHRASE
      );
      logger.log('[Transaction API] transaction: ', transaction);
      const keypair = Keypair.fromPublicKey(walletAddress);

      logger.log('[Transaction API] keypair: ', keypair);

      // Verify that the transaction is signed by the correct wallet
      const hasValidSignature = transaction.signatures.some((sig) => {
        try {
          return keypair.verify(transaction.hash(), sig.signature());
        } catch {
          return false;
        }
      });
      logger.log('[Transaction API] hasValidSignature: ', hasValidSignature);

      if (!hasValidSignature) {
        await logWithConfig('warn', 'Invalid signature for wallet address', {
          walletAddress,
          transactionType,
        });
        return NextResponse.json(
          {
            error: 'Invalid signature for wallet address',
          },
          { status: 403 }
        );
      }
    } catch (error) {
      await logWithConfig('error', 'Signature verification failed', {
        error,
        walletAddress,
        transactionType,
      });
      return NextResponse.json(
        {
          error: 'Failed to verify signature',
        },
        { status: 403 }
      );
    }

    // Execute the contract transaction server-side
    try {
      const rpcServer = new rpc.Server(constants.StellarConfig.RPC_URL, {
        allowHttp: constants.StellarConfig.RPC_URL.startsWith('http://'),
      });

      logger.log('[Transaction API] Stellar Server: ', rpcServer);

      // Submit the signed transaction
      const transaction = new Transaction(
        signedTransactionXDR,
        constants.StellarConfig.NETWORK_PASSPHRASE
      );
      let sendTxResponse = await rpcServer.sendTransaction(transaction);

      logger.log('[Transaction API] Result server.sendTransaction: ', sendTxResponse);

      let currentTime = Date.now();

      // Attempt to send the transaction and poll for the result
      while (sendTxResponse.status !== 'PENDING' && Date.now() - currentTime < 5000) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        sendTxResponse = await rpcServer.sendTransaction(transaction);
      }
      if (sendTxResponse.status !== 'PENDING') {
        const error = parseError(sendTxResponse);
        logger.log('[Transaction API] Failed to send transaction: ', sendTxResponse.hash, error);

        return NextResponse.json(
          {
            error:
              ContractErrorType[error.type] ||
              `Contract execution failed on send: ${JSON.stringify(sendTxResponse.errorResult)}`,
          },
          { status: 500 }
        );
      }

      currentTime = Date.now();

      let getTxResponse = await rpcServer.getTransaction(sendTxResponse.hash);

      while (getTxResponse.status === 'NOT_FOUND' && Date.now() - currentTime < 30000) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        getTxResponse = await rpcServer.getTransaction(sendTxResponse.hash);
      }

      if (getTxResponse.status === 'NOT_FOUND') {
        logger.log(
          '[Transaction API] Unable to validate transaction success: ',
          getTxResponse.txHash
        );

        return NextResponse.json(
          {
            error:
              'The transaction could have been accepted by the network, but we were unable to verify.',
          },
          { status: 500 }
        );
      }

      const hash = transaction.hash().toString('hex');

      if (getTxResponse.status === 'SUCCESS') {
        logger.log('[Transaction API] Successfully submitted transaction: ', hash);
        // stall for a bit to ensure data propagates to horizon
        await new Promise((resolve) => setTimeout(resolve, 500));

        return NextResponse.json({
          success: true,
          transactionHash: getTxResponse.txHash,
          getTxResponse,
          config: {
            timeout: apiConfig.timeout,
            rateLimitRemaining: remaining,
          },
        });
      } else {
        const error = parseError(getTxResponse);
        logger.error(`[Transaction API] Transaction failed: `, hash, error);

        return NextResponse.json(
          {
            error:
              ContractErrorType[error.type] ||
              `Contract execution failed on get: ${JSON.stringify(getTxResponse.resultXdr)}`,
          },
          { status: 500 }
        );
      }
    } catch (contractError: any) {
      logger.log('[Transaction API] Contract error: ', contractError);
      await logWithConfig('error', `${transactionType || 'Contract'} execution failed`, {
        error: contractError?.message,
        walletAddress,
      });
      return NextResponse.json(
        {
          error: contractError?.message || 'Contract execution failed',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    logger.log('[Transaction API] Error: ', error);
    await logWithConfig('error', 'Transaction API error', {
      error: error?.message,
      transactionType: req.method,
    });
    return NextResponse.json(
      { error: error?.message || 'Transaction processing failed' },
      { status: 500 }
    );
  }
}

// export const POST = createEdgeConfigHandler(transactionHandler, 'transaction');
export const POST = createNodeConfigHandler(transactionHandler, 'transaction');

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

  // Potential Comet Errors
  CometErrFreezeOnlyWithdrawals = 14,
  CometErrMaxInRatio = 17,
  CometErrMathApprox = 18,
  CometErrLimitIn = 19,
  CometErrLimitOut = 20,
  CometErrMaxOutRatio = 21,
  CometErrBadLimitPrice = 22,
  CometErrLimitPrice = 23,
  CometErrTokenAmountIsNegative = 25,
  CometErrInsufficientAllowance = 27,
  CometErrInsufficientBalance = 29,
  CometErrAddOverflow = 30,
  CometErrSubUnderflow = 31,
  CometErrDivInternal = 32,
  CometErrMulOverflow = 33,
  CometErrCPowBaseTooLow = 34,
  CometErrCPowBaseTooHigh = 35,
  CometErrInvalidExpirationLedger = 36,
  CometErrNegativeOrZero = 37,
  CometErrTokenInvalid = 38,

  // Backstop
  BackstopBadRequest = 1000,
  NotExpired = 1001,
  InvalidRewardZoneEntry = 1002,
  InsufficientFunds = 1003,
  NotPool = 1004,
  InvalidShareMintAmount = 1005,
  InvalidTokenWithdrawAmount = 1006,
  TooManyQ4WEntries = 1007,
  NotInRewardZone = 1008,
  RewardZoneFull = 1009,
  MaxBackfillEmissions = 1010,
  BadDebtExists = 1011,

  // Pool Request Errors (start at 1200)
  PoolBadRequest = 1200,
  InvalidPoolInitArgs = 1201,
  InvalidReserveMetadata = 1202,
  InitNotUnlocked = 1203,
  StatusNotAllowed = 1204,

  // Pool State Errors
  InvalidHf = 1205,
  InvalidPoolStatus = 1206,
  InvalidUtilRate = 1207,
  MaxPositionsExceeded = 1208,
  InternalReserveNotFound = 1209,
  InvalidBTokenMintAmount = 1216,
  InvalidBTokenBurnAmount = 1217,
  InvalidDTokenMintAmount = 1218,
  InvalidDTokenBurnAmount = 1219,
  ExceededSupplyCap = 1220,
  ReserveDisabled = 1223,
  MinCollateralNotMet = 1224,

  // Oracle Errors
  StalePrice = 1210,

  // Auction Errors
  InvalidLiquidation = 1211,
  AuctionInProgress = 1212,
  InvalidLiqTooLarge = 1213,
  InvalidLiqTooSmall = 1214,
  InterestTooSmall = 1215,
  InvalidBid = 1221,
  InvalidLot = 1222,

  // Pool Factory
  InvalidPoolFactoryInitArgs = 1300,
}

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

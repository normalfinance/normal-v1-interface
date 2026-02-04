import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';
import { ContractErrorType } from '@normalfinance/types';
import { getClientIP, getAccessToken } from '@/utils/http';
import { rpc, Keypair, Transaction } from '@stellar/stellar-sdk';
import { LinkedWalletService } from '@/lib/linked-wallet-service';
import { logger, constants, parseError } from '@normalfinance/utils';
import { getApiConfig, getRateLimitConfig } from '@/lib/edge-config';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';
import { logWithConfig, createNodeConfigHandler } from '@/lib/edge-config-middleware';

export const runtime = 'nodejs';

async function transactionHandler(req: NextRequest) {
  try {
    // Authenticate
    const token = getAccessToken(req);
    const user = await getAuthenticatedUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate params
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
    const ip = getClientIP(req);

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

    // Assert user owns walletAddress
    const isLinked = await LinkedWalletService.isWalletLinked(user.id, walletAddress);
    if (!isLinked) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

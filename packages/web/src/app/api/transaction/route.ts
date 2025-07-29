import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { constants } from '@normalfinance/utils';
import { rateLimiter } from '@/server/rateLimiter';
import { getApiConfig, getRateLimitConfig } from '@/lib/edge-config';
import { rpc, Keypair, Networks, Transaction } from '@stellar/stellar-sdk';
import { logWithConfig, createEdgeConfigHandler } from '@/lib/edge-config-middleware';

async function transactionHandler(req: NextRequest) {
  try {
    const { walletAddress, signedTransactionXDR, transactionType } = await req.json();

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
      await logWithConfig('warn', 'Rate limit exceeded for transaction API', { walletAddress, transactionType });
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Verify signature
    try {
      const transaction = new Transaction(
        signedTransactionXDR,
        constants.StellarConfig.NETWORK_PASSPHRASE
      );
      const keypair = Keypair.fromPublicKey(walletAddress);

      // Verify that the transaction is signed by the correct wallet
      const hasValidSignature = transaction.signatures.some((sig) => {
        try {
          return keypair.verify(transaction.hash(), sig.signature());
        } catch {
          return false;
        }
      });

      if (!hasValidSignature) {
        await logWithConfig('warn', 'Invalid signature for wallet address', { walletAddress, transactionType });
        return NextResponse.json(
          {
            error: 'Invalid signature for wallet address',
          },
          { status: 403 }
        );
      }
    } catch (error) {
      await logWithConfig('error', 'Signature verification failed', { error, walletAddress, transactionType });
      return NextResponse.json(
        {
          error: 'Failed to verify signature',
        },
        { status: 403 }
      );
    }

    // Execute the contract transaction server-side
    try {
      const server = new rpc.Server(constants.StellarConfig.RPC_URL, {
        allowHttp: process.env.NODE_ENV === 'development',
      });

      console.log('[Transaction API] Stellar Server: ', server);

      // Submit the signed transaction
      const result = await server.sendTransaction(
        new Transaction(signedTransactionXDR, constants.StellarConfig.NETWORK_PASSPHRASE)
      );

      console.log('[Transaction API] Result server.sendTransaction: ', result);

      return NextResponse.json({
        success: true,
        transactionHash: result.hash,
        result,
        config: {
          timeout: apiConfig.timeout,
          rateLimitRemaining: remaining,
        }
      });
    } catch (contractError: any) {
      await logWithConfig('error', `${transactionType || 'Contract'} execution failed`, { 
        error: contractError?.message, 
        walletAddress
      });
      return NextResponse.json(
        {
          error: contractError?.message || 'Contract execution failed',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    await logWithConfig('error', 'Transaction API error', { error: error?.message, transactionType: req.method });
    return NextResponse.json(
      { error: error?.message || 'Transaction processing failed' },
      { status: 500 }
    );
  }
}

export const POST = createEdgeConfigHandler(transactionHandler, 'transaction');

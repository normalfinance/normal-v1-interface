import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { constants } from '@normalfinance/utils';
import { rateLimiter } from '@/server/rateLimiter';
import { rpc, Keypair, Transaction } from '@stellar/stellar-sdk';

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, signedTransactionXDR, transactionType } = await req.json();

    if (!walletAddress || !signedTransactionXDR) {
      return NextResponse.json(
        {
          error: 'Missing walletAddress or signedTransactionXDR',
        },
        { status: 400 }
      );
    }

    // Get client IP address (prioritize proxy headers like middleware)
    const ip =
      req.headers.get('x-real-ip') || // many reverse proxies
      req.headers.get('X-Forwarded-For')?.split(',')[0] ||
      req.ip;

    const { success, limit, remaining, reset } = await rateLimiter.limit(walletAddress, ip);
    console.log(`${transactionType || 'Transaction'} rate limit check:`, {
      success,
      limit,
      remaining,
      reset,
    });

    if (!success) {
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
        return NextResponse.json(
          {
            error: 'Invalid signature for wallet address',
          },
          { status: 403 }
        );
      }
    } catch (error) {
      console.error('Signature verification failed:', error);
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

      // Submit the signed transaction
      const result = await server.sendTransaction(
        new Transaction(signedTransactionXDR, constants.StellarConfig.NETWORK_PASSPHRASE)
      );

      return NextResponse.json({
        success: true,
        transactionHash: result.hash,
        result,
      });
    } catch (contractError: any) {
      console.error(`${transactionType || 'Contract'} execution failed:`, contractError);
      return NextResponse.json(
        {
          error: contractError?.message || 'Contract execution failed',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error(`Transaction API error:`, error);
    return NextResponse.json(
      { error: error?.message || 'Transaction processing failed' },
      { status: 500 }
    );
  }
}

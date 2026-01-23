import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { FaucetService } from '@/lib/faucet-service';
import { rateLimiter } from '@/server/rateLimiter';

const FundWalletSchema = z.object({
  walletAddress: z
    .string()
    .min(1, 'Wallet address is required')
    .regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar wallet address'),
});

function getClientIP(request: NextRequest): string {
  const ip =
    request.headers.get('x-real-ip') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0] ||
    request.ip ||
    'unknown';
  return ip;
}

/**
 * POST /api/faucet/fund
 * Fund a new wallet with 1 XLM and return trustline XDR
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);

    const ipRateLimitResult = await rateLimiter.faucet.limit(ip);
    if (!ipRateLimitResult.success) {
      logger.warn('[API /faucet/fund] Rate limit exceeded for IP:', {
        ip: ip.substring(0, 8) + '...',
        remaining: ipRateLimitResult.remaining,
        reset: ipRateLimitResult.reset,
      });
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          reset: ipRateLimitResult.reset,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = FundWalletSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { walletAddress } = validation.data;

    const hasBeenFunded = await FaucetService.hasWalletBeenFunded(walletAddress);
    if (hasBeenFunded) {
      logger.warn('[API /faucet/fund] Wallet already funded:', {
        walletAddress: walletAddress.substring(0, 8) + '...',
      });
      return NextResponse.json(
        { error: 'Wallet has already been funded' },
        { status: 400 }
      );
    }

    const accountExists = await FaucetService.accountExists(walletAddress);
    if (accountExists) {
      logger.warn('[API /faucet/fund] Account already exists on Stellar:', {
        walletAddress: walletAddress.substring(0, 8) + '...',
      });
      return NextResponse.json(
        { error: 'Account already exists on Stellar network' },
        { status: 400 }
      );
    }

    const { txHash, trustlineXDR } = await FaucetService.fundNewWallet(
      walletAddress,
      ip,
      '1'
    );

    logger.log('[API /faucet/fund] Wallet funded successfully:', {
      walletAddress: walletAddress.substring(0, 8) + '...',
      txHash,
    });

    return NextResponse.json(
      {
        success: true,
        txHash,
        trustlineXDR,
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('[API /faucet/fund] Error funding wallet:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to fund wallet',
      },
      { status: 500 }
    );
  }
}

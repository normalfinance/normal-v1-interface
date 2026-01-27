import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { rateLimiter } from '@/server/rateLimiter';
import { SponsorService } from '@/lib/sponsor-service';

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
 * Sponsor a new account with reserves for account creation and USDC trustline
 * Returns partially-signed XDR that needs user signature
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

    const hasBeenSponsored = await SponsorService.hasBeenSponsored(walletAddress);
    if (hasBeenSponsored) {
      logger.warn('[API /faucet/fund] Wallet already sponsored:', {
        walletAddress: walletAddress.substring(0, 8) + '...',
      });
      return NextResponse.json({ error: 'Wallet has already been sponsored' }, { status: 400 });
    }

    const accountExists = await SponsorService.accountExists(walletAddress);
    if (accountExists) {
      logger.warn('[API /faucet/fund] Account already exists on Stellar:', {
        walletAddress: walletAddress.substring(0, 8) + '...',
      });
      return NextResponse.json(
        { error: 'Account already exists on Stellar network' },
        { status: 400 }
      );
    }

    const { sponsorshipXDR, sponsorAddress } = await SponsorService.createSponsoredAccount(
      walletAddress,
      ip
    );

    logger.log('[API /faucet/fund] Sponsorship XDR created:', {
      walletAddress: walletAddress.substring(0, 8) + '...',
      sponsor: sponsorAddress.substring(0, 8) + '...',
    });

    return NextResponse.json(
      {
        success: true,
        sponsorshipXDR,
        sponsorAddress,
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('[API /faucet/fund] Error creating sponsorship:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to create sponsorship',
      },
      { status: 500 }
    );
  }
}

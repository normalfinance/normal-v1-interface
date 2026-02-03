import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { SponsorService } from '@/lib/sponsor-service';
import { getClientIP, getAccessToken } from '@/utils/http';
import { faucetRateLimiter } from '@/server/faucetRateLimiter';
import { LinkedWalletService } from '@/lib/linked-wallet-service';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

const FundWalletSchema = z.object({
  walletAddress: z
    .string()
    .min(1, 'Wallet address is required')
    .regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar wallet address'),
});

/**
 * POST /api/faucet/fund
 * Sponsor a new account with reserves for account creation and USDC trustline
 * Returns partially-signed XDR that needs user signature
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const token = getAccessToken(request);
    const user = await getAuthenticatedUser(token);
    const isDev = process.env.NODE_ENV === 'development';
    const forceRateLimit = process.env.FORCE_RATE_LIMIT === 'true';

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit by supabaseUid (1 per week)
    if (!isDev || forceRateLimit) {
      const rateLimitResult = await faucetRateLimiter.limit(user.id);
      if (!rateLimitResult.success) {
        logger.warn('[API /faucet/fund] Rate limit exceeded for user:', {
          userId: user.id.substring(0, 8) + '...',
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset,
        });
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            reset: rateLimitResult.reset,
          },
          { status: 429 }
        );
      }
    } else if (isDev) {
      logger.log('[API /faucet/fund] Dev mode: skipping rate limit', {
        userId: user.id.substring(0, 8) + '...',
      });
    }

    const ip = getClientIP(request);

    const body = await request.json();
    const validation = FundWalletSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { walletAddress } = validation.data;

    // Assert user owns walletAddress
    const isLinked = await LinkedWalletService.isWalletLinked(user.id, walletAddress);
    if (!isLinked) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
      user.id,
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

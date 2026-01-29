import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { SponsorService } from '@/lib/sponsor-service';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

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

function getAccessToken(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return undefined;
  return authHeader.split(' ')[1];
}

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

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // TODO: Client giving "Rate limit exceeded. Please try again later." right after new account creation
    // Rate limit by supabaseUid (1 per week)
    if (!isDev) {
      const rateLimitResult = await rateLimiter.faucet.limit(user.id);
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
    } else {
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

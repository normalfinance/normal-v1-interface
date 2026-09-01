import type { NextRequest } from 'next/server';

import { logger } from '@/utils/logger';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { faucetRateLimiter } from '@/server/faucet-rate-limiter';

/**
 * GET /api/wallets/check-limit
 * Check the wallet creation rate limit status for the authenticated user
 * Returns whether the user can create a new wallet and when the limit resets
 */
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    // Authenticate

    const isDev = process.env.NODE_ENV === 'development';
    const isTestnet = process.env.NEXT_PUBLIC_NETWORK?.toLowerCase() !== 'mainnet';
    const forceRateLimit = process.env.FORCE_RATE_LIMIT === 'true';

    logger.log('[API /wallets/check-limit] Rate limit config:', {
      isDev,
      isTestnet,
      forceRateLimit,
      envValue: process.env.FORCE_RATE_LIMIT,
    });

    if ((isDev || isTestnet) && !forceRateLimit) {
      logger.log('[API /wallets/check-limit] Dev/testnet mode: skipping rate limit', {
        userId: user.id.substring(0, 8) + '...',
      });
      return NextResponse.json({
        allowed: true,
        remaining: 3,
        reset: 0,
      });
    }

    const rateLimitStatus = await faucetRateLimiter.check(user.id);

    if (rateLimitStatus.degraded) {
      logger.warn('[API /wallets/check-limit] Rate limiter unavailable, allowing request:', {
        userId: user.id.substring(0, 8) + '...',
      });
    }

    logger.log('[API /wallets/check-limit] Rate limit checked for user:', {
      userId: user.id.substring(0, 8) + '...',
      remaining: rateLimitStatus.remaining,
      reset: rateLimitStatus.reset,
      degraded: Boolean(rateLimitStatus.degraded),
    });

    return NextResponse.json({
      allowed: rateLimitStatus.remaining > 0,
      remaining: rateLimitStatus.remaining,
      reset: rateLimitStatus.reset,
    });
  } catch (error) {
    logger.error('[API /wallets/check-limit] Error checking rate limit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

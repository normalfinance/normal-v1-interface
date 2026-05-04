import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { getAccessToken } from '@/utils/http';
import { faucetRateLimiter } from '@/server/faucet-rate-limiter';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

/**
 * GET /api/wallets/check-limit
 * Check the wallet creation rate limit status for the authenticated user
 * Returns whether the user can create a new wallet and when the limit resets
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const accessToken = getAccessToken(request);
    const user = await getAuthenticatedUser(accessToken);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isDev = process.env.NODE_ENV === 'development';
    const forceRateLimit = process.env.FORCE_RATE_LIMIT === 'true';

    logger.log('[API /wallets/check-limit] Rate limit config:', {
      isDev,
      forceRateLimit,
      envValue: process.env.FORCE_RATE_LIMIT,
    });

    if (isDev && !forceRateLimit) {
      logger.log('[API /wallets/check-limit] Dev mode: skipping rate limit', {
        userId: user.id.substring(0, 8) + '...',
      });
      return NextResponse.json({
        allowed: true,
        remaining: 2,
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
}

import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { rateLimiter } from '@/server/rateLimiter';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

/**
 * GET /api/wallets/check-limit
 * Check the wallet creation rate limit status for the authenticated user
 * Returns whether the user can create a new wallet and when the limit resets
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : undefined;

    const user = await getAuthenticatedUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      logger.log('[API /wallets/check-limit] Dev mode: skipping rate limit', {
        userId: user.id.substring(0, 8) + '...',
      });
      return NextResponse.json({
        allowed: true,
        remaining: 1,
        reset: 0,
      });
    }

    const rateLimitStatus = await rateLimiter.faucet.check(user.id);

    logger.log('[API /wallets/check-limit] Rate limit checked for user:', {
      userId: user.id.substring(0, 8) + '...',
      remaining: rateLimitStatus.remaining,
      reset: rateLimitStatus.reset,
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

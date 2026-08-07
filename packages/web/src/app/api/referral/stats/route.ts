import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { getClientIP } from '@/utils/http';
import { rateLimiter } from '@/server/rateLimiter';
import { ReferralService } from '@/lib/referral-service';
import { getApiConfig, getRateLimitConfig } from '@/lib/edge-config';
import { logWithConfig, createEdgeConfigHandler } from '@/lib/edge-config-middleware';

export const dynamic = 'force-dynamic';

const GetStatsSchema = z.object({
  walletAddress: z.string().min(1, 'Wallet address is required'),
});

const getReferralStatsHandler = withAuth(async (request: NextRequest, { user }) => {
  try {
    const walletAddress = request.nextUrl.searchParams.get('walletAddress');

    const validation = GetStatsSchema.safeParse({ walletAddress });
    if (!validation.success) {
      await logWithConfig('warn', 'Referral stats API called with invalid parameters', {
        errors: validation.error.errors,
      });
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Get Edge Config for rate limiting
    const rateLimitConfig = await getRateLimitConfig('referral-stats');
    const apiConfig = await getApiConfig('referral-stats');

    // Get client IP address
    const ip = getClientIP(request);

    // Use Edge Config rate limit override if available
    const effectiveLimit = apiConfig.rateLimitOverride || {
      requests: rateLimitConfig.requests,
      windowMs: rateLimitConfig.windowMs,
    };

    const { success, limit, remaining, reset } = await rateLimiter.limit(
      validation.data.walletAddress,
      ip
    );

    await logWithConfig('info', 'Referral stats rate limit check', {
      success,
      limit,
      remaining,
      reset,
      walletAddress: validation.data.walletAddress.substring(0, 8) + '...',
      effectiveLimit,
    });

    if (!success) {
      await logWithConfig('warn', 'Rate limit exceeded for referral stats API', {
        walletAddress: validation.data.walletAddress,
      });
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Assert user owns walletAddress
    // const isLinked = await LinkedWalletService.isWalletLinked(
    //   user.id,
    //   validation.data.walletAddress
    // );
    // if (!isLinked) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    const stats = await ReferralService.getReferralStats(validation.data.walletAddress);

    await logWithConfig('info', 'Referral stats retrieved successfully', {
      walletAddress: validation.data.walletAddress.substring(0, 8) + '...',
      statsKeys: Object.keys(stats),
    });

    return NextResponse.json({
      stats,
      config: {
        timeout: apiConfig.timeout,
        rateLimitRemaining: remaining,
        refreshInterval: (apiConfig as any).refreshInterval || 300000,
      },
    });
  } catch (error) {
    await logWithConfig('error', 'Error fetching referral stats', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const GET = createEdgeConfigHandler(getReferralStatsHandler, 'referral-stats');

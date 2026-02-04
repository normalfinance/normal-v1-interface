import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';
import { getClientIP, getAccessToken } from '@/utils/http';
import { getApiConfig, getRateLimitConfig } from '@/lib/edge-config';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';
import { logWithConfig, createEdgeConfigHandler } from '@/lib/edge-config-middleware';

async function pairsHandler(req: NextRequest) {
  try {
    // Authenticate
    const token = getAccessToken(req);
    const user = await getAuthenticatedUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate params
    const { walletAddress } = await req.json();
    if (!walletAddress) {
      await logWithConfig('warn', 'Pair API called without wallet address');
      return NextResponse.json({ error: 'Missing walletAddress' }, { status: 400 });
    }

    // Get Edge Config for rate limiting
    const rateLimitConfig = await getRateLimitConfig('pairs');
    const apiConfig = await getApiConfig('pairs');

    // Get client IP address (prioritize proxy headers like middleware)
    const ip = getClientIP(req);

    // Use Edge Config rate limit override if available
    const effectiveLimit = apiConfig.rateLimitOverride || {
      requests: rateLimitConfig.requests,
      windowMs: rateLimitConfig.windowMs,
    };

    const { success, limit, remaining, reset } = await rateLimiter.limit(walletAddress, ip);

    await logWithConfig('info', 'Pair data rate limit check', {
      success,
      limit,
      remaining,
      reset,
      walletAddress: walletAddress.substring(0, 8) + '...',
      effectiveLimit,
    });

    if (!success) {
      await logWithConfig('warn', 'Rate limit exceeded for pools API', { walletAddress });
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Assert user owns walletAddress
    // const isLinked = await LinkedWalletService.isWalletLinked(user.id, walletAddress);
    // if (!isLinked) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    await logWithConfig('info', 'Pairs API access granted', {
      walletAddress: walletAddress.substring(0, 8) + '...',
    });
    return NextResponse.json({
      allowed: true,
      config: {
        timeout: apiConfig.timeout,
        rateLimitRemaining: remaining,
      },
    });
  } catch (error: any) {
    await logWithConfig('error', 'Pair data validation failed', { error: error?.message });
    return NextResponse.json(
      { error: error?.message || 'Pair data validation failed' },
      { status: 500 }
    );
  }
}

export const POST = createEdgeConfigHandler(pairsHandler, 'pairs');

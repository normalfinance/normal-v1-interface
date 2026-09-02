import type { NextRequest } from 'next/server';

import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { getClientIP } from '@/utils/http';
import { rateLimiter } from '@/server/rateLimiter';
import { getApiConfig, getRateLimitConfig } from '@/lib/edge-config';
import { logWithConfig, createEdgeConfigHandler } from '@/lib/edge-config-middleware';

const sendHandler = withAuth(async (req: NextRequest, { user }) => {
  try {
    // Validate params
    const { walletAddress } = await req.json();
    if (!walletAddress) {
      await logWithConfig('warn', 'Send API called without wallet address');
      return NextResponse.json({ error: 'Missing walletAddress' }, { status: 400 });
    }

    // Get Edge Config for rate limiting
    const rateLimitConfig = await getRateLimitConfig('send');
    const apiConfig = await getApiConfig('send');

    // Get client IP address (prioritize proxy headers like middleware)
    const ip = getClientIP(req);

    // Use Edge Config rate limit override if available
    const effectiveLimit = apiConfig.rateLimitOverride || {
      requests: rateLimitConfig.requests,
      windowMs: rateLimitConfig.windowMs,
    };

    const { success, limit, remaining, reset } = await rateLimiter.limit(walletAddress, ip);

    await logWithConfig('info', 'Send rate limit check', {
      success,
      limit,
      remaining,
      reset,
      walletAddress: walletAddress.substring(0, 8) + '...',
      effectiveLimit,
    });

    if (!success) {
      await logWithConfig('warn', 'Rate limit exceeded for send API', { walletAddress });
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Assert user owns walletAddress
    // const isLinked = await LinkedWalletService.isWalletLinked(user.id, walletAddress);
    // if (!isLinked) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    await logWithConfig('info', 'Send API access granted', {
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
    await logWithConfig('error', 'Send validation failed', { error: error?.message });
    return NextResponse.json(
      { error: error?.message || 'Send validation failed' },
      { status: 500 }
    );
  }
});

export const POST = createEdgeConfigHandler(sendHandler, 'send');

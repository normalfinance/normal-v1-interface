import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';
import { getClientIP, getAccessToken } from '@/utils/http';
import { LinkedWalletService } from '@/lib/linked-wallet-service';
import { getApiConfig, getRateLimitConfig } from '@/lib/edge-config';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';
import { logWithConfig, createEdgeConfigHandler } from '@/lib/edge-config-middleware';

async function tradeHandler(req: NextRequest) {
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
      await logWithConfig('warn', 'Trade API called without wallet address');
      return NextResponse.json({ error: 'Missing walletAddress' }, { status: 400 });
    }

    // Assert user owns walletAddress
    const isLinked = await LinkedWalletService.isWalletLinked(user.id, walletAddress);
    if (!isLinked) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get Edge Config for rate limiting
    const rateLimitConfig = await getRateLimitConfig('trade');
    const apiConfig = await getApiConfig('trade');

    // Get client IP address (prioritize proxy headers like middleware)
    const ip = getClientIP(req);

    // Use Edge Config rate limit override if available
    const effectiveLimit = apiConfig.rateLimitOverride || {
      requests: rateLimitConfig.requests,
      windowMs: rateLimitConfig.windowMs,
    };

    const { success, limit, remaining, reset } = await rateLimiter.limit(walletAddress, ip);

    await logWithConfig('info', 'Trade rate limit check', {
      success,
      limit,
      remaining,
      reset,
      walletAddress: walletAddress.substring(0, 8) + '...',
      effectiveLimit,
    });

    if (!success) {
      await logWithConfig('warn', 'Rate limit exceeded for trade API', { walletAddress });
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    await logWithConfig('info', 'Trade API access granted', {
      walletAddress: walletAddress.substring(0, 8) + '...',
    });
    return NextResponse.json({
      allowed: true,
      config: {
        timeout: apiConfig.timeout,
        rateLimitRemaining: remaining,
        slippageTolerance: (apiConfig as any).slippageTolerance || 0.01,
      },
    });
  } catch (error: any) {
    await logWithConfig('error', 'Trade validation failed', { error: error?.message });
    return NextResponse.json(
      { error: error?.message || 'Trade validation failed' },
      { status: 500 }
    );
  }
}

export const POST = createEdgeConfigHandler(tradeHandler, 'trade');

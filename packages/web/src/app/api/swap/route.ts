import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';
import { getApiConfig, getRateLimitConfig } from '@/lib/edge-config';
import { logWithConfig, createEdgeConfigHandler } from '@/lib/edge-config-middleware';

async function swapHandler(req: NextRequest) {
  try {
    const { walletAddress, swapArgs } = await req.json();
    if (!walletAddress || !swapArgs) {
      await logWithConfig('warn', 'Swap API called without wallet address or swap args');
      return NextResponse.json({ error: 'Missing walletAddress or swapArgs' }, { status: 400 });
    }

    // Get Edge Config for rate limiting
    const rateLimitConfig = await getRateLimitConfig('swap');
    const apiConfig = await getApiConfig('swap');

    // Get client IP address (prioritize proxy headers like middleware)
    const ip =
      req.headers.get('x-real-ip') || // many reverse proxies
      req.headers.get('X-Forwarded-For')?.split(',')[0] ||
      req.ip;

    // Use Edge Config rate limit override if available
    const effectiveLimit = apiConfig.rateLimitOverride || {
      requests: rateLimitConfig.requests,
      windowMs: rateLimitConfig.windowMs,
    };

    const { success, limit, remaining, reset } = await rateLimiter.limit(walletAddress, ip);

    await logWithConfig('info', 'Swap rate limit check', {
      success,
      limit,
      remaining,
      reset,
      walletAddress: walletAddress.substring(0, 8) + '...',
      effectiveLimit,
    });

    if (!success) {
      await logWithConfig('warn', 'Rate limit exceeded for swap API', { walletAddress });
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    await logWithConfig('info', 'Swap API access granted', {
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
    await logWithConfig('error', 'Swap validation failed', { error: error?.message });
    return NextResponse.json(
      { error: error?.message || 'Swap validation failed' },
      { status: 500 }
    );
  }
}

export const POST = createEdgeConfigHandler(swapHandler, 'swap');

import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';
import { LeaderboardService } from '@/lib/leaderboard-service';
import { getApiConfig, getRateLimitConfig } from '@/lib/edge-config';
import { logWithConfig, createEdgeConfigHandler } from '@/lib/edge-config-middleware';

export const dynamic = 'force-dynamic';

async function getLeaderboardStatsHandler(request: NextRequest) {
  try {
    const apiConfig = await getApiConfig('leaderboard-stats');

    // Get client IP address
    const ip =
      request.headers.get('x-real-ip') ||
      request.headers.get('X-Forwarded-For')?.split(',')[0] ||
      request.ip;

    const { success, limit, remaining, reset } = await rateLimiter.limit(
      'leaderboard-stats-api',
      ip
    );

    await logWithConfig('info', 'Leaderboard stats rate limit check', {
      success,
      limit,
      remaining,
      reset,
    });

    if (!success) {
      await logWithConfig('warn', 'Rate limit exceeded for leaderboard stats API');
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const stats = await LeaderboardService.getStats();

    await logWithConfig('info', 'Leaderboard stats retrieved successfully', {
      totalFunds: stats.totalFunds,
      publicFunds: stats.publicFunds,
    });

    return NextResponse.json({
      stats,
      config: {
        timeout: apiConfig.timeout,
        rateLimitRemaining: remaining,
        refreshInterval: (apiConfig as any).refreshInterval || 60000,
      },
    });
  } catch (error) {
    await logWithConfig('error', 'Error fetching leaderboard stats', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = createEdgeConfigHandler(getLeaderboardStatsHandler, 'leaderboard-stats');

import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';
import { LeaderboardService } from '@/lib/leaderboard-service';
import { getApiConfig, getRateLimitConfig } from '@/lib/edge-config';
import { logWithConfig, createEdgeConfigHandler } from '@/lib/edge-config-middleware';

export const dynamic = 'force-dynamic';

const GetLeaderboardSchema = z.object({
  metric: z.enum(['tvl', 'deposits', 'netFlow']).default('tvl'),
  visibility: z.enum(['all', 'public', 'private']).default('all'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

async function getLeaderboardHandler(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const validation = GetLeaderboardSchema.safeParse({
      metric: searchParams.get('metric') || 'tvl',
      visibility: searchParams.get('visibility') || 'all',
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    });

    if (!validation.success) {
      await logWithConfig('warn', 'Leaderboard API called with invalid parameters', {
        errors: validation.error.errors,
      });
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.errors },
        { status: 400 }
      );
    }

    const apiConfig = await getApiConfig('leaderboard');

    // Get client IP address
    const ip =
      request.headers.get('x-real-ip') ||
      request.headers.get('X-Forwarded-For')?.split(',')[0] ||
      request.ip;

    const { success, limit, remaining, reset } = await rateLimiter.limit('leaderboard-api', ip);

    await logWithConfig('info', 'Leaderboard rate limit check', {
      success,
      limit,
      remaining,
      reset,
    });

    if (!success) {
      await logWithConfig('warn', 'Rate limit exceeded for leaderboard API');
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const leaderboard = await LeaderboardService.getLeaderboard(validation.data);

    await logWithConfig('info', 'Leaderboard retrieved successfully', {
      metric: validation.data.metric,
      visibility: validation.data.visibility,
      page: validation.data.page,
      resultsCount: leaderboard.rankings.length,
    });

    return NextResponse.json({
      ...leaderboard,
      config: {
        timeout: apiConfig.timeout,
        rateLimitRemaining: remaining,
        refreshInterval: (apiConfig as any).refreshInterval || 60000,
      },
    });
  } catch (error) {
    await logWithConfig('error', 'Error fetching leaderboard', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = createEdgeConfigHandler(getLeaderboardHandler, 'leaderboard');

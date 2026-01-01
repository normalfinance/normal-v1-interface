import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { LeaderboardService } from '@/lib/leaderboard-service';
import { logWithConfig, createEdgeConfigHandler } from '@/lib/edge-config-middleware';

export const dynamic = 'force-dynamic';

// Sync endpoint should have a longer timeout
export const maxDuration = 60;

async function syncLeaderboardHandler(request: NextRequest) {
  try {
    // Verify API key for cron job authentication
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Also check for Vercel's cron authentication header
    const vercelCronAuth = request.headers.get('x-vercel-cron-auth');

    const isAuthorized =
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      (cronSecret && vercelCronAuth === cronSecret) ||
      process.env.NODE_ENV === 'development';

    if (!isAuthorized) {
      await logWithConfig('warn', 'Unauthorized sync attempt', {
        hasAuthHeader: !!authHeader,
        hasVercelCronAuth: !!vercelCronAuth,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await logWithConfig('info', 'Starting leaderboard sync');

    const startTime = Date.now();
    const result = await LeaderboardService.syncFromContracts();
    const duration = Date.now() - startTime;

    await logWithConfig('info', 'Leaderboard sync completed', {
      synced: result.synced,
      errors: result.errors,
      durationMs: duration,
    });

    return NextResponse.json({
      success: true,
      synced: result.synced,
      errors: result.errors,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    await logWithConfig('error', 'Error syncing leaderboard', { error });
    return NextResponse.json(
      {
        error: 'Sync failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const POST = createEdgeConfigHandler(syncLeaderboardHandler, 'leaderboard-sync');

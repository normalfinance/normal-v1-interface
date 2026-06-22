import type { NextRequest } from 'next/server';
import type { NetworkType } from '@normalfinance/utils';
import type { PortfolioAsset } from '@/types/portfolio';

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { redis } from '@/server/rateLimiter';
import { logger } from '@normalfinance/utils';
import { getAccessToken } from '@/utils/http';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';
import { aggregatePortfolio, applyStaleFallback } from '@/lib/portfolio/aggregate';

// ---------------------------------------------------------------------------
// GET /api/wallet/portfolio?stellar=<G…>&network=<mainnet|testnet>
//
// Single source of truth for the user's balances across all chains. Native
// (BTC/ETH/SOL) addresses come from the authed DB row (can't be spoofed); the
// Stellar address is passed in so it also covers connected (Lobstr) wallets.
//
// Two Redis keys: a short response cache (dedup + freshness) and a longer
// last-good snapshot used to serve stale values when a chain source fails.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';

const RESPONSE_TTL_SECONDS = 15;
const SNAPSHOT_TTL_SECONDS = 3600;

export async function GET(req: NextRequest) {
  try {
    const token = getAccessToken(req);
    const user = await getAuthenticatedUser(token);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const networkParam = req.nextUrl.searchParams.get('network');
    const network: NetworkType = networkParam === 'testnet' ? 'testnet' : 'mainnet';
    const stellarParam = req.nextUrl.searchParams.get('stellar');

    // Native addresses from the authed DB row; Stellar from the param (covers
    // connected wallets), falling back to the DB stellarAddress.
    const wallet = await prisma.turnkeyWallet.findUnique({
      where: { supabaseUid: user.id },
      select: {
        bitcoinAddress: true,
        ethereumAddress: true,
        solanaAddress: true,
        stellarAddress: true,
      },
    });

    const stellar =
      stellarParam && /^[GC][A-Z2-7]{55}$/.test(stellarParam)
        ? stellarParam
        : wallet?.stellarAddress ?? null;

    const addresses = {
      bitcoin: wallet?.bitcoinAddress ?? null,
      ethereum: wallet?.ethereumAddress ?? null,
      solana: wallet?.solanaAddress ?? null,
      stellar,
    };

    const cacheKey = `portfolio:${user.id}:${network}:${stellar ?? 'none'}`;
    const snapshotKey = `portfolio:snap:${user.id}:${network}:${stellar ?? 'none'}`;

    // Fresh response still cached → return immediately (dedups bursts of views).
    try {
      const cached = await redis.get<{ updatedAt: number; assets: PortfolioAsset[] }>(cacheKey);
      if (cached) return NextResponse.json({ success: true, ...cached });
    } catch {
      /* cache unavailable — aggregate fresh */
    }

    const fresh = await aggregatePortfolio(addresses, network, Date.now());

    // Backfill any failed chains from the last-good snapshot (marked `stale`).
    let lastGood: Record<string, PortfolioAsset> | null = null;
    try {
      lastGood = await redis.get<Record<string, PortfolioAsset>>(snapshotKey);
    } catch {
      /* no snapshot */
    }
    const { merged, snapshot } = applyStaleFallback(fresh, lastGood);

    try {
      await redis.set(cacheKey, merged, { ex: RESPONSE_TTL_SECONDS });
      await redis.set(snapshotKey, snapshot, { ex: SNAPSHOT_TTL_SECONDS });
    } catch {
      /* cache write non-fatal */
    }

    return NextResponse.json({ success: true, ...merged });
  } catch (error) {
    logger.error('[wallet/portfolio] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load portfolio' }, { status: 500 });
  }
}

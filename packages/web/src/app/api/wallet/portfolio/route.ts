import type { NextRequest } from 'next/server';
import type { ChainId } from '@/lib/chains/registry';
import type { NetworkType } from '@normalfinance/utils';
import type { PortfolioAsset, PortfolioPayload } from '@/types/portfolio';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { redis } from '@/server/rateLimiter';
import { logger } from '@normalfinance/utils';
import { CHAIN_IDS, ADDRESS_SELECT, getChainAddress } from '@/lib/chains/registry';
import {
  aggregatePortfolio,
  applyStaleFallback,
  aggregateStellarOnly,
} from '@/lib/portfolio/aggregate';

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

export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const networkParam = req.nextUrl.searchParams.get('network');
    const network: NetworkType = networkParam === 'testnet' ? 'testnet' : 'mainnet';
    const stellarParam = req.nextUrl.searchParams.get('stellar');

    // Native addresses from the authed DB row; Stellar from the param (covers
    // connected wallets), falling back to the DB stellarAddress.
    const wallet = await prisma.turnkeyWallet.findUnique({
      where: { supabaseUid: user.id },
      select: ADDRESS_SELECT,
    });

    const stellar =
      stellarParam && /^[GC][A-Z2-7]{55}$/.test(stellarParam)
        ? stellarParam
        : getChainAddress(wallet, 'stellar');

    // One entry per registry chain, so a new chain is aggregated without
    // editing this map. Stellar keeps its override: the query param covers a
    // connected (non-Turnkey) wallet, falling back to the stored address.
    const addresses = {
      ...(Object.fromEntries(CHAIN_IDS.map((id) => [id, getChainAddress(wallet, id)])) as Record<
        ChainId,
        string | null
      >),
      stellar,
    };

    // #32 chunk 2: when the connected wallet is EXTERNAL (the stellar param
    // differs from the user's Turnkey Stellar address), also return the
    // companion Normal wallet's XLM/USDC so the drawer can show both wallets.
    const turnkeyStellar = getChainAddress(wallet, 'stellar');
    const includeCompanion = !!turnkeyStellar && turnkeyStellar !== stellar;

    const cacheKey = `portfolio:${user.id}:${network}:${stellar ?? 'none'}`;
    const snapshotKey = `portfolio:snap:${user.id}:${network}:${stellar ?? 'none'}`;
    const floorKey = `portfolio:floor:${user.id}`;
    const wantsFresh = req.nextUrl.searchParams.get('refresh') === '1';

    // Fresh response still cached → return immediately (dedups bursts of views).
    //
    // `refresh=1` skips the cached copy so a just-made send/swap shows its new
    // balance at once — the same bypass the four activity routes have, and the
    // reason a send used to need a page reload (docs/audit/48). Floored per
    // user so the bypass can't be leaned on to hammer the chain sources.
    try {
      const withinFloor = wantsFresh ? await redis.get(floorKey) : null;
      if (!wantsFresh || withinFloor) {
        const cached = await redis.get<PortfolioPayload>(cacheKey);
        if (cached) return NextResponse.json({ success: true, ...cached });
      }
      if (wantsFresh && !withinFloor) await redis.set(floorKey, 1, { ex: 5 });
    } catch {
      /* cache unavailable — aggregate fresh */
    }

    const [fresh, companionAssets] = await Promise.all([
      aggregatePortfolio(addresses, network, Date.now()),
      includeCompanion
        ? aggregateStellarOnly(turnkeyStellar!, network).catch(() => null)
        : Promise.resolve(null),
    ]);

    // Doc 90 W3: one Horizon blip used to erase the companion Normal wallet
    // from the drawer, Holdings and the savings deposit balance. Mirror the
    // main assets' stale machinery with a last-good companion copy.
    let companionFinal = companionAssets;
    if (includeCompanion && turnkeyStellar) {
      const companionKey = `portfolio:companion:${network}:${turnkeyStellar}`;
      if (companionFinal && companionFinal.length > 0) {
        try {
          await redis.set(companionKey, companionFinal, { ex: SNAPSHOT_TTL_SECONDS });
        } catch {
          /* non-fatal */
        }
      } else {
        try {
          const saved = await redis.get<PortfolioAsset[]>(companionKey);
          if (saved?.length) companionFinal = saved;
        } catch {
          /* no last-good copy */
        }
      }
    }

    // Backfill any failed chains from the last-good snapshot (marked `stale`).
    let lastGood: Record<string, PortfolioAsset> | null = null;
    try {
      lastGood = await redis.get<Record<string, PortfolioAsset>>(snapshotKey);
    } catch {
      /* no snapshot */
    }
    const { merged, snapshot } = applyStaleFallback(fresh, lastGood);

    // Companion rides the response cache but stays OUT of the stale-snapshot
    // machinery: a failed companion read returns empty assets and self-heals
    // on the next 15s cycle — simpler than threading a second wallet through
    // the fallback merge, and the drawer degrades to a loading row.
    const body: PortfolioPayload = {
      ...merged,
      companionStellar:
        includeCompanion && turnkeyStellar
          ? { address: turnkeyStellar, assets: companionFinal ?? [] }
          : null,
    };

    try {
      await redis.set(cacheKey, body, { ex: RESPONSE_TTL_SECONDS });
      await redis.set(snapshotKey, snapshot, { ex: SNAPSHOT_TTL_SECONDS });
    } catch {
      /* cache write non-fatal */
    }

    return NextResponse.json({ success: true, ...body });
  } catch (error) {
    logger.error('[wallet/portfolio] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load portfolio' },
      { status: 500 }
    );
  }
});

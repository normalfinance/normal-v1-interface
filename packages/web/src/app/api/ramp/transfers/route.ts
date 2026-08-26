import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';
import { userOwnsAnyWalletAddress } from '@/lib/wallet-ownership';
import { liveChainBalance, hasIncomingSince } from '@/server/ramp-chain';
import { RAMP_STATUSES, type RampStatus, ABANDON_AFTER_MS, TERMINAL_STATUSES, balanceShowsArrival } from '@/lib/ramp/status';

// Ramp transfers (doc 89 F2): one record per handoff to a ramp provider,
// written BEFORE the user leaves our app so a closed tab cannot lose it.
//
// POST creates the record at commit; GET lists the caller's rows for the
// banner and activity feed. Table ships as additive SQL
// (docs/audit/sql/ramp_transfers.sql) — every handler degrades to an empty
// answer while the migration is pending, because a missing table must never
// block a purchase.
export const dynamic = 'force-dynamic';

const DIRECTIONS = new Set(['onramp', 'offramp']);
const PROVIDERS = new Set(['coinbase', 'moonpay', 'moneygram', 'stripe']);
const CHAINS = new Set(['stellar', 'bitcoin', 'ethereum', 'solana']);

export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const { success: withinLimit } = await rateLimiter.limit(`ramp-create:${user.id}`);
    if (!withinLimit) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    const direction = String(body?.direction ?? '');
    const provider = String(body?.provider ?? '');
    const asset = String(body?.asset ?? '').toUpperCase();
    const chain = String(body?.chain ?? '');
    const walletAddress = String(body?.walletAddress ?? '');
    const network = body?.network === 'testnet' ? 'testnet' : 'mainnet';
    const amountExpected = body?.amountExpected != null ? String(body.amountExpected) : null;
    const baselineBalance = body?.baselineBalance != null ? String(body.baselineBalance) : null;
    const providerRef = body?.providerRef != null ? String(body.providerRef) : null;

    if (!DIRECTIONS.has(direction) || !PROVIDERS.has(provider) || !CHAINS.has(chain) || !asset) {
      return NextResponse.json({ success: false, error: 'Invalid transfer' }, { status: 400 });
    }

    // The address comes from the request body, so authentication alone is not
    // enough — without this, any signed-in user could plant banners (and
    // later arrival flips) against someone else's wallet.
    if (!(await userOwnsAnyWalletAddress(user.id, walletAddress))) {
      return NextResponse.json(
        { success: false, error: 'Wallet does not belong to this account' },
        { status: 403 }
      );
    }

    // One live handoff per (provider, asset, wallet): re-opening the same
    // checkout must not stack a second banner row (2026-08-26: two stuck
    // rows read as "double messages"). The still-active row is the record.
    const existing = await prisma.rampTransfer.findFirst({
      where: {
        supabaseUid: user.id,
        network,
        direction,
        provider,
        asset,
        chain,
        walletAddress,
        status: { notIn: [...TERMINAL_STATUSES] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return NextResponse.json({ success: true, id: existing.id, reused: true });
    }

    // Arrival baseline for EVERY chain: use the client's number when it sent
    // one (Stellar knows its per-wallet balance), otherwise read the chain.
    const baseline = baselineBalance ?? (await liveChainBalance(chain, network, walletAddress, asset));

    const row = await prisma.rampTransfer.create({
      data: {
        supabaseUid: user.id,
        network,
        direction,
        provider,
        asset,
        chain,
        walletAddress,
        amountExpected,
        baselineBalance: baseline,
        providerRef,
      },
    });
    return NextResponse.json({ success: true, id: row.id }, { status: 201 });
  } catch (e: any) {
    // Missing table (migration pending) or transient DB trouble: the ramp
    // itself must proceed — the caller treats a failed create as "no
    // tracking this time", never as "do not buy".
    return NextResponse.json(
      { success: false, error: String(e?.message ?? e).slice(0, 200) },
      { status: 200 }
    );
  }
});

export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const activeOnly = req.nextUrl.searchParams.get('active') === '1';
    // Rule 2 ("nothing pends forever") without depending on the cron —
    // Vercel crons never run on localhost/staging (verified 2026-08-26), so
    // the read that feeds the banner sweeps this user's expired rows itself.
    await prisma.rampTransfer
      .updateMany({
        where: {
          supabaseUid: user.id,
          status: 'committed',
          createdAt: { lt: new Date(Date.now() - ABANDON_AFTER_MS) },
        },
        data: { status: 'abandoned', settledAt: new Date() },
      })
      .catch(() => {});
    // Server-side ARRIVAL (2026-08-26): the row must clear even when no tab
    // watched the money land — the read path proves it from the CHAIN:
    // balance above baseline when a baseline exists, or a confirmed incoming
    // transfer newer than the row when it does not (rule 3's "found on-chain
    // tx"). Best-effort: a dead RPC changes nothing; abandonment still
    // bounds every row.
    try {
      const candidates = await prisma.rampTransfer.findMany({
        where: {
          supabaseUid: user.id,
          direction: 'onramp',
          status: { notIn: [...TERMINAL_STATUSES] },
        },
        orderBy: { createdAt: 'desc' },
        take: 4,
      });
      for (const row of candidates) {
        // Give a just-committed checkout a moment — an instant lookup would
        // only measure the pre-purchase state.
        if (Date.now() - row.createdAt.getTime() < 30_000) continue;
        let arrivedNow = false;
        if (row.baselineBalance != null) {
          const current = await liveChainBalance(
            row.chain,
            row.network,
            row.walletAddress,
            row.asset
          );
          arrivedNow = balanceShowsArrival(
            row.baselineBalance,
            current == null ? null : Number(current)
          );
        } else {
          arrivedNow =
            (await hasIncomingSince(
              row.chain,
              row.network,
              row.walletAddress,
              row.asset,
              row.createdAt.getTime()
            )) === true;
        }
        if (arrivedNow) {
          await prisma.rampTransfer.updateMany({
            where: { id: row.id, status: { notIn: [...TERMINAL_STATUSES] } },
            data: { status: 'arrived', settledAt: new Date() },
          });
        }
      }
    } catch {
      /* chain checks are best-effort */
    }
    const rows = await prisma.rampTransfer.findMany({
      where: {
        supabaseUid: user.id,
        ...(activeOnly
          ? { status: { notIn: [...TERMINAL_STATUSES].filter((s) => s !== 'failed') } }
          : {}),
        // Old terminal rows are history the activity feed's chain rows
        // already tell better; cap the window so the list stays bounded.
        createdAt: { gt: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return NextResponse.json({
      success: true,
      transfers: rows.filter((r) => RAMP_STATUSES.includes(r.status as RampStatus)),
    });
  } catch {
    // Migration pending → no banner, not an error state.
    return NextResponse.json({ success: true, transfers: [] });
  }
});

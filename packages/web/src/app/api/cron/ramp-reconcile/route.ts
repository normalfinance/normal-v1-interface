import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';
// Vercel Cron: keep in-flight ramp transfers honest when no tab is open
// (doc 89 F2d). Two jobs, both rules of the status machine:
//
//   1. ABANDON — a `committed` row with no provider signal for 45 minutes
//      means the user closed the provider tab; the row says so instead of
//      haunting the banner forever ("nothing pends forever").
//   2. ARRIVE — for Stellar on-ramps, read Horizon directly and compare the
//      destination's balance against the baseline captured at commit. The
//      client hook does this while a tab is open; this tick covers phones
//      that went to sleep. "Arrived" comes from the CHAIN, never from the
//      provider's word — and it is what makes the banner disappear.
//
// Same auth pattern as the other crons (CRON_SECRET), same heartbeat.
import { NextResponse } from 'next/server';
import { cronAuthVerdict } from '@/server/cron-auth';
import { recordCronHeartbeat } from '@/server/cron-heartbeat';
import { ABANDON_AFTER_MS, balanceShowsArrival } from '@/lib/ramp/status';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;

const HORIZON: Record<string, string> = {
  mainnet: 'https://horizon.stellar.org',
  testnet: 'https://horizon-testnet.stellar.org',
};

/** The destination's CURRENT balance of one asset, or null when unknowable —
 *  a dead Horizon must never abandon-or-arrive anything. */
async function stellarBalance(
  network: string,
  address: string,
  asset: string
): Promise<number | null> {
  const base = HORIZON[network];
  if (!base) return null;
  try {
    const res = await fetch(`${base}/accounts/${address}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) return 0; // unfunded account: balance is genuinely zero
    if (!res.ok) return null;
    const data = await res.json();
    const balances: any[] = Array.isArray(data?.balances) ? data.balances : [];
    const entry =
      asset === 'XLM'
        ? balances.find((b) => b.asset_type === 'native')
        : balances.find((b) => b.asset_code === asset);
    const n = Number(entry?.balance ?? NaN);
    return Number.isFinite(n) ? n : asset === 'XLM' ? null : 0;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  // Doc 95 Wave 7: an UNSET secret used to skip this check entirely, leaving
  // a money-moving endpoint public. cronAuthVerdict fails closed instead.
  const auth = cronAuthVerdict(
    CRON_SECRET,
    req.headers.get('authorization'),
    process.env.NODE_ENV === 'development'
  );
  if (!auth.ok) {
    console.error('[cron] refused:', auth.error);
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let abandoned = 0;
  let arrived = 0;

  try {
    // 1. Abandonment — one bulk statement; the cutoff mirrors shouldAbandon.
    const cutoff = new Date(Date.now() - ABANDON_AFTER_MS);
    const res = await prisma.rampTransfer.updateMany({
      where: { status: 'committed', createdAt: { lt: cutoff } },
      data: { status: 'abandoned', settledAt: new Date() },
    });
    abandoned = res.count;

    // 2. Stellar arrival, server-side. Bounded: non-terminal on-ramps only,
    //    newest 50 — anything older has been abandoned by rule 1.
    const pending = await prisma.rampTransfer.findMany({
      where: {
        direction: 'onramp',
        chain: 'stellar',
        status: { in: ['committed', 'provider_processing', 'provider_complete'] },
        baselineBalance: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    for (const row of pending) {
      const current = await stellarBalance(row.network, row.walletAddress, row.asset);
      if (current == null) continue;
      if (balanceShowsArrival(row.baselineBalance, current)) {
        await prisma.rampTransfer.update({
          where: { id: row.id },
          data: {
            status: 'arrived',
            settledAt: new Date(),
            amountFinal: row.amountFinal ?? String(current - Number(row.baselineBalance ?? 0)),
          },
        });
        arrived += 1;
      }
    }
  } catch (e) {
    // Migration pending / transient DB trouble — report, never crash the tick.
    logger.warn('[cron/ramp-reconcile] skipped', {
      error: String((e as Error)?.message ?? e).slice(0, 120),
    });
  }

  const stamp = await recordCronHeartbeat('ramp-reconcile');
  return NextResponse.json({ success: true, abandoned, arrived, stamp });
}

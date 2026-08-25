import { prisma } from '@/lib/prisma';
// Vercel Cron: read what the autopilot has been signing and say something when
// it is worth a human's attention. Registered in packages/web/vercel.json.
//
// Why this exists: the autopilot's value caps were removed on 2026-08-24 so
// nobody is asked for extra signatures on a large swap (doc 76 §4). That
// traded prevention for detection, and the detection did not exist — every
// signature was written to autopilot_signatures and nothing ever read it.
//
// This job BLOCKS NOTHING. It reads rows that already happened.
//
// Same auth pattern as the other crons (CRON_SECRET), same heartbeat, and the
// alert channel is optional: with none configured the findings go to the log
// and this route reports that honestly rather than looking healthy.
import { NextResponse } from 'next/server';
import { redis } from '@/server/rateLimiter';
import { logger } from '@normalfinance/utils';
import { sendAlert, alertsConfigured } from '@/server/alerts';
import { recordCronHeartbeat } from '@/server/cron-heartbeat';
import {
  type WatchAlert,
  type SignatureRow,
  evaluateRelayerFloat,
  evaluateAutopilotWindow,
} from '@/server/autopilot-watch';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;
const WINDOW_MINUTES = 15;

/** Thresholds live in env so they can be tuned without a deploy, and an unset
 *  one means OFF — never zero. A threshold of zero would alert on everything
 *  and train the team to ignore the channel within a day. */
function thresholds() {
  return {
    txUsd: Number(process.env.AUTOPILOT_ALERT_TX_USD ?? 0),
    hourlyUsd: Number(process.env.AUTOPILOT_ALERT_HOURLY_USD ?? 0),
    refusals: Number(process.env.AUTOPILOT_ALERT_REFUSALS ?? 0),
  };
}

/** Report a finding at most once per its cooldown. Without this, a low gas
 *  float would post every 15 minutes until someone topped it up, which is how
 *  a channel earns a permanent mute. Redis failure fails OPEN — a missed
 *  suppression is noise, a missed alert is the thing we are trying to prevent. */
async function shouldReport(alert: WatchAlert): Promise<boolean> {
  const key = `alert:cooldown:${alert.key}`;
  try {
    const fresh = await redis.set(key, 1, { nx: true, ex: alert.cooldownSeconds });
    return fresh !== null;
  } catch {
    return true;
  }
}

/** The company wallet that funds new users' first Base gas. Read live — its
 *  balance is the single point of failure behind every new user's first swap. */
async function relayerFloatAlert(): Promise<WatchAlert | null> {
  const floor = Number(process.env.RELAYER_FLOAT_MIN_ETH ?? 0);
  const key = process.env.CCTP_RELAYER_EVM_PRIVATE_KEY;
  if (!(floor > 0) || !key) return null;
  try {
    const { privateKeyToAccount } = await import('viem/accounts');
    const { http, createPublicClient } = await import('viem');
    const { base } = await import('viem/chains');
    const account = privateKeyToAccount((key.startsWith('0x') ? key : `0x${key}`) as `0x${string}`);
    const client = createPublicClient({ chain: base, transport: http() });
    const wei = await client.getBalance({ address: account.address });
    return evaluateRelayerFloat(Number(wei) / 1e18, floor, account.address);
  } catch (e) {
    // A dead RPC must never be reported as an empty wallet.
    logger.warn('[cron/autopilot-watch] Could not read the relayer float', {
      error: String((e as Error)?.message ?? e).slice(0, 120),
    });
    return null;
  }
}

export async function GET(req: Request) {
  if (CRON_SECRET) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const now = Date.now();
  let rows: SignatureRow[] = [];
  try {
    // One hour covers both rules: the tick's own window for per-leg and
    // refusal clustering, the full hour for volume.
    rows = await prisma.$queryRaw<SignatureRow[]>`
      SELECT "outcome", "amountUsd", "createdAt"
      FROM autopilot_signatures
      WHERE "createdAt" > NOW() - INTERVAL '1 hour'
    `;
  } catch (e) {
    // The table ships as additive SQL; a missing one must not fail the cron.
    logger.warn('[cron/autopilot-watch] Could not read autopilot_signatures', {
      error: String((e as Error)?.message ?? e).slice(0, 120),
    });
  }

  const found: WatchAlert[] = evaluateAutopilotWindow(rows, thresholds(), now, WINDOW_MINUTES);
  const float = await relayerFloatAlert();
  if (float) found.push(float);

  let sent = 0;
  for (const alert of found) {
    if (!(await shouldReport(alert))) continue;
    await sendAlert(alert);
    sent += 1;
  }

  const stamp = await recordCronHeartbeat('autopilot-watch');

  return NextResponse.json({
    success: true,
    scanned: rows.length,
    found: found.length,
    sent,
    // Stated plainly: with no channel configured the findings only reach the
    // log, and a run that says "success" should not imply anyone was told.
    delivery: alertsConfigured() ? 'webhook' : 'log-only',
    stamp,
  });
}

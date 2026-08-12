import { redis } from '@/server/rateLimiter';

// ---------------------------------------------------------------------------
// Cron heartbeats (#64): Vercel crons fail silently — no alert, no log unless
// someone goes looking. Every cron run stamps a Redis key, so "are the crons
// alive?" is a 5-second Upstash lookup (key `cron:heartbeat:<name>`) instead
// of an incident discovered by a user. The stamp is also echoed in each cron
// route's JSON response for eyeball checks.
// ---------------------------------------------------------------------------

const HEARTBEAT_TTL_SECONDS = 7 * 24 * 3600;

export function heartbeatKey(name: string): string {
  return `cron:heartbeat:${name}`;
}

/** Best-effort — a Redis hiccup must never fail the cron run itself. */
export async function recordCronHeartbeat(name: string): Promise<string> {
  const stamp = new Date().toISOString();
  try {
    await redis.set(heartbeatKey(name), stamp, { ex: HEARTBEAT_TTL_SECONDS });
  } catch {
    /* the run still counts; only the stamp is lost */
  }
  return stamp;
}

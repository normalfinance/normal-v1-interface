import { prisma } from '@/lib/prisma';
import { Turnkey } from '@turnkey/sdk-server';

// ---------------------------------------------------------------------------
// #33 Stage 3, slice 2 — the autopilot's server-side signer.
//
// Signs Base-leg EVM transactions as the "Normal Autopilot" delegated user
// on the USER'S sub-org, using the AUTOPILOT keypair (a DIFFERENT key from
// the parent-org admin key in lib/turnkey/server.ts — this one's authority
// is bounded by the per-user policy created at consent, so a leak can only
// complete users' own started swaps to their own addresses).
//
// Safety layers, outermost first:
//   1. AUTOPILOT_DISABLED=1 — kill-switch: one env + deploy stops ALL
//      autopilot signing app-wide.
//   2. Turnkey policy — chain/contract/value constraints enforced in the
//      signer itself; out-of-policy requests fail there, not here.
//   3. Audit — every attempt (success or refusal) INSERTed into
//      autopilot_signatures via raw SQL, best-effort (table ships as
//      additive SQL — see migration note in doc 76 §8); a missing table
//      must never block a swap.
// ---------------------------------------------------------------------------

let client: Turnkey | null = null;

function autopilotClient(): Turnkey {
  if (!client) {
    const pub = process.env.AUTOPILOT_API_PUBLIC_KEY;
    const priv = process.env.AUTOPILOT_API_PRIVATE_KEY;
    if (!pub || !priv) throw new Error('Autopilot keypair not configured');
    client = new Turnkey({
      apiBaseUrl: 'https://api.turnkey.com',
      apiPublicKey: pub,
      apiPrivateKey: priv,
      defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
    });
  }
  return client;
}

async function audit(row: {
  subOrgId: string;
  signWith: string;
  purpose: string;
  outcome: string;
  detail?: string;
  amountUsd?: number;
}): Promise<void> {
  try {
    await prisma.$executeRaw`
      INSERT INTO autopilot_signatures ("subOrgId", "signWith", "purpose", "outcome", "detail", "amountUsd", "createdAt")
      VALUES (${row.subOrgId}, ${row.signWith}, ${row.purpose}, ${row.outcome}, ${row.detail ?? null}, ${row.amountUsd ?? null}, NOW())
    `;
  } catch {
    // amountUsd column not migrated yet (autopilot_signatures_amount.sql) —
    // fall back to the original shape so auditing never silently stops.
    try {
      await prisma.$executeRaw`
        INSERT INTO autopilot_signatures ("subOrgId", "signWith", "purpose", "outcome", "detail", "createdAt")
        VALUES (${row.subOrgId}, ${row.signWith}, ${row.purpose}, ${row.outcome}, ${row.detail ?? null}, NOW())
      `;
    } catch {
      /* table not migrated at all / transient — never block the flow */
    }
  }
}

// ---- D3 caps (doc 76 §4, locked): $2k per leg, $10k per rolling day, 90-day
// idle expiry (renew-on-use). Enforced HERE — one chokepoint for both routes —
// on amount-bearing signatures (the burn / the pivot; a MAX approve moves no
// funds by itself and is capped implicitly by the leg that follows it).
// Overridable by env without a code change. A cap refusal throws → the route
// 502s → the engine falls back to the interactive passkey path: an over-cap
// swap still WORKS, it just asks the user to sign it themselves.
const MAX_TX_USD = Number(process.env.AUTOPILOT_MAX_TX_USD ?? 2000);
const MAX_DAILY_USD = Number(process.env.AUTOPILOT_MAX_DAILY_USD ?? 10_000);
const IDLE_EXPIRY_DAYS = Number(process.env.AUTOPILOT_IDLE_EXPIRY_DAYS ?? 90);

/** Sum of signed autopilot legs for this sub-org in the last 24h. Depends on
 *  the amountUsd column (additive SQL); if the query fails the sum reads 0 —
 *  the per-tx cap and the policy still bound each signature, and the daily
 *  cap re-arms the moment the migration lands. */
async function dailySignedUsd(subOrgId: string): Promise<number> {
  try {
    const rows = await prisma.$queryRaw<{ total: number | null }[]>`
      SELECT COALESCE(SUM("amountUsd"), 0)::float AS total
      FROM autopilot_signatures
      WHERE "subOrgId" = ${subOrgId} AND "outcome" = 'signed'
        AND "createdAt" > NOW() - INTERVAL '24 hours'
    `;
    return rows?.[0]?.total ?? 0;
  } catch {
    return 0;
  }
}

/** Renew-on-use expiry: refuse when this sub-org's LAST signed autopilot leg
 *  is older than the idle window. No prior rows = first use = allowed (the
 *  idle clock starts at first use; exact grant-date tracking is the v2
 *  hardening, noted in doc 76). Query failure = no expiry claim. */
async function idleExpired(subOrgId: string): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<{ last: Date | null }[]>`
      SELECT MAX("createdAt") AS last
      FROM autopilot_signatures
      WHERE "subOrgId" = ${subOrgId} AND "outcome" = 'signed'
    `;
    const last = rows?.[0]?.last;
    if (!last) return false;
    return Date.now() - new Date(last).getTime() > IDLE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function autopilotEnabled(): boolean {
  return (
    process.env.AUTOPILOT_DISABLED !== '1' &&
    !!process.env.AUTOPILOT_API_PUBLIC_KEY &&
    !!process.env.AUTOPILOT_API_PRIVATE_KEY
  );
}

/**
 * Sign an unsigned EVM transaction (hex, no 0x prefix per Turnkey's API)
 * with the user's address via the autopilot delegation. Throws if the
 * kill-switch is on or Turnkey's policy rejects — callers fall back to the
 * interactive (passkey) path on ANY failure here.
 */
export async function signWithAutopilot(params: {
  subOrgId: string;
  /** The user's EVM address on their sub-org (the tx sender). */
  signWith: string;
  unsignedTransaction: string;
  /** Audit label, e.g. 'cctp-inbound-burn' | 'cctp-outbound-pivot'. */
  purpose: string;
  /** USD value of the leg (USDC wire ≈ USD). Pass on the amount-bearing
   *  signature of each leg — it arms the D3 caps + idle expiry. */
  amountUsd?: number;
}): Promise<string> {
  const { subOrgId, signWith, unsignedTransaction, purpose, amountUsd } = params;
  if (!autopilotEnabled()) {
    await audit({ subOrgId, signWith, purpose, outcome: 'refused-disabled' });
    throw new Error('Autopilot signing is disabled');
  }
  if (amountUsd != null) {
    if (amountUsd > MAX_TX_USD) {
      await audit({ subOrgId, signWith, purpose, outcome: 'refused-cap', amountUsd });
      throw new Error(`Autopilot per-transaction cap ($${MAX_TX_USD}) exceeded`);
    }
    const daily = await dailySignedUsd(subOrgId);
    if (daily + amountUsd > MAX_DAILY_USD) {
      await audit({ subOrgId, signWith, purpose, outcome: 'refused-cap', amountUsd });
      throw new Error(`Autopilot daily cap ($${MAX_DAILY_USD}) exceeded`);
    }
    if (await idleExpired(subOrgId)) {
      await audit({ subOrgId, signWith, purpose, outcome: 'refused-expired', amountUsd });
      throw new Error('Autopilot delegation expired from inactivity — re-enable in Settings');
    }
  }
  try {
    const res = await autopilotClient()
      .apiClient()
      .signTransaction({
        organizationId: subOrgId,
        signWith,
        type: 'TRANSACTION_TYPE_ETHEREUM',
        // Turnkey expects the serialized tx WITHOUT the 0x prefix; the
        // signed result comes back the same way (mirrors evm-signer.ts).
        unsignedTransaction: unsignedTransaction.startsWith('0x')
          ? unsignedTransaction.slice(2)
          : unsignedTransaction,
      });
    const signed = res?.signedTransaction;
    if (!signed) throw new Error('Turnkey returned no signed transaction');
    await audit({ subOrgId, signWith, purpose, outcome: 'signed', amountUsd });
    return signed.startsWith('0x') ? signed : `0x${signed}`;
  } catch (e: any) {
    await audit({
      subOrgId,
      signWith,
      purpose,
      outcome: 'failed',
      detail: String(e?.message ?? e).slice(0, 500),
      amountUsd,
    });
    throw e;
  }
}

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
}): Promise<void> {
  try {
    await prisma.$executeRaw`
      INSERT INTO autopilot_signatures ("subOrgId", "signWith", "purpose", "outcome", "detail", "createdAt")
      VALUES (${row.subOrgId}, ${row.signWith}, ${row.purpose}, ${row.outcome}, ${row.detail ?? null}, NOW())
    `;
  } catch {
    /* table not migrated yet / transient — never block the flow */
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
}): Promise<string> {
  const { subOrgId, signWith, unsignedTransaction, purpose } = params;
  if (!autopilotEnabled()) {
    await audit({ subOrgId, signWith, purpose, outcome: 'refused-disabled' });
    throw new Error('Autopilot signing is disabled');
  }
  try {
    const res = await autopilotClient().apiClient().signTransaction({
      organizationId: subOrgId,
      signWith,
      type: 'TRANSACTION_TYPE_ETHEREUM',
      unsignedTransaction,
    });
    const signed = res?.signedTransaction;
    if (!signed) throw new Error('Turnkey returned no signed transaction');
    await audit({ subOrgId, signWith, purpose, outcome: 'signed' });
    return signed;
  } catch (e: any) {
    await audit({
      subOrgId,
      signWith,
      purpose,
      outcome: 'failed',
      detail: String(e?.message ?? e).slice(0, 500),
    });
    throw e;
  }
}

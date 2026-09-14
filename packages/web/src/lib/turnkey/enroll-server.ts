import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';
import { turnkey } from '@/lib/turnkey/server';
import { pickRootUser } from '@/lib/turnkey/enroll-policy';

// ---------------------------------------------------------------------------
// Phone-side passkey enrolment — the SERVER side helpers shared by the four
// api/turnkey/enroll/* routes. Server-only: parent-org API key, Prisma.
// Decisions live in ./enroll-policy.ts (pure); this file only fetches and
// records.
// ---------------------------------------------------------------------------

export type EnrollStep = 'init' | 'verify' | 'login' | 'complete' | 'refused';

/** The user's sub-org id, or null when they have no Turnkey wallet yet. */
export async function findSubOrgId(supabaseUid: string): Promise<string | null> {
  const row = await prisma.turnkeyWallet.findUnique({
    where: { supabaseUid },
    select: { subOrgId: true },
  });
  return row?.subOrgId ?? null;
}

export interface RootUser {
  userId: string;
  userEmail: string | null;
  authenticators: { authenticatorId: string; credentialId: string; authenticatorName: string }[];
}

/**
 * The sub-org's END USER, read from Turnkey with the parent-org key. A sub-org
 * has one passkey root user plus, after autopilot consent, an API-only user;
 * pickRootUser tells them apart. Turnkey is the authority on the email and
 * the authenticators, never our database.
 */
export async function getRootUser(subOrgId: string): Promise<RootUser> {
  const { users } = await turnkey.apiClient().getUsers({ organizationId: subOrgId });
  // Not users[0]: autopilot sub-orgs also hold an API-only user (see picker).
  const u = pickRootUser(users);
  if (!u?.userId) throw new Error(`Sub-org ${subOrgId} has no root user`);
  return {
    userId: u.userId,
    userEmail: u.userEmail ?? null,
    authenticators: (u.authenticators ?? []).map((a) => ({
      authenticatorId: a.authenticatorId,
      credentialId: a.credentialId,
      authenticatorName: a.authenticatorName,
    })),
  };
}

/** Client address + agent for the audit row. Vercel sets x-forwarded-for. */
export function clientMeta(request: Request): { ip: string | null; userAgent: string | null } {
  const fwd = request.headers.get('x-forwarded-for');
  const ip = (fwd ? fwd.split(',')[0] : request.headers.get('x-real-ip'))?.trim() || null;
  return { ip, userAgent: request.headers.get('user-agent')?.slice(0, 512) ?? null };
}

/**
 * One audit row per step. Best-effort by design: a Postgres blip must not
 * turn a half-done enrolment into a stuck user, but it is logged at error
 * level so a missing trail is itself visible.
 */
export async function recordEnrollment(params: {
  supabaseUid: string;
  subOrgId: string;
  step: EnrollStep;
  otpId?: string | null;
  detail?: string | null;
  request: Request;
}): Promise<void> {
  const { ip, userAgent } = clientMeta(params.request);
  try {
    await prisma.turnkeyEnrollment.create({
      data: {
        supabaseUid: params.supabaseUid,
        subOrgId: params.subOrgId,
        step: params.step,
        otpId: params.otpId ?? null,
        detail: params.detail ?? null,
        ip,
        userAgent,
      },
    });
  } catch (e) {
    logger.error('[enroll] audit row NOT written', {
      step: params.step,
      uid: params.supabaseUid,
      e,
    });
  }
}

/**
 * Guardrail notice: "a new device was added to your wallet — if this wasn't
 * you, ...". The web app has no transactional email path today (Customer.io
 * is identify-only, Supabase sends auth mail only), so this is the hook, not
 * the mail. Wire it to a template when one exists; the audit row already
 * carries everything the message needs.
 */
export async function notifyNewDevice(params: {
  supabaseUid: string;
  email: string | null;
  deviceName: string;
  authenticatorId: string;
}): Promise<void> {
  logger.warn('[enroll] new device enrolled (guardrail email not yet wired)', {
    uid: params.supabaseUid,
    email: params.email,
    deviceName: params.deviceName,
    authenticatorId: params.authenticatorId,
  });
}

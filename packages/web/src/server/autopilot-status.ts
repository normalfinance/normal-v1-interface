import { prisma } from '@/lib/prisma';
import { turnkey } from '@/lib/turnkey/server';
import { autopilotEnabled } from '@/server/autopilot-signer';

// ---------------------------------------------------------------------------
// Is Autopilot granted for this person? The delegated "Normal Autopilot" user
// and its policy must both exist on their own sub-org. Shared by
// /api/autopilot/status and the index purchase route (which refuses a
// purchase Autopilot could not finish). Two Turnkey reads: call it on a
// person's action, never in a loop.
// ---------------------------------------------------------------------------

export const AUTOPILOT_USER_NAME = 'Normal Autopilot';
export const AUTOPILOT_POLICY_NAME = 'normal-autopilot-base-legs';

export type AutopilotStatus =
  | { active: true; autopilotUserId: string; subOrgId: string }
  | {
      active: false;
      reason: 'disabled' | 'no-wallet' | 'not-granted';
      autopilotUserId: string | null;
      subOrgId: string | null;
    };

export async function autopilotStatusFor(userId: string): Promise<AutopilotStatus> {
  if (!autopilotEnabled()) {
    return { active: false, reason: 'disabled', autopilotUserId: null, subOrgId: null };
  }
  const row = await prisma.turnkeyWallet.findFirst({
    where: { supabaseUid: userId },
    select: { subOrgId: true },
  });
  if (!row?.subOrgId) {
    return { active: false, reason: 'no-wallet', autopilotUserId: null, subOrgId: null };
  }
  const { users } = await turnkey.apiClient().getUsers({ organizationId: row.subOrgId });
  const delegate = users.find((u) => u.userName === AUTOPILOT_USER_NAME);
  let hasPolicy = false;
  if (delegate) {
    const { policies } = await turnkey.apiClient().getPolicies({ organizationId: row.subOrgId });
    hasPolicy = policies.some(
      (p) => p.policyName === AUTOPILOT_POLICY_NAME || (p.consensus ?? '').includes(delegate.userId)
    );
  }
  return delegate && hasPolicy
    ? { active: true, autopilotUserId: delegate.userId, subOrgId: row.subOrgId }
    : {
        active: false,
        reason: 'not-granted',
        autopilotUserId: delegate?.userId ?? null,
        subOrgId: row.subOrgId,
      };
}

'use client';

// #33 Stage 3 — revocation: one passkey prompt deletes the "Normal
// Autopilot" user from the USER'S sub-org; its API key and every policy
// bound to it die with it. Authoritative instantly (status reads Turnkey,
// not our DB). Mirror of the consent ceremony's stamping pattern.

import { getTurnkeyWalletInfo } from './wallet-info';

export async function revokeAutopilotConsent(autopilotUserId: string): Promise<void> {
  const info = await getTurnkeyWalletInfo();
  if (!info?.subOrgId) throw new Error('No Normal wallet');
  const rpId =
    typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_TURNKEY_RP_ID ?? window.location.hostname)
      : 'localhost';
  const { WebauthnStamper } = await import('@turnkey/webauthn-stamper');
  const { TurnkeyClient } = await import('@turnkey/http');
  const client = new TurnkeyClient(
    { baseUrl: 'https://api.turnkey.com' },
    new WebauthnStamper({ rpId })
  );
  const activity = await client.deleteUsers({
    type: 'ACTIVITY_TYPE_DELETE_USERS',
    timestampMs: String(Date.now()),
    organizationId: info.subOrgId,
    parameters: { userIds: [autopilotUserId] },
  });
  const deleted = activity?.activity?.result?.deleteUsersResult?.userIds;
  if (!deleted?.includes(autopilotUserId)) throw new Error('Turnkey did not delete the user');
}

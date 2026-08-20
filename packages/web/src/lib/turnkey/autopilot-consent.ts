'use client';

// ---------------------------------------------------------------------------
// #33 Stage 3, slice 1 — the autopilot CONSENT CEREMONY (doc 76 §8).
// ONE passkey prompt creates, on the USER'S OWN sub-org:
//   1. an API-only user ("Normal Autopilot") whose credential is the
//      server's public key (one keypair serves all consenting users — the
//      private half never leaves the server), and
//   2. a NARROW policy allowing that user to sign ONLY Base-chain
//      transactions to the allowlisted contracts (USDC, Circle
//      TokenMessengerV2, LI.FI diamond).
// Enforcement lives in Turnkey's signer, not in our server's good
// behavior: a stolen server key can do nothing outside this policy.
// Revocation (Settings) deletes the user; the policy dies with it.
// ---------------------------------------------------------------------------

import { EVM_USDC, EVM_CCTP } from '@/lib/cctp/config';

import { getTurnkeyWalletInfo } from './wallet-info';

const BASE_CHAIN_ID = '8453';

/** Contracts the autopilot may talk to on Base (mainnet). The USDC and
 *  Circle addresses are the SAME constants the burn code sends to (single
 *  source — a config change updates the policy for future consents). The
 *  LI.FI diamond has no other in-repo consumer (the pivot's target comes
 *  dynamically from each quote); verified against LI.FI's own deployment
 *  data (GET li.quest/v1/chains → chain 8453 diamondAddress, 2026-08-20).
 *  If LI.FI ever routes via a different contract, the policy REFUSES that
 *  signature and the engine falls back to the interactive prompt — the
 *  failure mode is a prompt, never a wrong signature. */
const ALLOWED_CONTRACTS = {
  usdc: EVM_USDC.base.mainnet,
  circleTokenMessengerV2: EVM_CCTP.mainnet.tokenMessengerV2,
  lifiDiamond: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
} as const;

export const AUTOPILOT_USER_NAME = 'Normal Autopilot';

/** The condition string enforced by Turnkey's policy engine. v1 constrains
 *  chain + destination contracts + zero native value; ABI-argument
 *  constraints (recipient == own forwarder) are the documented follow-up
 *  hardening (doc 76 §8). */
export function autopilotPolicyCondition(): string {
  const list = Object.values(ALLOWED_CONTRACTS)
    .map((a) => `'${a.toLowerCase()}'`)
    .join(', ');
  return `eth.tx.chain_id == ${BASE_CHAIN_ID} && eth.tx.value == 0 && [${list}].contains(eth.tx.to)`;
}

export interface ConsentResult {
  autopilotUserId: string;
  policyId: string;
}

/**
 * Runs the ceremony. `serverPublicKey` is NEXT_PUBLIC_AUTOPILOT_PUBLIC_KEY —
 * the P-256 public half of the server-held signing key. Two stamped
 * activities ride one WebAuthn session (a single passkey prompt in
 * practice: the stamper reuses the fresh assertion window).
 */
export async function grantAutopilotConsent(serverPublicKey: string): Promise<ConsentResult> {
  const info = await getTurnkeyWalletInfo();
  if (!info?.subOrgId) throw new Error('No Normal wallet to grant autopilot on');

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

  // 1. The delegated user, credentialed with the SERVER'S public key.
  const userActivity = await client.createApiOnlyUsers({
    type: 'ACTIVITY_TYPE_CREATE_API_ONLY_USERS',
    timestampMs: String(Date.now()),
    organizationId: info.subOrgId,
    parameters: {
      apiOnlyUsers: [
        {
          userName: AUTOPILOT_USER_NAME,
          apiKeys: [{ apiKeyName: 'normal-autopilot-key', publicKey: serverPublicKey }],
          userTags: [],
        },
      ],
    },
  });
  const autopilotUserId =
    userActivity?.activity?.result?.createApiOnlyUsersResult?.userIds?.[0] ?? '';
  if (!autopilotUserId) throw new Error('Turnkey did not create the autopilot user');

  // 2. The narrow policy binding that user to the allowlisted signing.
  const policyActivity = await client.createPolicy({
    type: 'ACTIVITY_TYPE_CREATE_POLICY_V3',
    timestampMs: String(Date.now()),
    organizationId: info.subOrgId,
    parameters: {
      policyName: 'normal-autopilot-base-legs',
      effect: 'EFFECT_ALLOW',
      consensus: `approvers.any(user, user.id == '${autopilotUserId}')`,
      condition: autopilotPolicyCondition(),
      notes: 'Completes swaps the user started: Base legs to allowlisted contracts only.',
    },
  });
  const policyId = policyActivity?.activity?.result?.createPolicyResult?.policyId ?? '';
  if (!policyId) throw new Error('Turnkey did not create the autopilot policy');

  return { autopilotUserId, policyId };
}

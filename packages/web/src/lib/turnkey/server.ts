import type { v1AuthenticatorTransport } from '@turnkey/sdk-types';

import { Turnkey } from '@turnkey/sdk-server';

// ---------------------------------------------------------------------------
// Turnkey server client — parent-org API key, instantiated once per cold start.
// Server-only: never import from client components.
//
// Account specs live in ./account-specs.ts. Accounts are created LAZILY —
// one chain at a time, only when the user acts on that asset (pricing).
// ---------------------------------------------------------------------------
export const turnkey = new Turnkey({
  apiBaseUrl: 'https://api.turnkey.com',
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

/**
 * Resolve the Turnkey root user ID of a sub-organization.
 * Our sub-orgs always have exactly one root user (the end user's passkey).
 */
export async function getSubOrgRootUserId(subOrgId: string): Promise<string | null> {
  const { users } = await turnkey.apiClient().getUsers({ organizationId: subOrgId });
  return users[0]?.userId ?? null;
}

// WebAuthn transport string → Turnkey enum
const TRANSPORT_MAP: Record<string, v1AuthenticatorTransport> = {
  usb: 'AUTHENTICATOR_TRANSPORT_USB',
  nfc: 'AUTHENTICATOR_TRANSPORT_NFC',
  ble: 'AUTHENTICATOR_TRANSPORT_BLE',
  internal: 'AUTHENTICATOR_TRANSPORT_INTERNAL',
  hybrid: 'AUTHENTICATOR_TRANSPORT_HYBRID',
};

export interface PasskeyAttestation {
  credentialId: string;
  clientDataJson: string;
  attestationObject: string;
  transports: string[];
}

/** Root-user params for createSubOrganization with a passkey authenticator. */
export function buildPasskeyRootUser(
  user: { id: string; email?: string | null },
  challenge: string,
  attestation: PasskeyAttestation
) {
  return {
    userName: user.email ?? user.id,
    userEmail: user.email ?? undefined,
    apiKeys: [],
    oauthProviders: [],
    authenticators: [
      {
        authenticatorName: 'Passkey',
        challenge,
        attestation: {
          credentialId: attestation.credentialId,
          clientDataJson: attestation.clientDataJson,
          attestationObject: attestation.attestationObject,
          transports: (attestation.transports ?? []).map(
            (t) => TRANSPORT_MAP[t] ?? 'AUTHENTICATOR_TRANSPORT_INTERNAL'
          ) as v1AuthenticatorTransport[],
        },
      },
    ],
  };
}

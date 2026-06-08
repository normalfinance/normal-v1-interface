import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { Turnkey, DEFAULT_BITCOIN_MAINNET_P2WPKH_ACCOUNTS, DEFAULT_ETHEREUM_ACCOUNTS, DEFAULT_XLM_ACCOUNTS } from '@turnkey/sdk-server';
import type { v1AuthenticatorTransport } from '@turnkey/sdk-types';
import { logger } from '@normalfinance/utils';
import { getAccessToken } from '@/utils/http';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';
import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Turnkey client — instantiated once per cold start
// ---------------------------------------------------------------------------
const turnkey = new Turnkey({
  apiBaseUrl: 'https://api.turnkey.com',
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

// Wallet accounts we create for every user — order defines addresses[0,1,2]
const WALLET_ACCOUNTS = [
  ...DEFAULT_BITCOIN_MAINNET_P2WPKH_ACCOUNTS, // addresses[0] → bc1q...
  ...DEFAULT_ETHEREUM_ACCOUNTS,               // addresses[1] → 0x...
  ...DEFAULT_XLM_ACCOUNTS,                   // addresses[2] → G...
];

// WebAuthn transport string → Turnkey enum
const TRANSPORT_MAP: Record<string, v1AuthenticatorTransport> = {
  usb:      'AUTHENTICATOR_TRANSPORT_USB',
  nfc:      'AUTHENTICATOR_TRANSPORT_NFC',
  ble:      'AUTHENTICATOR_TRANSPORT_BLE',
  internal: 'AUTHENTICATOR_TRANSPORT_INTERNAL',
  hybrid:   'AUTHENTICATOR_TRANSPORT_HYBRID',
};

// ---------------------------------------------------------------------------
// GET /api/turnkey/wallet
// Returns the authenticated user's Turnkey wallet addresses (or null)
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const accessToken = getAccessToken(request);
  const user = await getAuthenticatedUser(accessToken);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const wallet = await prisma.turnkeyWallet.findUnique({
    where: { supabaseUid: user.id },
    select: { bitcoinAddress: true, ethereumAddress: true, stellarAddress: true },
  });

  return NextResponse.json({ wallet: wallet ?? null });
}

// ---------------------------------------------------------------------------
// POST /api/turnkey/wallet
// Creates a Turnkey sub-org + BTC/ETH/XLM wallet for the authenticated user.
// Body: { challenge: string, attestation: { credentialId, clientDataJson, attestationObject, transports } }
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const accessToken = getAccessToken(request);
  const user = await getAuthenticatedUser(accessToken);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Idempotent — return existing wallet if already provisioned
  const existing = await prisma.turnkeyWallet.findUnique({ where: { supabaseUid: user.id } });
  if (existing) {
    return NextResponse.json({
      wallet: {
        bitcoinAddress: existing.bitcoinAddress,
        ethereumAddress: existing.ethereumAddress,
        stellarAddress: existing.stellarAddress,
      },
    });
  }

  let body: {
    challenge: string;
    attestation: {
      credentialId: string;
      clientDataJson: string;
      attestationObject: string;
      transports: string[];
    };
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { challenge, attestation } = body;
  if (!challenge || !attestation?.credentialId) {
    return NextResponse.json({ error: 'Missing challenge or attestation' }, { status: 400 });
  }

  try {
    const apiClient = turnkey.apiClient();

    const result = await apiClient.createSubOrganization({
      subOrganizationName: `normal-${user.id.slice(0, 8)}`,
      rootQuorumThreshold: 1,
      rootUsers: [
        {
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
        },
      ],
      wallet: {
        walletName: 'Normal Wallet',
        accounts: WALLET_ACCOUNTS,
      },
    });

    const subOrgId = result.subOrganizationId;
    const addresses = result.wallet?.addresses ?? [];
    const walletId = result.wallet?.walletId ?? '';

    const saved = await prisma.turnkeyWallet.create({
      data: {
        supabaseUid: user.id,
        subOrgId,
        walletId,
        bitcoinAddress: addresses[0] ?? null,
        ethereumAddress: addresses[1] ?? null,
        stellarAddress: addresses[2] ?? null,
      },
    });

    logger.log('[turnkey/wallet] Created wallet for user', { uid: user.id.slice(0, 8) });

    return NextResponse.json(
      {
        wallet: {
          bitcoinAddress: saved.bitcoinAddress,
          ethereumAddress: saved.ethereumAddress,
          stellarAddress: saved.stellarAddress,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('[turnkey/wallet] Error creating sub-org:', error);
    return NextResponse.json({ error: 'Failed to create wallet' }, { status: 500 });
  }
}

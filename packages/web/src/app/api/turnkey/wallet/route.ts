import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { getAccessToken } from '@/utils/http';
import { turnkey, buildPasskeyRootUser } from '@/lib/turnkey/server';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';
import { XLM_ACCOUNT, BITCOIN_ACCOUNT } from '@/lib/turnkey/account-specs';

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
    select: { subOrgId: true, walletId: true, bitcoinAddress: true, ethereumAddress: true, stellarAddress: true },
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
    chain?: 'bitcoin' | 'stellar';
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { challenge, attestation } = body;
  const chain = body.chain === 'stellar' ? 'stellar' : 'bitcoin';
  if (!challenge || !attestation?.credentialId) {
    return NextResponse.json({ error: 'Missing challenge or attestation' }, { status: 400 });
  }

  try {
    const apiClient = turnkey.apiClient();

    const result = await apiClient.createSubOrganization({
      subOrganizationName: `normal-${user.id.slice(0, 8)}`,
      rootQuorumThreshold: 1,
      rootUsers: [buildPasskeyRootUser(user, challenge, attestation)],
      wallet: {
        walletName: 'Normal Wallet',
        // Lazily provisioned — ONLY the requested chain's account is created.
        // Other chains are added on demand (Turnkey pricing scales with
        // addresses).
        accounts: chain === 'stellar' ? XLM_ACCOUNT : BITCOIN_ACCOUNT,
      },
    });

    const subOrgId = result.subOrganizationId;
    const address = result.wallet?.addresses?.[0] ?? null;
    const walletId = result.wallet?.walletId ?? '';

    const saved = await prisma.turnkeyWallet.create({
      data: {
        supabaseUid: user.id,
        subOrgId,
        walletId,
        bitcoinAddress: chain === 'bitcoin' ? address : null,
        stellarAddress: chain === 'stellar' ? address : null,
        ethereumAddress: null,
      },
    });

    logger.log('[turnkey/wallet] Created wallet for user', { uid: user.id.slice(0, 8), chain });

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

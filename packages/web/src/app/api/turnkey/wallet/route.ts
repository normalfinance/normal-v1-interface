import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { turnkey, buildPasskeyRootUser } from '@/lib/turnkey/server';
import { CHAINS, pickAddresses, ADDRESS_SELECT } from '@/lib/chains/registry';
import {
  XLM_ACCOUNT,
  SOLANA_ACCOUNT,
  BITCOIN_ACCOUNT,
  ETHEREUM_ACCOUNT,
} from '@/lib/turnkey/account-specs';

const CHAIN_SPECS = {
  bitcoin: BITCOIN_ACCOUNT,
  stellar: XLM_ACCOUNT,
  ethereum: ETHEREUM_ACCOUNT,
  solana: SOLANA_ACCOUNT,
} as const;

type Chain = keyof typeof CHAIN_SPECS;

// ---------------------------------------------------------------------------
// GET /api/turnkey/wallet
// Returns the authenticated user's Turnkey wallet addresses (or null)
// ---------------------------------------------------------------------------
export const GET = withAuth(async (request: NextRequest, { user }) => {
  const wallet = await prisma.turnkeyWallet.findUnique({
    where: { supabaseUid: user.id },
    // Address columns come from the registry, so a new chain's column is
    // selected automatically instead of being added by hand here.
    select: { subOrgId: true, walletId: true, ...ADDRESS_SELECT },
  });

  return NextResponse.json({ wallet: wallet ?? null });
});

// ---------------------------------------------------------------------------
// POST /api/turnkey/wallet
// Creates a Turnkey sub-org + BTC/ETH/XLM wallet for the authenticated user.
// Body: { challenge: string, attestation: { credentialId, clientDataJson, attestationObject, transports } }
// ---------------------------------------------------------------------------
export const POST = withAuth(async (request: NextRequest, { user }) => {
  // Idempotent — return existing wallet if already provisioned
  const existing = await prisma.turnkeyWallet.findUnique({ where: { supabaseUid: user.id } });
  if (existing) {
    return NextResponse.json({
      wallet: pickAddresses(existing),
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
    chain?: Chain;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { challenge, attestation } = body;
  const chain: Chain = body.chain && body.chain in CHAIN_SPECS ? body.chain : 'bitcoin';
  if (!challenge || !attestation?.credentialId) {
    return NextResponse.json({ error: 'Missing challenge or attestation' }, { status: 400 });
  }

  try {
    const apiClient = turnkey.apiClient();

    const result = await apiClient.createSubOrganization({
      // Unique by construction. The name is a dashboard label — nothing
      // parses it — but the uid prefix alone REPEATS when an account is
      // re-provisioned (support wipes the turnkey_wallets row so a user whose
      // passkey became unusable can start over, and the uid is unchanged).
      // A name we cannot guarantee is accepted twice would fail exactly the
      // recovery it is needed for, so the suffix removes the question.
      subOrganizationName: `normal-${user.id.slice(0, 8)}-${Date.now().toString(36)}`,
      rootQuorumThreshold: 1,
      rootUsers: [buildPasskeyRootUser(user, challenge, attestation)],
      wallet: {
        walletName: 'Normal Wallet',
        // Lazily provisioned — ONLY the requested chain's account is created.
        // Other chains are added on demand (Turnkey pricing scales with
        // addresses).
        accounts: CHAIN_SPECS[chain],
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
        // Lazy provisioning: only the requested chain gets an address, and the
        // column is looked up from the registry rather than branched per chain.
        [CHAINS[chain].addressField]: address,
      },
    });

    logger.log('[turnkey/wallet] Created wallet for user', { uid: user.id.slice(0, 8), chain });

    return NextResponse.json(
      {
        wallet: pickAddresses(saved),
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('[turnkey/wallet] Error creating sub-org:', error);
    return NextResponse.json({ error: 'Failed to create wallet' }, { status: 500 });
  }
});

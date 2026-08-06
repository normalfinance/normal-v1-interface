import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { getAccessToken } from '@/utils/http';
import { turnkey } from '@/lib/turnkey/server';
import { CHAINS } from '@/lib/chains/registry';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

// ---------------------------------------------------------------------------
// GET /api/turnkey/btc-pubkey
// Returns the compressed public key of the user's Bitcoin account.
//
// Needed because we no longer hand LI.FI's PSBT to Turnkey to parse — their
// parser rejects it over the OP_RETURN memo output. We compute the signature
// hashes ourselves and sign them with SIGN_RAW_PAYLOADS (Turnkey's own
// documented alternative), and that requires the public key to build the
// witness. See docs/audit/44-btc-swap-fix-plan.md.
//
// Read from Turnkey rather than trusted from the client: the key decides which
// signature ends up in a Bitcoin transaction.
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(getAccessToken(request));
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const wallet = await prisma.turnkeyWallet.findUnique({
    where: { supabaseUid: user.id },
    select: { subOrgId: true, walletId: true, bitcoinAddress: true },
  });

  if (!wallet?.walletId || !wallet.bitcoinAddress) {
    return NextResponse.json({ error: 'No Bitcoin wallet for this account' }, { status: 404 });
  }

  try {
    const { accounts } = await turnkey.apiClient().getWalletAccounts({
      organizationId: wallet.subOrgId,
      walletId: wallet.walletId,
    });

    // Match by the ADDRESS we sign with, not just the format: signing uses
    // `signWith: bitcoinAddress`, so if a wallet ever carries two BTC accounts
    // a format-only match could return the other account's key and the client
    // would refuse to sign with a confusing "account mismatch". The format
    // check stays as a sanity assertion.
    const account = accounts.find(
      (a) =>
        a.address === wallet.bitcoinAddress &&
        a.addressFormat === CHAINS.bitcoin.turnkeyAddressFormat
    );

    // `publicKey` is optional in Turnkey's schema, so treat its absence as a
    // hard failure with a clear message rather than proceeding without it.
    if (!account?.publicKey) {
      logger.error('[btc-pubkey] account found but no publicKey returned', {
        found: !!account,
        address: account?.address,
      });
      return NextResponse.json(
        { error: 'Turnkey did not return a public key for the Bitcoin account' },
        { status: 502 }
      );
    }

    // The address is returned so the client can verify the key belongs to the
    // wallet it is about to sign for.
    return NextResponse.json({
      publicKey: account.publicKey,
      address: account.address,
    });
  } catch (error) {
    logger.error('[btc-pubkey] error:', error);
    return NextResponse.json({ error: 'Failed to fetch Bitcoin public key' }, { status: 500 });
  }
}

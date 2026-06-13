import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { getAccessToken } from '@/utils/http';
import { turnkey } from '@/lib/turnkey/server';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

// ---------------------------------------------------------------------------
// POST /api/turnkey/import
// Records a wallet import completed client-side (the import activities are
// stamped by the user's passkey in the browser).
//
// Body: { walletId, expectedStellarAddress? }
// The client only reports the walletId — we read the derived addresses
// straight from Turnkey (parent orgs have read access to sub-orgs), so a
// client can't write spoofed addresses into its row.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const accessToken = getAccessToken(request);
  const user = await getAuthenticatedUser(accessToken);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { walletId?: string; expectedStellarAddress?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { walletId, expectedStellarAddress } = body;
  if (!walletId) {
    return NextResponse.json({ error: 'Missing walletId' }, { status: 400 });
  }

  const row = await prisma.turnkeyWallet.findUnique({ where: { supabaseUid: user.id } });
  if (!row) {
    return NextResponse.json(
      { error: 'No import in progress — call import-init first' },
      { status: 409 }
    );
  }

  try {
    // Authoritative read of the imported wallet's accounts from Turnkey
    const { accounts } = await turnkey.apiClient().getWalletAccounts({
      organizationId: row.subOrgId,
      walletId,
    });

    const byFormat = (format: string) =>
      accounts.find((a) => a.addressFormat === format)?.address ?? null;

    const bitcoinAddress = byFormat('ADDRESS_FORMAT_BITCOIN_MAINNET_P2WPKH');
    const ethereumAddress = byFormat('ADDRESS_FORMAT_ETHEREUM');
    const solanaAddress = byFormat('ADDRESS_FORMAT_SOLANA');
    const stellarAddress = byFormat('ADDRESS_FORMAT_XLM');

    if (!stellarAddress && !bitcoinAddress) {
      return NextResponse.json(
        { error: 'Imported wallet has no recognizable accounts' },
        { status: 422 }
      );
    }

    // Both our local derivation and Turnkey's XLM account use the standard
    // SEP-0005 path m/44'/148'/0', so a mismatch here means a bug — surface
    // it rather than silently routing signing to the wrong key.
    const stellarMatch = expectedStellarAddress ? stellarAddress === expectedStellarAddress : true;
    if (!stellarMatch) {
      logger.error('[turnkey/import] Stellar address mismatch after import', {
        uid: user.id.slice(0, 8),
        expected: expectedStellarAddress,
        derived: stellarAddress,
      });
    }

    if (row.walletId && row.walletId !== walletId) {
      logger.warn('[turnkey/import] Replacing existing wallet reference with imported wallet', {
        uid: user.id.slice(0, 8),
      });
    }

    // Never null out a previously linked address: only update a chain's
    // address when this wallet actually has an account for it. A user's
    // funded BTC address must survive importing a (XLM-only) wallet.
    const saved = await prisma.turnkeyWallet.update({
      where: { supabaseUid: user.id },
      data: {
        walletId,
        bitcoinAddress: bitcoinAddress ?? undefined,
        ethereumAddress: ethereumAddress ?? undefined,
        solanaAddress: solanaAddress ?? undefined,
        stellarAddress: stellarAddress ?? undefined,
      },
    });

    logger.log('[turnkey/import] Imported wallet recorded', { uid: user.id.slice(0, 8) });

    return NextResponse.json(
      {
        wallet: {
          bitcoinAddress: saved.bitcoinAddress,
          ethereumAddress: saved.ethereumAddress,
          solanaAddress: saved.solanaAddress,
          stellarAddress: saved.stellarAddress,
        },
        stellarMatch,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('[turnkey/import] Error recording wallet import:', error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to import wallet: ${detail}` }, { status: 500 });
  }
}

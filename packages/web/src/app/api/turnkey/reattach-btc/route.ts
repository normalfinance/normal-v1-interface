import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { getAccessToken } from '@/utils/http';
import { turnkey } from '@/lib/turnkey/server';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

// ---------------------------------------------------------------------------
// POST /api/turnkey/reattach-btc
// Points the user's bitcoinAddress back at a BTC account from ANOTHER wallet
// in their own sub-org (e.g. the original Turnkey-generated wallet after a
// mnemonic import replaced the row's addresses). No on-chain transaction —
// the same passkey signs for every wallet in the sub-org.
//
// Body: { address: string }
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const accessToken = getAccessToken(request);
  const user = await getAuthenticatedUser(accessToken);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { address?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const address = body.address?.trim();
  if (!address) return NextResponse.json({ error: 'address is required' }, { status: 400 });

  const row = await prisma.turnkeyWallet.findUnique({ where: { supabaseUid: user.id } });
  if (!row) return NextResponse.json({ error: 'No Turnkey wallet found' }, { status: 404 });

  try {
    const apiClient = turnkey.apiClient();

    // Verify the address belongs to a wallet inside THIS user's sub-org
    const { wallets } = await apiClient.getWallets({ organizationId: row.subOrgId });

    let found = false;
    for (const w of wallets) {
      const { accounts } = await apiClient.getWalletAccounts({
        organizationId: row.subOrgId,
        walletId: w.walletId,
      });
      if (
        accounts.some(
          (a) => a.address === address && a.addressFormat === 'ADDRESS_FORMAT_BITCOIN_MAINNET_P2WPKH'
        )
      ) {
        found = true;
        break;
      }
    }

    if (!found) {
      return NextResponse.json(
        { error: 'That address does not belong to any wallet in your account' },
        { status: 403 }
      );
    }

    const saved = await prisma.turnkeyWallet.update({
      where: { supabaseUid: user.id },
      data: { bitcoinAddress: address },
    });

    logger.log('[turnkey/reattach-btc] Reattached BTC address', { uid: user.id.slice(0, 8) });

    return NextResponse.json({ wallet: { bitcoinAddress: saved.bitcoinAddress } });
  } catch (error) {
    logger.error('[turnkey/reattach-btc] Error:', error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to reattach address: ${detail}` }, { status: 500 });
  }
}

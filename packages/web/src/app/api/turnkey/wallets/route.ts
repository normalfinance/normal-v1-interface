import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';

// Every Turnkey WALLET (seed) this user owns — doc 83 phase 1.
//
// A sub-organization can hold several wallets, and each one is a separate
// recovery phrase controlling its own set of chain addresses. The export
// dialog reads this so it can show WHICH ADDRESSES a phrase controls before
// revealing it: with one wallet that is reassuring, and with two it is the
// difference between saving the right phrase and the wrong one.
//
// Read-only. Signing never consults it — Turnkey signs by organizationId +
// address and takes no walletId at all.
export const dynamic = 'force-dynamic';

export interface WalletSeedDto {
  walletId: string;
  label: string;
  origin: string;
  isPrimary: boolean;
  addresses: {
    stellar: string | null;
    bitcoin: string | null;
    ethereum: string | null;
    solana: string | null;
  };
}

export const GET = withAuth(async (_req: NextRequest, { user }) => {
  try {
    const row = await prisma.turnkeyWallet.findFirst({
      where: { supabaseUid: user.id },
    });
    if (!row) return NextResponse.json({ success: true, wallets: [] });

    let seeds: WalletSeedDto[] = [];
    try {
      const rows = await prisma.turnkeyWalletSeed.findMany({
        where: { supabaseUid: user.id },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      });
      seeds = rows.map((r) => ({
        walletId: r.walletId,
        label: r.label ?? (r.isPrimary ? 'Normal wallet' : 'Imported wallet'),
        origin: r.origin,
        isPrimary: r.isPrimary,
        addresses: {
          stellar: r.stellarAddress,
          bitcoin: r.bitcoinAddress,
          ethereum: r.ethereumAddress,
          solana: r.solanaAddress,
        },
      }));
    } catch {
      // Table not migrated yet (it ships as additive SQL). Fall through to the
      // primary row below rather than failing: a user must always be able to
      // export the wallet they have.
      seeds = [];
    }

    // No seed rows — either the migration is pending or this wallet predates
    // it. Describe the primary row so the dialog behaves exactly as before.
    if (seeds.length === 0 && row.walletId) {
      seeds = [
        {
          walletId: row.walletId,
          label: 'Normal wallet',
          origin: 'created',
          isPrimary: true,
          addresses: {
            stellar: row.stellarAddress,
            bitcoin: row.bitcoinAddress,
            ethereum: row.ethereumAddress,
            solana: row.solanaAddress,
          },
        },
      ];
    }

    return NextResponse.json({ success: true, wallets: seeds, subOrgId: row.subOrgId });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: String(e?.message ?? e), wallets: [] },
      { status: 500 }
    );
  }
});

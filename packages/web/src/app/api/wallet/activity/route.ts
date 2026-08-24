import type { NextRequest } from 'next/server';
import type { WalletActivityItem } from '@/types/wallet-activity';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { userOwnsWallet } from '@/lib/wallet-ownership';
import { isValidStellarAddress } from '@/utils/stellar-address';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function parseLimit(raw: string | null): number {
  if (!raw) return DEFAULT_LIMIT;
  const n = parseInt(raw, 10);
  if (isNaN(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

// PRIVATE (doc 81 item 1, decision A — Niko 2026-08-24). This route reads OUR
// database (vault_deposits + swap_logs), not the chain: without auth anyone
// could pull any address's confirmed money movements as ready-made JSON, and
// every call was an unauthenticated pair of Postgres queries. The content is
// also on the public ledger, so this is not a secrecy fix — it stops us being
// a curated, free, enumerable index of it, and closes an open load channel.
// Public-by-design would be a separate, cached, rate-limited endpoint.
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    const limit = parseLimit(searchParams.get('limit'));

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'walletAddress is required' },
        { status: 400 }
      );
    }

    if (!isValidStellarAddress(walletAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // The address arrives in the query string, so authentication alone is not
    // enough — without this any signed-in user could read anyone's history.
    // userOwnsWallet covers turnkey_wallets AND linked_wallets, so a hybrid
    // user's companion wallet and their connected Lobstr wallet both pass.
    if (!(await userOwnsWallet(user.id, walletAddress))) {
      return NextResponse.json(
        { success: false, error: 'Wallet does not belong to this account' },
        { status: 403 }
      );
    }

    // #27: rows now exist BEFORE broadcast with pending/failed states — only
    // confirmed ones are money that actually moved.
    const [vaultRows, swapRows] = await Promise.all([
      // `take` matters: the response was sliced to `limit` but the QUERIES were
      // unbounded, so a wallet with 5,000 confirmed rows made Postgres read
      // and ship all 5,000 to return 50 — the heaviest users generating the
      // heaviest queries, on an endpoint the drawer opens on every visit.
      // Each side takes `limit` because the merge below sorts them together.
      prisma.vaultDeposit.findMany({
        where: { walletAddress, status: 'confirmed' },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.swapLog.findMany({
        where: { walletAddress, status: 'confirmed' },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);

    const items: WalletActivityItem[] = [];

    for (const row of vaultRows) {
      const kind = row.type === 'withdraw' ? 'vault_withdraw' : 'vault_deposit';
      items.push({
        kind,
        id: `vault:${row.id}`,
        createdAt: row.createdAt.toISOString(),
        txHash: row.txHash,
        amount: row.amount,
        vaultAddress: row.vaultAddress,
      } as WalletActivityItem);
    }

    for (const row of swapRows) {
      items.push({
        kind: 'swap',
        id: `swap:${row.id}`,
        createdAt: row.createdAt.toISOString(),
        txHash: row.txHash,
        tokenInAddress: row.tokenInAddress,
        tokenOutAddress: row.tokenOutAddress,
        tokenInSymbol: row.tokenInSymbol,
        tokenOutSymbol: row.tokenOutSymbol,
        amountIn: row.amountIn,
        amountOut: row.amountOut,
      });
    }

    items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    return NextResponse.json({
      success: true,
      items: items.slice(0, limit),
    });
  } catch (error) {
    console.error('Wallet activity error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load activity' }, { status: 500 });
  }
});

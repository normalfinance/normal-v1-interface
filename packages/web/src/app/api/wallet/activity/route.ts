import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { isValidStellarAddress } from '@/utils/stellar-address';
import type { WalletActivityItem, WalletActivityKind } from '@/types/wallet-activity';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function parseLimit(raw: string | null): number {
  if (!raw) return DEFAULT_LIMIT;
  const n = parseInt(raw, 10);
  if (isNaN(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

export async function GET(request: NextRequest) {
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

    const [vaultRows, swapRows, sponsored] = await Promise.all([
      prisma.vaultDeposit.findMany({
        where: { walletAddress },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.swapLog.findMany({
        where: { walletAddress },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sponsoredAccount.findUnique({
        where: { walletAddress },
      }),
    ]);

    const items: WalletActivityItem[] = [];

    for (const row of vaultRows) {
      const kind: WalletActivityKind =
        row.type === 'withdraw' ? 'vault_withdraw' : 'vault_deposit';
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

    if (sponsored?.txHash) {
      items.push({
        kind: 'sponsorship',
        id: `sponsorship:${sponsored.id}`,
        createdAt: sponsored.sponsoredAt.toISOString(),
        txHash: sponsored.txHash,
      });
    }

    items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    return NextResponse.json({
      success: true,
      items: items.slice(0, limit),
    });
  } catch (error) {
    console.error('Wallet activity error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load activity' },
      { status: 500 }
    );
  }
}

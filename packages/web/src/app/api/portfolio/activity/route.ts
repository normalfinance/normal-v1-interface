import type { NextRequest } from 'next/server';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { isValidStellarAddress } from '@/utils/stellar-address';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const { searchParams } = new URL(request.url);

    const user = searchParams.get('user');
    const type = (searchParams.get('type') || 'all') as 'all' | 'swaps' | 'savings';
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 50);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const networkOverride = searchParams.get('network');
    const network = networkOverride ?? cookieStore.get('normal-network')?.value ?? 'testnet';
    const isMainnet = network === 'mainnet';

    if (!user || !isValidStellarAddress(user)) {
      return NextResponse.json(
        { success: false, error: 'Valid user address required' },
        { status: 400 }
      );
    }

    const VAULT_ADDRESS = isMainnet
      ? process.env.NEXT_PUBLIC_MAINNET_DEFINDEX_VAULT || ''
      : process.env.NEXT_PUBLIC_TESTNET_DEFINDEX_VAULT || '';

    const [swaps, vaultTxs] = await Promise.all([
      type !== 'savings'
        ? prisma.swapLog.findMany({
            where: { walletAddress: user },
            select: {
              id: true,
              tokenInSymbol: true,
              tokenOutSymbol: true,
              amountIn: true,
              amountOut: true,
              txHash: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),

      type !== 'swaps' && VAULT_ADDRESS
        ? prisma.vaultDeposit.findMany({
            where: { walletAddress: user, vaultAddress: VAULT_ADDRESS },
            select: {
              id: true,
              type: true,
              amount: true,
              txHash: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    const swapItems = swaps.map((s) => ({
      id: s.id,
      kind: 'swap' as const,
      assetIn: s.tokenInSymbol ?? 'Token',
      assetOut: s.tokenOutSymbol ?? 'Token',
      amountIn: s.amountIn,
      amountOut: s.amountOut,
      txHash: s.txHash ?? null,
      createdAt: s.createdAt.toISOString(),
    }));

    const vaultItems = vaultTxs.map((v) => ({
      id: v.id,
      kind: v.type as 'deposit' | 'withdraw',
      assetIn: 'USDC',
      assetOut: null,
      amountIn: v.amount,
      amountOut: null,
      txHash: v.txHash ?? null,
      createdAt: v.createdAt.toISOString(),
    }));

    const all = [...swapItems, ...vaultItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const paginated = all.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      items: paginated,
      total: all.length,
      hasMore: offset + limit < all.length,
    });
  } catch (error) {
    console.error('[portfolio/activity]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}

import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getAccessToken } from '@/utils/http';
import { rateLimiter } from '@/server/rateLimiter';
import { userOwnsWallet } from '@/lib/wallet-ownership';
import { isValidStellarAddress } from '@/utils/stellar-address';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

function isValidTokenRef(ref: string): boolean {
  return ref === 'native' || isValidStellarAddress(ref);
}

export async function POST(request: NextRequest) {
  try {
    // This route writes financial records that feed the public Dune dashboard.
    // It was open to anyone — verified on staging, where an unauthenticated
    // POST reached validation instead of being rejected.
    const user = await getAuthenticatedUser(getAccessToken(request));
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      walletAddress,
      tokenInAddress,
      tokenOutAddress,
      tokenInSymbol,
      tokenOutSymbol,
      amountIn,
      amountOut,
      txHash,
      feeAmount,
      feeTxHash,
    } = body;

    if (!walletAddress || !tokenInAddress || !tokenOutAddress || !amountIn || !amountOut) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!isValidStellarAddress(walletAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Authentication alone isn't enough: walletAddress comes from the body, so
    // without this any logged-in user could log swaps against someone else's
    // address.
    if (!(await userOwnsWallet(user.id, walletAddress))) {
      return NextResponse.json(
        { success: false, error: 'Wallet does not belong to this account' },
        { status: 403 }
      );
    }

    // Second line of defence: even a legitimate user shouldn't be able to fill
    // the table.
    const { success: withinLimit } = await rateLimiter.limit(
      walletAddress,
      request.headers.get('x-forwarded-for') ?? undefined
    );
    if (!withinLimit) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
    }

    if (!isValidTokenRef(tokenInAddress) || !isValidTokenRef(tokenOutAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid token address format' },
        { status: 400 }
      );
    }

    const inNum = Number(amountIn);
    const outNum = Number(amountOut);
    if (isNaN(inNum) || isNaN(outNum) || inNum <= 0 || outNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'amountIn and amountOut must be positive numbers' },
        { status: 400 }
      );
    }

    await prisma.swapLog.create({
      data: {
        walletAddress,
        tokenInAddress,
        tokenOutAddress,
        tokenInSymbol: typeof tokenInSymbol === 'string' ? tokenInSymbol : null,
        tokenOutSymbol: typeof tokenOutSymbol === 'string' ? tokenOutSymbol : null,
        amountIn: String(amountIn),
        amountOut: String(amountOut),
        txHash: typeof txHash === 'string' ? txHash : null,
        feeAmount: feeAmount != null ? String(feeAmount) : null,
        feeTxHash: typeof feeTxHash === 'string' ? feeTxHash : null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Swap log transaction error:', error);
    return NextResponse.json({ success: false, error: 'Failed to log swap' }, { status: 500 });
  }
}

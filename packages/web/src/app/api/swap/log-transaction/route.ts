import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { isValidStellarAddress } from '@/utils/stellar-address';

function isValidTokenRef(ref: string): boolean {
  return ref === 'native' || isValidStellarAddress(ref);
}

export async function POST(request: NextRequest) {
  try {
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
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Swap log transaction error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to log swap' },
      { status: 500 }
    );
  }
}

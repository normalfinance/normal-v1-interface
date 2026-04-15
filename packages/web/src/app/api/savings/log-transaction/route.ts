import type { NextRequest} from 'next/server';

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { isValidStellarAddress } from '@/utils/stellar-address';

// ----------------------------------------------------------------------

const VALID_TYPES = ['deposit', 'withdraw'] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, vaultAddress, type, amount, txHash, feeAmount, feeTxHash } = body;

    // Validate required fields
    if (!walletAddress || !vaultAddress || !type || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!isValidStellarAddress(walletAddress) || !isValidStellarAddress(vaultAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid address format' },
        { status: 400 }
      );
    }

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Type must be "deposit" or "withdraw"' },
        { status: 400 }
      );
    }

    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    await prisma.vaultDeposit.create({
      data: {
        walletAddress,
        vaultAddress,
        type,
        amount: String(amount),
        txHash: txHash || null,
        feeAmount: feeAmount != null ? String(feeAmount) : null,
        feeTxHash: typeof feeTxHash === 'string' ? feeTxHash : null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Log transaction error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to log transaction' },
      { status: 500 }
    );
  }
}

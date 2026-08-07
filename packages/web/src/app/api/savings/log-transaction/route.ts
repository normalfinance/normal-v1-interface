import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';
import { userOwnsWallet } from '@/lib/wallet-ownership';
import { isValidStellarAddress } from '@/utils/stellar-address';

// ----------------------------------------------------------------------

const VALID_TYPES = ['deposit', 'withdraw'] as const;

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    // This route writes vault_deposits, the fallback source for totalDeposited
    // — the figure users read as their savings. It was open to anyone, so its
    // integrity affects money on screen, not just analytics.

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

    // walletAddress comes from the body, so authentication alone would still
    // let any logged-in user write rows against another person's address.
    if (!(await userOwnsWallet(user.id, walletAddress))) {
      return NextResponse.json(
        { success: false, error: 'Wallet does not belong to this account' },
        { status: 403 }
      );
    }

    const { success: withinLimit } = await rateLimiter.limit(
      walletAddress,
      request.headers.get('x-forwarded-for') ?? undefined
    );
    if (!withinLimit) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
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
});

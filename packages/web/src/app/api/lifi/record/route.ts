import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// POST /api/lifi/record
// Records a completed cross-chain (LI.FI) swap into SwapLog so it renders as a
// single "Swap A → B" row in the activity feed (instead of separate Sent/
// Received legs on each chain). Keyed under the user's Stellar address — the
// same key the activity feed already queries.
//
// Body: { fromSymbol, toSymbol, amountIn, amountOut, txHash }
// ---------------------------------------------------------------------------

export const POST = withAuth(async (request: NextRequest, { user }) => {
  let body: {
    fromSymbol?: string;
    toSymbol?: string;
    amountIn?: string;
    amountOut?: string;
    txHash?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { fromSymbol, toSymbol, amountIn, amountOut, txHash } = body;
  if (!fromSymbol || !toSymbol || !amountIn || !amountOut || !txHash) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Authoritative Stellar address for this user — the activity feed's key.
  const wallet = await prisma.turnkeyWallet.findUnique({
    where: { supabaseUid: user.id },
    select: { stellarAddress: true },
  });
  if (!wallet?.stellarAddress) {
    // Nothing to key activity under; the swap itself already succeeded.
    return NextResponse.json({ success: true, recorded: false });
  }

  try {
    await prisma.swapLog.create({
      data: {
        walletAddress: wallet.stellarAddress,
        // Synthetic refs (not Stellar contracts) — the symbol fields drive display.
        tokenInAddress: `lifi:${fromSymbol}`,
        tokenOutAddress: `lifi:${toSymbol}`,
        tokenInSymbol: String(fromSymbol),
        tokenOutSymbol: String(toSymbol),
        amountIn: String(amountIn),
        amountOut: String(amountOut),
        txHash: String(txHash),
      },
    });
    return NextResponse.json({ success: true, recorded: true });
  } catch (error) {
    logger.error('[lifi/record] Failed to record swap:', error);
    return NextResponse.json({ error: 'Failed to record swap' }, { status: 500 });
  }
});

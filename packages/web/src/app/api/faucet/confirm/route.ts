import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { getClientIP } from '@/utils/http';
import { logger } from '@normalfinance/utils';
import { SponsorService } from '@/lib/sponsor-service';

const ConfirmSchema = z.object({
  walletAddress: z.string().regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar wallet address'),
  txHash: z.string().min(1, 'Transaction hash is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = ConfirmSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { walletAddress, txHash } = validation.data;
    const ipAddress = getClientIP(request);

    await SponsorService.recordTransactionHash({
      walletAddress,
      txHash,
      ipAddress,
    });

    logger.log('[API /faucet/confirm] Transaction hash recorded:', {
      walletAddress: walletAddress.substring(0, 8) + '...',
      txHash,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    logger.error('[API /faucet/confirm] Error recording transaction:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to record transaction' },
      { status: 500 }
    );
  }
}

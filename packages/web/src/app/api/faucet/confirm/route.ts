import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { SponsorService } from '@/lib/sponsor-service';
import { getClientIP, getAccessToken } from '@/utils/http';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

const ConfirmSchema = z.object({
  walletAddress: z.string().regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar wallet address'),
  txHash: z.string().min(1, 'Transaction hash is required'),
});


export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const accessToken = getAccessToken(request);
    const user = await getAuthenticatedUser(accessToken);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = ConfirmSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { walletAddress, txHash } = validation.data;

    // Assert user owns walletAddress
    // const isLinked = await LinkedWalletService.isWalletLinked(user.id, walletAddress);
    // if (!isLinked) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    const ipAddress = getClientIP(request);

    await SponsorService.recordTransactionHash({
      walletAddress,
      txHash,
      ipAddress,
      supabaseUid: user?.id,
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

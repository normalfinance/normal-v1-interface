import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { ReferralService } from '@/lib/referral-service';

export const dynamic = "force-dynamic";

const GetStatsSchema = z.object({
  walletAddress: z.string().min(1, 'Wallet address is required'),
});

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.nextUrl.searchParams.get('walletAddress');

    const validation = GetStatsSchema.safeParse({ walletAddress });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.errors },
        { status: 400 }
      );
    }

    const stats = await ReferralService.getReferralStats(validation.data.walletAddress);

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

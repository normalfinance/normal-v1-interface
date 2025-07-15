import type { NextRequest } from 'next/server';

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { ReferralService } from '@/lib/referral-service';

const ActivateReferralSchema = z.object({
  code: z.string().min(1, 'Referral code is required'),
  refereeWalletAddress: z.string().min(1, 'Referee wallet address is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = ActivateReferralSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { code, refereeWalletAddress } = validation.data;

    const referral = await ReferralService.activateReferral(code, refereeWalletAddress);

    return NextResponse.json({
      referral,
      message: 'Referral activated successfully',
    });
  } catch (error) {
    console.error('Error activating referral:', error);

    if (error instanceof Error) {
      const errorMessages = [
        'Referral code not found',
        'Referral code already used',
        'Referral code is inactive',
        'Cannot use your own referral code',
      ];

      if (errorMessages.includes(error.message)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { ReferralService } from '@/lib/referral-service';
import { z } from 'zod';

const CreateReferralSchema = z.object({
  referrerWalletAddress: z.string().min(1, 'Referrer wallet address is required'),
  customCode: z.string().optional(),
  source: z.string().optional(),
  campaign: z.string().optional(),
});

const GetReferralSchema = z.object({
  code: z.string().min(1, 'Referral code is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = CreateReferralSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { referrerWalletAddress, customCode, source, campaign } = validation.data;

    const referral = await ReferralService.createReferralCode(referrerWalletAddress, customCode);

    if (source || campaign) {
    }

    return NextResponse.json({ referral }, { status: 201 });
  } catch (error) {
    console.error('Error creating referral:', error);

    if (error instanceof Error && error.message === 'Referral code already exists') {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    const validation = GetReferralSchema.safeParse({ code });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.errors },
        { status: 400 }
      );
    }

    const referral = await ReferralService.getReferralByCode(validation.data.code);

    if (!referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 });
    }

    return NextResponse.json({ referral });
  } catch (error) {
    console.error('Error fetching referral:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

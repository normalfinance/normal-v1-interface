import { NextRequest, NextResponse } from 'next/server';
import { ReferralService } from '@/lib/referral-service';
import { z } from 'zod';

const RecordActionSchema = z.object({
  userWalletAddress: z.string().min(1, 'User wallet address is required'),
  referralCode: z.string().min(1, 'Referral code is required'),
  action: z.string().min(1, 'Action is required'),
  metadata: z
    .object({
      amount: z.string().optional(),
      tokenSymbol: z.string().optional(),
    })
    .optional(),
});

const GetActionsSchema = z.object({
  userWalletAddress: z.string().min(1, 'User wallet address is required'),
  referralCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = RecordActionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { userWalletAddress, referralCode, action, metadata } = validation.data;

    if (!ReferralService.isValidAction(action)) {
      return NextResponse.json(
        {
          error: 'Invalid action type',
          validActions: ReferralService.getValidActions(),
          enabledActions: ReferralService.getEnabledActions(),
        },
        { status: 400 }
      );
    }

    if (!ReferralService.isEnabledAction(action)) {
      return NextResponse.json(
        {
          error: 'Action is not enabled',
          enabledActions: ReferralService.getEnabledActions(),
        },
        { status: 400 }
      );
    }

    const actionRecord = await ReferralService.recordAction(
      userWalletAddress,
      referralCode,
      action,
      metadata
    );

    return NextResponse.json(
      {
        action: actionRecord,
        message: 'Action recorded successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error recording action:', error);

    if (error instanceof Error) {
      const errorMessages = [
        'Referral not found',
        'Action already recorded for this referral',
        'Action is not enabled',
        'Invalid metadata',
      ];

      if (
        error.message.includes('Invalid action') ||
        error.message.includes('not enabled') ||
        error.message.includes('Invalid metadata')
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (errorMessages.some((msg) => error.message.includes(msg))) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userWalletAddress = searchParams.get('userWalletAddress');
    const referralCode = searchParams.get('referralCode');

    const validation = GetActionsSchema.safeParse({
      userWalletAddress,
      referralCode: referralCode || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.errors },
        { status: 400 }
      );
    }

    const actions = await ReferralService.getUserActions(
      validation.data.userWalletAddress,
      validation.data.referralCode
    );

    return NextResponse.json({ actions });
  } catch (error) {
    console.error('Error fetching actions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

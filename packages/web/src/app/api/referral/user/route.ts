import { NextRequest, NextResponse } from 'next/server';
import { ReferralService } from '@/lib/referral-service';
import { z } from 'zod';

const GetUserSchema = z.object({
  walletAddress: z.string().min(1, 'Wallet address is required'),
});

const CreateUserSchema = z.object({
  walletAddress: z.string().min(1, 'Wallet address is required'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    const validation = GetUserSchema.safeParse({ walletAddress });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.errors },
        { status: 400 }
      );
    }

    const user = await ReferralService.getUserByWallet(validation.data.walletAddress);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = CreateUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const user = await ReferralService.findOrCreateUser(validation.data.walletAddress);

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

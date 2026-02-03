import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';
import { getClientIP, getAccessToken } from '@/utils/http';
import { LinkedWalletService } from '@/lib/linked-wallet-service';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const token = getAccessToken(req);
    const user = await getAuthenticatedUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate params
    const { walletAddress } = await req.json();
    if (!walletAddress) {
      return NextResponse.json({ error: 'Missing walletAddress' }, { status: 400 });
    }

    // Assert user owns walletAddress
    const isLinked = await LinkedWalletService.isWalletLinked(user.id, walletAddress);
    if (!isLinked) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get client IP address (prioritize proxy headers like middleware)
    const ip = getClientIP(req);

    const { success, limit, remaining, reset } = await rateLimiter.limit(walletAddress, ip);
    console.log('Liquidity rate limit check:', {
      success,
      limit,
      remaining,
      reset,
    });

    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    return NextResponse.json({ allowed: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Index validation failed' },
      { status: 500 }
    );
  }
}

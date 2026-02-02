import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';
import { getClientIP, getAccessToken } from '@/utils/http';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const token = getAccessToken(req);
    const user = await getAuthenticatedUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Validate params
    const { walletAddress } = await req.json();
    if (!walletAddress) {
      return NextResponse.json({ error: 'Missing walletAddress' }, { status: 400 });
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

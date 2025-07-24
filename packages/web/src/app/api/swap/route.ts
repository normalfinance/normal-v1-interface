import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, swapArgs } = await req.json();
    if (!walletAddress || !swapArgs) {
      return NextResponse.json({ error: 'Missing walletAddress or swapArgs' }, { status: 400 });
    }

    // Get client IP address (prioritize proxy headers like middleware)
    const ip =
      req.headers.get('x-real-ip') || // many reverse proxies
      req.headers.get('X-Forwarded-For')?.split(',')[0] ||
      req.ip;

    const { success, limit, remaining, reset } = await rateLimiter.limit(walletAddress, ip);
    console.log('Swap rate limit check:', {
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
      { error: error?.message || 'Swap validation failed' },
      { status: 500 }
    );
  }
}

import { rateLimiter } from '@/server/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { walletAddress } = await req.json();
    if (!walletAddress) {
      return NextResponse.json({ error: 'Missing walletAddress' }, { status: 400 });
    }

    // Get client IP address (prioritize proxy headers like middleware)
    let ip =
      req.headers.get('x-real-ip') || // many reverse proxies
      req.headers.get('X-Forwarded-For')?.split(',')[0] ||
      req.ip;

    const { success, limit, remaining, reset } = await rateLimiter.limit(walletAddress, ip);
    console.log('Send rate limit check:', {
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
      { error: error?.message || 'Send validation failed' },
      { status: 500 }
    );
  }
}

import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { logger, getCdpBearerToken } from '@normalfinance/utils';
import { createSupabaseServerClient } from '@/lib/createSupabaseServerClient';

export async function POST(req: NextRequest) {
  try {
    const { address, asset = 'USDC' } = await req.json();

    if (!address) {
      return NextResponse.json({ error: 'Missing wallet address' }, { status: 400 });
    }

    // Grab request access token
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }

    const accessToken = authHeader.replace('Bearer ', '');

    // Validate it with Supabase
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Coinbase
    const { jwt, host, path } = await getCdpBearerToken();

    const clientIp =
      req.headers.get('x-real-ip') || // many reverse proxies
      req.headers.get('X-Forwarded-For')?.split(',')[0] ||
      req.ip;

    const resp = await fetch(`https://${host}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        addresses: [{ address, blockchains: ['stellar'] }],
        clientIp,
        assets: [asset],
      }),
    });

    const text = await resp.text();
    if (!resp.ok) {
      // Surface error body for debugging in your logs
      logger.error('Coinbase session error:', resp.status, text);
      return NextResponse.json(
        { error: text || 'Session creation failed' },
        { status: resp.status }
      );
    }

    // expected: { token: '...' }
    const data = JSON.parse(text);
    return NextResponse.json(data);
  } catch (err: any) {
    logger.error('Coinbase session exception:', err);
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}

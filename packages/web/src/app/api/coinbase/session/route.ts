import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { getClientIP, getAccessToken } from '@/utils/http';
import { logger, getCdpBearerToken } from '@normalfinance/utils';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

export async function POST(req: NextRequest) {
  try {
    const { address, asset = 'USDC' } = await req.json();

    if (!address) {
      return NextResponse.json({ error: 'Missing wallet address' }, { status: 400 });
    }

    const token = getAccessToken(req);
    const user = await getAuthenticatedUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { jwt, host, path } = await getCdpBearerToken();

    const rawIp = getClientIP(req);
    const isPrivateIp = !rawIp || rawIp === 'unknown' || /^(::1|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(rawIp);
    const clientIp = isPrivateIp ? undefined : rawIp;

    const body: Record<string, unknown> = {
      addresses: [{ address, blockchains: ['stellar'] }],
      assets: [asset],
    };
    if (clientIp) body.clientIp = clientIp;

    const resp = await fetch(`https://${host}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
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

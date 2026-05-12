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

    // Coinbase CDP rejects requests from private/localhost IPs.
    // In local dev the Next.js server has no public IP, so skip the call
    // and return a friendly signal the wizard can detect.
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      return NextResponse.json(
        { error: 'DEV_PRIVATE_IP', message: 'Coinbase onramp is not available on localhost — use ngrok or deploy to test.' },
        { status: 503 }
      );
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
      logger.error('[coinbase/session] Coinbase API error:', resp.status, text);
      // Try to parse Coinbase JSON error body, fall back to raw text
      let errorPayload: unknown = text;
      try { errorPayload = JSON.parse(text); } catch { /* keep raw string */ }
      return NextResponse.json(
        { error: errorPayload || 'Session creation failed' },
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

import type { NextRequest } from 'next/server';

import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { getClientIP } from '@/utils/http';
import { logger, getCdpBearerToken } from '@normalfinance/utils';

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const { address, asset = 'USDC', blockchain = 'stellar' } = await req.json();

    if (!address) {
      return NextResponse.json({ error: 'Missing wallet address' }, { status: 400 });
    }
    if (!['stellar', 'bitcoin', 'ethereum', 'solana'].includes(blockchain)) {
      return NextResponse.json({ error: 'Unsupported blockchain' }, { status: 400 });
    }

    const { jwt, host, path } = await getCdpBearerToken();

    const rawIp = getClientIP(req);
    const isPrivateIp =
      !rawIp ||
      rawIp === 'unknown' ||
      /^(::1|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(rawIp);
    // Only forward clientIp when it's a real public IP — Coinbase rejects private addresses.
    const clientIp = isPrivateIp ? undefined : rawIp;

    const body: Record<string, unknown> = {
      addresses: [{ address, blockchains: [blockchain] }],
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
      try {
        errorPayload = JSON.parse(text);
      } catch {
        /* keep raw string */
      }
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
});

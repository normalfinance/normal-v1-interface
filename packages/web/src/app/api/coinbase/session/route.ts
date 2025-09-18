import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { getCdpBearerToken } from '@/utils/coinbase-auth';
import { logger } from '@normalfinance/utils';

export async function POST(req: NextRequest) {
  try {
    const { address, asset = 'XLM' } = await req.json();

    if (!address) {
      return NextResponse.json({ error: 'Missing wallet address' }, { status: 400 });
    }

    const { jwt, host, path } = await getCdpBearerToken();

    const resp = await fetch(`https://${host}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        // send XLM to Stellar:
        addresses: [{ address, blockchains: ['stellar'] }],
        assets: [asset], // 'XLM' typically
        // optional: partnerUserId, redirectUrl (must be allow-listed)
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

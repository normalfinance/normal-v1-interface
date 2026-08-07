import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { mgiApiBase } from '@/lib/mgi/server-base';
import { logWithConfig } from '@/lib/edge-config-middleware';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req: Request) => {
  try {
    // Authenticate

    const { searchParams } = new URL(req.url);
    const account = searchParams.get('account');
    if (!account) {
      return NextResponse.json({ error: 'Missing account' }, { status: 400 });
    }

    const base = mgiApiBase();
    if (!base) {
      return NextResponse.json({ error: 'Server missing MGI_ACCESS_HOST' }, { status: 500 });
    }
    const clientDomain = process.env.CLIENT_DOMAIN!;

    await logWithConfig('info', 'MoneyGram client info', {
      base,
      clientDomain,
    });

    const url = `${base}/auth?account=${encodeURIComponent(
      account
    )}&client_domain=${encodeURIComponent(clientDomain)}`;

    const r = await fetch(url, { method: 'GET' });
    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json(
        { error: text || 'MGI challenge fetch failed' },
        { status: r.status }
      );
    }
    const data = await r.json(); // { transaction, network_passphrase, ... }
    return NextResponse.json(data);
  } catch (e: any) {
    await logWithConfig('error', 'Trade validation failed', {
      error: e?.message ?? 'MGI challenge fetch failed',
    });
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
});

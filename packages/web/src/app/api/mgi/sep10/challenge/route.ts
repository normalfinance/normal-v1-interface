import { NextResponse } from 'next/server';
import { getAccessToken } from '@/utils/http';
import { mgiApiBase } from '@/lib/mgi/server-base';
import { logWithConfig } from '@/lib/edge-config-middleware';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // Authenticate
    const token = getAccessToken(req);
    const user = await getAuthenticatedUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
}

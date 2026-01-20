import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const account = searchParams.get('account');
    if (!account) {
      return NextResponse.json({ error: 'Missing account' }, { status: 400 });
    }

    const host = process.env.MGI_ACCESS_HOST!;
    const clientDomain = process.env.CLIENT_DOMAIN!;
    console.log('host', host);
    console.log('clientDomain', clientDomain);
    const url = `https://${host}/stellaradapterservice/auth?account=${encodeURIComponent(
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
    console.error(e, 'MGI challenge fetch failed');
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

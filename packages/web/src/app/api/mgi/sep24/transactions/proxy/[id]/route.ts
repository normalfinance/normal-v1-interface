import { NextResponse } from 'next/server';

const j = (s: number, p: any) => NextResponse.json(p, { status: s });

type Params = { params: { id: string } };

export async function GET(req: Request, { params }: Params) {
  try {
    const host = process.env.MGI_ACCESS_HOST;
    if (!host) return j(500, { error: 'Server missing MGI_ACCESS_HOST' });

    const auth = req.headers.get('authorization');
    if (!auth) return j(401, { error: 'Missing Authorization' });

    const url = `https://${host}/stellaradapterservice/sep24/transaction?id=${encodeURIComponent(
      params.id
    )}`;

    const r = await fetch(url, { headers: { Authorization: auth, Accept: 'application/json' } });
    const ct = (r.headers.get('content-type') || '').toLowerCase();

    if (!r.ok) {
      return j(r.status, {
        error: 'anchor transaction failed',
        status: r.status,
        contentType: ct || null,
        bodySnippet: await r.text().then((t) => t.slice(0, 2000)),
      });
    }
    if (!ct.includes('application/json')) {
      return j(502, { error: 'Expected JSON from anchor', status: r.status, contentType: ct });
    }

    const data = await r.json();
    const transaction = data?.transaction ?? data;
    return NextResponse.json({ transaction });
  } catch (e: any) {
    return j(500, { error: e?.message || 'Server error', stack: e?.stack });
  }
}

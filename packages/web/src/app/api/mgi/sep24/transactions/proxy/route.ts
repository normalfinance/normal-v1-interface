import { NextResponse } from 'next/server';

const j = (s: number, p: any) => NextResponse.json(p, { status: s });

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const host = process.env.MGI_ACCESS_HOST;
    if (!host) return j(500, { error: 'Server missing MGI_ACCESS_HOST' });

    const auth = req.headers.get('authorization');
    if (!auth) return j(401, { error: 'Missing Authorization' });

    // SEP-24 standard query params you might pass-through (kind, status, asset_code…)
    const qs = searchParams.toString();
    const url = `https://${host}/stellaradapterservice/sep24/transactions?${qs}`;

    const r = await fetch(url, { headers: { Authorization: auth, Accept: 'application/json' } });
    const ct = (r.headers.get('content-type') || '').toLowerCase();

    if (!r.ok) {
      return j(r.status, {
        error: 'anchor transactions failed',
        status: r.status,
        contentType: ct || null,
        bodySnippet: await r.text().then((t) => t.slice(0, 2000)),
      });
    }
    if (!ct.includes('application/json')) {
      return j(502, { error: 'Expected JSON from anchor', status: r.status, contentType: ct });
    }

    const data = await r.json();
    // Normalize shape to your client’s types: { transactions: [...] }
    const transactions = Array.isArray(data?.transactions)
      ? data.transactions
      : data?.records || data;
    return NextResponse.json({ transactions });
  } catch (e: any) {
    return j(500, { error: e?.message || 'Server error', stack: e?.stack });
  }
}

import { NextResponse } from 'next/server';
import { j, getAccessToken } from '@/utils/http';
import { mgiApiBase } from '@/lib/mgi/server-base';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mgi/sep24/transactions/proxy
 * Query: account? kind? status? asset_code? order? limit?
 * Requires: Authorization: Bearer <Supabase token> + x-mgi-token: <SEP-10 token>
 *
 * We forward to MoneyGram's anchor:
 *   https://{MGI_ACCESS_HOST}/stellarsepservice/sep24/transactions
 */
export async function GET(req: Request) {
  const t0 = Date.now();
  try {
    // Authenticate
    const accessToken = getAccessToken(req);
    const user = await getAuthenticatedUser(accessToken);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base = mgiApiBase();
    if (!base) return j(500, { error: 'Server missing MGI_ACCESS_HOST' });

    // The SEP-10 token comes via x-mgi-token (Authorization carries the
    // Supabase session used to authenticate the user above). Forwarding the
    // Supabase JWT to MoneyGram was the old bug — the anchor rejects it.
    const sep10 = req.headers.get('x-mgi-token') || '';
    if (!sep10) {
      return j(401, { error: 'Missing MoneyGram SEP-10 token (x-mgi-token header required)' });
    }

    const { searchParams } = new URL(req.url);

    // Pass through the typical filters. Default asset_code to USDC if omitted.
    if (!searchParams.get('asset_code')) searchParams.set('asset_code', 'USDC');

    // You can also pass `account`, `kind`, `status`, `limit`, `order`, etc.
    const endpoint = `${base}/sep24/transactions?${searchParams.toString()}`;

    const r = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json, text/plain, */*',
        Authorization: `Bearer ${sep10}`,
      },
      redirect: 'manual',
    });

    const dur = Date.now() - t0;
    const ct = (r.headers.get('content-type') || '').toLowerCase();

    // MoneyGram should return 200 JSON with { transactions: [...] }
    if (r.ok && ct.includes('application/json')) {
      const data = await r.json().catch(() => ({}));
      // Don’t transform; pass through. Your table knows how to render.
      console.log(
        '[MGI] list tx',
        r.status,
        'in',
        dur,
        'ms, count=',
        data?.transactions?.length ?? 'n/a'
      );
      return NextResponse.json(data, { status: 200 });
    }

    // Unexpected (HTML shell, 4xx/5xx body, etc.) → bubble diagnostics.
    const text = await r.text();
    return j(502, {
      error: 'Unexpected response from anchor (list)',
      status: r.status,
      contentType: ct || null,
      bodySnippet: text.slice(0, 2000),
      sentTo: endpoint,
      note:
        'List should return JSON. If you see 401, ensure the x-mgi-token header carried a valid SEP-10 token. ' +
        'If you get HTML, re-check allowlisted client_domain and token scope.',
    });
  } catch (e: any) {
    console.error('[MGI] /api/mgi/sep24/transactions/proxy crashed:', e);
    return j(500, { error: e?.message || 'Server error', stack: e?.stack });
  }
}

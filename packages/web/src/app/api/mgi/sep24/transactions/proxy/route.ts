import { NextResponse } from 'next/server';
import { j, getAccessToken } from '@/utils/http';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mgi/sep24/transactions/proxy
 * Query: account? kind? status? asset_code? order? limit?
 * Requires: Authorization: Bearer <SEP10 token> (from your /api/mgi/sep10/complete)
 *
 * We forward to MoneyGram adapterservice:
 *   https://{MGI_ACCESS_HOST}/stellaradapterservice/sep24/transactions
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

    const host = process.env.MGI_ACCESS_HOST;
    if (!host) return j(500, { error: 'Server missing MGI_ACCESS_HOST' });

    const auth = req.headers.get('authorization') || '';
    if (!auth.toLowerCase().startsWith('bearer ')) {
      // IMPORTANT: history calls must include the token (your client gets it via getMgiAuthToken)
      return j(401, { error: 'Missing or invalid Authorization (Bearer token required)' });
    }

    const { searchParams } = new URL(req.url);

    // Pass through the typical filters. Default asset_code to USDC if omitted.
    if (!searchParams.get('asset_code')) searchParams.set('asset_code', 'USDC');

    // You can also pass `account`, `kind`, `status`, `limit`, `order`, etc.
    const endpoint = `https://${host}/stellaradapterservice/sep24/transactions?${searchParams.toString()}`;

    const r = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json, text/plain, */*',
        Authorization: auth,
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
        'List should return JSON. If you see 401, ensure you passed Authorization: Bearer <SEP10 token>. ' +
        'If you get HTML, re-check allowlisted client_domain and token scope.',
    });
  } catch (e: any) {
    console.error('[MGI] /api/mgi/sep24/transactions/proxy crashed:', e);
    return j(500, { error: e?.message || 'Server error', stack: e?.stack });
  }
}

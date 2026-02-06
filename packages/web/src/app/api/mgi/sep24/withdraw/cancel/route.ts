import { NextResponse } from 'next/server';
import { j, getAccessToken } from '@/utils/http';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

/**
 * POST /api/mgi/sep24/withdraw/cancel
 * Body: { token: string; id: string; lang?: string }
 *
 * This calls MoneyGram adapterservice to start the "cancel/refund" interactive flow
 * for an existing *withdrawal* (cash-out) transaction.
 *
 */
export async function POST(req: Request) {
  try {
    // Authenticate
    const accessToken = getAccessToken(req);
    const user = await getAuthenticatedUser(accessToken);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      token,
      id,
      lang = 'en',
    } = (await req.json()) as {
      token?: string;
      id?: string;
      lang?: string;
    };

    if (!token) return j(400, { error: 'Missing token' });
    if (!id) return j(400, { error: 'Missing transaction id' });

    const host = process.env.MGI_ACCESS_HOST;
    if (!host) return j(500, { error: 'Server missing MGI_ACCESS_HOST' });

    // Primary (adapterservice) endpoint for interactive cancel
    const endpoint = `https://${host}/stellaradapterservice/sep24/transactions/withdraw/cancel/interactive`;

    const payload = { id, lang };

    const r = await fetch(endpoint, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const ct = (r.headers.get('content-type') || '').toLowerCase();

    // MoneyGram typically responds with 302/303 to the interactive Cancel UI
    if (r.status === 302 || r.status === 303) {
      const loc = r.headers.get('location');
      if (!loc) {
        return j(502, {
          error: 'Redirected without Location header',
          status: r.status,
          sentTo: endpoint,
          sentBody: payload,
        });
      }
      return NextResponse.json({ url: loc, id });
    }

    // Some anchors may return JSON with { url, id }
    if (r.ok && ct.includes('application/json')) {
      const data = await r.json().catch(() => ({}));
      const url = data?.url ?? data?.location ?? null;
      const retId = data?.id ?? data?.transaction_id ?? id ?? null;
      if (!url) {
        return j(502, { error: 'JSON response lacked url', details: data, status: r.status });
      }
      return NextResponse.json({ url, id: retId });
    }

    // Otherwise bubble diagnostics (helps a ton during allowlisting/config)
    const text = await r.text();
    return j(502, {
      error: 'Unexpected response from anchor (cancel)',
      status: r.status,
      contentType: ct || null,
      bodySnippet: text.slice(0, 2000),
      sentTo: endpoint,
      sentBody: payload,
      note:
        'Adapterservice should return JSON or a 302/303 redirect to the interactive UI. ' +
        'If HTML persists, re-check allowlisted client_domain and token scope.',
    });
  } catch (e: any) {
    return j(500, { error: e?.message || 'Server error', stack: e?.stack });
  }
}

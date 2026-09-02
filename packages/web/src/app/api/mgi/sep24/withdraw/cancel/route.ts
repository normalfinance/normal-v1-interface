import { j } from '@/utils/http';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { mgiApiBase } from '@/lib/mgi/server-base';

/**
 * POST /api/mgi/sep24/withdraw/cancel
 * Body: { token: string; id: string; lang?: string }
 *
 * Starts MoneyGram's "cancel/refund" interactive flow for an existing
 * *withdrawal* (cash-out) transaction. NOTE: this endpoint is a MoneyGram
 * custom extension, not standard SEP-24 — confirmed still needed on their
 * Anchor Platform, but re-test it after any platform change on their side.
 */
export const POST = withAuth(async (req: Request) => {
  try {
    // Authenticate

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

    const base = mgiApiBase();
    if (!base) return j(500, { error: 'Server missing MGI_ACCESS_HOST' });

    const endpoint = `${base}/sep24/transactions/withdraw/cancel/interactive`;

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
    return j(502, {
      error: 'Unexpected response from anchor (cancel)',
      status: r.status,
      contentType: ct || null,
      note:
        'The anchor should return JSON or a 302/303 redirect to the interactive UI. ' +
        'If HTML persists, re-check allowlisted client_domain and token scope.',
    });
  } catch (e: any) {
    console.error('[MGI] route crashed:', e); // detail stays in logs (doc 90 1c)
    return j(500, { error: 'MoneyGram is temporarily unavailable — please try again.' });
  }
});

import { NextResponse } from 'next/server';
import { j, getAccessToken } from '@/utils/http';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

/**
 * GET /api/mgi/sep24/transaction/proxy/:id
 * Requires: Authorization: Bearer <SEP10 token>
 *
 * Forwards to:
 *   https://{MGI_ACCESS_HOST}/stellaradapterservice/sep24/transaction?id=<id>
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
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
      return j(401, { error: 'Missing or invalid Authorization (Bearer token required)' });
    }

    const id = params.id;
    if (!id) return j(400, { error: 'Missing transaction id' });

    const endpoint = `https://${host}/stellaradapterservice/sep24/transaction?id=${encodeURIComponent(id)}`;

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

    if (r.ok && ct.includes('application/json')) {
      const data = await r.json().catch(() => ({}));
      console.log('[MGI] get tx', id, r.status, 'in', dur, 'ms');
      return NextResponse.json(data, { status: 200 });
    }

    const text = await r.text();
    return j(502, {
      error: 'Unexpected response from anchor (get)',
      status: r.status,
      contentType: ct || null,
      bodySnippet: text.slice(0, 2000),
      sentTo: endpoint,
      note: 'Should return JSON. If you see 401, ensure Authorization Bearer token is present. If HTML, re-check allowlist.',
    });
  } catch (e: any) {
    console.error('[MGI] /api/mgi/sep24/transaction/proxy/:id crashed:', e);
    return j(500, { error: e?.message || 'Server error', stack: e?.stack });
  }
}

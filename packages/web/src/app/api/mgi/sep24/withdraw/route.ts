import { NextResponse } from 'next/server';
import { j, getAccessToken } from '@/utils/http';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

/**
 * POST /api/mgi/sep24/withdraw
 * Body: { token: string; account: string; amount: string|number; lang?: string }
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
      account,
      amount,
      lang = 'en',
    } = (await req.json()) as {
      token?: string;
      account?: string;
      amount?: string | number;
      lang?: string;
    };

    if (!token) return j(400, { error: 'Missing token' });
    if (!account) return j(400, { error: 'Missing account' });

    const n = Number(amount);
    if (!Number.isFinite(n)) return j(400, { error: 'Amount must be a valid number' });

    const host = process.env.MGI_ACCESS_HOST;
    if (!host) return j(500, { error: 'Server missing MGI_ACCESS_HOST' });

    const endpoint = `https://${host}/stellaradapterservice/sep24/transactions/withdraw/interactive`;

    const payload = {
      asset_code: 'USDC',
      withdrawal_account: account,
      account, // keep both for compatibility
      amount: String(n),
      lang,
    };

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

    if (r.status === 302 || r.status === 303) {
      const loc = r.headers.get('location');
      if (!loc) return j(502, { error: 'Redirected without Location', status: r.status });
      return NextResponse.json({ url: loc, id: null });
    }

    if (r.ok && ct.includes('application/json')) {
      const data = await r.json().catch(() => ({}));
      const url = data?.url ?? data?.location ?? null;
      const id = data?.id ?? data?.transaction_id ?? null;
      if (!url) return j(502, { error: 'JSON response lacked url', details: data });
      return NextResponse.json({ url, id });
    }

    const text = await r.text();
    return j(502, {
      error: 'Unexpected response from anchor',
      status: r.status,
      contentType: ct || null,
      bodySnippet: text.slice(0, 2000),
      sentTo: endpoint,
      sentBody: payload,
    });
  } catch (e: any) {
    return j(500, { error: e?.message || 'Server error', stack: e?.stack });
  }
}

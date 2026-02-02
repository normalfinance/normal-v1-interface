import { NextResponse } from 'next/server';
import { getAccessToken } from '@/utils/http';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

function j(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

// MoneyGram sandbox USDC issuer on Stellar Testnet (FYI, we do NOT send it unless you decide to)
const USDC_TESTNET_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

export async function POST(req: Request) {
  const t0 = Date.now();

  try {
    // Authenticate
    const accessToken = getAccessToken(req);
    const user = await getAuthenticatedUser(accessToken);

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      token,
      account,
      amount,
      lang = 'en',
    } = body as {
      token?: string;
      account?: string;
      amount?: string | number;
      lang?: string;
    };

    if (!token) return j(400, { error: 'Missing token' });
    if (!account) return j(400, { error: 'Missing account' });

    const n = Number(amount);
    if (!Number.isFinite(n)) {
      return j(400, { error: 'Missing or invalid amount (number required)' });
    }

    const host = process.env.MGI_ACCESS_HOST; // extstellar.moneygram.com for sandbox
    if (!host) return j(500, { error: 'Server missing MGI_ACCESS_HOST' });

    const endpoint = `https://${host}/stellaradapterservice/sep24/transactions/deposit/interactive`;

    const payload: Record<string, any> = {
      asset_code: 'USDC',
      account,
      amount: String(n), // string per SEP-24 convention
      lang,
      // asset_issuer: USDC_TESTNET_ISSUER, // uncomment if required by your tenant
      // memo: '123456', memo_type: 'id',   // for custodial setups
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

    const dur = Date.now() - t0;
    const ct = (r.headers.get('content-type') || '').toLowerCase();

    if (r.status === 302 || r.status === 303) {
      const loc = r.headers.get('location');
      if (!loc) {
        return j(502, { error: 'Anchor redirected without a Location header', status: r.status });
      }
      console.log('[MGI] deposit interactive redirect', r.status, 'in', dur, 'ms ->', loc);
      return NextResponse.json({ url: loc, id: null });
    }

    if (r.ok && ct.includes('application/json')) {
      const data = await r.json().catch(() => ({}));
      const url = data?.url ?? data?.location ?? null;
      const id = data?.id ?? data?.transaction_id ?? null;
      if (!url) {
        return j(502, { error: 'Interactive JSON lacked url', details: data, status: r.status });
      }
      console.log('[MGI] deposit interactive JSON', r.status, 'in', dur, 'ms ->', url);
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
      note: 'Adapterservice should return JSON or a 302/303 redirect to the interactive UI. If HTML persists, re-check allowlisted client_domain and SEP-10 token scope.',
    });
  } catch (e: any) {
    console.error('[MGI] /api/mgi/sep24/deposit crashed:', e);
    return j(500, { error: e?.message || 'Server error', stack: e?.stack });
  }
}

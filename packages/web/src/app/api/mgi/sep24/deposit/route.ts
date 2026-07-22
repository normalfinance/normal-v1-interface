import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { j, getAccessToken } from '@/utils/http';
import { mgiApiBase } from '@/lib/mgi/server-base';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

// We send only `asset_code: 'USDC'`; MoneyGram resolves the issuer for its
// network, so no hardcoded (testnet) issuer is needed here.

export async function POST(req: Request) {
  const t0 = Date.now();

  try {
    // Authenticate
    const accessToken = getAccessToken(req);
    const user = await getAuthenticatedUser(accessToken);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const base = mgiApiBase(); // extmgxanchor.moneygram.com in test, mgxanchor.moneygram.com in prod
    if (!base) return j(500, { error: 'Server missing MGI_ACCESS_HOST' });

    const endpoint = `${base}/sep24/transactions/deposit/interactive`;

    const payload: Record<string, any> = {
      asset_code: 'USDC',
      account,
      amount: String(n), // string per SEP-24 convention
      lang,
      // asset_issuer: '<mainnet USDC issuer>', // only if your MGI tenant requires it
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
      // Record the transaction so the activity feed can render it without a
      // SEP-10 ceremony. Best-effort — a logging failure must not break the ramp.
      if (id) {
        try {
          await prisma.moneyGramTransaction.upsert({
            where: { id: String(id) },
            create: {
              id: String(id),
              supabaseUid: user.id,
              walletAddress: account,
              kind: 'deposit',
              amount: String(n),
              status: 'incomplete',
            },
            update: {},
          });
        } catch (dbErr) {
          console.error('[MGI] failed to record deposit tx', dbErr);
        }
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
      note: 'The anchor should return JSON or a 302/303 redirect to the interactive UI. If HTML persists, re-check allowlisted client_domain and SEP-10 token scope.',
    });
  } catch (e: any) {
    console.error('[MGI] /api/mgi/sep24/deposit crashed:', e);
    return j(500, { error: e?.message || 'Server error', stack: e?.stack });
  }
}

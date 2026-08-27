import { j } from '@/utils/http';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { mgiApiBase } from '@/lib/mgi/server-base';

// We send only `asset_code: 'USDC'`; MoneyGram resolves the issuer for its
// network, so no hardcoded (testnet) issuer is needed here.

export const POST = withAuth(async (req: Request, { user }) => {
  const t0 = Date.now();

  try {
    // Authenticate

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
    // A JSON error body from the anchor is a clean user-facing rejection
    // (e.g. "amount is less than asset's minimum limit") — pass the message
    // through instead of dumping diagnostics at the user.
    if (ct.includes('application/json')) {
      try {
        const errBody = JSON.parse(text);
        if (typeof errBody?.error === 'string' && errBody.error) {
          return j(400, { error: `MoneyGram: ${errBody.error}` });
        }
      } catch {
        /* not JSON after all — fall through to diagnostics */
      }
    }
    return j(502, {
      error: 'Unexpected response from anchor',
      status: r.status,
      contentType: ct || null,
      note: 'The anchor should return JSON or a 302/303 redirect to the interactive UI. If HTML persists, re-check allowlisted client_domain and SEP-10 token scope.',
    });
  } catch (e: any) {
    console.error('[MGI] /api/mgi/sep24/deposit crashed:', e);
    return j(500, { error: 'MoneyGram is temporarily unavailable — please try again.' });
  }
});

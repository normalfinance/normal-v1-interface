import { j } from '@/utils/http';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { mgiApiBase } from '@/lib/mgi/server-base';

/**
 * POST /api/mgi/sep24/withdraw
 * Body: { token: string; account: string; amount: string|number; lang?: string }
 */
export const POST = withAuth(async (req: Request, { user }) => {
  try {
    // Authenticate

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

    const base = mgiApiBase();
    if (!base) return j(500, { error: 'Server missing MGI_ACCESS_HOST' });

    const endpoint = `${base}/sep24/transactions/withdraw/interactive`;

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
              kind: 'withdrawal',
              amount: String(n),
              status: 'incomplete',
            },
            update: {},
          });
        } catch (dbErr) {
          console.error('[MGI] failed to record withdraw tx', dbErr);
        }
      }
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
      bodySnippet: text.slice(0, 2000),
      sentTo: endpoint,
      sentBody: payload,
    });
  } catch (e: any) {
    return j(500, { error: e?.message || 'Server error', stack: e?.stack });
  }
});

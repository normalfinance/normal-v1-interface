import { j } from '@/utils/http';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { mgiApiBase } from '@/lib/mgi/server-base';

/**
 * GET /api/mgi/sep24/transaction/proxy/:id
 * Requires: Authorization: Bearer <SEP10 token>
 *
 * Forwards to:
 *   https://{MGI_ACCESS_HOST}/stellarsepservice/sep24/transaction?id=<id>
 */
export const GET = withAuth(async (req: Request, { user, params }) => {
  const t0 = Date.now();
  try {
    // Authenticate

    const base = mgiApiBase();
    if (!base) return j(500, { error: 'Server missing MGI_ACCESS_HOST' });

    // The SEP-10 token comes via x-mgi-token (Authorization carries the Supabase
    // session used to authenticate the user above).
    const sep10 = req.headers.get('x-mgi-token') || '';
    if (!sep10) {
      return j(401, { error: 'Missing MoneyGram SEP-10 token (x-mgi-token header required)' });
    }

    const id = params.id;
    if (!id) return j(400, { error: 'Missing transaction id' });

    const endpoint = `${base}/sep24/transaction?id=${encodeURIComponent(id)}`;

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

    if (r.ok && ct.includes('application/json')) {
      const data = await r.json().catch(() => ({}));
      // Shape of the anchor's answer, never the memo or account values: this
      // is the line to read when a cash-out never reaches "send" (2026-10-14).
      const tx = (data as any)?.transaction ?? {};
      console.log('[MGI] get tx', id, r.status, 'in', dur, 'ms', {
        kind: tx.kind ?? null,
        status: tx.status ?? null,
        hasAnchorAccount: !!tx.withdraw_anchor_account,
        hasMemo: tx.withdraw_memo != null && tx.withdraw_memo !== '',
        memoType: tx.withdraw_memo_type ?? null,
        amountIn: tx.amount_in?.amount ?? null,
        amountInAsset: tx.amount_in?.asset ?? null,
        hasReference: !!tx.external_transaction_id,
      });
      return NextResponse.json(data, { status: 200 });
    }

    return j(502, {
      error: 'Unexpected response from anchor (get)',
      status: r.status,
      contentType: ct || null,
      note: 'Should return JSON. If you see 401, ensure Authorization Bearer token is present. If HTML, re-check allowlist.',
    });
  } catch (e: any) {
    console.error('[MGI] /api/mgi/sep24/transaction/proxy/:id crashed:', e);
    return j(500, { error: 'MoneyGram is temporarily unavailable — please try again.' });
  }
});

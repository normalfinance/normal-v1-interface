import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { getAccessToken } from '@/utils/http';
import { logger, getCdpBearerToken } from '@normalfinance/utils';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

// ---------------------------------------------------------------------------
// GET /api/coinbase/offramp-status
// Lists the authenticated user's Coinbase Offramp (sell) transactions.
//
// For a self-custody wallet, Coinbase does NOT pull funds — after the user
// confirms a sell on Coinbase, the transaction sits in STARTED with a
// `to_address` + `sell_amount`, waiting for OUR app to send the crypto on-chain.
// This route surfaces those so the client can complete the send.
//
// partnerUserRef is derived from the authenticated session (the user's email),
// never from client input — otherwise a user could read another user's sells.
// Docs: https://docs.cdp.coinbase.com/onramp-&-offramp/offramp-apis/transaction-status
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = getAccessToken(req);
    const user = await getAuthenticatedUser(token);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    // partnerUserRef = the same value the offramp URL was generated with: the
    // Supabase user UUID. It is URL-safe, so the JWT path matches the request
    // path exactly (an email's encoded '@' breaks that match → Coinbase 401).
    const partnerUserRef = user.id;
    const encodedRef = encodeURIComponent(partnerUserRef);
    const path = `/onramp/v1/sell/user/${encodedRef}/transactions`;

    // JWT must be minted for this exact GET path (query string excluded).
    const { jwt, host } = await getCdpBearerToken('GET', path);

    const resp = await fetch(`https://${host}${path}?pageSize=20`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${jwt}`, Accept: 'application/json' },
      cache: 'no-store',
    });

    const text = await resp.text();
    if (!resp.ok) {
      logger.error('[coinbase/offramp-status] Coinbase API error:', resp.status, text);
      let errorPayload: unknown = text;
      try {
        errorPayload = JSON.parse(text);
      } catch {
        /* keep raw */
      }
      return NextResponse.json(
        { error: errorPayload || 'Status fetch failed' },
        { status: resp.status }
      );
    }

    const data = JSON.parse(text);
    const transactions = (data.transactions ?? []).map((tx: any) => ({
      transactionId: tx.transaction_id ?? tx.id ?? null,
      status: tx.status ?? null,
      toAddress: tx.to_address ?? null,
      fromAddress: tx.from_address ?? null,
      asset: tx.asset ?? tx.sell_amount?.currency ?? null,
      network: tx.network ?? null,
      amount: tx.sell_amount?.value ?? null,
      currency: tx.sell_amount?.currency ?? tx.asset ?? null,
      txHash: tx.tx_hash ?? null,
      createdAt: tx.created_at ?? null,
      // Stellar deposits to Coinbase REQUIRE a memo (shared address routing).
      // Coinbase's exact field name isn't documented for offramp, so surface any
      // plausible candidate — the client hard-guards if it's still missing.
      memo:
        tx.memo ??
        tx.deposit_memo ??
        tx.destination_tag ??
        tx.to_memo ??
        tx.to_address_memo ??
        null,
    }));

    return NextResponse.json({ transactions });
  } catch (err: any) {
    logger.error('[coinbase/offramp-status] exception:', err);
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}

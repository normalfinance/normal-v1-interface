import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { userOwnsAnyWalletAddress } from '@/lib/wallet-ownership';
import { type OnrampChain, onrampSessionForm } from '@/lib/stripe/onramp';

// ---------------------------------------------------------------------------
// POST /api/stripe/onramp-session
// Mints a Stripe fiat-to-crypto onramp session locked to the caller's OWN
// wallet address and returns the hosted page URL. Replaces the old bare
// crypto.link.com link, which carried no address (users typed their own).
//
// Body: { address, asset: 'USDC'|'XLM'|'BTC'|'ETH'|'SOL', blockchain, amountUsd? }
// 200: { url, sessionId }
// 400: unsupported pair / Stripe refused (incl. unsupported region)
// 403: address is not one of the caller's wallets
// 503: STRIPE_SECRET_KEY not configured (client falls back to the plain link)
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';

const CHAINS = new Set<OnrampChain>(['stellar', 'bitcoin', 'ethereum', 'solana']);

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { success: false, error: 'Stripe onramp is not configured', notConfigured: true },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const address = String(body?.address ?? '').trim();
  const symbol = String(body?.asset ?? '').trim();
  const chain = String(body?.blockchain ?? '') as OnrampChain;
  const amountUsd = body?.amountUsd != null ? String(body.amountUsd) : null;
  if (!address || !symbol || !CHAINS.has(chain)) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
  // The address is attacker-controlled input: only the caller's own wallets
  // may be set as the locked destination.
  if (!(await userOwnsAnyWalletAddress(user.id, address))) {
    return NextResponse.json(
      { success: false, error: 'Wallet does not belong to this account' },
      { status: 403 }
    );
  }

  const clientIp =
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    null;
  const form = onrampSessionForm({
    chain,
    symbol,
    address,
    amountUsd,
    clientIp,
    metadata: { supabaseUid: user.id, asset: symbol.toUpperCase(), chain },
  });
  if (!form) {
    return NextResponse.json(
      { success: false, error: `Stripe cannot deliver ${symbol} on ${chain}` },
      { status: 400 }
    );
  }

  try {
    const r = await fetch('https://api.stripe.com/v1/crypto/onramp_sessions', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${secret}:`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
      signal: AbortSignal.timeout(15_000),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data?.redirect_url) {
      const code = data?.error?.code ?? '';
      // Stripe answers 400 for an IP outside its supported regions — tell the
      // user that plainly instead of "something went wrong".
      const regional = /region|country|unsupported|not_available/i.test(
        `${code} ${data?.error?.message ?? ''}`
      );
      console.error('[stripe/onramp-session] Stripe error:', r.status, code, data?.error?.message);
      return NextResponse.json(
        {
          success: false,
          error: regional
            ? 'Stripe is not available in your region yet.'
            : 'Stripe could not start this purchase. Please try another provider.',
          code: code || undefined,
        },
        { status: r.status >= 400 && r.status < 500 ? 400 : 502 }
      );
    }
    return NextResponse.json({ success: true, url: data.redirect_url, sessionId: data.id });
  } catch (e: any) {
    console.error('[stripe/onramp-session] exception:', e?.message ?? e);
    return NextResponse.json(
      { success: false, error: 'Stripe is temporarily unavailable — please try again.' },
      { status: 502 }
    );
  }
});

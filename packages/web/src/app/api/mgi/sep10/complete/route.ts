import { cookies } from 'next/headers';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { mgiApiBase } from '@/lib/mgi/server-base';
import { Keypair, Transaction } from '@stellar/stellar-sdk';
import { networkFromCookie } from '@/server/network-cookie';
import { getStellarConfigForNetwork } from '@normalfinance/utils';

/**
 * POST /api/mgi/sep10/complete
 * Body: { userSignedXDR: string }
 *
 * - Rebuilds the SEP-10 challenge with the correct network passphrase
 * - Co-signs with your app's AUTH secret (must match SIGNING_KEY in TOML)
 * - Posts to MGI /auth as application/x-www-form-urlencoded (transaction=<xdr>)
 * - Bubbles up MoneyGram's exact error body so you can see what's wrong
 */
export const POST = withAuth(async (req: Request, { user }) => {
  try {
    // Authenticate

    const { userSignedXDR } = (await req.json()) as { userSignedXDR?: string };
    if (!userSignedXDR) {
      return NextResponse.json({ error: 'Missing userSignedXDR' }, { status: 400 });
    }

    const authSecret = process.env.AUTH_SECRET_KEY;
    const mgiBase = mgiApiBase();
    const cookieStore = await cookies();
    // Prefer the user's cookie, but fall back to the build's NEXT_PUBLIC_NETWORK
    // (not a hardcoded testnet) so a missing cookie can't downgrade a mainnet
    // user onto the testnet passphrase against the production MoneyGram host.
    const network = networkFromCookie(cookieStore);
    const passphrase = getStellarConfigForNetwork(network).NETWORK_PASSPHRASE;

    if (!authSecret) {
      return NextResponse.json({ error: 'Server missing AUTH_SECRET_KEY' }, { status: 500 });
    }
    if (!mgiBase) {
      return NextResponse.json({ error: 'Server missing MGI_ACCESS_HOST' }, { status: 500 });
    }

    const tx = new Transaction(userSignedXDR, passphrase);
    const appKey = Keypair.fromSecret(authSecret);
    tx.sign(appKey);
    const appSignedXDR = tx.toXDR();

    const url = `${mgiBase}/auth`;
    const body = new URLSearchParams({ transaction: appSignedXDR }).toString();

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const raw = await r.text();
    console.error('[MGI] /auth status', r.status, 'body:', raw);

    let data: any = raw;
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }

    if (!r.ok) {
      return NextResponse.json(
        {
          error: 'MoneyGram sign-in failed — please try again.',
          status: r.status,
        },
        { status: r.status }
      );
    }

    const token = data?.token ?? data?.access_token ?? data;
    if (!token) {
      return NextResponse.json(
        { error: 'MoneyGram sign-in failed — please try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ token });
  } catch (e: any) {
    console.error('[MGI] /api/mgi/sep10/complete crashed:', e);
    return NextResponse.json(
      { error: 'MoneyGram is temporarily unavailable — please try again.' },
      { status: 500 }
    );
  }
});

import { NextResponse } from 'next/server';
import { Keypair, Transaction } from '@stellar/stellar-sdk';

/**
 * POST /api/mgi/sep10/complete
 * Body: { userSignedXDR: string }
 *
 * - Rebuilds the SEP-10 challenge with the correct network passphrase
 * - Co-signs with your app's AUTH secret (must match SIGNING_KEY in TOML)
 * - Posts to MGI /auth as application/x-www-form-urlencoded (transaction=<xdr>)
 * - Bubbles up MoneyGram's exact error body so you can see what's wrong
 */
export async function POST(req: Request) {
  try {
    const { userSignedXDR } = (await req.json()) as { userSignedXDR?: string };
    if (!userSignedXDR) {
      return NextResponse.json({ error: 'Missing userSignedXDR' }, { status: 400 });
    }

    const authSecret = process.env.AUTH_SECRET_KEY;
    const mgiHost = process.env.MGI_ACCESS_HOST;
    const passphrase =
      process.env.HORIZON_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';

    if (!authSecret) {
      return NextResponse.json({ error: 'Server missing AUTH_SECRET_KEY' }, { status: 500 });
    }
    if (!mgiHost) {
      return NextResponse.json({ error: 'Server missing MGI_ACCESS_HOST' }, { status: 500 });
    }

    const tx = new Transaction(userSignedXDR, passphrase);
    const appKey = Keypair.fromSecret(authSecret);
    tx.sign(appKey);
    const appSignedXDR = tx.toXDR();

    const url = `https://${mgiHost}/stellaradapterservice/auth`;
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
    } catch (err) {
      data = raw;
    }

    if (!r.ok) {
      return NextResponse.json(
        {
          error: 'MGI auth complete failed',
          status: r.status,
          details: data,
          sentTo: url,
        },
        { status: r.status }
      );
    }

    const token = data?.token ?? data?.access_token ?? data;
    if (!token) {
      return NextResponse.json(
        { error: 'MGI /auth succeeded but no token in response', details: data },
        { status: 502 }
      );
    }

    return NextResponse.json({ token });
  } catch (e: any) {
    console.error('[MGI] /api/mgi/sep10/complete crashed:', e);
    return NextResponse.json(
      { error: e?.message || 'Server error', stack: e?.stack },
      { status: 500 }
    );
  }
}

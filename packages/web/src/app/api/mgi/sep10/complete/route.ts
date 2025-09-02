import { NextResponse } from 'next/server';
import { Keypair, Transaction } from '@stellar/stellar-sdk';

export async function POST(req: Request) {
  try {
    const { userSignedXDR } = (await req.json()) as { userSignedXDR: string };
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

    // Rebuild the challenge
    // NOTE: in stellar-sdk v14, the ctor takes (xdrBase64, networkPassphrase: string)
    const tx = new Transaction(userSignedXDR, passphrase);

    // Co-sign with the app’s AUTH key (must match SIGNING_KEY in your TOML)
    const appKey = Keypair.fromSecret(authSecret);
    tx.sign(appKey);
    const appSignedXDR = tx.toXDR();

    // MoneyGram /auth expects x-www-form-urlencoded: transaction=<xdr>
    const body = new URLSearchParams({ transaction: appSignedXDR }).toString();

    const url = `https://${mgiHost}/stellaradapterservice/auth`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const raw = await r.text();
    let data: any = raw;
    try {
      data = JSON.parse(raw);
    } catch (_) {
      /* keep raw text */
    }

    if (!r.ok) {
      // Bubble up MoneyGram’s message so you see it in your browser
      const problem = {
        error: 'MGI auth complete failed',
        status: r.status,
        details: data,
        sentTo: url,
      };
      console.error('[MGI] /auth error:', problem);
      return NextResponse.json(problem, { status: r.status });
    }

    const token = data?.token ?? data?.access_token ?? data;
    return NextResponse.json({ token });
  } catch (e: any) {
    console.error('[MGI] /api/mgi/sep10/complete crashed:', e);
    return NextResponse.json(
      { error: e?.message || 'Server error', stack: e?.stack },
      { status: 500 }
    );
  }
}

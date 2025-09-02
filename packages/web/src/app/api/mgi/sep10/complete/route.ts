import { NextResponse } from 'next/server';
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';

export async function POST(req: Request) {
  try {
    const { userSignedXDR } = (await req.json()) as { userSignedXDR: string };
    if (!userSignedXDR) {
      return NextResponse.json({ error: 'Missing userSignedXDR' }, { status: 400 });
    }

    const authSecret = process.env.AUTH_SECRET_KEY!;
    const mgiHost = process.env.MGI_ACCESS_HOST!;
    const passphrase =
      process.env.HORIZON_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';

    const network = passphrase.includes('Test') ? Networks.TESTNET : Networks.PUBLIC;
    const tx = new Transaction(userSignedXDR, network);

    const appKey = Keypair.fromSecret(authSecret);
    tx.sign(appKey);
    const appSignedXDR = tx.toXDR();

    const r = await fetch(`https://${mgiHost}/stellaradapterservice/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction: appSignedXDR }),
    });
    const data = await r.json();

    if (!r.ok) {
      return NextResponse.json(
        { error: data?.error || 'MGI auth complete failed', details: data },
        { status: r.status }
      );
    }

    return NextResponse.json({ token: data?.token || data?.access_token || data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

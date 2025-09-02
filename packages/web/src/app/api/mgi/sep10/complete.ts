import type { NextApiRequest, NextApiResponse } from 'next';
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { userSignedXDR } = req.body as { userSignedXDR: string };
    if (!userSignedXDR) return res.status(400).json({ error: 'Missing userSignedXDR' });

    const authSecret = process.env.AUTH_SECRET_KEY!;
    const mgiHost = process.env.MGI_ACCESS_HOST!;
    const passphrase = process.env.HORIZON_NETWORK_PASSPHRASE!;

    // 1) Load user-signed challenge XDR and add app signature
    const tx = new Transaction(
      userSignedXDR,
      Networks[passphrase.includes('Test') ? 'TESTNET' : 'PUBLIC']
    );
    const appKey = Keypair.fromSecret(authSecret);
    tx.sign(appKey);
    const appSignedXDR = tx.toXDR();

    // 2) POST back to MGI /auth to exchange for token
    const r = await fetch(`https://${mgiHost}/stellaradapterservice/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction: appSignedXDR }),
    });
    const data = await r.json();
    if (!r.ok) {
      return res
        .status(r.status)
        .json({ error: data?.error || 'MGI auth complete failed', details: data });
    }
    // expect a token (JWT-like)
    return res.status(200).json({ token: data?.token || data?.access_token || data });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
}

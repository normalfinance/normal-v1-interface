import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { token, account, amount } = req.body as {
      token: string;
      account: string;
      amount: string;
    };

    const mgiHost = process.env.MGI_ACCESS_HOST!;
    const r = await fetch(
      `https://${mgiHost}/stellarsepservice/sep24/transactions/withdraw/interactive`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          asset_code: 'USDC',
          account, // user's G... (for non-custodial)
          lang: 'en',
          amount, // for withdraw you will usually collect this from the user
        }),
      }
    );

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data });

    return res.status(200).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
}

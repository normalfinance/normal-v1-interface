import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { account } = req.query; // user's G... (from xBull)
    if (!account || typeof account !== 'string') {
      return res.status(400).json({ error: 'Missing account' });
    }

    const host = process.env.MGI_ACCESS_HOST!;
    const clientDomain = process.env.CLIENT_DOMAIN!;
    const url = `https://${host}/stellaradapterservice/auth?account=${encodeURIComponent(
      account
    )}&client_domain=${encodeURIComponent(clientDomain)}`;

    const r = await fetch(url, { method: 'GET' });
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: text || 'MGI challenge fetch failed' });
    }
    // MoneyGram returns a SEP-10 challenge in JSON/XDR form
    const data = await r.json(); // expect { transaction: "<XDR>", network_passphrase: "..." } or similar
    return res.status(200).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
}

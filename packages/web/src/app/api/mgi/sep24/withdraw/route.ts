import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { token, account, amount } = (await req.json()) as {
      token: string;
      account: string;
      amount: string;
    };
    const mgiHost = process.env.MGI_ACCESS_HOST!;

    const r = await fetch(
      `https://${mgiHost}/stellarsepservice/sep24/transactions/withdraw/interactive`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ asset_code: 'USDC', account, lang: 'en', amount }),
      }
    );
    const data = await r.json();
    if (!r.ok) return NextResponse.json({ error: data }, { status: r.status });

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

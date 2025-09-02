import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { token, account } = (await req.json()) as { token: string; account: string };
    const mgiHost = process.env.MGI_ACCESS_HOST!;

    const r = await fetch(
      `https://${mgiHost}/stellarsepservice/sep24/transactions/deposit/interactive`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ asset_code: 'USDC', account, lang: 'en' }),
      }
    );
    const data = await r.json();
    if (!r.ok) return NextResponse.json({ error: data }, { status: r.status });

    return NextResponse.json(data); // { url, id }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

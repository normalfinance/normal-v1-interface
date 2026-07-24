import { j } from '@/utils/http';
import { NextResponse } from 'next/server';
import { mgiApiBase } from '@/lib/mgi/server-base';

export const revalidate = 300;

/**
 * GET /api/mgi/info — MoneyGram's live SEP-24 limits (public anchor metadata,
 * no user auth; cached 5 min). The amount dialogs enforce these so users can't
 * start a deposit/withdrawal MoneyGram will reject — their limits have changed
 * under us before (deposit min went 1 → 15 without notice).
 */
export async function GET() {
  try {
    const base = mgiApiBase();
    if (!base) return j(500, { error: 'Server missing MGI_ACCESS_HOST' });

    const r = await fetch(`${base}/sep24/info`, { next: { revalidate: 300 } });
    if (!r.ok) return j(502, { error: `anchor /info failed: ${r.status}` });
    const info = await r.json();

    const dep = info?.deposit?.USDC ?? {};
    const wd = info?.withdraw?.USDC ?? {};
    return NextResponse.json(
      {
        deposit: { min: Number(dep.min_amount) || 15, max: Number(dep.max_amount) || 950 },
        withdraw: { min: Number(wd.min_amount) || 15, max: Number(wd.max_amount) || 2500 },
      },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } }
    );
  } catch (e: any) {
    return j(500, { error: e?.message || 'Server error' });
  }
}

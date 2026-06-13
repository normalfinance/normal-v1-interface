import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// GET /api/lifi/status?txHash=…&fromChain=…&toChain=…
// Proxies LI.FI's cross-chain status endpoint (key stays server-side).
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const txHash = request.nextUrl.searchParams.get('txHash');
  const fromChain = request.nextUrl.searchParams.get('fromChain');
  const toChain = request.nextUrl.searchParams.get('toChain');

  if (!txHash) {
    return NextResponse.json({ success: false, error: 'Missing txHash' }, { status: 400 });
  }

  const params = new URLSearchParams({ txHash });
  if (fromChain) params.set('fromChain', fromChain);
  if (toChain) params.set('toChain', toChain);

  const headers: Record<string, string> = {};
  if (process.env.LIFI_API_KEY) headers['x-lifi-api-key'] = process.env.LIFI_API_KEY;

  try {
    const res = await fetch(`https://li.quest/v1/status?${params.toString()}`, {
      headers,
      cache: 'no-store',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: err.message ?? `Status failed (${res.status})` },
        { status: res.status }
      );
    }
    const status = await res.json();
    return NextResponse.json({ success: true, status });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch status' }, { status: 502 });
  }
}

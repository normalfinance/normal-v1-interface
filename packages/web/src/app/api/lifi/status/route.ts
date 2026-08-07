import type { NextRequest } from 'next/server';

import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';

// ---------------------------------------------------------------------------
// GET /api/lifi/status?txHash=…&fromChain=…&toChain=…
// Proxies LI.FI's cross-chain status endpoint (key stays server-side).
// ---------------------------------------------------------------------------

// Unauthenticated until 2026-08-07 (finding #50): any anonymous caller could
// drive this route — and with it, quota we pay for. Its only legitimate
// callers are signed-in app flows, which send auth headers.
export const GET = withAuth(async (request: NextRequest, { user }) => {
  const { success: withinLimit } = await rateLimiter.limit(user.id);
  if (!withinLimit) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
  }

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
});

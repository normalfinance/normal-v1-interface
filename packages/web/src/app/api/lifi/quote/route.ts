import type { NextRequest } from 'next/server';

import { logger } from '@/utils/logger';
import { NextResponse } from 'next/server';
import { quoteRateLimiter } from '@/server/rateLimiter';
import { getLifiQuote, LifiQuoteError } from '@/server/lifi-quote';
import { sanitizeTool, sanitizeToolList } from '@/lib/cctp/failure-class';

// ---------------------------------------------------------------------------
// POST /api/lifi/quote
// Server-side proxy for LI.FI quotes (the API key never reaches the browser).
// Body: { fromSymbol, toSymbol, fromAmount (base units), fromAddress, toAddress }
// The quote core (asset map, integrator fee + 1011 feeless retry, no-route
// message) lives in server/lifi-quote.ts, shared with the autopilot pivot.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // Unauthenticated by design, but this proxies a service we pay for, so it
  // needs a ceiling. Keyed on IP — the only identity available here.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const { success: withinLimit } = await quoteRateLimiter.limit(ip);
  if (!withinLimit) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
  }

  let body: {
    fromSymbol?: string;
    toSymbol?: string;
    fromAmount?: string;
    fromAddress?: string;
    toAddress?: string;
    denyBridges?: unknown;
    denyExchanges?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { quote, feePercent } = await getLifiQuote({
      fromSymbol: body.fromSymbol ?? '',
      toSymbol: body.toSymbol ?? '',
      fromAmount: body.fromAmount ?? '',
      fromAddress: body.fromAddress ?? '',
      toAddress: body.toAddress ?? '',
      // Bridge-failover retries exclude the bridge that just reverted — the
      // list is slug-validated + bounded; junk silently drops to "no filter".
      denyBridges: Array.isArray(body.denyBridges)
        ? body.denyBridges
            .map(sanitizeTool)
            .filter((x): x is string => !!x)
            .slice(0, 4)
        : undefined,
      denyExchanges: sanitizeToolList(body.denyExchanges),
    });
    return NextResponse.json({ success: true, quote, feePercent });
  } catch (error) {
    if (error instanceof LifiQuoteError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    logger.error('[lifi/quote] Error fetching quote:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch quote' }, { status: 502 });
  }
}

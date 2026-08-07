import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { quoteRateLimiter } from '@/server/rateLimiter';

// ---------------------------------------------------------------------------
// POST /api/lifi/quote
// Server-side proxy for LI.FI quotes (the API key never reaches the browser).
// Body: { fromSymbol, toSymbol, fromAmount (base units), fromAddress, toAddress }
//
// The integrator fee is attached when configured; if the LI.FI portal has no
// fee wallet for the source ecosystem yet (error 1011), we retry feeless so
// swaps keep working — the missing portal config is logged for follow-up.
// ---------------------------------------------------------------------------

const LIFI_ASSETS: Record<string, { chainId: number; token: string }> = {
  BTC: { chainId: 20000000000001, token: 'bitcoin' },
  ETH: { chainId: 1, token: '0x0000000000000000000000000000000000000000' },
  SOL: { chainId: 1151111081099710, token: '11111111111111111111111111111111' },
  // Native USDC on Base — the CCTP pivot leg (crosschain asset → USDC on Base →
  // CCTP → Stellar). Mainnet only: LI.FI has no meaningful testnet liquidity.
  USDC_BASE: { chainId: 8453, token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
};

async function fetchQuote(params: URLSearchParams): Promise<Response> {
  const headers: Record<string, string> = {};
  if (process.env.LIFI_API_KEY) headers['x-lifi-api-key'] = process.env.LIFI_API_KEY;
  // Hard timeout so a slow/hung upstream can never leave the client spinning.
  return fetch(`https://li.quest/v1/quote?${params.toString()}`, {
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(25_000),
  });
}

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
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { fromSymbol, toSymbol, fromAmount, fromAddress, toAddress } = body;
  const from = fromSymbol ? LIFI_ASSETS[fromSymbol] : undefined;
  const to = toSymbol ? LIFI_ASSETS[toSymbol] : undefined;

  if (!from || !to || from === to) {
    return NextResponse.json({ success: false, error: 'Unsupported asset pair' }, { status: 400 });
  }
  if (!fromAmount || !/^\d+$/.test(fromAmount) || fromAmount === '0') {
    return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 });
  }
  if (!fromAddress || !toAddress) {
    return NextResponse.json({ success: false, error: 'Missing addresses' }, { status: 400 });
  }

  const params = new URLSearchParams({
    fromChain: String(from.chainId),
    toChain: String(to.chainId),
    fromToken: from.token,
    toToken: to.token,
    fromAmount,
    fromAddress,
    toAddress,
    integrator: process.env.NEXT_PUBLIC_LIFI_INTEGRATOR ?? 'normalfinance',
    // Gas.zip is a gas-refuel bridge, not a value bridge — it mis-handled a
    // real SOL→ETH swap (stuck 20h+, then refunded). Blocklist it so LI.FI
    // routes value swaps through proper bridges (Mayan/Chainflip/Near/Relay…).
    // We deny (not allow) so newly added bridges still flow in automatically.
    denyBridges: 'gasZipBridge',
  });

  const fee = process.env.LIFI_FEE;
  // Whether the Normal integrator fee actually ends up on this quote — flipped
  // off if the 1011 fallback below strips it, so the client shows the real fee.
  let feeApplied = Boolean(fee);
  if (fee) params.set('fee', fee);

  try {
    let res = await fetchQuote(params);

    // 1011 = integrator fee wallet not configured for this chain in the
    // LI.FI portal — retry without the fee rather than blocking the swap.
    if (!res.ok && fee) {
      const err = await res
        .clone()
        .json()
        .catch(() => null);
      if (err?.code === 1011) {
        logger.warn('[lifi/quote] Integrator fee not configured for chain, retrying feeless', {
          fromSymbol,
        });
        params.delete('fee');
        feeApplied = false;
        res = await fetchQuote(params);
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // LI.FI returns 404 / a "no available quotes" message when no bridge will
      // carry this amount+pair. Surface a clear, actionable message instead of
      // the raw upstream error so the user knows to try a larger amount.
      const raw = String(err.message ?? '');
      const noRoute = res.status === 404 || /no (available )?(quote|route)/i.test(raw);
      const error = noRoute
        ? 'No route found for this amount — try a larger amount or a different pair.'
        : (err.message ?? `Quote failed (${res.status})`);
      return NextResponse.json({ success: false, error }, { status: res.status });
    }

    const quote = await res.json();
    // feePercent as a fraction (e.g. 0.005 = 0.5%); 0 when the fee was stripped.
    const feePercent = feeApplied && fee ? Number(fee) : 0;
    return NextResponse.json({ success: true, quote, feePercent });
  } catch (error) {
    logger.error('[lifi/quote] Error fetching quote:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch quote' }, { status: 502 });
  }
}

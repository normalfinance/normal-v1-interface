import type { NextRequest } from 'next/server';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { quoteRateLimiter } from '@/server/rateLimiter';
import { getFeesDepositAddress } from '@/lib/build-fee-payment';
import { isValidStellarAddress } from '@/utils/stellar-address';

const DEFAULT_SOROSWAP_API_BASE_URL = 'https://api.soroswap.finance';
const DEFAULT_PROTOCOLS = ['soroswap'];
const DEFAULT_SLIPPAGE_BPS = 100; // 1%

// #33 Stage 1 circuit breaker: Soroswap's fee-build endpoint is broken
// upstream (400 "simulation incorrect" whenever referralId rides along —
// doc 76 §7). The embedded-fee flag must DEGRADE, never fail a swap: after
// one embedded failure, quotes go straight to the legacy fee-pair shape for
// a window (honest 2-signature footer instead of a broken 1-signature
// promise). Per-instance memory is fine — each instance learns on its first
// attempt, and the window re-probes upstream automatically.
const EMBEDDED_BREAKER_MS = 10 * 60_000;
let embeddedBrokenUntil = 0;

// Wrapped XLM contract addresses on Soroban (not available via NEXT_PUBLIC_ env in API routes)
const XLM_CONTRACT: Record<'mainnet' | 'testnet', string> = {
  mainnet: 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA',
  testnet: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCN4',
};

export async function POST(request: NextRequest) {
  try {
    // Unauthenticated by design, but this proxies a service we pay for, so it
    // needs a ceiling. Keyed on IP — the only identity available here.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const { success: withinLimit } = await quoteRateLimiter.limit(ip);
    if (!withinLimit) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const {
      token_in_address,
      token_out_address,
      amount,
      mode = 'strict-send',
      sender,
      gross_amount,
    } = body;
    // #33 Stage 1: embedded fee — Soroswap skims our 0.5% inside the SAME
    // transaction (feeBps at quote, referralId at build) → ONE signature.
    // Flag-gated; off = today's fee-pair path, byte-identical.
    let embeddedFee =
      process.env.SOROSWAP_EMBEDDED_FEE === '1' &&
      typeof gross_amount === 'string' &&
      Date.now() > embeddedBrokenUntil;
    const feeBps = Number(process.env.NORMAL_SWAP_FEE_BPS ?? 50);

    if (!token_in_address || !token_out_address || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const isValidAddress = (addr: string) => addr === 'native' || isValidStellarAddress(addr);
    if (!isValidAddress(token_in_address) || !isValidAddress(token_out_address)) {
      return NextResponse.json(
        { success: false, error: 'Invalid token address format' },
        { status: 400 }
      );
    }

    if (mode !== 'strict-send' && mode !== 'strict-receive') {
      return NextResponse.json(
        { success: false, error: 'Invalid mode. Must be "strict-send" or "strict-receive"' },
        { status: 400 }
      );
    }

    const apiKey = process.env.SOROSWAP_API_KEY;
    if (!apiKey) {
      console.error('[swap/quote] SOROSWAP_API_KEY is not configured');
      return NextResponse.json(
        { success: false, error: 'Swap aggregator is not configured on the server' },
        { status: 500 }
      );
    }

    const apiBaseUrl = process.env.SOROSWAP_API_BASE_URL || DEFAULT_SOROSWAP_API_BASE_URL;
    const cookieStore = await cookies();
    const network = (cookieStore.get('normal-network')?.value ?? 'testnet') as
      | 'mainnet'
      | 'testnet';
    const tradeType = mode === 'strict-send' ? 'EXACT_IN' : 'EXACT_OUT';

    const resolveAddress = (addr: string) => (addr === 'native' ? XLM_CONTRACT[network] : addr);

    const quoteUrl = `${apiBaseUrl}/quote?network=${network}`;
    const fetchSoroswapQuote = (withEmbedded: boolean) => {
      const payload = {
        assetIn: resolveAddress(token_in_address),
        assetOut: resolveAddress(token_out_address),
        amount: withEmbedded ? gross_amount : amount,
        tradeType,
        protocols: DEFAULT_PROTOCOLS,
        slippageBps: DEFAULT_SLIPPAGE_BPS,
        ...(withEmbedded ? { feeBps } : {}),
      };
      console.log('[swap/quote] Soroswap quote request:', { url: quoteUrl, payload });
      return fetch(quoteUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
    };

    let quoteResponse = await fetchSoroswapQuote(embeddedFee);

    // Embedded quote refused upstream → trip the breaker and retry the
    // legacy shape in-place. The swap must work either way; embedded only
    // ever changes HOW MANY signatures, never WHETHER.
    if (!quoteResponse.ok && embeddedFee) {
      const errorText = await quoteResponse.text();
      console.error('[swap/quote] embedded quote failed, degrading:', errorText);
      embeddedBrokenUntil = Date.now() + EMBEDDED_BREAKER_MS;
      embeddedFee = false;
      quoteResponse = await fetchSoroswapQuote(false);
    }

    if (!quoteResponse.ok) {
      const errorText = await quoteResponse.text();
      console.error('[swap/quote] Soroswap /quote error:', quoteResponse.status, errorText);
      return NextResponse.json(
        { success: false, error: `Swap quote request failed (${quoteResponse.status})` },
        { status: quoteResponse.status }
      );
    }

    const quote = await quoteResponse.json();
    console.log('[swap/quote] Soroswap quote response:', JSON.stringify(quote, null, 2));

    const amountIn = String(quote.amountIn ?? amount);
    const amountOut = String(quote.amountOut ?? '0');
    const minAmountOut = String(quote.otherAmountThreshold ?? '0');

    const path: string[] = Array.isArray(quote.routePlan)
      ? quote.routePlan.flatMap((step: { swapInfo?: { path?: string[] } }) =>
          Array.isArray(step?.swapInfo?.path) ? step.swapInfo!.path : []
        )
      : [];

    if (amountOut === '0') {
      return NextResponse.json({
        success: false,
        error: 'No route available for this token pair',
        path,
        amount_in: amountIn,
        amount_out: amountOut,
        min_amount_out: minAmountOut,
        xdr: '',
      });
    }

    // Quote-only response (no sender, so no transaction to build)
    if (!sender) {
      return NextResponse.json({
        success: true,
        path,
        amount_in: amountIn,
        amount_out: amountOut,
        min_amount_out: minAmountOut,
        xdr: '',
        ...(embeddedFee
          ? { embedded_fee: { feeBps, feeAmount: String(quote.platformFee?.feeAmount ?? '') } }
          : {}),
      });
    }

    if (!isValidStellarAddress(sender)) {
      return NextResponse.json(
        { success: false, error: 'Invalid sender address format' },
        { status: 400 }
      );
    }

    const buildUrl = `${apiBaseUrl}/quote/build?network=${network}`;
    const buildPayload = {
      quote,
      from: sender,
      ...(embeddedFee ? { referralId: getFeesDepositAddress() } : {}),
    };

    const buildResponse = await fetch(buildUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(buildPayload),
    });

    if (!buildResponse.ok) {
      const errorText = await buildResponse.text();
      console.error('[swap/quote] Soroswap /quote/build error:', buildResponse.status, errorText);
      // The embedded build failing is the KNOWN upstream defect (doc 76 §7) —
      // trip the breaker and tell the client to run its fee-pair path instead
      // of surfacing a dead 400. The quote this build used carried feeBps, so
      // its xdr-less state can't be salvaged here; the client re-quotes net.
      if (embeddedFee) {
        embeddedBrokenUntil = Date.now() + EMBEDDED_BREAKER_MS;
        return NextResponse.json(
          {
            success: false,
            embedded_unavailable: true,
            error: 'Single-signature swap unavailable right now — using the standard flow',
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, error: `Swap build request failed (${buildResponse.status})` },
        { status: buildResponse.status }
      );
    }

    const built = await buildResponse.json();
    const xdr = typeof built?.xdr === 'string' ? built.xdr : '';

    if (!xdr) {
      return NextResponse.json(
        { success: false, error: 'Swap aggregator did not return a transaction XDR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      path,
      amount_in: amountIn,
      amount_out: amountOut,
      min_amount_out: minAmountOut,
      xdr,
      ...(embeddedFee
        ? { embedded_fee: { feeBps, feeAmount: String(quote.platformFee?.feeAmount ?? '') } }
        : {}),
    });
  } catch (error) {
    console.error('Swap quote error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get swap quote' },
      { status: 500 }
    );
  }
}

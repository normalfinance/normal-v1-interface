// Server core of the LI.FI quote: asset map, integrator fee (+1011 feeless
// retry), and the no-route message live HERE, shared by the /api/lifi/quote
// proxy and the autopilot pivot (which must quote in-process — a server route
// cannot fetch itself). Callers own rate limiting and HTTP mapping.

import { logger } from '@normalfinance/utils';

export const LIFI_ASSETS: Record<string, { chainId: number; token: string }> = {
  BTC: { chainId: 20000000000001, token: 'bitcoin' },
  ETH: { chainId: 1, token: '0x0000000000000000000000000000000000000000' },
  SOL: { chainId: 1151111081099710, token: '11111111111111111111111111111111' },
  // Native USDC on Base — the CCTP pivot leg (crosschain asset → USDC on Base →
  // CCTP → Stellar). Mainnet only: LI.FI has no meaningful testnet liquidity.
  USDC_BASE: { chainId: 8453, token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
};

/** Thrown with the upstream (or mapped) HTTP status so routes can pass it on. */
export class LifiQuoteError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'LifiQuoteError';
  }
}

async function fetchQuote(params: URLSearchParams): Promise<Response> {
  const headers: Record<string, string> = {};
  if (process.env.LIFI_API_KEY) headers['x-lifi-api-key'] = process.env.LIFI_API_KEY;
  // Hard timeout so a slow/hung upstream can never leave the caller spinning.
  return fetch(`https://li.quest/v1/quote?${params.toString()}`, {
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(25_000),
  });
}

/** Fetch a LI.FI quote with the Normal integrator fee attached when
 *  configured; if the LI.FI portal has no fee wallet for the source ecosystem
 *  yet (error 1011), retries feeless so swaps keep working. Throws
 *  LifiQuoteError with a user-facing message on any failure. */
export async function getLifiQuote(input: {
  fromSymbol: string;
  toSymbol: string;
  /** base units, positive integer string */
  fromAmount: string;
  fromAddress: string;
  toAddress: string;
  /** bridge-failover: LI.FI tool keys to exclude from THIS quote only */
  denyBridges?: string[];
  /** DEX steps to exclude — the poisoned element can be the swap inside the
   *  route (2026-08-26: a fake token pool in the "fly" step), not the bridge */
  denyExchanges?: string[];
}): Promise<{ quote: any; feePercent: number }> {
  const from = LIFI_ASSETS[input.fromSymbol];
  const to = LIFI_ASSETS[input.toSymbol];
  if (!from || !to || from === to) throw new LifiQuoteError('Unsupported asset pair', 400);
  if (!/^\d+$/.test(input.fromAmount) || input.fromAmount === '0')
    throw new LifiQuoteError('Invalid amount', 400);
  if (!input.fromAddress || !input.toAddress) throw new LifiQuoteError('Missing addresses', 400);

  const params = new URLSearchParams({
    fromChain: String(from.chainId),
    toChain: String(to.chainId),
    fromToken: from.token,
    toToken: to.token,
    fromAmount: input.fromAmount,
    fromAddress: input.fromAddress,
    toAddress: input.toAddress,
    integrator: process.env.NEXT_PUBLIC_LIFI_INTEGRATOR ?? 'normalfinance',
  });
  // Gas.zip is a gas-refuel bridge, not a value bridge — it mis-handled a
  // real SOL→ETH swap (stuck 20h+, then refunded). Blocklist it so LI.FI
  // routes value swaps through proper bridges (Mayan/Chainflip/Near/Relay…).
  // We deny (not allow) so newly added bridges still flow in automatically.
  // input.denyBridges rides along for bridge-FAILOVER retries only: the
  // bridge that just reverted THIS transfer's pivot is excluded from the
  // retry quote — never from routing in general (Niko 2026-08-26).
  for (const tool of ['gasZipBridge', ...(input.denyBridges ?? [])]) {
    params.append('denyBridges', tool);
  }
  for (const tool of input.denyExchanges ?? []) {
    params.append('denyExchanges', tool);
  }

  const fee = process.env.LIFI_FEE;
  // Whether the Normal integrator fee actually ends up on this quote — flipped
  // off if the 1011 fallback below strips it, so the caller shows the real fee.
  let feeApplied = Boolean(fee);
  if (fee) params.set('fee', fee);

  let res = await fetchQuote(params);

  // 1011 = integrator fee wallet not configured for this chain in the
  // LI.FI portal — retry without the fee rather than blocking the swap.
  if (!res.ok && fee) {
    const err = await res
      .clone()
      .json()
      .catch(() => null);
    if (err?.code === 1011) {
      logger.warn('[lifi-quote] Integrator fee not configured for chain, retrying feeless', {
        fromSymbol: input.fromSymbol,
      });
      params.delete('fee');
      feeApplied = false;
      res = await fetchQuote(params);
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}) as any);
    // LI.FI returns 404 / a "no available quotes" message when no bridge will
    // carry this amount+pair. Surface a clear, actionable message instead of
    // the raw upstream error so the user knows to try a larger amount.
    const raw = String(err.message ?? '');
    const noRoute = res.status === 404 || /no (available )?(quote|route)/i.test(raw);
    const message = noRoute
      ? 'No route found for this amount — try a larger amount or a different pair.'
      : (err.message ?? `Quote failed (${res.status})`);
    throw new LifiQuoteError(message, res.status);
  }

  const quote = await res.json();
  // feePercent as a fraction (e.g. 0.005 = 0.5%); 0 when the fee was stripped.
  return { quote, feePercent: feeApplied && fee ? Number(fee) : 0 };
}

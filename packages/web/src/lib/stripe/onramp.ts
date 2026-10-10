import type { RampStatus } from '@/lib/ramp/status';

import { createHmac, timingSafeEqual } from 'node:crypto';

// ---------------------------------------------------------------------------
// Stripe fiat-to-crypto onramp — the pure parts (mapping, signing, status).
// Routes stay thin so these rules are testable without Stripe.
//
// Facts from docs.stripe.com/api/crypto/onramp_sessions (read 2026-10-09):
//   - POST /v1/crypto/onramp_sessions, form-encoded, Basic auth with the
//     secret key. `wallet_addresses[<network>]` locks the destination when
//     `lock_wallet_address=true`; `destination_networks[]` /
//     `destination_currencies[]` restrict the UI; `source_amount` prefills USD.
//   - Networks include `stellar`, `bitcoin`, `ethereum`, `solana`; currencies
//     include `xlm`, `usdc`, `btc`, `eth`, `sol`. XLM and USDC (Stellar) are
//     not offered in New York; Stripe enforces that itself.
//   - A `customer_ip_address` in an unsupported region returns HTTP 400.
//   - The hosted page is `redirect_url` (crypto.link.com?session_hash=…).
// ---------------------------------------------------------------------------

export type OnrampChain = 'stellar' | 'bitcoin' | 'ethereum' | 'solana';

/** Our chain ids → Stripe `destination_network` enum. Same spelling today, but
 *  the mapping lives here so a rename on either side is one edit. */
const STRIPE_NETWORK: Record<OnrampChain, string> = {
  stellar: 'stellar',
  bitcoin: 'bitcoin',
  ethereum: 'ethereum',
  solana: 'solana',
};

/** Which of our assets Stripe can deliver on which chain. */
export function stripeDestination(
  chain: OnrampChain,
  symbol: string
): { network: string; currency: string } | null {
  const sym = symbol.toUpperCase();
  const ok =
    (chain === 'stellar' && (sym === 'XLM' || sym === 'USDC')) ||
    (chain === 'bitcoin' && sym === 'BTC') ||
    (chain === 'ethereum' && (sym === 'ETH' || sym === 'USDC')) ||
    (chain === 'solana' && (sym === 'SOL' || sym === 'USDC'));
  if (!ok) return null;
  return { network: STRIPE_NETWORK[chain], currency: sym.toLowerCase() };
}

export interface OnrampSessionInput {
  chain: OnrampChain;
  symbol: string;
  address: string;
  amountUsd?: string | null;
  clientIp?: string | null;
  metadata?: Record<string, string>;
}

/** Body for POST /v1/crypto/onramp_sessions (application/x-www-form-urlencoded). */
export function onrampSessionForm(input: OnrampSessionInput): URLSearchParams | null {
  const dest = stripeDestination(input.chain, input.symbol);
  if (!dest) return null;
  const p = new URLSearchParams();
  p.set(`wallet_addresses[${dest.network}]`, input.address);
  p.set('lock_wallet_address', 'true');
  p.append('destination_networks[]', dest.network);
  p.append('destination_currencies[]', dest.currency);
  p.set('destination_network', dest.network);
  p.set('destination_currency', dest.currency);
  p.set('source_currency', 'usd');
  const amt = input.amountUsd?.trim();
  // Stripe rejects fractional cents; keep whole dollars or two decimals.
  if (amt && /^\d+(\.\d{1,2})?$/.test(amt) && Number(amt) > 0) p.set('source_amount', amt);
  if (input.clientIp && isPublicIp(input.clientIp)) p.set('customer_ip_address', input.clientIp);
  for (const [k, v] of Object.entries(input.metadata ?? {})) p.set(`metadata[${k}]`, v);
  return p;
}

export function isPublicIp(ip: string): boolean {
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10 || a === 127 || a === 0) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 169 && b === 254) return false;
    return true;
  }
  if (ip.includes(':')) {
    const lower = ip.toLowerCase();
    return !(
      lower === '::1' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe80')
    );
  }
  return false;
}

// ---- Webhook -------------------------------------------------------------

export const STRIPE_SIGNATURE_TOLERANCE_S = 300;

/**
 * Stripe-Signature: `t=<unix>,v1=<hex>[,v1=<hex>…]`; signed payload is
 * `${t}.${rawBody}` with HMAC-SHA256 over the endpoint's signing secret.
 * Returns false on any malformed input — never throws into the route.
 */
export function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowS = Math.floor(Date.now() / 1000)
): boolean {
  if (!header || !secret) return false;
  const parts = header.split(',').map((s) => s.trim());
  const t = parts.find((s) => s.startsWith('t='))?.slice(2);
  const sigs = parts.filter((s) => s.startsWith('v1=')).map((s) => s.slice(3));
  if (!t || !/^\d+$/.test(t) || sigs.length === 0) return false;
  if (Math.abs(nowS - Number(t)) > STRIPE_SIGNATURE_TOLERANCE_S) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  const exp = Buffer.from(expected, 'hex');
  return sigs.some((s) => {
    if (!/^[0-9a-f]+$/i.test(s)) return false;
    const got = Buffer.from(s, 'hex');
    return got.length === exp.length && timingSafeEqual(got, exp);
  });
}

/** Stripe onramp session statuses → our ramp_transfers status machine.
 *  `fulfillment_complete` is the provider's word, not the chain's: it maps to
 *  provider_complete and the reconciler marks `arrived` once the balance moves. */
export function rampStatusForStripe(status: string | null | undefined): RampStatus | null {
  switch (status) {
    case 'requires_payment':
    case 'fulfillment_processing':
      return 'provider_processing';
    case 'fulfillment_complete':
      return 'provider_complete';
    case 'rejected':
      return 'failed';
    default:
      return null; // 'initialized' and unknown values carry no information
  }
}

export interface StripeOnrampSessionObject {
  id: string;
  status?: string;
  metadata?: Record<string, string>;
  transaction_details?: {
    destination_amount?: string | null;
    destination_currency?: string | null;
    destination_network?: string | null;
    transaction_id?: string | null;
    wallet_address?: string | null;
  } | null;
}

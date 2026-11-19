'use client';

import type { NetworkType } from '@normalfinance/utils';
import type { NetworkConfig } from '@normalfinance/types';
import type { SwapRecordInput } from '@/server/tx-records';

import { Asset } from '@stellar/stellar-sdk';
import { buildAuthHeaders } from '@/utils/http';
import { STELLAR_CCTP } from '@/lib/cctp/config';
import { FEE_PAIR_TIMEOUT_SECONDS } from '@/lib/build-fee-payment';
import { submitFeePair, getTransactionSequence } from '@/lib/stellar/fee-pair';

// ---------------------------------------------------------------------------
// Doc 129: Core 4's Stellar coin, from the page's side. The server split the
// purchase and sent the exact amounts (api/index/purchases → stellarLegs):
// the swap spends `swapWire` of USDC for XLM on Soroswap and the fee pays
// `feeWire` (0.5%) to Normal, chained right behind it. Both are the person's
// own transactions, signed in the purchase's one prompt; the fee-pair funnel
// sends them and settles the leg (server/index-stellar-leg.ts).
// ---------------------------------------------------------------------------

export interface StellarLegAmounts {
  symbol: string;
  amountWire: string;
  feeWire: string;
  swapWire: string;
}

export interface BuiltStellarLeg {
  /** The swap, then the fee: unsigned, in sequence order. */
  xdrs: [string, string];
  record: SwapRecordInput;
  /** About how much XLM it buys, in XLM: "26.4182310". */
  amountOut: string;
}

/** 6-decimal wire units as a 7-decimal amount string: 3691450 → "3.6914500". */
export const wireTo7 = (wire: bigint) => {
  const whole = wire / 1_000_000n;
  const frac = (wire % 1_000_000n).toString().padStart(6, '0');
  return `${whole}.${frac}0`;
};

/** Build the swap and its fee, chained, for `account`. Nothing is signed. */
export async function buildStellarLeg(p: {
  leg: StellarLegAmounts;
  account: string;
  network: NetworkType;
  passphrase: string;
}): Promise<BuiltStellarLeg> {
  const usdcIssuer = STELLAR_CCTP[p.network].usdcIssuer;
  const usdcSac = new Asset('USDC', usdcIssuer).contractId(p.passphrase);
  const swapWire = BigInt(p.leg.swapWire);
  const feeWire = BigInt(p.leg.feeWire);
  const headers = { ...(await buildAuthHeaders()), 'Content-Type': 'application/json' };

  const quoteRes = await fetch('/api/swap/quote', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      token_in_address: usdcSac,
      token_out_address: 'native',
      amount: (swapWire * 10n).toString(), // 7-decimal units
      sender: p.account,
    }),
  });
  const quote = await quoteRes.json().catch(() => null);
  if (!quoteRes.ok || !quote?.success || !quote.xdr) {
    throw new Error(quote?.error ?? 'The Stellar part of this purchase could not be prepared.');
  }

  const feeRes = await fetch('/api/fees/build-payment', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      caller: p.account,
      amount: wireTo7(feeWire),
      assetCode: 'USDC',
      assetIssuer: usdcIssuer,
      sourceSequence: getTransactionSequence(quote.xdr, p.passphrase),
      timeoutSeconds: FEE_PAIR_TIMEOUT_SECONDS,
    }),
  });
  const fee = await feeRes.json().catch(() => null);
  if (!feeRes.ok || !fee?.success || !fee.xdr) {
    throw new Error(fee?.error ?? 'The Stellar part of this purchase could not be prepared.');
  }

  const amountOut = (parseInt(quote.amount_out, 10) / 10_000_000).toFixed(7);
  return {
    xdrs: [quote.xdr, fee.xdr],
    amountOut,
    record: {
      tokenInAddress: usdcSac,
      tokenOutAddress: 'native',
      tokenInSymbol: 'USDC',
      tokenOutSymbol: p.leg.symbol,
      amountIn: wireTo7(swapWire),
      amountOut,
      feeAmount: wireTo7(feeWire),
    },
  };
}

/** Send the signed pair; the server claims and settles the leg. */
export async function submitStellarLeg(p: {
  signed: string[];
  built: BuiltStellarLeg;
  purchaseId: string;
  symbol: string;
  config: NetworkConfig;
}) {
  return submitFeePair({
    signedServiceXdr: p.signed[0],
    signedFeeXdr: p.signed[1],
    kind: 'swap',
    record: p.built.record,
    config: p.config,
    indexLeg: { purchaseId: p.purchaseId, symbol: p.symbol },
  });
}

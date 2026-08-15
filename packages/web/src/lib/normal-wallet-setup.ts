'use client';

// ---------------------------------------------------------------------------
// #32 chunk 3 — guided Normal-wallet setup for external-wallet users
// (doc 72 §3). The dialog walks a Lobstr/Freighter user through the four
// physically-required steps before a cross-chain swap can run on Turnkey
// rails: create the wallet → activate it with XLM → add the USDC trustline →
// move the USDC to swap.
//
// RESUMABLE BY CONSTRUCTION: the current step is DERIVED from chain + DB
// state (deriveSetupStep, pure + unit-tested), never remembered — a killed
// tab resumes at the first unmet condition, and a returning user with a
// funded wallet derives straight to 'ready'.
// ---------------------------------------------------------------------------

import type { NetworkConfig } from '@normalfinance/types';

import { Asset, Horizon, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { xlmAvailableForFees, MIN_XLM_FOR_SAVINGS_TX } from '@/utils/stellar-reserve';

export type SetupStep = 'create' | 'activate' | 'trustline' | 'fund' | 'ready';

/** Default XLM sent to activate the new wallet (editable in the dialog):
 *  ~1.5 network reserve (base + USDC trustline) + fee headroom that lands the
 *  wallet semaphore-green (#67) from day one. Decision: Niko, 2026-08-15. */
export const SETUP_FUNDING_XLM = 4;

export interface CompanionProbe {
  exists: boolean;
  hasUsdcTrustline: boolean;
  xlmBalance: number;
  usdcBalance: number;
}

/** First unmet condition wins — the whole resumability story is this order. */
export function deriveSetupStep(
  companionAddress: string | null,
  probe: CompanionProbe | null,
  neededUsdc: number
): SetupStep {
  if (!companionAddress) return 'create';
  if (!probe || !probe.exists) return 'activate';
  // #32 chunk 4a: an activated wallet whose fee-XLM ran dry can't pay the
  // swap's Soroban burn fee — the activate step doubles as an XLM top-up.
  // Same threshold as the savings action-block and the #67 semaphore.
  if (xlmAvailableForFees(probe.xlmBalance).lt(MIN_XLM_FOR_SAVINGS_TX)) return 'activate';
  if (!probe.hasUsdcTrustline) return 'trustline';
  if (probe.usdcBalance < neededUsdc || (neededUsdc <= 0 && probe.usdcBalance <= 0)) return 'fund';
  return 'ready';
}

/** One Horizon read → everything deriveSetupStep needs. 404 = not activated. */
export async function probeCompanion(
  address: string,
  config: NetworkConfig
): Promise<CompanionProbe> {
  const server = new Horizon.Server(config.HORIZON_URL, {
    allowHttp: config.HORIZON_URL.startsWith('http://'),
  });
  try {
    const acc = await server.loadAccount(address);
    const xlm = parseFloat(acc.balances.find((b) => b.asset_type === 'native')?.balance ?? '0');
    const usdcLine = acc.balances.find(
      (b) => 'asset_code' in b && b.asset_code === 'USDC' && b.asset_issuer === config.USDC_ISSUER
    );
    return {
      exists: true,
      hasUsdcTrustline: !!usdcLine,
      xlmBalance: xlm,
      usdcBalance: usdcLine ? parseFloat(usdcLine.balance) : 0,
    };
  } catch (e: any) {
    if (e?.response?.status === 404 || e?.name === 'NotFoundError') {
      return { exists: false, hasUsdcTrustline: false, xlmBalance: 0, usdcBalance: 0 };
    }
    throw e;
  }
}

/**
 * Add the USDC trustline ON THE COMPANION. The transaction's source is the
 * Normal wallet, so the universal signer routes it to the PASSKEY — the
 * connected external wallet is not involved and could not sign it.
 */
export async function addCompanionUsdcTrustline(
  companionAddress: string,
  config: NetworkConfig
): Promise<string> {
  const server = new Horizon.Server(config.HORIZON_URL, {
    allowHttp: config.HORIZON_URL.startsWith('http://'),
  });
  const account = await server.loadAccount(companionAddress);
  const tx = new TransactionBuilder(account, {
    fee: '2000',
    networkPassphrase: config.NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.changeTrust({ asset: new Asset('USDC', config.USDC_ISSUER) }))
    .setTimeout(120)
    .build();
  // Lazy import: the universal signer pulls the wallet-kit module graph,
  // which the pure helpers above (and their tests) must not depend on.
  const { signStellarTxForMgi } = await import('@/lib/mgi/kit-signer');
  const signed = await signStellarTxForMgi(tx.toXDR(), config.NETWORK_PASSPHRASE, companionAddress);
  const result = await server.submitTransaction(
    TransactionBuilder.fromXDR(signed, config.NETWORK_PASSPHRASE)
  );
  return result.hash;
}

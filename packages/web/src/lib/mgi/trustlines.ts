'use client';

import * as Stellar from '@stellar/stellar-sdk';
import { useNetworkStore } from '@normalfinance/state';
import { type NetworkType, getStellarConfigForNetwork } from '@normalfinance/utils';

import { signStellarTxForMgi } from './kit-signer';

// ---------------------------------------------------------------------------
// USDC trustline management for the MoneyGram flow. NETWORK-AWARE: the Horizon
// URL, USDC issuer and network passphrase all come from the app's active
// network (testnet vs mainnet) — never hardcoded. Signing dispatches by wallet
// type (Normal-wallet passkey or external wallet) via signStellarTxForMgi.
// ---------------------------------------------------------------------------

const SDK: any = (Stellar as any).default ?? Stellar;
const { Asset, Account, TransactionBuilder, Operation, BASE_FEE: BASE_FEE_CONST } = SDK;

const BASE_FEE: string = typeof BASE_FEE_CONST === 'string' ? BASE_FEE_CONST : '100';
const INACTIVE_STELLAR_ACCOUNT_MESSAGE =
  'This Stellar account is not active yet. Please fund it with at least 1 XLM first.';

function activeNetwork(): NetworkType {
  try {
    return useNetworkStore.getState().network as NetworkType;
  } catch {
    return 'mainnet';
  }
}

/** { HORIZON_URL, USDC_ISSUER, NETWORK_PASSPHRASE } for the active network. */
function stellarCfg() {
  return getStellarConfigForNetwork(activeNetwork());
}

async function fetchAccountRaw(horizon: string, publicKey: string): Promise<any> {
  const r = await fetch(`${horizon}/accounts/${encodeURIComponent(publicKey)}`);
  if (!r.ok) {
    if (r.status === 404) throw new Error(INACTIVE_STELLAR_ACCOUNT_MESSAGE);
    const body = await r.text().catch(() => '');
    throw new Error(`Horizon loadAccount failed (${r.status}): ${body || r.statusText}`);
  }
  return r.json();
}

async function submitTransactionXDR(horizon: string, xdr: string): Promise<any> {
  const body = new URLSearchParams({ tx: xdr }).toString();
  const r = await fetch(`${horizon}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await r.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!r.ok) throw new Error(typeof data === 'string' ? data : JSON.stringify(data));
  return data;
}

/** Returns true if the account already has a USDC trustline (active network). */
export async function hasUSDCTrustline(publicKey: string): Promise<boolean> {
  const cfg = stellarCfg();
  const acct = await fetchAccountRaw(cfg.HORIZON_URL, publicKey);
  const balances: any[] = acct?.balances ?? [];
  return balances.some((b) => b.asset_code === 'USDC' && b.asset_issuer === cfg.USDC_ISSUER);
}

/** Builds a changeTrust XDR adding the USDC trustline on the active network. */
export async function buildUSDCTrustlineTxXDR(publicKey: string): Promise<string> {
  const cfg = stellarCfg();
  const acct = await fetchAccountRaw(cfg.HORIZON_URL, publicKey);
  const sequence = acct?.sequence;
  if (!sequence) throw new Error(INACTIVE_STELLAR_ACCOUNT_MESSAGE);

  const account = new Account(publicKey, sequence);
  const usdc = new Asset('USDC', cfg.USDC_ISSUER);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: cfg.NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.changeTrust({ asset: usdc }))
    .setTimeout(180)
    .build();

  return tx.toXDR();
}

/**
 * Adds the USDC trustline: builds the changeTrust, signs it with whichever
 * wallet the user has (Normal-wallet passkey or external wallet), and submits
 * to Horizon for the active network.
 */
export async function addUSDCTrustline(publicKey: string) {
  const cfg = stellarCfg();

  // Short-circuit if already present.
  if (await hasUSDCTrustline(publicKey)) {
    return { alreadyTrusted: true, txResult: null };
  }

  const unsignedXDR = await buildUSDCTrustlineTxXDR(publicKey);
  const signedXDR = await signStellarTxForMgi(unsignedXDR, cfg.NETWORK_PASSPHRASE, publicKey);
  const txResult = await submitTransactionXDR(cfg.HORIZON_URL, signedXDR);

  return { alreadyTrusted: false, txResult };
}

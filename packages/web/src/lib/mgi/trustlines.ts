import * as Stellar from '@stellar/stellar-sdk';
// @ts-expect-error @ts-expect-error
import { signXDRWithConnectedWallet } from '@/lib/mgi/client';

const SDK: any = (Stellar as any).default ?? Stellar;
const {
  Asset,
  Account, // we'll construct an Account(publicKey, sequence)
  TransactionBuilder,
  Operation,
  BASE_FEE: BASE_FEE_CONST,
} = SDK;

// -----------------------
// Horizon (TESTNET)
// -----------------------
const HORIZON = 'https://horizon-testnet.stellar.org';
export const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';

// Fallback fee constant if SDK doesn’t expose BASE_FEE
const BASE_FEE: string = typeof BASE_FEE_CONST === 'string' ? BASE_FEE_CONST : '100';

// -----------------------
// USDC on TESTNET
// -----------------------
export const USDC_TESTNET_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
export const USDC = new Asset('USDC', USDC_TESTNET_ISSUER);

// -----------------------
// Horizon helpers (no Server)
// -----------------------
async function fetchAccountRaw(publicKey: string): Promise<any> {
  const r = await fetch(`${HORIZON}/accounts/${encodeURIComponent(publicKey)}`);
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(`Horizon loadAccount failed (${r.status}): ${body || r.statusText}`);
  }
  return r.json();
}

async function submitTransactionXDR(xdr: string): Promise<any> {
  const body = new URLSearchParams({ tx: xdr }).toString();
  const r = await fetch(`${HORIZON}/transactions`, {
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
  if (!r.ok) {
    // bubble up Horizon error JSON exactly for debugging
    throw new Error(typeof data === 'string' ? data : JSON.stringify(data));
  }
  return data;
}

// -----------------------
// Public helpers
// -----------------------

/** Returns true if the account already has a USDC trustline. */
export async function hasUSDCTrustline(publicKey: string): Promise<boolean> {
  const acct = await fetchAccountRaw(publicKey);
  const balances: any[] = acct?.balances ?? [];
  return balances.some((b) => b.asset_code === 'USDC' && b.asset_issuer === USDC_TESTNET_ISSUER);
}

/** Builds a changeTrust transaction XDR for adding the USDC trustline on TESTNET. */
export async function buildUSDCTrustlineTxXDR(publicKey: string): Promise<string> {
  const acct = await fetchAccountRaw(publicKey);
  const sequence = acct?.sequence;
  if (!sequence) throw new Error('Account sequence not found (is the account funded/created?)');

  // Build a minimal Account instance (no Server needed)
  const account = new Account(publicKey, sequence);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: TESTNET_PASSPHRASE,
  })
    .addOperation(
      Operation.changeTrust({
        asset: USDC, // USDC on TESTNET
        // limit: undefined -> default max
      })
    )
    .setTimeout(180)
    .build();

  return tx.toXDR();
}

/**
 * Signs the changeTrust XDR with the connected wallet (xBull/Freighter/Lobstr/Hana/WalletConnect)
 * and submits to Horizon testnet.
 */
export async function addUSDCTrustline(publicKey: string) {
  // Short-circuit if already present
  if (await hasUSDCTrustline(publicKey)) {
    return { alreadyTrusted: true, txResult: null };
  }

  // 1) Build XDR
  const unsignedXDR = await buildUSDCTrustlineTxXDR(publicKey);

  // 2) Ask active connector to sign (your abstraction handles xBull/Freighter/etc.)
  const signedXDR = await signXDRWithConnectedWallet(unsignedXDR, TESTNET_PASSPHRASE, publicKey);

  // 3) Submit to Horizon (no Server object)
  const txResult = await submitTransactionXDR(signedXDR);

  return { alreadyTrusted: false, txResult };
}

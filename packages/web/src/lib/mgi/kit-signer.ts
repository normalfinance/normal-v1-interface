'use client';

import { useStellarWalletKitStore } from '@normalfinance/state';

/**
 * Sign a SEP-10 challenge XDR via the Stellar Wallets Kit store.
 * Works outside React (uses Zustand's getState()).
 */
export async function signXDRWithWalletKit(
  xdr: string,
  networkPassphrase: string,
  account: string
): Promise<string> {
  const s = useStellarWalletKitStore.getState();

  if (!s?.isConnected || !s?.publicKey) {
    throw new Error('No wallet connected. Please connect a wallet first.');
  }

  // Optional sanity: if caller passed an account, ensure it matches the connected wallet
  if (account && s.publicKey && account !== s.publicKey) {
    // You can choose to only warn or to hard-error; hard-error is clearer for MGI auth.
    throw new Error(
      `Active wallet (${s.publicKey}) does not match requested account (${account}).`
    );
  }

  // The store already exposes a signer. Some implementations accept (xdr) only,
  // some accept (xdr, opts). Call in a way that supports both.
  const sign = s.signTransaction as unknown as (
    xdr: string,
    opts?: { networkPassphrase?: string; accountToSign?: string }
  ) => Promise<string | { xdr?: string; signedXDR?: string }>;

  const res = await sign(xdr, { networkPassphrase, accountToSign: account });

  // Normalize return shape to a string XDR
  if (typeof res === 'string') return res;
  if (res?.xdr) return res.xdr;
  if (res?.signedXDR) return res.signedXDR;

  throw new Error('Wallet signer returned no XDR.');
}

/** Convenience: get currently connected public key from the kit store. */
export function getActivePublicKey(): string | undefined {
  const s = useStellarWalletKitStore.getState();
  return s?.publicKey ?? undefined;
}

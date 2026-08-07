'use client';

import { SESSION_BASED_WALLET_TYPES } from '@/hooks/stellar/use-stellar-wallets-kit';
import {
  usePersistStore,
  useNormalWalletStore,
  useStellarWalletKitStore,
} from '@normalfinance/state';
import {
  isSessionError,
  WalletSessionExpiredError,
  showWalletReconnectSnackbar,
} from '@/hooks/stellar/use-wallet-reconnect';

/**
 * Sign a Stellar XDR for the MoneyGram flow (SEP-10 challenge or USDC
 * trustline), dispatching by wallet type so BOTH custodial Normal wallets and
 * external wallets work:
 *   1. Normal wallet, Turnkey-managed  → passkey signing
 *   2. Normal wallet, local key (unlocked in memory) → store signer
 *   3. External wallet (Freighter/Lobstr/xBull/…) → Stellar Wallets Kit
 */
export async function signStellarTxForMgi(
  xdr: string,
  networkPassphrase: string,
  account: string
): Promise<string> {
  // 1) Turnkey-managed Normal wallet — sign with the user's passkey.
  const { getTurnkeyWalletInfo } = await import('@/lib/turnkey/wallet-info');
  const tk = await getTurnkeyWalletInfo();
  if (tk?.subOrgId && tk.stellarAddress && tk.stellarAddress === account) {
    const { signStellarXdrWithTurnkey } = await import('@/lib/turnkey/stellar-signer');
    return signStellarXdrWithTurnkey(xdr, networkPassphrase, tk.subOrgId, tk.stellarAddress);
  }

  // 2) Local-key Normal wallet — only if the keypair is already unlocked.
  const nw = useNormalWalletStore.getState() as unknown as {
    keypair?: unknown;
    publicKey?: string;
    signTransaction?: (xdr: string, networkPassphrase?: string) => Promise<unknown>;
  };
  if (nw?.keypair && nw.publicKey === account && typeof nw.signTransaction === 'function') {
    const res = await nw.signTransaction(xdr, networkPassphrase);
    if (typeof res === 'string') return res;
    const r = res as { xdr?: string; signedXDR?: string };
    if (r?.xdr) return r.xdr;
    if (r?.signedXDR) return r.signedXDR;
    throw new Error('Normal wallet signer returned no XDR.');
  }

  // 3) External wallet kit.
  return signXDRWithWalletKit(xdr, networkPassphrase, account);
}

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
  // some accept (xdr, networkPassphrase). The connected wallet address is
  // already verified above, so only the passphrase needs to be forwarded.
  const sign = s.signTransaction as unknown as (
    xdr: string,
    networkPassphrase?: string
  ) => Promise<string | { xdr?: string; signedXDR?: string }>;

  let res: string | { xdr?: string; signedXDR?: string };
  try {
    res = await sign(xdr, networkPassphrase);
  } catch (err) {
    // Lobstr/WalletConnect sessions don't survive page reloads; signing then
    // fails with "connection key is missing". Surface the same reconnect UX
    // the savings flow uses instead of the kit's raw error.
    const walletType = usePersistStore.getState().wallet.walletType ?? '';
    if (SESSION_BASED_WALLET_TYPES.has(walletType) && isSessionError(err)) {
      showWalletReconnectSnackbar(() =>
        useStellarWalletKitStore.getState().connectWallet(usePersistStore.getState())
      );
      throw new WalletSessionExpiredError();
    }
    throw err;
  }

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

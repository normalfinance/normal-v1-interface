'use client';

import { logger } from '@/utils/logger';
import { WEBAUTHN_FRIENDLY_MESSAGE } from '@/lib/turnkey/webauthn-guard';

// ---------------------------------------------------------------------------
// Doc 129 Phase 1: one passkey prompt for the transactions of one action.
//
// A savings deposit, a withdrawal with a commission and a Soroswap swap are
// each TWO Stellar transactions (the action, then Normal's fee, chained by
// sequence number; lib/stellar/fee-pair.ts). Both are built before anything
// is signed, so a Turnkey-held key can sign both with ONE ceremony
// (ACTIVITY_TYPE_SIGN_RAW_PAYLOADS). Nothing else about the pair changes:
// the server still escrows the fee and records before it broadcasts.
//
// Anything that is not a Turnkey-held key signs one by one exactly as before
// (an external wallet signs one transaction per prompt; a local key needs no
// prompt). If Turnkey turns a batch down for any reason other than the
// person saying no, the same transactions are signed one by one instead.
//
// Kill switch: NEXT_PUBLIC_STELLAR_BATCH_SIGN=0 (build-time, like every
// NEXT_PUBLIC_ value) puts every flow back on one prompt per transaction.
// ---------------------------------------------------------------------------

export const STELLAR_BATCH_SIGNING = process.env.NEXT_PUBLIC_STELLAR_BATCH_SIGN !== '0';

/**
 * Pure: does `account` sign with one prompt per action? True only for the
 * Stellar address of the person's own Turnkey wallet, while batching is on.
 * The review page and the signer both ask this, so they show and do the same.
 */
export function batchesStellar(
  turnkeyStellarAddress: string | null | undefined,
  account: string | null | undefined,
  enabled: boolean = STELLAR_BATCH_SIGNING
): boolean {
  return enabled && !!account && !!turnkeyStellarAddress && turnkeyStellarAddress === account;
}

/** Doc 129 Phase 3 switch (build-time, like every NEXT_PUBLIC_ value), default off. */
export const STELLAR_PERMISSIONS = process.env.NEXT_PUBLIC_STELLAR_PERMISSIONS === '1';

/**
 * Pure: does a Circle transfer from `account` go out as pre-signed permissions
 * (one prompt; Normal's relayer sends Circle's permission and the transfer)?
 * The review pages and lib/cctp/burn-stellar.ts both ask this, so they show
 * and do the same.
 */
export function burnsWithPermissions(
  turnkeyStellarAddress: string | null | undefined,
  account: string | null | undefined,
  enabled: boolean = STELLAR_PERMISSIONS
): boolean {
  return enabled && batchesStellar(turnkeyStellarAddress, account);
}

/**
 * The person turned the passkey prompt down (or let it time out). That is
 * their answer: it is never retried another way.
 */
export function isPasskeyRefusal(error: unknown): boolean {
  const e = error as { name?: string; message?: string } | null;
  return e?.name === 'NotAllowedError' || e?.message === WEBAUTHN_FRIENDLY_MESSAGE;
}

export interface SignedInOrder {
  /** Signed XDRs, in the order they were given. */
  signed: string[];
  /** True when one passkey prompt covered all of them. */
  batched: boolean;
}

/**
 * Sign the transactions of one action for `account`, in order. A Turnkey-held
 * key signs all of them with one passkey prompt; otherwise `signOne` signs
 * each in turn (today's path, unchanged). `onPrompt(i)` fires right before
 * the prompt for transaction i appears: once, with 0, when one prompt covers
 * them all.
 */
export async function signStellarTxsInOrder(params: {
  xdrs: string[];
  networkPassphrase: string;
  account: string;
  signOne: (xdr: string) => Promise<string>;
  onPrompt?: (index: number) => void;
}): Promise<SignedInOrder> {
  const { xdrs, networkPassphrase, account, signOne, onPrompt } = params;

  // A local key already unlocked in memory signs with no prompt at all, and
  // takes precedence (as in use-normal-wallet's signTransaction).
  const { useNormalWalletStore } = await import('@normalfinance/state');
  const local = useNormalWalletStore.getState() as { keypair?: unknown; publicKey?: string };
  const unlockedLocally = !!local?.keypair && local.publicKey === account;

  if (xdrs.length > 1 && STELLAR_BATCH_SIGNING && !unlockedLocally) {
    const { getTurnkeyWalletInfo } = await import('@/lib/turnkey/wallet-info');
    // A failed lookup is not "no Turnkey wallet": it only means this action
    // signs one by one, as it always did.
    const tk = await getTurnkeyWalletInfo().catch(() => null);
    if (tk?.subOrgId && batchesStellar(tk.stellarAddress, account)) {
      onPrompt?.(0);
      try {
        const { signStellarXdrsWithTurnkey } = await import('@/lib/turnkey/stellar-signer');
        const signed = await signStellarXdrsWithTurnkey(
          xdrs,
          networkPassphrase,
          tk.subOrgId,
          account
        );
        return { signed, batched: true };
      } catch (error) {
        if (isPasskeyRefusal(error)) throw error;
        logger.warn('[batch-sign] one-prompt signing failed; signing one by one instead', error);
      }
    }
  }

  const signed: string[] = [];
  for (let i = 0; i < xdrs.length; i++) {
    onPrompt?.(i);
    signed.push(await signOne(xdrs[i]));
  }
  return { signed, batched: false };
}

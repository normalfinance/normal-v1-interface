'use client';

import type { v1WalletAccountParams } from '@turnkey/sdk-types';
import type { ChainId, ChainAddresses } from '@/lib/chains/registry';

import { buildAuthHeaders } from '@/utils/http';
import { pickAddresses, getChainAddress } from '@/lib/chains/registry';

import { createPasskeyRegistration } from './passkey';
import { markWalletNeedsBackup } from './wallet-backup';
import { getTurnkeyWalletInfo, invalidateTurnkeyWalletInfo } from './wallet-info';
import { XLM_ACCOUNT, SOLANA_ACCOUNT, BITCOIN_ACCOUNT, ETHEREUM_ACCOUNT } from './account-specs';

// ---------------------------------------------------------------------------
// Adds accounts for a new chain to the user's EXISTING Turnkey wallet.
// Accounts are provisioned lazily (pricing) — call this the first time the
// user acts on an asset whose address doesn't exist yet.
//
// The CREATE_WALLET_ACCOUNTS activity is stamped by the user's passkey
// (parent-org keys can't act on a sub-org), then our server re-reads the
// wallet's accounts from Turnkey and updates the DB row.
// ---------------------------------------------------------------------------

export async function addWalletAccounts(
  subOrgId: string,
  walletId: string,
  accounts: v1WalletAccountParams[],
  chain?: TurnkeyChain
): Promise<ChainAddresses> {
  const rpId =
    typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_TURNKEY_RP_ID ?? window.location.hostname)
      : 'localhost';

  const { WebauthnStamper } = await import('@turnkey/webauthn-stamper');
  const { TurnkeyClient } = await import('@turnkey/http');
  const client = new TurnkeyClient(
    { baseUrl: 'https://api.turnkey.com' },
    new WebauthnStamper({ rpId })
  );

  // Passkey prompt — derive the new account(s) on the existing seed
  const activity = await client.createWalletAccounts({
    type: 'ACTIVITY_TYPE_CREATE_WALLET_ACCOUNTS',
    timestampMs: String(Date.now()),
    organizationId: subOrgId,
    parameters: { walletId, accounts },
  });

  const created = activity?.activity?.result?.createWalletAccountsResult?.addresses;
  if (!created?.length) throw new Error('Turnkey did not create the account');

  // Server re-reads the wallet's accounts from Turnkey and syncs the DB
  const headers = await buildAuthHeaders();
  const res = await fetch('/api/turnkey/import', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletId, chain }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Failed to sync wallet (${res.status})`);
  }
  const data = await res.json();

  invalidateTurnkeyWalletInfo();

  // Every address field the registry knows about — a chain added there is
  // carried through here automatically.
  return pickAddresses(data.wallet);
}

/** Registry chain ids — kept as an alias so existing call sites read the same. */
export type TurnkeyChain = ChainId;

export const CHAIN_ACCOUNT_SPECS: Record<TurnkeyChain, v1WalletAccountParams[]> = {
  bitcoin: BITCOIN_ACCOUNT,
  stellar: XLM_ACCOUNT,
  ethereum: ETHEREUM_ACCOUNT,
  solana: SOLANA_ACCOUNT,
};

export type { ChainAddresses };

const chainAddress = getChainAddress;

/**
 * Makes sure the user has a Turnkey address for `chain`, creating the
 * minimum necessary (lazy provisioning):
 * - address already exists      → no-op
 * - wallet exists, chain missing → passkey-stamped CREATE_WALLET_ACCOUNTS
 * - sub-org exists, no wallet    → passkey-stamped CREATE_WALLET
 * - nothing yet                  → passkey registration + sub-org with a
 *                                  single-chain wallet
 */
export async function ensureChainAccount(
  chain: TurnkeyChain,
  supabaseUserId: string,
  userEmail?: string | null
): Promise<ChainAddresses> {
  const spec = CHAIN_ACCOUNT_SPECS[chain];
  const existing = await getTurnkeyWalletInfo();

  // Already provisioned
  if (existing) {
    const current = chainAddress(existing, chain);
    if (current) {
      return pickAddresses(existing);
    }
  }

  // Existing wallet missing this chain → derive on the same seed
  if (existing?.walletId) {
    return addWalletAccounts(existing.subOrgId, existing.walletId, spec, chain);
  }

  // Sub-org without a wallet (e.g. abandoned import) → create the wallet,
  // passkey-stamped, then sync addresses via the server
  if (existing) {
    const rpId =
      typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_TURNKEY_RP_ID ?? window.location.hostname)
        : 'localhost';
    const { WebauthnStamper } = await import('@turnkey/webauthn-stamper');
    const { TurnkeyClient } = await import('@turnkey/http');
    const client = new TurnkeyClient(
      { baseUrl: 'https://api.turnkey.com' },
      new WebauthnStamper({ rpId })
    );

    const activity = await client.createWallet({
      type: 'ACTIVITY_TYPE_CREATE_WALLET',
      timestampMs: String(Date.now()),
      organizationId: existing.subOrgId,
      parameters: { walletName: 'Normal Wallet', accounts: spec },
    });
    const walletId = activity?.activity?.result?.createWalletResult?.walletId;
    if (!walletId) throw new Error('Turnkey did not create the wallet');

    const headers = await buildAuthHeaders();
    const res = await fetch('/api/turnkey/import', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletId, chain }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? `Failed to sync wallet (${res.status})`);
    }
    const data = await res.json();
    invalidateTurnkeyWalletInfo();
    // A brand-new seed was just created → the user must back it up (doc 79).
    markWalletNeedsBackup(existing.subOrgId);
    return {
      ...pickAddresses(data.wallet),
    };
  }

  // Nothing yet → register a passkey and create the sub-org + wallet
  const { challenge, attestation } = await createPasskeyRegistration(supabaseUserId, userEmail);
  const headers = await buildAuthHeaders();
  const res = await fetch('/api/turnkey/wallet', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ challenge, attestation, chain }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Failed to create wallet (${res.status})`);
  }
  const data = await res.json();
  invalidateTurnkeyWalletInfo();
  // A brand-new seed was just created → the user MUST back it up (doc 79).
  // The route replies with ADDRESSES ONLY (pickAddresses drops subOrgId), so
  // this always fell through to a fire-and-forget lookup — which could fail
  // silently and never mark the backup for a brand-new user, the exact user
  // the feature exists for. Read it back and AWAIT it instead.
  try {
    const fresh = await getTurnkeyWalletInfo();
    if (fresh?.subOrgId) markWalletNeedsBackup(fresh.subOrgId);
  } catch {
    /* never block wallet creation; Settings still offers backup */
  }

  return {
    bitcoinAddress: data.wallet?.bitcoinAddress ?? null,
    ethereumAddress: data.wallet?.ethereumAddress ?? null,
    solanaAddress: data.wallet?.solanaAddress ?? null,
    stellarAddress: data.wallet?.stellarAddress ?? null,
  };
}

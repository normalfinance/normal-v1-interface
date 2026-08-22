'use client';

import { buildAuthHeaders } from '@/utils/http';
import { createPasskeyStamper } from '@/lib/turnkey/passkey-stamper';

import { createPasskeyRegistration } from './passkey';
import { invalidateTurnkeyWalletInfo } from './wallet-info';

// ---------------------------------------------------------------------------
// Imports a BIP-39 mnemonic into the user's Turnkey sub-org.
//
// Security model: the mnemonic is HPKE-encrypted in this browser to a
// Turnkey enclave key (after verifying the enclave's signature on the
// bundle), so neither our server nor Turnkey staff ever see the plaintext.
//
// The INIT_IMPORT_WALLET and IMPORT_WALLET activities are stamped by the
// user's passkey directly against their sub-org — parent-org API keys are
// rejected with ORGANIZATION_MISMATCH for these activity types. Expect two
// passkey prompts (three on first-time setup, for sub-org creation).
// ---------------------------------------------------------------------------

export type TurnkeyImportStage = 'passkey' | 'preparing' | 'authorize' | 'encrypting' | 'importing';

export interface TurnkeyImportParams {
  mnemonic: string;
  supabaseUserId: string;
  userEmail?: string | null;
  /** Locally-derived Stellar address — asserted against Turnkey's derivation. */
  expectedStellarAddress?: string;
  onStage?: (stage: TurnkeyImportStage) => void;
}

export interface TurnkeyImportResult {
  bitcoinAddress: string | null;
  ethereumAddress: string | null;
  stellarAddress: string | null;
  stellarMatch: boolean;
}

async function readError(res: Response, fallback: string): Promise<string> {
  const err = await res.json().catch(() => ({}));
  return err.error ?? `${fallback} (${res.status})`;
}

export async function importMnemonicIntoTurnkey(
  params: TurnkeyImportParams
): Promise<TurnkeyImportResult> {
  const headers = await buildAuthHeaders();
  const jsonHeaders = { ...headers, 'Content-Type': 'application/json' };

  // 1 — does the user already have a Turnkey sub-org?
  params.onStage?.('preparing');
  const check = await fetch('/api/turnkey/wallet', { headers });
  if (!check.ok) throw new Error(await readError(check, 'Failed to check wallet status'));
  const hasSubOrg = (await check.json()).wallet !== null;

  // 2 — passkey ceremony only when a sub-org must be created
  let initBody: Record<string, unknown> = {};
  if (!hasSubOrg) {
    params.onStage?.('passkey');
    const registration = await createPasskeyRegistration(params.supabaseUserId, params.userEmail);
    initBody = registration as unknown as Record<string, unknown>;
  }

  // 3 — ensure the sub-org exists; get IDs + the canonical accounts spec
  const initRes = await fetch('/api/turnkey/import-init', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(initBody),
  });
  if (!initRes.ok) throw new Error(await readError(initRes, 'Failed to start import'));
  const { subOrgId, userId, accounts } = await initRes.json();

  // 4 — passkey-stamped Turnkey client against the sub-org
  const { TurnkeyClient } = await import('@turnkey/http');
  const client = new TurnkeyClient(
    { baseUrl: 'https://api.turnkey.com' },
    await createPasskeyStamper()
  );

  // 5 — INIT_IMPORT_WALLET (passkey prompt) → enclave import bundle
  params.onStage?.('authorize');
  const initActivity = await client.initImportWallet({
    type: 'ACTIVITY_TYPE_INIT_IMPORT_WALLET',
    timestampMs: String(Date.now()),
    organizationId: subOrgId,
    parameters: { userId },
  });
  const importBundle = initActivity?.activity?.result?.initImportWalletResult?.importBundle;
  if (!importBundle) throw new Error('Turnkey did not return an import bundle');

  // 6 — encrypt the mnemonic to the enclave key, in this browser
  params.onStage?.('encrypting');
  const { encryptWalletToBundle } = await import('@turnkey/crypto');
  const encryptedBundle = await encryptWalletToBundle({
    mnemonic: params.mnemonic,
    importBundle,
    userId,
    organizationId: subOrgId,
  });

  // 7 — IMPORT_WALLET (passkey prompt) → wallet created from the mnemonic.
  // Wallet labels must be unique per sub-org (a "Normal Wallet" may already
  // exist from the create flow), so stamp the name with the import time.
  params.onStage?.('importing');
  const importedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const importActivity = await client.importWallet({
    type: 'ACTIVITY_TYPE_IMPORT_WALLET',
    timestampMs: String(Date.now()),
    organizationId: subOrgId,
    parameters: {
      userId,
      walletName: `Normal Wallet (imported ${importedAt})`,
      encryptedBundle,
      accounts,
    },
  });
  const walletId = importActivity?.activity?.result?.importWalletResult?.walletId;
  if (!walletId) throw new Error('Import did not complete — no wallet returned');

  // 8 — record on our server (it reads the addresses from Turnkey itself)
  const completeRes = await fetch('/api/turnkey/import', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      walletId,
      expectedStellarAddress: params.expectedStellarAddress,
    }),
  });
  if (!completeRes.ok) throw new Error(await readError(completeRes, 'Failed to record import'));
  const data = await completeRes.json();

  invalidateTurnkeyWalletInfo();

  return {
    bitcoinAddress: data.wallet?.bitcoinAddress ?? null,
    ethereumAddress: data.wallet?.ethereumAddress ?? null,
    stellarAddress: data.wallet?.stellarAddress ?? null,
    stellarMatch: data.stellarMatch ?? true,
  };
}

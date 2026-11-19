'use client';

import { xdr, Keypair, Networks, TransactionBuilder } from '@stellar/stellar-sdk';

// ---------------------------------------------------------------------------
// Doc 129 Phase 5c: run XLM → Savings or Savings → XLM from the page.
//
//   1. The server prices the action and builds everything to sign
//      (api/stellar/actions). Nothing moves.
//   2. ONE passkey prompt signs it all: the steps Normal will send (their
//      hashes) and the person's own first transaction.
//   3. The server checks every signature and that the first transaction is
//      exactly the one it built (or the withdrawal it was built around),
//      records, sends it, and runs the rest in order
//      (api/stellar/permissions/commit, then .../advance; the cron finishes
//      whatever this page does not live to see).
// ---------------------------------------------------------------------------

export type ActionKind =
  | 'xlm_to_savings'
  | 'savings_to_xlm'
  | 'bridge_to_xlm'
  | 'bridge_to_savings';

export interface CreatedAction {
  id: string;
  kind: ActionKind;
  plan: Record<string, string>;
  steps: { id: string; kind: string; payloadHash: string }[];
  ownTxs: string[];
}

export interface ActionState {
  done: boolean;
  failed: string | null;
  steps: { kind: string; status: string; txHash: string | null }[];
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const { buildAuthHeaders } = await import('@/utils/http');
  const res = await fetch(path, {
    method: 'POST',
    headers: { ...(await buildAuthHeaders()), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !data) {
    throw new Error(data?.error ?? 'Normal could not reach Stellar just now. Nothing was sent.');
  }
  return data;
}

/** The server prices it and builds what to sign. Nothing moves. */
export function createAction(body: Record<string, unknown>): Promise<CreatedAction> {
  return post<CreatedAction>('/api/stellar/actions', body);
}

/**
 * Doc 129 Phase 6: sign an action's steps now (one passkey prompt) and hand
 * them to the server; they run once its Circle transfer lands on Stellar.
 */
export async function signAndCommitAction(p: {
  network: 'mainnet' | 'testnet';
  account: string;
  created: CreatedAction;
  onSigning?: () => void;
}): Promise<ActionState> {
  const { getTurnkeyWalletInfo } = await import('@/lib/turnkey/wallet-info');
  const tk = await getTurnkeyWalletInfo().catch(() => null);
  if (!tk?.subOrgId || tk.stellarAddress !== p.account) {
    throw new Error('This needs your Normal wallet with its passkey. Nothing was sent.');
  }
  p.onSigning?.();
  const { signStellarHashesWithTurnkey } = await import('@/lib/turnkey/stellar-signer');
  const signatures = await signStellarHashesWithTurnkey(
    p.created.steps.map((s) => Buffer.from(s.payloadHash, 'hex')),
    tk.subOrgId,
    p.account
  );
  return post<ActionState>('/api/stellar/permissions/commit', {
    actionId: p.created.id,
    signatures: p.created.steps.map((s, i) => ({
      id: s.id,
      signature: signatures[i].toString('hex'),
    })),
  });
}

/** Follow an action until it lands or stops (the cron finishes what a page does not see). */
export async function followAction(
  actionId: string,
  onState?: (state: ActionState) => void,
  polls = 60
): Promise<ActionState> {
  let state = await post<ActionState>('/api/stellar/permissions/advance', { actionId });
  onState?.(state);
  for (let i = 0; i < polls && !state.done && !state.failed; i++) {
    await new Promise((r) => {
      setTimeout(r, 3_000);
    });
    state = await post<ActionState>('/api/stellar/permissions/advance', { actionId });
    onState?.(state);
  }
  return state;
}

/**
 * Sign with one passkey prompt, hand it to the server, and follow it until it
 * lands or stops. `firstXdr` is the person's own first transaction, unsigned.
 */
export async function signAndRunAction(p: {
  network: 'mainnet' | 'testnet';
  account: string;
  created: CreatedAction;
  firstXdr: string;
  onSigning?: () => void;
  onCommitted?: (firstHash: string, state: ActionState) => void;
  onState?: (state: ActionState) => void;
}): Promise<ActionState> {
  const { getTurnkeyWalletInfo } = await import('@/lib/turnkey/wallet-info');
  const tk = await getTurnkeyWalletInfo().catch(() => null);
  if (!tk?.subOrgId || tk.stellarAddress !== p.account) {
    throw new Error('This needs your Normal wallet with its passkey. Nothing was sent.');
  }
  const passphrase = p.network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
  const first = TransactionBuilder.fromXDR(p.firstXdr, passphrase);

  p.onSigning?.();
  const { signStellarHashesWithTurnkey } = await import('@/lib/turnkey/stellar-signer');
  const signatures = await signStellarHashesWithTurnkey(
    [...p.created.steps.map((s) => Buffer.from(s.payloadHash, 'hex')), first.hash()],
    tk.subOrgId,
    p.account
  );
  first.signatures.push(
    new xdr.DecoratedSignature({
      hint: Keypair.fromPublicKey(p.account).signatureHint(),
      signature: signatures[p.created.steps.length],
    })
  );

  let state = await post<ActionState>('/api/stellar/permissions/commit', {
    actionId: p.created.id,
    signatures: p.created.steps.map((s, i) => ({
      id: s.id,
      signature: signatures[i].toString('hex'),
    })),
    firstTxs: [first.toXDR()],
  });
  p.onCommitted?.(first.hash().toString('hex'), state);
  for (let i = 0; i < 60 && !state.done && !state.failed; i++) {
    await new Promise((r) => {
      setTimeout(r, 3_000);
    });
    state = await post<ActionState>('/api/stellar/permissions/advance', {
      actionId: p.created.id,
    });
    p.onState?.(state);
  }
  return state;
}

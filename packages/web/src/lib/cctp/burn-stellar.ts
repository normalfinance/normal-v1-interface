'use client';

// Outbound burn on Stellar: approve + deposit_for_burn on Circle's
// TokenMessengerMinterV2 (Soroban). Two user signatures — same "1 of 2 /
// 2 of 2" pattern as the savings deposit. Validated end-to-end by the Phase-0
// spike (scripts/cctp-spike/outbound.mjs): total leg ≈ 10s on-chain + ~7s
// attestation.
//
// The caller persists the CctpTransfer row (POST /api/cctp/transfers) BEFORE
// invoking this, and PATCHes the returned burnTxHash immediately after — the
// crash-safety rule that makes every burn recoverable.

import { signStellarTxForMgi } from '@/lib/mgi/kit-signer';
import { BroadcastUncertainError } from '@/lib/chains/broadcast-safety';
import { batchesStellar, signStellarTxsInOrder } from '@/lib/stellar/batch-sign';
import { type NetworkType, getStellarConfigForNetwork } from '@normalfinance/utils';
import {
  rpc,
  xdr,
  Asset,
  Keypair,
  Contract,
  Networks,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

import { STELLAR_CCTP } from './config';
import { wireToStellar7 } from './decimals';
import { type StellarLeg, submitStellarLeg } from './stellar-submit';
import { approveArgs, readSacAllowance, depositForBurnArgs } from './stellar-burn-calls';

// Persist the burn approval so repeat swaps skip its extra signature: approve a
// large amount with a long (but finite) expiry, and skip re-approving while the
// on-chain allowance still covers this burn. The allowance is only a ceiling —
// transfer_from can never pull more than the user's actual USDC balance — so a
// large value adds no custody risk.
const APPROVE_AMOUNT_7 = 10_000_000_000_000_000n; // 1e16 in 7-dp SAC units (~$1B ceiling)
const APPROVE_EXPIRY_LEDGERS = 500_000; // ≈ 1 month; well under mainnet max_entry_ttl

export interface StellarBurnParams {
  network: NetworkType;
  /** User's Stellar account (burn source; signs both txs). */
  stellarAddress: string;
  /** Amount in canonical 6-dp wire units. */
  amountWire: bigint;
  /** CCTP domain of the destination chain (e.g. base=6). */
  destinationDomain: number;
  /** 32-byte mint recipient on the destination (evmAddressToBytes for EVM). */
  mintRecipient: Uint8Array;
  /** Progress callback: 'approve' before signature 1, 'burn' before signature 2. */
  onStep?: (step: 'approve' | 'burn') => void;
  /** Doc 93 0a: fires right before EACH signature prompt appears — the
   *  caller flips its step to "approve in your wallet" exactly then, never
   *  during the silent prepare/simulate window. */
  onSigning?: () => void;
  /** Fires once a signed transaction is on the network, before its result is
   *  known: the money is moving from that moment (the review page's step). */
  onSubmitted?: (step: 'approve' | 'burn', hash: string) => void;
  /**
   * Doc 129 Phase 3: the CctpTransfer row this burn belongs to. With it, a
   * Turnkey wallet signs the approve (when needed) and the burn as pre-signed
   * permissions in ONE passkey prompt, and Normal's relayer sends them, while
   * NEXT_PUBLIC_STELLAR_PERMISSIONS is on. Without it, or for any other
   * wallet, the burn runs exactly as before.
   */
  transferId?: string;
  /**
   * Doc 129: more of the person's own Stellar transactions that go with this
   * burn (Core 4's XLM swap and its fee). On the permission path they are
   * signed in the SAME prompt and sent once the burn has landed; otherwise
   * they are built after the burn (so their sequence numbers follow it) and
   * signed together in one more prompt. `submit` reports its own failures:
   * the burn is out either way.
   */
  alongside?: {
    build: () => Promise<string[]>;
    submit: (signed: string[]) => Promise<void>;
  };
}

/** Doc 129 Phase 3 switch, default off. */
const STELLAR_PERMISSIONS = process.env.NEXT_PUBLIC_STELLAR_PERMISSIONS === '1';

interface PermissionState {
  ok?: boolean;
  error?: string;
  approveTxHash?: string | null;
  burnTxHash?: string | null;
  pendingBurnTxHash?: string | null;
  failed?: string | null;
}

/**
 * The permission path: the server builds the permissions from the transfer
 * row and the wallet row; the person signs their hashes with ONE passkey
 * prompt; the server checks the signatures and its relayer sends the steps in
 * order. Returns once the burn has landed.
 */
async function burnWithPermissions(
  params: StellarBurnParams & { transferId: string; subOrgId: string }
): Promise<{ approveTxHash: string; burnTxHash: string }> {
  const { buildAuthHeaders } = await import('@/utils/http');
  const headers = { ...(await buildAuthHeaders()), 'Content-Type': 'application/json' };
  const post = async (path: string, body: unknown): Promise<PermissionState> => {
    const res = await fetch(path, { method: 'POST', headers, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => null)) as PermissionState | null;
    if (!res.ok || !data?.ok) throw new Error(data?.error ?? 'The transfer could not be prepared.');
    return data;
  };

  const prepared = (await post('/api/stellar/permissions/prepare', {
    transferId: params.transferId,
  })) as PermissionState & { steps: { id: string; kind: string; payloadHash: string }[] };

  // The person's own transactions that go with it (doc 129: Core 4's XLM).
  const passphrase = params.network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
  const extras = params.alongside
    ? (await params.alongside.build()).map((x) => TransactionBuilder.fromXDR(x, passphrase))
    : [];

  // One prompt covers the approve (when there is one), the burn and the extras.
  params.onStep?.('burn');
  params.onSigning?.();
  const { signStellarHashesWithTurnkey } = await import('@/lib/turnkey/stellar-signer');
  const all = await signStellarHashesWithTurnkey(
    [
      ...prepared.steps.map((st) => Buffer.from(st.payloadHash, 'hex')),
      ...extras.map((tx) => tx.hash()),
    ],
    params.subOrgId,
    params.stellarAddress
  );
  const signatures = all.slice(0, prepared.steps.length);
  const hint = Keypair.fromPublicKey(params.stellarAddress).signatureHint();
  const signedExtras = extras.map((tx, i) => {
    tx.signatures.push(
      new xdr.DecoratedSignature({ hint, signature: all[prepared.steps.length + i] })
    );
    return tx.toXDR();
  });

  let state = await post('/api/stellar/permissions/commit', {
    transferId: params.transferId,
    signatures: prepared.steps.map((st, i) => ({
      id: st.id,
      signature: signatures[i].toString('hex'),
    })),
  });
  // The relayer sends the approve, then the burn; follow it until the burn lands.
  for (let i = 0; i < 40 && !state.burnTxHash && !state.failed; i++) {
    await new Promise((r) => setTimeout(r, 3_000));
    state = await post('/api/stellar/permissions/advance', { transferId: params.transferId });
  }
  if (state.failed) throw new Error(state.failed);
  if (!state.burnTxHash) {
    // A burn that went out and has not been confirmed: keep its hash, offer no
    // second send (the cron finishes it, the row follows it).
    if (state.pendingBurnTxHash) {
      throw new BroadcastUncertainError('stellar', state.pendingBurnTxHash, 'burn');
    }
    throw new Error(
      'Your transfer is taking longer than usual. It finishes on its own: check Activity before you try again.'
    );
  }
  params.onSubmitted?.('burn', state.burnTxHash);
  // The burn landed: now the extras, from the same signature.
  if (params.alongside && signedExtras.length) await params.alongside.submit(signedExtras);
  return { approveTxHash: state.approveTxHash ?? 'skipped', burnTxHash: state.burnTxHash };
}

// Send and follow one signed leg (lib/cctp/stellar-submit.ts holds the rules).
// The id is the signed envelope's own hash, known before it is sent. A burn
// whose fate stays unclear ends as BroadcastUncertainError('stellar', hash):
// the caller keeps that hash on the row and offers no second send.
async function submitSigned(
  server: rpc.Server,
  signedXdr: string,
  passphrase: string,
  label: string,
  leg: StellarLeg,
  onSubmitted?: (hash: string) => void
) {
  const tx = TransactionBuilder.fromXDR(signedXdr, passphrase);
  const hash = tx.hash().toString('hex');
  return submitStellarLeg({
    hash,
    leg,
    label,
    onSubmitted,
    node: {
      send: async () => {
        const sent = await server.sendTransaction(tx);
        return {
          status: sent.status,
          detail: sent.status === 'ERROR' ? JSON.stringify(sent.errorResult ?? sent) : undefined,
        };
      },
      status: async () => (await server.getTransaction(hash)).status,
    },
  });
}

async function invokeAsUser(params: {
  onSigning?: () => void;
  onSubmitted?: (hash: string) => void;
  server: rpc.Server;
  passphrase: string;
  source: string;
  contractId: string;
  method: string;
  args: xdr.ScVal[];
  label: string;
  leg: StellarLeg;
}) {
  const account = await params.server.getAccount(params.source);
  const contract = new Contract(params.contractId);
  let tx = new TransactionBuilder(account, {
    fee: '10000000',
    networkPassphrase: params.passphrase,
  })
    .addOperation(contract.call(params.method, ...params.args))
    .setTimeout(120)
    .build();
  // Simulation surfaces arg/balance errors BEFORE asking for a passkey prompt.
  tx = await params.server.prepareTransaction(tx);
  // Universal signer: Turnkey passkey / local Normal wallet / external kit.
  // The prompt appears NOW — everything above (getAccount, simulation) was
  // the silent prepare window (doc 93 0a).
  params.onSigning?.();
  const signed = await signStellarTxForMgi(tx.toXDR(), params.passphrase, params.source);
  return submitSigned(
    params.server,
    signed,
    params.passphrase,
    params.label,
    params.leg,
    params.onSubmitted
  );
}

/** Runs approve + deposit_for_burn. Returns both tx hashes. */
export async function burnUsdcOnStellar(params: StellarBurnParams): Promise<{
  approveTxHash: string;
  burnTxHash: string;
}> {
  // Custody invariant: the destination recipient (32-byte EVM address) is fixed
  // HERE, inside the user-signed burn. The relayer only replays this signed
  // message on the destination chain — it can never redirect the funds. Refuse
  // to burn to a zero/invalid recipient (an unrecoverable burn to nowhere).
  if (params.mintRecipient.length !== 32 || params.mintRecipient.every((b) => b === 0)) {
    throw new Error('refusing to burn: invalid mint recipient');
  }

  // Doc 129 Phase 3: one prompt for a Turnkey wallet, when switched on.
  if (STELLAR_PERMISSIONS && params.transferId) {
    const { getTurnkeyWalletInfo } = await import('@/lib/turnkey/wallet-info');
    const tk = await getTurnkeyWalletInfo().catch(() => null);
    if (tk?.subOrgId && batchesStellar(tk.stellarAddress, params.stellarAddress)) {
      return burnWithPermissions({
        ...params,
        transferId: params.transferId,
        subOrgId: tk.subOrgId,
      });
    }
  }

  const cfg = STELLAR_CCTP[params.network];
  const stellarCfg = getStellarConfigForNetwork(params.network);
  const passphrase = params.network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
  const server = new rpc.Server(stellarCfg.RPC_URL, {
    allowHttp: stellarCfg.RPC_URL.startsWith('http://'),
  });

  const usdcSac = new Asset('USDC', cfg.usdcIssuer).contractId(passphrase);
  const amount7 = wireToStellar7(params.amountWire); // SAC amounts are 7-dp

  // 1) approve — TokenMessengerMinter pulls the USDC via transfer_from. Skip the
  // signature when a prior large, still-valid allowance already covers this burn
  // (transfer_from decrements it, so one approval lasts many swaps).
  let approveTxHash = 'skipped';
  const currentAllowance = await readSacAllowance(
    server,
    usdcSac,
    params.stellarAddress,
    cfg.tokenMessengerMinter,
    passphrase
  );
  if (currentAllowance < amount7) {
    params.onStep?.('approve');
    const { sequence } = await server.getLatestLedger();
    approveTxHash = await invokeAsUser({
      server,
      passphrase,
      source: params.stellarAddress,
      contractId: usdcSac,
      method: 'approve',
      args: approveArgs(
        params.stellarAddress,
        cfg.tokenMessengerMinter,
        APPROVE_AMOUNT_7,
        sequence + APPROVE_EXPIRY_LEDGERS
      ),
      onSigning: params.onSigning,
      onSubmitted: (hash) => params.onSubmitted?.('approve', hash),
      label: 'approve',
      leg: 'approve',
    });
  }

  // 2) deposit_for_burn — destinationCaller = 0 (open execution, no lock-in).
  params.onStep?.('burn');
  const burnTxHash = await invokeAsUser({
    server,
    passphrase,
    source: params.stellarAddress,
    contractId: cfg.tokenMessengerMinter,
    method: 'deposit_for_burn',
    args: depositForBurnArgs({
      caller: params.stellarAddress,
      amount7,
      destinationDomain: params.destinationDomain,
      mintRecipient: params.mintRecipient,
      usdcSac,
    }),
    onSigning: params.onSigning,
    onSubmitted: (hash) => params.onSubmitted?.('burn', hash),
    label: 'deposit_for_burn',
    leg: 'burn',
  });

  // Doc 129: the extras, built now so their sequence numbers follow the burn.
  if (params.alongside) {
    const xdrs = await params.alongside.build();
    params.onSigning?.();
    const { signed } = await signStellarTxsInOrder({
      xdrs,
      networkPassphrase: passphrase,
      account: params.stellarAddress,
      signOne: (x) => signStellarTxForMgi(x, passphrase, params.stellarAddress),
    });
    await params.alongside.submit(signed);
  }

  return { approveTxHash, burnTxHash };
}

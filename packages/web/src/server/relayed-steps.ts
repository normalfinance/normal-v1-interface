import type { RelayedStep, CctpTransfer } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { wireToStellar7 } from '@/lib/cctp/decimals';
import { evmAddressToBytes } from '@/lib/cctp/addresses';
import { CCTP_DOMAIN, STELLAR_CCTP } from '@/lib/cctp/config';
import { type NetworkType, getStellarConfigForNetwork } from '@normalfinance/utils';
import { approveArgs, readSacAllowance, depositForBurnArgs } from '@/lib/cctp/stellar-burn-calls';
import {
  contractCall,
  permittedCall,
  permissionHash,
  buildPermission,
  attachPermissionSignature,
} from '@/lib/stellar/permissions';
import {
  rpc,
  xdr,
  Asset,
  Keypair,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
  type FeeBumpTransaction,
} from '@stellar/stellar-sdk';

// ---------------------------------------------------------------------------
// Doc 129 Phase 3: the Circle burn as pre-signed permissions.
//
// Today a person's first Circle transfer asks twice (approve, then burn), and
// the burn cannot be signed with the approve because it cannot be simulated
// until the approve has landed. Here the person signs both as PERMISSIONS
// (lib/stellar/permissions.ts) in one passkey ceremony, and Normal's Stellar
// relayer (CCTP_RELAYER_STELLAR_SECRET, the account that already submits the
// inbound mints) wraps each in its own transaction, in order, paying the fee.
//
// Safety, in the order it happens:
// - The server builds every permission from the transfer row and the wallet
//   row: the Stellar account and the Base address Circle mints to are the
//   person's own, read from their wallet, never from the request.
// - The person signs only the hashes; each signature is checked against
//   their own key before a step is stored as signed (READY).
// - A step is claimed by compare-and-set before it is sent, its transaction
//   hash is recorded BEFORE it is broadcast, and the relayed transaction must
//   carry the signed permission unchanged.
// - The transfer gets its burn hash only once the burn has LANDED, so a burn
//   that never reached the network can be sent again (same permission, new
//   transaction) without stranding a hash on the transfer.
// - A permission works once (random nonce) and only until its ledger; past
//   it a step is EXPIRED and nothing moved.
// ---------------------------------------------------------------------------

/** Build-time switch, default off (doc 129 §4.2). Read on both sides. */
export const PERMISSIONS_ENABLED = process.env.NEXT_PUBLIC_STELLAR_PERMISSIONS === '1';

const OUTBOUND = new Set(['stellar_to_crosschain', 'stellar_to_index']);

/** Time to sign and relay: about 10 minutes. */
export const SIGNATURE_WINDOW_LEDGERS = 120;
/** A relayed approve's allowance: about 20 minutes, enough for its own burn. */
export const ALLOWANCE_WINDOW_LEDGERS = 240;
/** A relayed transaction's own time limit. Past it (plus a margin) NOT_FOUND = never landed. */
const TX_TIMEOUT_SECONDS = 120;
const NEVER_LANDED_AFTER_MS = (TX_TIMEOUT_SECONDS + 60) * 1000;
/** A claim older than this crashed before anything was broadcast. */
const STALE_CLAIM_MS = 5 * 60_000;
const MAX_ATTEMPTS = 3;

export type StepKind = 'approve' | 'burn';

export interface Refusal {
  ok: false;
  status: number;
  error: string;
}

export interface PreparedStep {
  id: string;
  kind: StepKind;
  /** What the person signs (hex, 32 bytes). */
  payloadHash: string;
}

export interface RelayState {
  ok: true;
  /** Every step landed. */
  done: boolean;
  approveTxHash: string | null;
  burnTxHash: string | null;
  /** Why it stopped, when a step failed or expired (nothing more will be sent). */
  failed: string | null;
  /** A burn sent and not yet confirmed: its hash, so nobody sends a second one. */
  pendingBurnTxHash: string | null;
}

const passphraseOf = (network: NetworkType) =>
  network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

function serverFor(network: NetworkType) {
  const cfg = getStellarConfigForNetwork(network);
  return new rpc.Server(cfg.RPC_URL, { allowHttp: cfg.RPC_URL.startsWith('http://') });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- pure rules (tested) ----------------------------------------------------

/**
 * May this transfer's burn be prepared as permissions? Only an outbound
 * Circle transfer from Stellar to Base that has not been sent, from the
 * person's own Turnkey Stellar account to their own EVM address.
 */
export function permissionBurnRefusal(
  transfer: Pick<
    CctpTransfer,
    | 'userId'
    | 'direction'
    | 'sourceDomain'
    | 'destDomain'
    | 'status'
    | 'burnTxHash'
    | 'srcAddress'
    | 'destAddress'
  > | null,
  userId: string,
  wallet: { stellarAddress: string | null; ethereumAddress: string | null } | null
): Refusal | null {
  if (!transfer || transfer.userId !== userId)
    return { ok: false, status: 404, error: 'Not found' };
  if (
    !OUTBOUND.has(transfer.direction) ||
    transfer.sourceDomain !== CCTP_DOMAIN.stellar ||
    transfer.destDomain !== CCTP_DOMAIN.base
  ) {
    return { ok: false, status: 400, error: 'This transfer does not start on Stellar' };
  }
  if (transfer.burnTxHash || transfer.status !== 'CREATED') {
    return { ok: false, status: 409, error: 'This transfer has already been sent' };
  }
  if (!wallet?.stellarAddress || wallet.stellarAddress !== transfer.srcAddress) {
    return { ok: false, status: 403, error: 'This transfer is not from your own Stellar wallet' };
  }
  if (
    !wallet.ethereumAddress ||
    wallet.ethereumAddress.toLowerCase() !== transfer.destAddress.toLowerCase()
  ) {
    return { ok: false, status: 403, error: 'This transfer does not go to your own address' };
  }
  return null;
}

/**
 * Doc 129 Phase 5: the person's own Stellar transaction that must land before
 * the Circle steps (XLM → USDC on Soroswap, for an XLM → BTC/ETH/SOL swap).
 * Relayed as signed, never altered: it must come from the transfer's own
 * wallet and carry that wallet's signature, be one Soroban call, and belong to
 * a transfer whose source is XLM. Pure.
 */
export function firstTxRefusal(
  tx: Transaction | FeeBumpTransaction,
  transfer: Pick<CctpTransfer, 'srcAddress' | 'srcAsset' | 'srcSwapTxHash'>
): Refusal | null {
  if (!(tx instanceof Transaction)) {
    return { ok: false, status: 400, error: 'The swap must be a plain transaction' };
  }
  if (transfer.srcAsset !== 'XLM') {
    return { ok: false, status: 400, error: 'Only a swap from XLM goes before the transfer' };
  }
  if (tx.source !== transfer.srcAddress) {
    return { ok: false, status: 403, error: 'The swap must come from the transfer’s own wallet' };
  }
  if (tx.operations.length !== 1 || tx.operations[0].type !== 'invokeHostFunction') {
    return { ok: false, status: 400, error: 'The swap must be one Soroban call' };
  }
  const hash = tx.hash();
  const key = Keypair.fromPublicKey(tx.source);
  const signed = tx.signatures.some(
    (d) => d.hint().equals(key.signatureHint()) && key.verify(hash, d.signature())
  );
  if (!signed) return { ok: false, status: 400, error: 'The swap is not signed by its wallet' };
  if (transfer.srcSwapTxHash && transfer.srcSwapTxHash !== hash.toString('hex')) {
    return { ok: false, status: 409, error: 'This transfer already has its swap' };
  }
  return null;
}

/** Where a transfer's steps stand, for the page and the client. */
export function relayStateOf(
  steps: Pick<RelayedStep, 'kind' | 'status' | 'txHash' | 'errorDetail'>[]
): RelayState {
  const approve = steps.find((s) => s.kind === 'approve');
  const burn = steps.find((s) => s.kind === 'burn');
  const stopped = steps.find((s) => s.status === 'FAILED' || s.status === 'EXPIRED');
  return {
    ok: true,
    done: steps.length > 0 && steps.every((s) => s.status === 'DONE'),
    approveTxHash: approve?.status === 'DONE' ? approve.txHash : null,
    burnTxHash: burn?.status === 'DONE' ? burn.txHash : null,
    failed: stopped
      ? (stopped.errorDetail ??
        'The transfer did not go out, so your USDC is still in your wallet.')
      : null,
    pendingBurnTxHash: burn?.status === 'SUBMITTED' ? burn.txHash : null,
  };
}

// ---- prepare ----------------------------------------------------------------

export async function preparePermissionBurn(
  userId: string,
  transferId: string
): Promise<{ ok: true; steps: PreparedStep[] } | Refusal> {
  const transfer = await prisma.cctpTransfer.findUnique({ where: { id: transferId } });
  const wallet = await prisma.turnkeyWallet.findFirst({
    where: { supabaseUid: userId },
    select: { stellarAddress: true, ethereumAddress: true },
  });
  const refusal = permissionBurnRefusal(transfer, userId, wallet);
  if (refusal) return refusal;

  const existing = await prisma.relayedStep.findMany({ where: { transferId } });
  if (existing.some((s) => s.status !== 'AWAITING_SIGNATURE')) {
    return { ok: false, status: 409, error: 'This transfer has already been signed' };
  }

  const network = transfer!.network as NetworkType;
  const passphrase = passphraseOf(network);
  const cfg = STELLAR_CCTP[network];
  const server = serverFor(network);
  const account = wallet!.stellarAddress!;
  const usdcSac = new Asset('USDC', cfg.usdcIssuer).contractId(passphrase);
  const amount7 = wireToStellar7(BigInt(transfer!.amountWire));
  const { sequence } = await server.getLatestLedger();

  // An approve only when the standing allowance does not cover this burn, and
  // then for exactly this amount, for about 20 minutes: no month-long
  // allowances from this path.
  const allowance = await readSacAllowance(
    server,
    usdcSac,
    account,
    cfg.tokenMessengerMinter,
    passphrase
  );
  const calls: { kind: StepKind; call: xdr.InvokeContractArgs }[] = [];
  if (allowance < amount7) {
    calls.push({
      kind: 'approve',
      call: contractCall(
        usdcSac,
        'approve',
        approveArgs(account, cfg.tokenMessengerMinter, amount7, sequence + ALLOWANCE_WINDOW_LEDGERS)
      ),
    });
  }
  calls.push({
    kind: 'burn',
    call: contractCall(
      cfg.tokenMessengerMinter,
      'deposit_for_burn',
      depositForBurnArgs({
        caller: account,
        amount7,
        destinationDomain: CCTP_DOMAIN.base,
        mintRecipient: evmAddressToBytes(wallet!.ethereumAddress!),
        usdcSac,
      })
    ),
  });

  const expiresLedger = sequence + SIGNATURE_WINDOW_LEDGERS;
  const rows = calls.map(({ kind, call }, order) => {
    const entry = buildPermission(account, call, expiresLedger);
    return {
      userId,
      network,
      transferId,
      order,
      kind,
      account,
      entryXdr: entry.toXDR('base64'),
      payloadHash: permissionHash(entry, passphrase).toString('hex'),
      expiresLedger,
    };
  });

  // Opening the review again gets fresh permissions: unsigned ones are replaced.
  const created = await prisma.$transaction(async (tx) => {
    await tx.relayedStep.deleteMany({ where: { transferId, status: 'AWAITING_SIGNATURE' } });
    const out: RelayedStep[] = [];
    for (const data of rows) out.push(await tx.relayedStep.create({ data }));
    return out;
  });
  return {
    ok: true,
    steps: created.map((s) => ({ id: s.id, kind: s.kind as StepKind, payloadHash: s.payloadHash })),
  };
}

// ---- commit -----------------------------------------------------------------

export async function commitPermissionSignatures(
  userId: string,
  transferId: string,
  signatures: unknown,
  firstTxXdr?: unknown
): Promise<RelayState | Refusal> {
  const steps = await prisma.relayedStep.findMany({
    where: { transferId, userId },
    orderBy: { order: 'asc' },
  });
  if (!steps.length) return { ok: false, status: 404, error: 'Nothing to sign for this transfer' };
  const given = Array.isArray(signatures) ? signatures : [];

  // Doc 129 Phase 5: the person's own swap that goes first, checked before
  // anything is stored or sent.
  let firstTx: Transaction | null = null;
  if (firstTxXdr != null) {
    const transfer = await prisma.cctpTransfer.findUnique({ where: { id: transferId } });
    if (!transfer || transfer.userId !== userId) {
      return { ok: false, status: 404, error: 'Not found' };
    }
    let parsed: Transaction | FeeBumpTransaction;
    try {
      parsed = TransactionBuilder.fromXDR(
        String(firstTxXdr),
        passphraseOf(transfer.network as NetworkType)
      );
    } catch {
      return { ok: false, status: 400, error: 'The swap could not be read' };
    }
    const refusal = firstTxRefusal(parsed, transfer);
    if (refusal) return refusal;
    firstTx = parsed as Transaction;
  }

  // Check EVERY signature before marking any step signed: half a signed set
  // must never be relayed.
  const signed: { id: string; signedXdr: string }[] = [];
  for (const step of steps.filter((s) => s.status === 'AWAITING_SIGNATURE')) {
    const sig = (
      given.find((g) => (g as { id?: unknown })?.id === step.id) as { signature?: unknown }
    )?.signature;
    if (typeof sig !== 'string' || !/^[0-9a-fA-F]{128}$/.test(sig)) {
      return { ok: false, status: 400, error: 'Every step needs its signature' };
    }
    try {
      const entry = attachPermissionSignature(
        xdr.SorobanAuthorizationEntry.fromXDR(step.entryXdr, 'base64'),
        step.account,
        passphraseOf(step.network as NetworkType),
        Buffer.from(sig, 'hex')
      );
      signed.push({ id: step.id, signedXdr: entry.toXDR('base64') });
    } catch {
      return { ok: false, status: 400, error: 'A signature does not match this transfer' };
    }
  }
  // The first transaction's hash goes on the transfer BEFORE it is broadcast,
  // so the relay gate (and Activity) can follow it whatever happens next.
  if (firstTx) {
    await prisma.cctpTransfer.updateMany({
      where: { id: transferId, srcSwapTxHash: null },
      data: { srcSwapTxHash: firstTx.hash().toString('hex') },
    });
  }
  for (const s of signed) {
    await prisma.relayedStep.updateMany({
      where: { id: s.id, status: 'AWAITING_SIGNATURE' },
      data: { signedXdr: s.signedXdr, status: 'READY' },
    });
  }
  if (firstTx) {
    const server = serverFor(steps[0].network as NetworkType);
    try {
      const sent = await server.sendTransaction(firstTx);
      if (sent.status === 'ERROR') {
        await failOpenSteps(
          transferId,
          'The swap from XLM was refused, so nothing moved: your XLM is still in your wallet.'
        );
        return relayStateOf(await stepsOf(transferId));
      }
    } catch {
      // Unknown: the gate follows the recorded hash and decides.
    }
    // Give it a moment to land, so this request can often send the transfer too.
    for (let i = 0; i < 10; i++) {
      if ((await firstTxGate(transferId)) !== 'pending') break;
      await sleep(2_000);
    }
  }
  return relayTransferSteps(transferId);
}

/** The first transaction's fate: none to wait for, landed, still out, or never will. */
type FirstTxGate = 'none' | 'confirmed' | 'pending' | 'failed';

/** A first transaction still unknown this long after commit never landed. */
const FIRST_TX_NEVER_LANDS_MS = 10 * 60_000;

async function firstTxGate(transferId: string): Promise<FirstTxGate> {
  const transfer = await prisma.cctpTransfer.findUnique({
    where: { id: transferId },
    select: { srcSwapTxHash: true, network: true },
  });
  if (!transfer?.srcSwapTxHash) return 'none';
  let status: string;
  try {
    status = (
      await serverFor(transfer.network as NetworkType).getTransaction(transfer.srcSwapTxHash)
    ).status;
  } catch {
    return 'pending';
  }
  if (status === 'SUCCESS') return 'confirmed';
  if (status === 'FAILED') return 'failed';
  // NOT_FOUND: still on its way, unless its window has long passed.
  const first = await prisma.relayedStep.findFirst({
    where: { transferId },
    orderBy: { order: 'asc' },
    select: { updatedAt: true, status: true },
  });
  if (
    first &&
    first.status === 'READY' &&
    Date.now() - first.updatedAt.getTime() > FIRST_TX_NEVER_LANDS_MS
  ) {
    return 'failed';
  }
  return 'pending';
}

/** Stop every step not yet done: nothing more will be sent for this transfer. */
async function failOpenSteps(transferId: string, detail: string) {
  await prisma.relayedStep.updateMany({
    where: { transferId, status: { in: ['AWAITING_SIGNATURE', 'READY', 'SUBMITTING'] } },
    data: { status: 'FAILED', errorDetail: detail },
  });
}

// ---- relay ------------------------------------------------------------------

/**
 * Run a transfer's steps in order as far as they can go now: send the next
 * READY one, confirm a SUBMITTED one. Safe to call from the open page and the
 * cron at once (claims are compare-and-set).
 */
export async function relayTransferSteps(transferId: string): Promise<RelayState> {
  for (let round = 0; round < 6; round++) {
    const steps = await prisma.relayedStep.findMany({
      where: { transferId },
      orderBy: { order: 'asc' },
    });
    const next = steps.find((s) => s.status !== 'DONE');
    if (!next) return relayStateOf(steps);

    // Doc 129 Phase 5: nothing of Circle's goes out before the person's own
    // swap has landed (its USDC is what the burn spends).
    if (next.status === 'READY' && steps.every((s) => s.status === 'READY')) {
      const gate = await firstTxGate(transferId);
      if (gate === 'pending') return relayStateOf(steps);
      if (gate === 'failed') {
        await failOpenSteps(
          transferId,
          'The swap from XLM did not go through, so nothing moved: your XLM is still in your wallet.'
        );
        return relayStateOf(await stepsOf(transferId));
      }
    }

    if (next.status === 'SUBMITTED') {
      const moved = await confirmStep(next, round === 0 ? 2_000 : 20_000);
      if (!moved) return relayStateOf(await stepsOf(transferId));
      continue;
    }
    if (next.status === 'SUBMITTING' && Date.now() - next.updatedAt.getTime() > STALE_CLAIM_MS) {
      // A claim that crashed before it recorded a hash broadcast nothing.
      await prisma.relayedStep.updateMany({
        where: { id: next.id, status: 'SUBMITTING', updatedAt: next.updatedAt },
        data: { status: 'READY' },
      });
      continue;
    }
    if (next.status !== 'READY') return relayStateOf(steps);
    const progressed = await submitStep(next);
    if (!progressed) return relayStateOf(await stepsOf(transferId));
  }
  return relayStateOf(await stepsOf(transferId));
}

const stepsOf = (transferId: string) =>
  prisma.relayedStep.findMany({ where: { transferId }, orderBy: { order: 'asc' } });

async function stopStep(id: string, status: 'FAILED' | 'EXPIRED' | 'READY', detail?: string) {
  await prisma.relayedStep.update({
    where: { id },
    data: { status, ...(detail ? { errorDetail: detail.slice(0, 500) } : {}) },
  });
}

/** Claim, build, simulate, record, send. True when the step moved on. */
async function submitStep(step: RelayedStep): Promise<boolean> {
  const claimed = await prisma.relayedStep.updateMany({
    where: { id: step.id, status: 'READY' },
    data: { status: 'SUBMITTING', attempts: { increment: 1 } },
  });
  if (claimed.count === 0) return false;

  const network = step.network as NetworkType;
  const passphrase = passphraseOf(network);
  const server = serverFor(network);

  const secret = process.env.CCTP_RELAYER_STELLAR_SECRET;
  if (!secret) {
    console.error('[relayed-steps] CCTP_RELAYER_STELLAR_SECRET not configured');
    await stopStep(step.id, 'READY');
    return false;
  }
  const relayer = Keypair.fromSecret(secret);

  try {
    const { sequence } = await server.getLatestLedger();
    if (sequence > step.expiresLedger) {
      await stopStep(
        step.id,
        'EXPIRED',
        'The signature expired before it could be sent. Nothing moved: your USDC is still in your wallet.'
      );
      return true;
    }
    const permission = xdr.SorobanAuthorizationEntry.fromXDR(step.signedXdr!, 'base64');

    for (let attempt = 0; attempt < 3; attempt++) {
      const account = await server.getAccount(relayer.publicKey());
      const raw = new TransactionBuilder(account, {
        fee: '10000000',
        networkPassphrase: passphrase,
      })
        .addOperation(
          Operation.invokeHostFunction({
            func: xdr.HostFunction.hostFunctionTypeInvokeContract(permittedCall(permission)),
            auth: [permission],
          })
        )
        .setTimeout(TX_TIMEOUT_SECONDS)
        .build();
      const sim = await server.simulateTransaction(raw);
      if (!rpc.Api.isSimulationSuccess(sim)) {
        // The network refused it before anything was sent (a balance that
        // moved, a contract that changed). Nothing moved.
        await stopStep(
          step.id,
          'FAILED',
          `Stellar refused this step: ${String(sim.error).slice(0, 300)}`
        );
        return true;
      }
      const tx = rpc.assembleTransaction(raw, sim).build();
      // The relayer only ever wraps the person's own signed permission.
      if (tx.operations[0].type !== 'invokeHostFunction') throw new Error('unexpected operation');
      const kept = (tx.operations[0] as Operation.InvokeHostFunction).auth?.[0]?.toXDR('base64');
      if (kept !== step.signedXdr) {
        await stopStep(step.id, 'FAILED', 'The signed permission was not kept in the transaction.');
        return true;
      }
      tx.sign(relayer);
      const hash = tx.hash().toString('hex');

      // Record BEFORE broadcast: a crash after this line leaves a hash the
      // cron can follow, never a send nobody knows about.
      await prisma.relayedStep.update({
        where: { id: step.id },
        data: { txHash: hash, status: 'SUBMITTED' },
      });
      const sent = await server.sendTransaction(tx);
      if (sent.status === 'PENDING' || sent.status === 'DUPLICATE') {
        await confirmStep(
          { ...step, txHash: hash, status: 'SUBMITTED', updatedAt: new Date() },
          20_000
        );
        return true;
      }
      const reason = JSON.stringify(sent.errorResult ?? sent);
      if (sent.status === 'TRY_AGAIN_LATER' || /tx_bad_seq|txBadSeq/i.test(reason)) {
        // Not accepted: shared relayer sequence, or a busy network. Rebuild.
        await prisma.relayedStep.update({
          where: { id: step.id },
          data: { txHash: null, status: 'SUBMITTING' },
        });
        await sleep(700 * (attempt + 1));
        continue;
      }
      await stopStep(step.id, 'FAILED', `Stellar did not accept this step: ${reason}`);
      return true;
    }
    await stopStep(step.id, 'READY');
    return false;
  } catch (e) {
    // The RPC did not answer: nothing is known to have been sent unless a
    // hash was recorded, and then the step stays SUBMITTED for the cron.
    console.warn('[relayed-steps] submit interrupted:', String((e as Error)?.message ?? e));
    const fresh = await prisma.relayedStep.findUnique({ where: { id: step.id } });
    if (fresh?.status === 'SUBMITTING') await stopStep(step.id, 'READY');
    return false;
  }
}

/** Follow a sent step until it lands or `waitMs` passes. True when it moved on. */
async function confirmStep(step: RelayedStep, waitMs: number): Promise<boolean> {
  if (!step.txHash) {
    await stopStep(step.id, 'READY');
    return true;
  }
  const server = serverFor(step.network as NetworkType);
  const deadline = Date.now() + waitMs;
  for (;;) {
    let status: string;
    try {
      status = (await server.getTransaction(step.txHash)).status;
    } catch {
      status = 'UNKNOWN';
    }
    if (status === 'SUCCESS') {
      await prisma.relayedStep.update({ where: { id: step.id }, data: { status: 'DONE' } });
      if (step.kind === 'burn') {
        // The transfer follows the burn from here (lib/cctp/state.ts), exactly
        // as if the person's own transaction had sent it.
        await prisma.cctpTransfer.updateMany({
          where: { id: step.transferId, burnTxHash: null },
          data: { burnTxHash: step.txHash, status: 'BURN_SUBMITTED' },
        });
      }
      return true;
    }
    if (status === 'FAILED') {
      await stopStep(
        step.id,
        'FAILED',
        'Stellar refused this step, so nothing moved: your USDC is still in your wallet.'
      );
      return true;
    }
    if (Date.now() >= deadline) break;
    await sleep(2_000);
  }
  // Still unknown. Past the transaction's own time limit, NOT_FOUND means it
  // never landed: the same permission goes out again in a new transaction.
  if (Date.now() - step.updatedAt.getTime() > NEVER_LANDED_AFTER_MS) {
    if (step.attempts >= MAX_ATTEMPTS) {
      await stopStep(
        step.id,
        'FAILED',
        'This step could not reach Stellar. Nothing moved: your USDC is still in your wallet.'
      );
    } else {
      await prisma.relayedStep.updateMany({
        where: { id: step.id, status: 'SUBMITTED', txHash: step.txHash },
        data: { status: 'READY', txHash: null },
      });
    }
    return true;
  }
  return false;
}

// ---- cron -------------------------------------------------------------------

/** The cron's pass: finish whatever the open pages left. Sequential (one relayer account). */
export async function advanceRelayedSteps(limit = 20): Promise<{ transfers: number }> {
  if (!PERMISSIONS_ENABLED) return { transfers: 0 };
  const now = Date.now();
  const due = await prisma.relayedStep.findMany({
    where: {
      OR: [
        { status: 'SUBMITTED' },
        { status: 'READY', updatedAt: { lt: new Date(now - 30_000) } },
        { status: 'SUBMITTING', updatedAt: { lt: new Date(now - STALE_CLAIM_MS) } },
      ],
    },
    select: { transferId: true },
    distinct: ['transferId'],
    orderBy: { updatedAt: 'asc' },
    take: limit,
  });
  for (const { transferId } of due) {
    await relayTransferSteps(transferId).catch((e) =>
      console.warn('[relayed-steps] cron pass failed for', transferId, String(e?.message ?? e))
    );
  }
  return { transfers: due.length };
}

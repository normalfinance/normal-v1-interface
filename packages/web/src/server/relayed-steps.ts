import type { RelayedStep, CctpTransfer, RelayedAction } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { wireToStellar7 } from '@/lib/cctp/decimals';
import { evmAddressToBytes } from '@/lib/cctp/addresses';
import { CCTP_DOMAIN, STELLAR_CCTP } from '@/lib/cctp/config';
import { savingsVaultOf, vaultWithdrawOf } from '@/lib/stellar/vault-withdraw';
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
  /** Every step in order (doc 129 Phase 5c: an action's page follows these). */
  steps: { kind: string; status: string; txHash: string | null }[];
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

/** What a Savings-funded transfer is checked against (doc 129 Phase 5b). */
export interface SavingsRules {
  /** The DeFindex vault behind Savings. */
  vault: string;
  /** Normal's fee address: the commission must pay it. */
  feeAddress: string;
  /** The USDC the vault pays out, which is the USDC Circle burns. */
  usdc: Asset;
}

type FirstTxTransfer = Pick<CctpTransfer, 'srcAddress' | 'srcAsset' | 'srcSwapTxHash'> & {
  amountWire?: string;
};

/** A commission window this short is not worth sending (the pair route's rule). */
const MIN_COMMISSION_RUNWAY_MS = 60_000;

/** A classic amount ("12.3456789") in 7-decimal units. */
function units7(amount: string): bigint {
  const [whole = '0', frac = ''] = amount.split('.');
  return BigInt(whole) * 10_000_000n + BigInt(`${frac}0000000`.slice(0, 7));
}

function signedBySource(tx: Transaction): boolean {
  const hash = tx.hash();
  const key = Keypair.fromPublicKey(tx.source);
  return tx.signatures.some(
    (d) => d.hint().equals(key.signatureHint()) && key.verify(hash, d.signature())
  );
}

/**
 * Doc 129 Phase 5: the person's own Stellar transactions that must land before
 * the Circle steps, because they make the USDC the burn spends:
 * - from XLM: one Soroswap swap (XLM → exactly this USDC);
 * - from Savings (5b): the vault withdrawal, then, when earnings are taken,
 *   Normal's commission chained right behind it.
 * Relayed as signed, never altered: every one must come from the transfer's
 * own wallet and carry that wallet's signature. A withdrawal must guarantee
 * (its own minimum out, which the vault enforces) at least the transfer plus
 * the commission. Pure.
 */
export function firstTxsRefusal(
  txs: (Transaction | FeeBumpTransaction)[],
  transfer: FirstTxTransfer,
  savings: SavingsRules | null,
  nowMs: number = Date.now()
): Refusal | null {
  if (!txs.length) return { ok: false, status: 400, error: 'Nothing to send first' };
  const plain: Transaction[] = [];
  for (const tx of txs) {
    if (!(tx instanceof Transaction)) {
      return { ok: false, status: 400, error: 'Each transaction must be a plain transaction' };
    }
    if (tx.source !== transfer.srcAddress) {
      return {
        ok: false,
        status: 403,
        error: 'Each transaction must come from the transfer’s own wallet',
      };
    }
    if (!signedBySource(tx)) {
      return { ok: false, status: 400, error: 'A transaction is not signed by its wallet' };
    }
    plain.push(tx);
  }
  const [first, commission] = plain;
  if (transfer.srcSwapTxHash && transfer.srcSwapTxHash !== first.hash().toString('hex')) {
    return { ok: false, status: 409, error: 'This transfer already has its first transaction' };
  }

  if (transfer.srcAsset === 'XLM') {
    if (plain.length !== 1) {
      return { ok: false, status: 400, error: 'A swap from XLM goes first on its own' };
    }
    if (first.operations.length !== 1 || first.operations[0].type !== 'invokeHostFunction') {
      return { ok: false, status: 400, error: 'The swap must be one Soroban call' };
    }
    return null;
  }

  if (transfer.srcAsset !== 'USDC' || !savings) {
    return {
      ok: false,
      status: 400,
      error: 'Only a swap from XLM or a withdrawal from Savings goes before the transfer',
    };
  }
  if (plain.length > 2) {
    return { ok: false, status: 400, error: 'A withdrawal goes first with at most its commission' };
  }
  const withdrawal = vaultWithdrawOf(first, savings.vault);
  if (!withdrawal) {
    return {
      ok: false,
      status: 400,
      error: 'The first transaction must be a withdrawal from your Savings',
    };
  }
  let commission7 = 0n;
  if (commission) {
    if (BigInt(commission.sequence) !== BigInt(first.sequence) + 1n) {
      return {
        ok: false,
        status: 400,
        error: 'The commission must directly follow the withdrawal',
      };
    }
    const op = commission.operations[0];
    if (commission.operations.length !== 1 || op.type !== 'payment') {
      return { ok: false, status: 400, error: 'The commission must be one payment' };
    }
    if (op.destination !== savings.feeAddress || !op.asset.equals(savings.usdc)) {
      return {
        ok: false,
        status: 400,
        error: 'The commission must pay Normal’s fee address in USDC',
      };
    }
    commission7 = units7(op.amount);
    const maxTime = Number(commission.timeBounds?.maxTime ?? '0') * 1000;
    if (commission7 <= 0n || !maxTime || maxTime < nowMs + MIN_COMMISSION_RUNWAY_MS) {
      return { ok: false, status: 400, error: 'The commission is not usable: start again' };
    }
  }
  const burn7 = wireToStellar7(BigInt(transfer.amountWire ?? '0'));
  if (burn7 <= 0n || withdrawal.minOut < burn7 + commission7) {
    return {
      ok: false,
      status: 400,
      error: 'The withdrawal does not guarantee enough for this transfer and its commission',
    };
  }
  return null;
}

/** Doc 129 Phase 5a: the XLM swap alone (kept for its callers and tests). */
export function firstTxRefusal(
  tx: Transaction | FeeBumpTransaction,
  transfer: FirstTxTransfer
): Refusal | null {
  return firstTxsRefusal([tx], transfer, null);
}

/**
 * Savings on this network pays out the very USDC Circle burns, or the
 * Savings → coin path does not exist here (testnet Savings uses Blend's test
 * USDC). Loaded lazily: the fee address module reads the shared config.
 */
async function savingsRulesFor(network: NetworkType): Promise<SavingsRules | null> {
  const vault = savingsVaultOf(network === 'mainnet' ? 'mainnet' : 'testnet');
  const config = getStellarConfigForNetwork(network) as {
    BLEND_USDC_ISSUER?: string;
    USDC_ISSUER?: string;
  };
  const issuer = config.BLEND_USDC_ISSUER || config.USDC_ISSUER;
  if (!vault || !issuer || issuer !== STELLAR_CCTP[network].usdcIssuer) return null;
  const { getFeesDepositAddress } = await import('@/lib/build-fee-payment');
  return { vault, feeAddress: getFeesDepositAddress(), usdc: new Asset('USDC', issuer) };
}

/** What the person reads when the first transaction did not go through. */
const FIRST_TX_WORDS = {
  XLM: {
    refused: 'The swap from XLM was refused, so nothing moved: your XLM is still in your wallet.',
    failed:
      'The swap from XLM did not go through, so nothing moved: your XLM is still in your wallet.',
  },
  SAVINGS: {
    refused:
      'Taking it out of Savings was refused, so nothing moved: your money is still in Savings.',
    failed:
      'Taking it out of Savings did not go through, so nothing moved: your money is still in Savings.',
  },
} as const;

const wordsFor = (srcAsset: string) =>
  srcAsset === 'XLM' ? FIRST_TX_WORDS.XLM : FIRST_TX_WORDS.SAVINGS;

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
    steps: steps.map((s) => ({ kind: s.kind, status: s.status, txHash: s.txHash })),
  };
}

// ---- what the steps belong to -----------------------------------------------------

/**
 * Relayed steps belong to a Circle transfer (approve, burn) or, since doc 129
 * Phase 5c, to a RelayedAction (XLM → Savings, Savings → XLM); `transferId`
 * holds either id.
 */
type Parent = { type: 'transfer'; row: CctpTransfer } | { type: 'action'; row: RelayedAction };

async function parentOf(id: string): Promise<Parent | null> {
  const transfer = await prisma.cctpTransfer.findUnique({ where: { id } });
  if (transfer) return { type: 'transfer', row: transfer };
  const action = await prisma.relayedAction.findUnique({ where: { id } });
  return action ? { type: 'action', row: action } : null;
}

/** The person's first transaction for this parent, if it has one. */
async function firstTxOf(id: string): Promise<{ hash: string | null; network: string } | null> {
  const transfer = await prisma.cctpTransfer.findUnique({
    where: { id },
    select: { srcSwapTxHash: true, network: true },
  });
  if (transfer) return { hash: transfer.srcSwapTxHash, network: transfer.network };
  const action = await prisma.relayedAction.findUnique({
    where: { id },
    select: { firstTxHash: true, network: true },
  });
  return action ? { hash: action.firstTxHash, network: action.network } : null;
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
  firstTxXdr?: unknown,
  savingsAmount?: unknown
): Promise<RelayState | Refusal> {
  const steps = await prisma.relayedStep.findMany({
    where: { transferId, userId },
    orderBy: { order: 'asc' },
  });
  if (!steps.length) return { ok: false, status: 404, error: 'Nothing to sign for this transfer' };
  const given = Array.isArray(signatures) ? signatures : [];
  const parent = await parentOf(transferId);
  if (!parent || parent.row.userId !== userId) {
    return { ok: false, status: 404, error: 'Not found' };
  }
  const actions = parent.type === 'action' ? await import('@/server/relayed-actions') : null;

  // Doc 129 Phase 5: the person's own transactions that go first (an XLM
  // swap, or a Savings withdrawal and its commission), checked before
  // anything is stored or sent.
  const firstXdrs = firstTxXdr == null ? [] : Array.isArray(firstTxXdr) ? firstTxXdr : [firstTxXdr];
  let firstTxs: Transaction[] = [];
  let transfer: CctpTransfer | null = null;
  let savings: SavingsRules | null = null;
  let savingsAmountText: string | null = null;
  if (parent.type === 'action' && !firstXdrs.length && !parent.row.firstTxHash) {
    return { ok: false, status: 400, error: 'The first transaction is missing' };
  }
  if (firstXdrs.length) {
    const network = parent.row.network as NetworkType;
    const parsed: (Transaction | FeeBumpTransaction)[] = [];
    for (const one of firstXdrs) {
      try {
        parsed.push(TransactionBuilder.fromXDR(String(one), passphraseOf(network)));
      } catch {
        return { ok: false, status: 400, error: 'A transaction could not be read' };
      }
    }
    if (parent.type === 'action') {
      // Doc 129 Phase 5c: exactly the transaction the action was built for.
      const refusal = actions!.actionFirstTxRefusal(parsed, parent.row);
      if (refusal) return refusal;
      firstTxs = parsed as Transaction[];
    } else {
      transfer = parent.row;
      savings = transfer.srcAsset === 'USDC' ? await savingsRulesFor(network) : null;
      const refusal = firstTxsRefusal(parsed, transfer, savings);
      if (refusal) return refusal;
      firstTxs = parsed as Transaction[];
    }
    if (savings) {
      // The amount the Savings record shows: what was asked for, which the
      // withdrawal's own guaranteed minimum must be within 5% of.
      const minOut = vaultWithdrawOf(firstTxs[0], savings.vault)!.minOut;
      const asked =
        typeof savingsAmount === 'string' && /^\d+(\.\d{1,7})?$/.test(savingsAmount)
          ? units7(savingsAmount)
          : 0n;
      const near = asked * 100n >= minOut * 95n && asked * 100n <= minOut * 105n;
      if (!near) {
        return { ok: false, status: 400, error: 'The amount does not match the withdrawal' };
      }
      savingsAmountText = savingsAmount as string;
    }
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
      if (step.kind === 'user_tx') {
        // Doc 129 Phase 5c: one of the person's own transactions, sent as signed.
        signed.push({
          id: step.id,
          signedXdr: actions!.attachUserTxSignature(
            step.entryXdr,
            step.account,
            passphraseOf(step.network as NetworkType),
            Buffer.from(sig, 'hex')
          ),
        });
        continue;
      }
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
  const firstTx = firstTxs[0] ?? null;
  let firstIsNew = false;
  if (firstTx) {
    const hash = firstTx.hash().toString('hex');
    const claimed =
      parent.type === 'action'
        ? await prisma.relayedAction.updateMany({
            where: { id: transferId, firstTxHash: null },
            data: { firstTxHash: hash, status: 'RUNNING' },
          })
        : await prisma.cctpTransfer.updateMany({
            where: { id: transferId, srcSwapTxHash: null },
            data: { srcSwapTxHash: hash },
          });
    firstIsNew = claimed.count === 1;
  }
  // Doc 129 Phase 5c: an action's records (its swap, or its withdrawal and
  // swap), BEFORE anything is broadcast.
  if (firstTx && parent.type === 'action' && firstIsNew) {
    await actions!.recordActionStart({
      ...parent.row,
      firstTxHash: firstTx.hash().toString('hex'),
    });
  }
  // Doc 129 Phase 5b: a Savings withdrawal is recorded, and its commission
  // held, BEFORE anything is broadcast, exactly as the pair route does.
  if (firstTx && savings && transfer && firstIsNew) {
    await recordSavingsWithdrawal(userId, transfer, savings, firstTxs, savingsAmountText!);
  }
  for (const s of signed) {
    await prisma.relayedStep.updateMany({
      where: { id: s.id, status: 'AWAITING_SIGNATURE' },
      data: { signedXdr: s.signedXdr, status: 'READY' },
    });
  }
  if (firstTx) {
    const server = serverFor(steps[0].network as NetworkType);
    const words =
      parent.type === 'action'
        ? actions!.actionFirstTxWords(parent.row.kind)
        : wordsFor(transfer?.srcAsset ?? 'XLM');
    try {
      // A busy source account asks to try again: the same signed envelope can
      // only ever apply once, so sending it again is safe.
      for (let attempt = 0; attempt < 3; attempt++) {
        const sent = await server.sendTransaction(firstTx);
        if (sent.status === 'TRY_AGAIN_LATER') {
          await sleep(2_000);
          continue;
        }
        if (sent.status === 'ERROR') {
          await settleFirstTx(transferId, 'failed');
          await failOpenSteps(transferId, words.refused);
          return relayStateOf(await stepsOf(transferId));
        }
        break;
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
  const origin = await firstTxOf(transferId);
  if (!origin?.hash) return 'none';
  let status: string;
  try {
    status = (await serverFor(origin.network as NetworkType).getTransaction(origin.hash)).status;
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

/**
 * Doc 129 Phase 5b: record a Savings withdrawal (and hold its commission) the
 * way the pair route does (app/api/fees/execute-pair), before broadcast.
 *
 * One difference, on purpose: the held entry says the withdrawal's own window
 * has already closed, so the fee sweeper never sends the withdrawal itself.
 * This transfer's gate is its only sender, and gives up on it after
 * FIRST_TX_NEVER_LANDS_MS; a withdrawal the sweeper could send later than
 * that would move Savings to the wallet after the transfer had stopped. The
 * sweeper still collects the commission once the withdrawal has landed.
 */
async function recordSavingsWithdrawal(
  userId: string,
  transfer: CctpTransfer,
  savings: SavingsRules,
  txs: Transaction[],
  amount: string
): Promise<void> {
  const network = transfer.network as NetworkType;
  const [withdrawal, commission] = txs;
  const serviceHash = withdrawal.hash().toString('hex');
  const feeHash = commission ? commission.hash().toString('hex') : null;
  const feeOp = commission?.operations[0] as { amount: string } | undefined;
  const { createPendingRecord } = await import('@/server/tx-records');
  await createPendingRecord({
    input: {
      kind: 'savings_withdraw',
      record: { vaultAddress: savings.vault, amount, feeAmount: feeOp?.amount ?? null },
    },
    walletAddress: transfer.srcAddress,
    network,
    serviceHash,
    feeHash,
  });
  if (commission && feeHash) {
    const { escrowFeePair } = await import('@/server/fee-escrow');
    const nowMs = Date.now();
    await escrowFeePair({
      feeXdr: commission.toXDR(),
      feeHash,
      serviceXdr: withdrawal.toXDR(),
      serviceHash,
      network,
      userId,
      walletAddress: transfer.srcAddress,
      kind: 'savings_withdraw',
      createdAtMs: nowMs,
      feeExpiresAtMs: Number(commission.timeBounds?.maxTime ?? '0') * 1000,
      serviceExpiresAtMs: nowMs,
      status: 'pending',
    });
  }
}

/**
 * The first transaction landed or never will: settle its Savings record (an
 * XLM swap has none). Idempotent: a settled record is never rewritten.
 * Returns the transfer's source asset, for the words.
 */
async function settleFirstTx(
  transferId: string,
  outcome: 'confirmed' | 'failed'
): Promise<{ refused: string; failed: string }> {
  const transfer = await prisma.cctpTransfer.findUnique({
    where: { id: transferId },
    select: { srcAsset: true, srcSwapTxHash: true, srcAddress: true, network: true },
  });
  if (!transfer) {
    // Doc 129 Phase 5c: an action's first transaction.
    const action = await prisma.relayedAction.findUnique({ where: { id: transferId } });
    const actions = await import('@/server/relayed-actions');
    if (action) await actions.settleActionFirstTx(action, outcome);
    return actions.actionFirstTxWords(action?.kind ?? '');
  }
  if (transfer.srcAsset === 'USDC' && transfer.srcSwapTxHash) {
    const { settleRecord } = await import('@/server/tx-records');
    await settleRecord({
      kind: 'savings_withdraw',
      serviceHash: transfer.srcSwapTxHash,
      status: outcome,
      ...(outcome === 'failed' ? { reason: 'did not land before its transfer gave up' } : {}),
      walletAddress: transfer.srcAddress,
      network: transfer.network,
    }).catch(() => {});
  }
  return wordsFor(transfer.srcAsset);
}

/** Stop every step not yet done: nothing more will be sent for this transfer. */
async function failOpenSteps(transferId: string, detail: string) {
  await prisma.relayedStep.updateMany({
    where: { transferId, status: { in: ['AWAITING_SIGNATURE', 'READY', 'SUBMITTING'] } },
    data: { status: 'FAILED', errorDetail: detail },
  });
  // Doc 129 Phase 5c: an action stops with its steps (no row for a transfer id).
  await prisma.relayedAction.updateMany({
    where: { id: transferId, status: { in: ['CREATED', 'RUNNING'] } },
    data: { status: 'FAILED', errorDetail: detail.slice(0, 500) },
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
        const words = await settleFirstTx(transferId, 'failed');
        await failOpenSteps(transferId, words.failed);
        return relayStateOf(await stepsOf(transferId));
      }
      if (gate === 'confirmed') await settleFirstTx(transferId, 'confirmed');
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
  const step = await prisma.relayedStep.update({
    where: { id },
    data: { status, ...(detail ? { errorDetail: detail.slice(0, 500) } : {}) },
  });
  if (status === 'READY') return;
  // Doc 129 Phase 5c: an action's later steps can never follow one that
  // stopped (a fee never goes without what it pays for): they stop too.
  const action = await prisma.relayedAction.findUnique({ where: { id: step.transferId } });
  if (action) {
    const { onActionStepStopped } = await import('@/server/relayed-actions');
    await onActionStepStopped(step, action, detail ?? null);
    await failOpenSteps(step.transferId, detail ?? 'An earlier step did not go through.');
  }
}

/** Claim, build, simulate, record, send. True when the step moved on. */
async function submitStep(step: RelayedStep): Promise<boolean> {
  const claimed = await prisma.relayedStep.updateMany({
    where: { id: step.id, status: 'READY' },
    data: { status: 'SUBMITTING', attempts: { increment: 1 } },
  });
  if (claimed.count === 0) return false;
  if (step.kind === 'user_tx') return sendUserTx(step);

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

/**
 * Doc 129 Phase 5c: send one of the person's own signed transactions as it
 * is (a commission, a swap with its fee). Its hash is known and recorded
 * before broadcast; the same envelope can only ever apply once, so sending
 * it again is safe. Claimed already (SUBMITTING).
 */
async function sendUserTx(step: RelayedStep): Promise<boolean> {
  const network = step.network as NetworkType;
  const server = serverFor(network);
  try {
    const tx = TransactionBuilder.fromXDR(step.signedXdr!, passphraseOf(network));
    const maxTime = Number((tx as Transaction).timeBounds?.maxTime ?? '0');
    if (maxTime && Date.now() / 1000 > maxTime) {
      await stopStep(
        step.id,
        'EXPIRED',
        'Its time ran out before it could be sent. Your money is in your wallet as digital dollars.'
      );
      return true;
    }
    const hash = tx.hash().toString('hex');
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
    if (sent.status === 'TRY_AGAIN_LATER') {
      await prisma.relayedStep.update({
        where: { id: step.id },
        data: { txHash: null, status: 'READY' },
      });
      return false;
    }
    console.warn(
      '[relayed-steps] own transaction refused:',
      JSON.stringify(sent.errorResult ?? sent)
    );
    await stopStep(
      step.id,
      'FAILED',
      'Stellar did not accept this step. Your money is in your wallet as digital dollars.'
    );
    return true;
  } catch (e) {
    console.warn(
      '[relayed-steps] own transaction interrupted:',
      String((e as Error)?.message ?? e)
    );
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
      const moved = await prisma.relayedStep.updateMany({
        where: { id: step.id, status: { not: 'DONE' } },
        data: { status: 'DONE' },
      });
      // Doc 129 Phase 5c: an action's step writes its record, once.
      if (moved.count === 1 && step.kind !== 'approve' && step.kind !== 'burn') {
        const action = await prisma.relayedAction.findUnique({ where: { id: step.transferId } });
        if (action) {
          const { onActionStepLanded } = await import('@/server/relayed-actions');
          await onActionStepLanded({ ...step, status: 'DONE' }, action).catch((e) =>
            console.warn('[relayed-steps] action record failed:', String(e?.message ?? e))
          );
        }
      }
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

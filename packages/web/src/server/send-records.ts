import { prisma } from '@/lib/prisma';
import { SOLANA_RPC_URL } from '@/lib/chains/rpc-fallback';
import { decideRecordSettlement } from '@/server/tx-records';

// ---------------------------------------------------------------------------
// #29 record-before-broadcast for native ETH/SOL sends.
//
// The send adapters build and SIGN client-side (custody unchanged — the
// passkey signs, the server can only relay), then hand the signed tx to
// /api/send/execute, which writes the send_logs row BEFORE broadcasting.
// The tx hash is computable before broadcast on both chains, so the row
// always carries it — the reconciler below can settle the record from the
// chain no matter where the flow died.
//
// The double-send guard: a non-terminal row for a wallet+chain blocks any
// further send on that chain (409). Ethereum has no Stellar-style sequence
// protection across DIFFERENT nonces — a retry after a lost response reads a
// fresh pending nonce and creates a second valid transaction — so the guard
// is what makes double-sends structurally impossible: send #2 cannot exist
// while send #1's outcome is unknown, and unknowns are settled by the cron
// within ~2 minutes (usually seconds).
// ---------------------------------------------------------------------------

export type SendChain = 'ethereum' | 'solana';

const NON_TERMINAL = ['pending', 'submitted'];

// A tx not found on-chain past these cutoffs can never apply. Solana's
// blockhash expires in ~2 minutes — 10 min is a wide margin; EVM gets the
// same 30 min the Stellar records use.
export const EVM_ABANDON_AFTER_MS = 30 * 60 * 1000;
export const SOL_ABANDON_AFTER_MS = 10 * 60 * 1000;

export const SEND_IN_FLIGHT_MESSAGE =
  'Your previous send is still confirming — this usually takes under a minute. Please wait a moment and try again.';

export const INSUFFICIENT_MESSAGE =
  'Not enough balance to cover this send plus its network fee. Reduce the amount slightly and try again.';

export type BroadcastOutcome =
  | { outcome: 'accepted' }
  | { outcome: 'rejected'; reason: string; friendly: string }
  | { outcome: 'unknown' };

/**
 * Classify an EVM broadcast error. Pure — pinned by send-records.test.ts.
 * The cardinal rule: only DEFINITIVE node rejections become 'rejected'
 * (terminal 'failed' on the record); anything ambiguous is 'unknown', because
 * the tx may have been accepted and marking it failed would lie — the
 * reconciler settles unknowns from the chain itself.
 */
export function classifyEvmError(message: string): BroadcastOutcome {
  const m = message.toLowerCase();
  // Nodes phrase duplicate-tx acceptance several ways: geth "already known",
  // erigon "ALREADY_EXISTS", others "AlreadyKnown" — normalize separators.
  const compact = m.replace(/[\s_-]/g, '');
  // The identical tx already sits in the pool (a previous attempt made it) —
  // that IS acceptance, not failure.
  if (compact.includes('alreadyknown') || compact.includes('alreadyexists')) {
    return { outcome: 'accepted' };
  }
  if (m.includes('insufficient funds')) {
    return { outcome: 'rejected', reason: message, friendly: INSUFFICIENT_MESSAGE };
  }
  if (
    m.includes('nonce too low') ||
    m.includes('underpriced') ||
    m.includes('intrinsic gas') ||
    m.includes('exceeds block gas') ||
    m.includes('invalid')
  ) {
    return {
      outcome: 'rejected',
      reason: message,
      friendly: 'The network rejected this send. Please try again.',
    };
  }
  return { outcome: 'unknown' };
}

// ---------------------------------------------------------------------------
// Base58 (Bitcoin/Solana alphabet) — a Solana signature is base58 of the
// 64-byte signature, computable BEFORE broadcast. Local implementation to
// avoid depending on a transitive package. BigInt arithmetic only — and never
// `**` (it transpiles to Math.pow and crashes on BigInt).
// ---------------------------------------------------------------------------

const B58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function base58Encode(bytes: Uint8Array): string {
  let value = 0n;
  for (const byte of bytes) value = value * 256n + BigInt(byte);

  let out = '';
  while (value > 0n) {
    out = B58_ALPHABET[Number(value % 58n)] + out;
    value /= 58n;
  }
  // Leading zero bytes encode as leading '1's.
  for (const byte of bytes) {
    if (byte !== 0) break;
    out = '1' + out;
  }
  return out || '1';
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

export async function findUnsettledSend(walletAddress: string, chain: SendChain) {
  return prisma.sendLog.findFirst({
    where: { walletAddress, chain, status: { in: NON_TERMINAL } },
    select: { id: true, txHash: true, createdAt: true },
  });
}

/**
 * Probe an unsettled send RIGHT NOW and settle it if the chain has answered.
 * Returns 'settled' when the row reached a terminal state (a new send may
 * proceed) or 'wait' when the outcome is genuinely still unknown.
 *
 * This is what makes the one-send-at-a-time guard SELF-CLEARING at request
 * time: without it, a send whose tx confirmed seconds ago would keep
 * blocking until the cron reconciler's next tick (~2 min on Vercel — and
 * never on localhost, where crons don't run). Observed live 2026-08-12: a
 * confirmed test send 409-blocked the next ETH send.
 */
export async function probeAndSettleUnsettledSend(row: {
  id: string;
  chain: SendChain;
  txHash: string | null;
  createdAt: Date;
}): Promise<'settled' | 'wait'> {
  if (!row.txHash) return 'wait';
  try {
    const probe = await probeWithFallback(row.chain, row.txHash);

    const decision = decideRecordSettlement(
      probe,
      row.createdAt.getTime(),
      Date.now(),
      row.chain === 'ethereum' ? EVM_ABANDON_AFTER_MS : SOL_ABANDON_AFTER_MS
    );
    if (decision.status === 'wait') return 'wait';

    await settleSend(
      row.id,
      decision.status,
      decision.status === 'abandoned' ? 'never reached the network before expiry' : undefined
    );
    return 'settled';
  } catch {
    // RPC hiccup — keep the guard conservative; the cron settles it.
    return 'wait';
  }
}

export async function createPendingSend(params: {
  walletAddress: string;
  chain: SendChain;
  symbol: string;
  amount: string;
  destination: string;
  txHash: string;
  nonce: number | null;
  network: string;
}): Promise<string> {
  const row = await prisma.sendLog.create({
    data: { ...params, status: 'pending' },
    select: { id: true },
  });
  return row.id;
}

/** Terminal states are never overwritten — actors stay idempotent. */
export async function settleSend(
  id: string,
  status: 'submitted' | 'confirmed' | 'failed' | 'abandoned',
  reason?: string
): Promise<void> {
  await prisma.sendLog.updateMany({
    where: { id, status: { in: NON_TERMINAL } },
    data: { status, statusReason: reason ?? null },
  });
}

// ---------------------------------------------------------------------------
// Chain probes — shaped like tx-records' TxProbe so the settlement decision
// function is shared (and already unit-tested there).
// ---------------------------------------------------------------------------

type Probe = { state: 'not_found' } | { state: 'found'; successful: boolean };

async function probeEvmTx(rpcUrl: string, hash: string): Promise<Probe> {
  const { http, createPublicClient } = await import('viem');
  const client = createPublicClient({ transport: http(rpcUrl) });
  try {
    const receipt = await client.getTransactionReceipt({ hash: hash as `0x${string}` });
    return { state: 'found', successful: receipt.status === 'success' };
  } catch (err: unknown) {
    // Only a REAL "no receipt" answer means not-found. A transport error must
    // rethrow (#64): swallowing it as not_found let a dead RPC read as "tx
    // never existed" — which the reconciler could escalate to a false
    // 'abandoned' — and it also has to bubble so the fallback endpoint runs.
    if ((err as { name?: string })?.name === 'TransactionReceiptNotFoundError') {
      return { state: 'not_found' };
    }
    throw err;
  }
}

async function probeSolSig(rpcUrl: string, signature: string): Promise<Probe> {
  const { Connection } = await import('@solana/web3.js');
  const connection = new Connection(rpcUrl, 'confirmed');
  const status = await connection.getSignatureStatus(signature, {
    searchTransactionHistory: true,
  });
  const info = status?.value;
  if (!info) return { state: 'not_found' };
  return { state: 'found', successful: info.err == null };
}

// ---------------------------------------------------------------------------
// Cron reconciliation — settles sends whose route invocation died
// ---------------------------------------------------------------------------

const RECONCILE_MIN_AGE_MS = 60_000;

const PUBLIC_FALLBACK: Record<SendChain, string> = {
  ethereum: 'https://ethereum-rpc.publicnode.com',
  solana: 'https://api.mainnet-beta.solana.com',
};

/**
 * Configured endpoint first, public fallback second (deduped). A probe that
 * fails on the primary keeps the one-send-at-a-time guard conservative
 * (409) — trying a second endpoint shrinks that window (#64). Exported for
 * tests.
 */
export function rpcCandidatesFor(chain: SendChain): string[] {
  // doc 126: Solana resolves through the shared helper so both historical env
  // names work; Ethereum keeps its single, always-used variable.
  const configured = chain === 'ethereum' ? process.env.NEXT_PUBLIC_ETH_RPC_URL : SOLANA_RPC_URL;
  const fallback = PUBLIC_FALLBACK[chain];
  return configured && configured !== fallback ? [configured, fallback] : [fallback];
}

async function probeWithFallback(chain: SendChain, txHash: string) {
  let lastError: unknown;
  for (const url of rpcCandidatesFor(chain)) {
    try {
      return chain === 'ethereum' ? await probeEvmTx(url, txHash) : await probeSolSig(url, txHash);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export async function reconcileSendRecords(): Promise<{ scanned: number; settled: number }> {
  const cutoff = new Date(Date.now() - RECONCILE_MIN_AGE_MS);
  const rows = await prisma.sendLog.findMany({
    where: { status: { in: NON_TERMINAL }, createdAt: { lt: cutoff } },
    select: { id: true, chain: true, txHash: true, createdAt: true },
  });

  let settled = 0;
  for (const row of rows) {
    if (!row.txHash || (row.chain !== 'ethereum' && row.chain !== 'solana')) continue;
    const chain = row.chain as SendChain;
    try {
      const probe = await probeWithFallback(chain, row.txHash);

      const decision = decideRecordSettlement(
        probe,
        row.createdAt.getTime(),
        Date.now(),
        chain === 'ethereum' ? EVM_ABANDON_AFTER_MS : SOL_ABANDON_AFTER_MS
      );
      if (decision.status === 'wait') continue;

      await settleSend(
        row.id,
        decision.status,
        decision.status === 'abandoned'
          ? 'never reached the network before expiry'
          : decision.status === 'failed'
            ? 'transaction failed on-chain'
            : undefined
      );
      settled += 1;
    } catch (err) {
      // RPC hiccup — leave the row, next tick retries.
      console.warn('[send-records] reconcile error for', row.txHash, err);
    }
  }

  return { scanned: rows.length, settled };
}

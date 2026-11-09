// ---------------------------------------------------------------------------
// Sending one leg of the Stellar burn: the approve, then deposit_for_burn
// (2026-11-09, the Stellar twin of lib/chains/broadcast-safety.ts).
//
// What went wrong before, each found by reading the code:
// - a timed-out APPROVE handed its hash up as "may still land", and the swap
//   page saved it as the burn: the row then waited for Circle forever, since
//   Circle never sees a burn in a permission;
// - TRY_AGAIN_LATER (the node is busy and did NOT take it) counted as sent;
// - a send that threw with no answer, or a status read that failed after a
//   good send, ended as a plain error: the page said "nothing is lost, try
//   again" while the burn could be on its way, and a second try is a second,
//   separate transfer.
//
// The rules:
// - the transaction's id is known before it is sent (the signed envelope's
//   hash), so an unclear send is settled by resending the SAME bytes (same id,
//   never a second transfer) and looking the id up;
// - the approve moves no money: any doubt about it is a plain error, and its
//   hash never leaves this file as anything but the approve's;
// - the burn moves money: when its fate stays unclear it ends as
//   `BroadcastUncertainError('stellar', hash, 'burn')`, the page keeps the hash
//   on the row (uncertainBurnHash) and offers no second send. Pure apart from
//   the node it is given.
// ---------------------------------------------------------------------------

import { settleUncertainSend, BroadcastUncertainError } from '@/lib/chains/broadcast-safety';

export type StellarLeg = 'approve' | 'burn';

export type StellarSendStatus = 'PENDING' | 'DUPLICATE' | 'TRY_AGAIN_LATER' | 'ERROR';
export type StellarTxStatus = 'SUCCESS' | 'FAILED' | 'NOT_FOUND';

export interface StellarSubmitNode {
  /** Submit the signed envelope (always the same bytes). */
  send: () => Promise<{ status: StellarSendStatus; detail?: string }>;
  /** Where the network has this transaction. */
  status: () => Promise<StellarTxStatus>;
}

/** The node took it, or already had it. */
const accepted = (s: StellarSendStatus) => s === 'PENDING' || s === 'DUPLICATE';

const BUSY_TRIES = 3;

export async function submitStellarLeg(opts: {
  node: StellarSubmitNode;
  /** The signed envelope's hash, known before it is sent. */
  hash: string;
  leg: StellarLeg;
  label: string;
  onSubmitted?: (hash: string) => void;
  polls?: number;
  intervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
  settleWindowMs?: number;
}): Promise<string> {
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const interval = opts.intervalMs ?? 2_000;
  const { hash, leg, label } = opts;

  // 1. Send. A busy node did not take it, so the same bytes go again.
  let sent = false;
  for (let attempt = 0; attempt < BUSY_TRIES && !sent; attempt++) {
    let answer: { status: StellarSendStatus; detail?: string };
    try {
      answer = await opts.node.send();
    } catch (err) {
      // No answer: it may or may not have gone out.
      if (leg === 'approve') throw err; // a permission only, safe to redo
      const settled = await settleUncertainSend({
        lookup: async () => (await opts.node.status()) !== 'NOT_FOUND',
        resend: async () => {
          const again = await opts.node.send();
          // A refusal now can mean the first one used the sequence number,
          // so only a clear acceptance settles it here.
          if (!accepted(again.status)) throw new Error(again.status);
          return again;
        },
        verdictOf: () => 'unknown',
        windowMs: opts.settleWindowMs,
        sleep,
      });
      if (!settled.sent) throw new BroadcastUncertainError('stellar', hash, 'burn');
      sent = true;
      break;
    }
    if (accepted(answer.status)) {
      sent = true;
    } else if (answer.status === 'ERROR') {
      // Refused outright: nothing was sent.
      throw new Error(`${label} submit failed: ${answer.detail ?? 'ERROR'}`);
    } else if (attempt < BUSY_TRIES - 1) {
      await sleep(interval);
    }
  }
  if (!sent) {
    // Shown as it is (utils/errors friendlyAppError), so no internal names.
    throw new Error('Stellar is busy and did not take it. Nothing was sent. Try again in a moment.');
  }

  opts.onSubmitted?.(hash);

  // 2. Follow it. A failed read is not a failed transfer: keep looking.
  for (let i = 0; i < (opts.polls ?? 60); i++) {
    await sleep(interval);
    let status: StellarTxStatus;
    try {
      status = await opts.node.status();
    } catch {
      continue;
    }
    if (status === 'SUCCESS') return hash;
    if (status === 'FAILED') {
      const err = new Error(`${label} failed on-chain (${hash})`) as Error & { txHash?: string };
      err.txHash = hash;
      throw err;
    }
  }

  // 3. Taken by the network, fate still unknown after the window.
  if (leg === 'burn') throw new BroadcastUncertainError('stellar', hash, 'burn');
  throw new Error(`${label} timed out (${hash})`);
}

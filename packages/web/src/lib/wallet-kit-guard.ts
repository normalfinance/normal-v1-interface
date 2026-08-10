'use client';

// ---------------------------------------------------------------------------
// Serializes external-wallet (WalletConnect/Lobstr/Freighter) signing requests
// and absorbs the transient "A request is already pending" error — finding
// #54, hit live on mainnet by a Lobstr user mid savings-deposit.
//
// THE BUG: a savings deposit signs TWO transactions back-to-back (fee, then
// deposit). WalletConnect allows ONE open signing request per session; firing
// request #2 a split-second after #1 resolved can bounce off session state
// that hasn't cleared yet: "A request is already pending." The user's fee was
// charged and the deposit never happened. This is the WalletConnect twin of
// the passkey bug fixed in turnkey/webauthn-guard.ts — that guard only covers
// Turnkey signing, and scoping it that way was wrong.
//
// THE FIX, same three layers, tuned for WalletConnect's slower round trips:
//  1. A queue — our code never has two wallet signing requests in flight.
//  2. A settle pause between consecutive requests, so the wallet/session
//     finishes closing request #1 before #2 arrives.
//  3. On "already pending": wait, then ONE retry. Unlike the passkey guard's
//     fast-fail heuristic, a pending-bounce here is safe to retry regardless
//     of timing — the rejected request was never queued, so retrying cannot
//     double-sign anything.
//
// If the error still survives (a genuinely stuck request from an abandoned
// attempt), it is rethrown with instructions a human can act on. Stuck
// WalletConnect requests also expire on their own within minutes, and a
// disconnect/reconnect always clears the session — the user is never
// permanently stuck, and funds are never affected (signing is the only thing
// jammed, and only in this session).
// ---------------------------------------------------------------------------

const SETTLE_MS = 750;
const PENDING_RETRY_DELAY_MS = 2_500;

export const WALLET_REQUEST_PENDING_MESSAGE =
  'Your wallet has an unanswered request. Open your wallet app (e.g. Lobstr on your phone) and approve or dismiss it — or disconnect and reconnect your wallet — then try again.';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function isRequestPending(error: unknown): boolean {
  const e = error as { message?: string } | null;
  return /request is already pending/i.test(e?.message ?? '');
}

// Queue tail: at most one wallet signing request in flight per tab.
let tail: Promise<unknown> = Promise.resolve();

async function attempt<T>(sign: () => Promise<T>): Promise<T> {
  try {
    return await sign();
  } catch (error) {
    if (isRequestPending(error)) {
      // The bounced request was never queued wallet-side, so one retry after
      // the session has had time to settle cannot double-sign.
      console.warn('[wallet-kit-guard] request bounced as already-pending — retrying once');
      await sleep(PENDING_RETRY_DELAY_MS);
      return sign();
    }
    throw error;
  }
}

/**
 * Run an external-wallet signing request serialized against all others, with
 * one retry on the already-pending bounce and a human-actionable error when
 * the jam is real.
 */
export function runWalletKitSigning<T>(sign: () => Promise<T>): Promise<T> {
  const run = tail
    .catch(() => {})
    .then(() => sleep(SETTLE_MS))
    .then(() => attempt(sign))
    .catch((error) => {
      if (isRequestPending(error)) {
        throw new Error(WALLET_REQUEST_PENDING_MESSAGE, { cause: error });
      }
      throw error;
    });
  tail = run.catch(() => {});
  return run;
}

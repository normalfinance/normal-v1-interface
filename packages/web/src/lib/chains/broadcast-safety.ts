// ---------------------------------------------------------------------------
// Never send a swap twice (2026-11-08).
//
// A broadcast that throws does not prove the transaction stayed home: an RPC
// can pass it on and then time out, or a transport retry can land on a node
// that already has it. Treating every throw as "nothing was sent" offered
// "Try again", and on Ethereum (the next nonce) or Solana (a fresh blockhash)
// a second try is a second, separate swap. Likewise the nonce-race retry that
// re-signed on "already known": that phrase means the node already holds THIS
// transaction, so re-signing made a second one.
//
// The rules, the same on every chain:
// - the transaction's id is known BEFORE it is sent (EVM: keccak256 of the
//   signed bytes; Solana: its first signature; Bitcoin: our route knows it);
// - a send error is sorted into what it proves (`sendVerdict`):
//     sent      the network already holds this exact transaction
//     rejected  the network refused it, so it can be tried again
//     unknown   anything else: it may or may not have gone out
// - "unknown" is settled from the chain (`settleUncertainSend`): resend the
//   SAME signed bytes (idempotent: same id) and look the id up for a while;
// - still unknown after that: `BroadcastUncertainError`, and the page must
//   not offer another send. Pure apart from the callbacks it is given.
// ---------------------------------------------------------------------------

export type SendChainKind = 'evm' | 'solana' | 'bitcoin';
export type SendVerdict = 'sent' | 'rejected' | 'unknown';

/** What the page says when it cannot tell. Engines pass it through t(). */
export const UNCERTAIN_SEND_MESSAGE =
  "We couldn't tell whether this swap was sent. Check Activity before you try again, so you don't swap twice.";

const compact = (message: string) => message.toLowerCase().replace(/[\s_-]/g, '');

/**
 * What a send error proves. Bitcoin goes through our own route, which relays
 * the node's refusal as a 4xx and its own trouble as a 5xx, so its HTTP status
 * decides; the message only says when the transaction is already known.
 */
export function sendVerdict(
  kind: SendChainKind,
  message: string,
  httpStatus?: number
): SendVerdict {
  const m = message.toLowerCase();
  const c = compact(message);

  if (kind === 'evm') {
    // geth "already known", erigon "ALREADY_EXISTS", others "AlreadyKnown"
    // (the same normalisation server/send-records.ts uses).
    if (
      c.includes('alreadyknown') ||
      c.includes('alreadyexists') ||
      c.includes('knowntransaction')
    ) {
      return 'sent';
    }
    if (
      /nonce too (low|high)|insufficient funds|intrinsic gas|exceeds block gas limit|gas limit reached|underpriced|invalid sender|invalid signature|max fee per gas less than|fee cap|tip higher than/.test(
        m
      )
    ) {
      return 'rejected';
    }
    return 'unknown';
  }

  if (kind === 'solana') {
    if (c.includes('alreadybeenprocessed') || c.includes('alreadyprocessed')) return 'sent';
    if (
      /simulation failed|blockhash not found|insufficient funds|insufficient lamports|custom program error|invalid account|signature verification/.test(
        m
      )
    ) {
      return 'rejected';
    }
    return 'unknown';
  }

  // bitcoin
  if (/txn-already-in-mempool|txn-already-known|already in block chain/.test(m)) return 'sent';
  if (httpStatus !== undefined && httpStatus >= 400 && httpStatus < 500) return 'rejected';
  // 502 from our route = every relay refused it after checking the mempool
  // for this very transaction (api/turnkey/broadcast-btc).
  if (httpStatus === 502) return 'rejected';
  return 'unknown';
}

/**
 * An EVM error that may only mean "another transaction took this nonce". The
 * caller asks the chain whether that transaction is OURS before re-signing.
 */
export const isNonceRace = (message: string) =>
  /nonce too low|replacement transaction underpriced/i.test(message);

/** The send may or may not have reached the network; nothing must be re-sent. */
export class BroadcastUncertainError extends Error {
  readonly chain: string;

  /** The transaction's own id, when it is known before broadcast. */
  readonly hash: string | null;

  /** Which leg of a Circle transfer it was, set by the burn helpers: a
   *  permission ('approve') moves no money, the 'burn' does. Null elsewhere. */
  step: UncertainStep | null = null;

  constructor(chain: string, hash: string | null, step: UncertainStep | null = null) {
    super(UNCERTAIN_SEND_MESSAGE);
    this.name = 'BroadcastUncertainError';
    this.chain = chain;
    this.hash = hash;
    this.step = step;
  }
}

export type UncertainStep = 'approve' | 'burn';

export const isBroadcastUncertain = (err: unknown): err is BroadcastUncertainError =>
  err instanceof BroadcastUncertainError ||
  (typeof err === 'object' &&
    err !== null &&
    (err as { name?: string }).name === 'BroadcastUncertainError');

/** Mark an unclear send with the leg it was (the burn helpers call this). */
export function tagUncertainStep<E>(err: E, step: UncertainStep): E {
  if (isBroadcastUncertain(err)) (err as BroadcastUncertainError).step = step;
  return err;
}

/**
 * The hash a transfer row must keep after an unclear send: the burn's own,
 * and only the burn's. A lost burn hash strands the money (nothing ever asks
 * Circle for it); a permission's hash saved as the burn leaves the row
 * waiting for Circle forever. Null when the unclear send was anything else.
 */
export const uncertainBurnHash = (err: unknown): string | null =>
  isBroadcastUncertain(err) && err.step === 'burn' ? err.hash : null;

export const SETTLE_WINDOW_MS = 30_000;
const SETTLE_INTERVAL_MS = 3_000;

type Settled<T> = { sent: true; resent?: T } | { sent: false };

/**
 * Settle an "unknown" send from the network itself:
 * 1. is the transaction already known? then it was sent;
 * 2. resend the SAME signed bytes once: a success (or an "already known")
 *    means it is out, and the same bytes can never become a second swap;
 * 3. otherwise keep looking for its id until the window closes.
 */
export async function settleUncertainSend<T>(opts: {
  /** Does the network know this transaction? Errors count as "not yet". */
  lookup?: () => Promise<boolean>;
  /** Re-send exactly the signed bytes that were sent before. */
  resend: () => Promise<T>;
  /** What a resend's error proves (a "sent" verdict ends it). */
  verdictOf: (err: unknown) => SendVerdict;
  windowMs?: number;
  intervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}): Promise<Settled<T>> {
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = opts.now ?? Date.now;
  const deadline = now() + (opts.windowMs ?? SETTLE_WINDOW_MS);
  const known = async () => (opts.lookup ? opts.lookup().catch(() => false) : false);

  if (await known()) return { sent: true };

  try {
    const resent = await opts.resend();
    return { sent: true, resent };
  } catch (err) {
    if (opts.verdictOf(err) === 'sent') return { sent: true };
  }

  while (now() < deadline) {
    await sleep(opts.intervalMs ?? SETTLE_INTERVAL_MS);
    if (await known()) return { sent: true };
  }
  return { sent: false };
}

/** The message a library error carries (viem keeps the short one apart). */
export const errorMessage = (err: unknown): string => {
  const e = err as { shortMessage?: unknown; message?: unknown } | null;
  return String(e?.shortMessage ?? e?.message ?? err ?? '');
};

// ---- base58 (Solana's transaction id is its first signature, base58) -------

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function base58(bytes: Uint8Array): string {
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  // Repeated division of the big-endian number by 58, digits least first.
  const digits: number[] = [];
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] * 256;
      digits[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  return (
    '1'.repeat(zeros) +
    digits
      .reverse()
      .map((d) => ALPHABET[d])
      .join('')
  );
}

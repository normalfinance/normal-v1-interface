import type { PublicKey, VersionedTransaction } from '@solana/web3.js';

// ---------------------------------------------------------------------------
// A Solana transaction names a recent blockhash and is only good for about a
// minute after it (~150 blocks). LI.FI builds the transaction when the price
// is fetched, so a person who reads the review page for longer than that signs
// a transaction Solana no longer takes: it answers "Blockhash not found" and
// nothing is sent (live 2026-11-09, SOL to USDC).
//
// The fix is to put a fresh blockhash in right before the passkey prompt. That
// changes the signed bytes, so it is only safe when nothing else depends on
// them: the person must be the one and only signer (no signature from anyone
// else to break), and the transaction must not run on a durable nonce (there
// the "blockhash" field holds the nonce value and must stay as it is).
// Checked on real LI.FI quotes (near, mayan, mayanMCTP): one signer, the
// person, nothing pre-signed, a compute-budget instruction first.
// ---------------------------------------------------------------------------

const SYSTEM_PROGRAM = '11111111111111111111111111111111';
/** SystemInstruction::AdvanceNonceAccount, a little-endian u32 in the data. */
const ADVANCE_NONCE_ACCOUNT = 4;

/**
 * True when Solana refused a send because its blockhash had expired. Nothing
 * was sent. When the blockhash could not be refreshed (another signer, a
 * durable nonce), signing the same quote again fails the same way, so the
 * engines treat the quote as stale and the next Confirm fetches a new one.
 */
export function isBlockhashExpired(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? err ?? '');
  return /blockhash not found|block ?height exceeded/i.test(msg);
}

/** How long one blockhash read may take before we stop waiting for it. */
export const BLOCKHASH_READ_MS = 5_000;
/** The pause before the one retry. */
export const BLOCKHASH_RETRY_MS = 800;

/**
 * A fresh blockhash from `read`, or null. One retry after a short pause, and
 * no read may hold the swap longer than BLOCKHASH_READ_MS: a stalled node
 * would otherwise keep the person waiting before the passkey prompt for as
 * long as the platform's fetch waits (suggested by the mobile review). Null
 * means keep the quote's own blockhash: the send then gives the real answer,
 * and an expired one marks the quote stale (isBlockhashExpired).
 */
export async function freshBlockhash(
  read: () => Promise<{ blockhash: string }>,
  {
    readMs = BLOCKHASH_READ_MS,
    retryMs = BLOCKHASH_RETRY_MS,
    sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
  }: { readMs?: number; retryMs?: number; sleep?: (ms: number) => Promise<void> } = {}
): Promise<string | null> {
  const once = async (): Promise<string | null> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const late = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), readMs);
    });
    try {
      return await Promise.race([
        read()
          .then((got) => got?.blockhash || null)
          .catch(() => null),
        late,
      ]);
    } finally {
      clearTimeout(timer);
    }
  };
  const first = await once();
  if (first) return first;
  await sleep(retryMs);
  return once();
}

/** True when this unsigned transaction can take a fresh blockhash safely. */
export function canRefreshBlockhash(vtx: VersionedTransaction, signer: PublicKey): boolean {
  const { message } = vtx;
  if (message.header.numRequiredSignatures !== 1) return false;
  if (!message.staticAccountKeys[0]?.equals(signer)) return false;

  // A durable-nonce transaction always starts with AdvanceNonceAccount.
  const first = message.compiledInstructions[0];
  if (first) {
    const program = message.staticAccountKeys[first.programIdIndex];
    const d = first.data;
    const advancesNonce =
      program?.toBase58() === SYSTEM_PROGRAM &&
      d.length >= 4 &&
      d[0] === ADVANCE_NONCE_ACCOUNT &&
      d[1] === 0 &&
      d[2] === 0 &&
      d[3] === 0;
    if (advancesNonce) return false;
  }
  return true;
}

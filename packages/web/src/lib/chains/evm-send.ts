import type { Hex } from 'viem';

import { keccak256 } from 'viem';

import {
  isNonceRace,
  sendVerdict,
  errorMessage,
  settleUncertainSend,
  BroadcastUncertainError,
} from './broadcast-safety';

// ---------------------------------------------------------------------------
// Broadcast one SIGNED EVM transaction, safely (see broadcast-safety.ts).
// Shared by every EVM send that signs with a passkey or with Autopilot: the
// LI.FI Ethereum source, the Base burn and pivot legs, and the server's
// autopilot burn and pivot. It never signs anything itself, so the worst it
// can do is say "not sure"; only the caller can decide to sign again, and it
// is told to only when the chain shows our transaction is not the one there.
// ---------------------------------------------------------------------------

/** The two calls it needs, so any viem public client fits whatever its chain. */
export interface EvmSendClient {
  sendRawTransaction(args: { serializedTransaction: Hex }): Promise<Hex>;
  getTransaction(args: { hash: Hex }): Promise<unknown>;
}

export type EvmSendResult =
  | { sent: true; hash: Hex }
  /** Another transaction holds the nonce and ours is not out: re-sign may follow. */
  | { sent: false; error: unknown };

/** How long a nonce race waits for our own transaction to show up. */
const NONCE_LOOKUP_MS = 9_000;

const known = (client: EvmSendClient, hash: Hex) =>
  client
    .getTransaction({ hash })
    .then(() => true)
    .catch(() => false);

async function seenWithin(
  client: EvmSendClient,
  hash: Hex,
  ms: number,
  sleep: (ms: number) => Promise<void>
) {
  const deadline = Date.now() + ms;
  for (;;) {
    if (await known(client, hash)) return true;
    if (Date.now() >= deadline) return false;
    await sleep(3_000);
  }
}

export async function sendSignedEvmTransaction(
  client: EvmSendClient,
  raw: Hex,
  opts: {
    /** For the error: "ethereum", "base". */
    chainLabel: string;
    windowMs?: number;
    nonceLookupMs?: number;
    sleep?: (ms: number) => Promise<void>;
  }
): Promise<EvmSendResult> {
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  // The transaction's id, before it leaves: keccak256 of the signed bytes.
  const ours = keccak256(raw);

  try {
    return { sent: true, hash: await client.sendRawTransaction({ serializedTransaction: raw }) };
  } catch (err) {
    const message = errorMessage(err);

    if (sendVerdict('evm', message) === 'sent') return { sent: true, hash: ours };

    if (isNonceRace(message)) {
      // Is OUR transaction the one holding the nonce (a first answer that
      // was lost)? Then it is sent. Only if not may the caller sign again.
      if (await seenWithin(client, ours, opts.nonceLookupMs ?? NONCE_LOOKUP_MS, sleep)) {
        return { sent: true, hash: ours };
      }
      return { sent: false, error: err };
    }

    if (sendVerdict('evm', message) === 'rejected') throw err;

    const settled = await settleUncertainSend({
      lookup: () => known(client, ours),
      resend: () => client.sendRawTransaction({ serializedTransaction: raw }),
      verdictOf: (e) => sendVerdict('evm', errorMessage(e)),
      windowMs: opts.windowMs,
      sleep,
    });
    if (settled.sent) return { sent: true, hash: ours };
    throw new BroadcastUncertainError(opts.chainLabel, ours);
  }
}

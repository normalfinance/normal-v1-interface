import { randomBytes } from 'node:crypto';
import {
  Account,
  Keypair,
  BASE_FEE,
  Operation,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

// ---------------------------------------------------------------------------
// Proof that someone controls a Stellar account, not just knows its address.
//
// Linking an address used to need nothing but the address, and a linked
// address is what every "is this your wallet?" check trusts. Anyone could claim
// anyone's address (security report, 2026-11-04). Now the wallet signs a
// challenge first.
//
// The challenge is a transaction with sequence number 0, which the network
// never accepts, so it can be signed but never submitted: the same trick as
// SEP-10. Every wallet we support (Freighter, Lobstr, Ledger, WalletConnect)
// signs transactions, so nothing needs message-signing support.
// ---------------------------------------------------------------------------

export const LINK_CHALLENGE_TTL_SECONDS = 300;

const CHALLENGE_DATA_NAME = 'Normal wallet link';

/** Per user and address, so a signature for one account's challenge can't link another's. */
export const linkChallengeKey = (userId: string, walletAddress: string) =>
  `wallet-link:challenge:${userId}:${walletAddress}`;

export function buildLinkChallenge(
  walletAddress: string,
  networkPassphrase: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): { xdr: string; hash: string } {
  // TransactionBuilder adds one, so '-1' becomes sequence 0.
  const source = new Account(walletAddress, '-1');
  const transaction = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase,
    timebounds: { minTime: nowSeconds, maxTime: nowSeconds + LINK_CHALLENGE_TTL_SECONDS },
  })
    // 48 random bytes is 64 base64 characters, the most a data entry holds.
    .addOperation(
      Operation.manageData({ name: CHALLENGE_DATA_NAME, value: randomBytes(48).toString('base64') })
    )
    .build();
  return { xdr: transaction.toXDR(), hash: transaction.hash().toString('hex') };
}

/** Whether any signature on the transaction is a valid one from this account's key. */
export function isSignedBy(transaction: Transaction, accountAddress: string): boolean {
  let keypair: Keypair;
  try {
    keypair = Keypair.fromPublicKey(accountAddress);
  } catch {
    return false;
  }
  const hash = transaction.hash();
  return transaction.signatures.some((signature) => {
    try {
      return keypair.verify(hash, signature.signature());
    } catch {
      return false;
    }
  });
}

/**
 * True only for the exact challenge we issued (the hash covers source, sequence,
 * operation and time window, but not the signatures), still in its window, and
 * signed by the account's own key.
 */
export function verifyLinkProof(params: {
  signedXdr: string;
  walletAddress: string;
  expectedHash: string;
  networkPassphrase: string;
  nowSeconds?: number;
}): boolean {
  const { signedXdr, walletAddress, expectedHash, networkPassphrase } = params;
  const nowSeconds = params.nowSeconds ?? Math.floor(Date.now() / 1000);

  let transaction: Transaction;
  try {
    const parsed = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
    if (!(parsed instanceof Transaction)) return false;
    transaction = parsed;
  } catch {
    return false;
  }

  if (transaction.hash().toString('hex') !== expectedHash) return false;
  if (transaction.source !== walletAddress) return false;
  const maxTime = Number(transaction.timeBounds?.maxTime ?? 0);
  if (!maxTime || nowSeconds > maxTime) return false;

  return isSignedBy(transaction, walletAddress);
}

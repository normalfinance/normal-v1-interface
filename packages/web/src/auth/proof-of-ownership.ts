import { constants } from '@normalfinance/utils';
import { markWalletVerifiedForSession } from '@/utils/wallet-proof';
import { Account, Keypair, Operation, Transaction, TransactionBuilder } from '@stellar/stellar-sdk';

/**
 * Build a short, unique challenge string guaranteed <= 64 bytes.
 * Format: "normal:{base36_ts}:{base36_nonce}"
 */
export function buildChallengeMessage(): string {
  const ts = Date.now().toString(36); // compact timestamp
  const rand = Math.random().toString(36).slice(2, 10); // 8 chars
  const challenge = `normal:${ts}:${rand}`;
  // Defensive: ensure <= 64 bytes (ASCII string, so bytes === length)
  return challenge.length <= 64 ? challenge : challenge.slice(0, 64);
}

/**
 * Build a non-submitting challenge transaction that encodes our challenge as a ManageData op.
 * Source account is the user's address; sequence number "0" is a standard SEP-10-style approach.
 */
export function buildChallengeTransaction(params: {
  address: string;
  challenge: string;
  networkPassphrase: string;
}) {
  const { address, challenge, networkPassphrase } = params;

  const account = new Account(address, '0');
  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase,
  })
    .addOperation(
      Operation.manageData({
        name: 'normal:auth',
        value: challenge,
      })
    )
    .setTimeout(300)
    .build();

  return tx;
}

/**
 * Verify that the signedXDR includes a valid signature from `address`.
 */
export function verifySignedChallenge(params: {
  address: string;
  signedXDR: string;
  networkPassphrase: string;
}): boolean {
  const { address, signedXDR, networkPassphrase } = params;

  // Parse the signed transaction
  const signedTx = new Transaction(signedXDR, networkPassphrase);

  // Hash: Buffer in Node, Uint8Array in browser
  const txHash: Uint8Array = (signedTx as any).hash();
  const keypair = Keypair.fromPublicKey(address);

  const B = (globalThis as any).Buffer;
  const msgBufLike = B ? B.from(txHash) : (txHash as Uint8Array);

  // Ensure at least one signature validates against the user's public key
  return (
    (signedTx as any).signatures?.some((sig: any) => {
      try {
        // sig.signature() may return Buffer; normalize to Uint8Array
        const raw = typeof sig.signature === 'function' ? sig.signature() : sig.signature;
        const sigBytes: Uint8Array = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
        const sigBufLike = B ? B.from(sigBytes) : sigBytes;
        return (keypair as any).verify(msgBufLike as any, sigBufLike as any);
      } catch {
        return false;
      }
    }) ?? false
  );
}

/**
 * Run the full proof flow using a signer:
 *  - build challenge
 *  - sign challenge tx via the Stellar Wallets Kit
 *  - verify signature
 *  - mark verified in sessionStorage
 *
 * Returns the challenge string on success. Throws on failure.
 */
export async function runProofOfOwnership(params: {
  address: string;
  signTransaction: (xdr: string) => Promise<string>; // kit signer
  networkPassphrase?: string;
  message?: string;
}): Promise<string> {
  const {
    address,
    signTransaction,
    networkPassphrase = constants.StellarConfig.NETWORK_PASSPHRASE,
    message,
  } = params;

  const challenge = message && message.length <= 64 ? message : buildChallengeMessage();
  const tx = buildChallengeTransaction({ address, challenge, networkPassphrase });

  const signedXDR = await signTransaction(tx.toXDR());
  if (!signedXDR) {
    throw new Error('Signing failed or no signature returned.');
  }

  const ok = verifySignedChallenge({ address, signedXDR, networkPassphrase });
  if (!ok) {
    throw new Error('Signature verification failed.');
  }

  markWalletVerifiedForSession(address);
  return challenge;
}

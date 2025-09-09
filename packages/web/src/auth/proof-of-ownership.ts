import { Account, Keypair, Operation, Transaction, TransactionBuilder } from '@stellar/stellar-sdk';
import { constants } from '@normalfinance/utils';
import { markWalletVerifiedForSession } from '@/utils/wallet-proof';

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
 * Source account is the user's address; sequence number "0" is the standard SEP-10 approach.
 */
export function buildChallengeTransaction(params: {
  address: string;
  challenge: string;
  networkPassphrase: string;
}) {
  const { address, challenge, networkPassphrase } = params;

  const account = new Account(address, '0'); // sequence '0' for challenge tx
  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase,
  })
    .addOperation(
      Operation.manageData({
        name: 'normal:auth',
        // IMPORTANT: manageData value must be string | Buffer | null (max 64 bytes)
        value: challenge,
      })
    )
    // Make challenge fresh; 5 minutes is plenty
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
  const txHash = signedTx.hash();
  const keypair = Keypair.fromPublicKey(address);

  // Ensure at least one signature validates against the user's public key
  return signedTx.signatures.some((sig) => {
    try {
      return keypair.verify(txHash, sig.signature());
    } catch {
      return false;
    }
  });
}

/**
 * Run the full proof flow using the provided connector:
 *  - build challenge
 *  - sign challenge tx
 *  - verify signature
 *  - mark verified in sessionStorage
 *
 * Returns the challenge string on success. Throws on failure.
 */
export async function runProofOfOwnership(params: {
  walletType: 'freighter' | 'xbull' | 'lobstr' | 'hana' | 'wallet-connect';
  address: string;
  signTransaction: (
    xdr: string,
    opts?: { networkPassphrase?: string; accountToSign?: string }
  ) => Promise<string>;
  networkPassphrase?: string; // defaults to constants.StellarConfig.NETWORK_PASSPHRASE
}): Promise<string> {
  const {
    walletType,
    address,
    signTransaction,
    networkPassphrase = constants.StellarConfig.NETWORK_PASSPHRASE,
  } = params;

  const challenge = buildChallengeMessage();
  const tx = buildChallengeTransaction({ address, challenge, networkPassphrase });

  const signedXDR = await signTransaction(tx.toXDR(), {
    networkPassphrase,
    accountToSign: address,
  });

  const ok = verifySignedChallenge({ address, signedXDR, networkPassphrase });
  if (!ok) {
    throw new Error('Signature verification failed.');
  }

  // One-time per session
  markWalletVerifiedForSession(address);
  return challenge;
}

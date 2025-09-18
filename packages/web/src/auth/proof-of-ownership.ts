import { constants } from '@normalfinance/utils';
import { markWalletVerifiedForSession } from '@/utils/wallet-proof';
// packages/web/src/auth/proof-of-ownership.ts
import { Account, Keypair, Operation, Transaction, TransactionBuilder } from '@stellar/stellar-sdk';

export function buildChallengeMessage(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  const challenge = `normal:${ts}:${rand}`;
  return challenge.length <= 64 ? challenge : challenge.slice(0, 64);
}

export function buildChallengeTransaction(params: {
  address: string;
  challenge: string;
  networkPassphrase: string;
}) {
  const { address, challenge, networkPassphrase } = params;
  const account = new Account(address, '0');
  const tx = new TransactionBuilder(account, { fee: '100', networkPassphrase })
    .addOperation(
      Operation.manageData({
        name: 'normal:auth',
        value: challenge, // <= 64 bytes
      })
    )
    .setTimeout(300)
    .build();
  return tx;
}

export function verifySignedChallenge(params: {
  address: string;
  signedXDR: string;
  networkPassphrase: string;
}): boolean {
  const { address, signedXDR, networkPassphrase } = params;
  const signedTx = new Transaction(signedXDR, networkPassphrase);
  const txHash: Uint8Array = (signedTx as any).hash();
  const keypair = Keypair.fromPublicKey(address);

  const B = (globalThis as any).Buffer;
  const msgBufLike = B ? B.from(txHash) : (txHash as Uint8Array);

  return (
    (signedTx as any).signatures?.some((sig: any) => {
      try {
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

export async function runProofOfOwnership(params: {
  address: string;
  signTransaction: (xdr: string) => Promise<string>;
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
  if (!signedXDR) throw new Error('Signing failed or no signature returned.');

  const ok = verifySignedChallenge({ address, signedXDR, networkPassphrase });
  if (!ok) throw new Error('Signature verification failed.');

  markWalletVerifiedForSession(address);
  return challenge;
}

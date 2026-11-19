import { Keypair } from '@stellar/stellar-sdk';

/**
 * Doc 129: Turnkey's raw ed25519 answers (r and s per payload) as 64-byte
 * Stellar signatures, each verified against the account's own public key
 * before it is used. A reordered answer or one from another key fails here,
 * loudly, instead of on chain. Pure.
 */
export function toVerifiedSignatures(
  signatures: { r?: string; s?: string }[],
  hashes: Buffer[],
  stellarAddress: string
): Buffer[] {
  if (signatures.length !== hashes.length) {
    throw new Error(`Got ${signatures.length} signatures for ${hashes.length} payloads`);
  }
  const key = Keypair.fromPublicKey(stellarAddress);
  return signatures.map((sig, i) => {
    if (!sig?.r || !sig?.s) throw new Error(`Turnkey signature ${i + 1} is missing r or s`);
    const signature = Buffer.from(sig.r + sig.s, 'hex');
    if (!key.verify(hashes[i], signature)) {
      throw new Error(`Turnkey signature ${i + 1} does not match the wallet's key`);
    }
    return signature;
  });
}

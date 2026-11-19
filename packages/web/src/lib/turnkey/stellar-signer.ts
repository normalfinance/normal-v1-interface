'use client';

import { constants } from '@normalfinance/utils';
import { createPasskeyStamper } from '@/lib/turnkey/passkey-stamper';
import { xdr, Keypair, TransactionBuilder } from '@stellar/stellar-sdk';

import { runWebauthnCeremony } from './webauthn-guard';
import { toVerifiedSignatures } from './stellar-signatures';

// ---------------------------------------------------------------------------
// Signs a Stellar transaction with the user's Turnkey-held key via passkey.
//
// Turnkey has no native Stellar transaction type, so we hash the transaction
// locally (SHA-256 of the signature base — what Stellar actually signs) and
// have the enclave sign the digest raw with the ed25519 key. hashFunction
// must be HASH_FUNCTION_NOT_APPLICABLE for ed25519 per Turnkey's API.
// ---------------------------------------------------------------------------

export async function signStellarXdrWithTurnkey(
  xdrString: string,
  networkPassphrase: string | undefined,
  subOrgId: string,
  stellarAddress: string
): Promise<string> {
  const passphrase = networkPassphrase ?? constants.StellarConfig.NETWORK_PASSPHRASE;
  const tx = TransactionBuilder.fromXDR(xdrString, passphrase);
  const payload = tx.hash().toString('hex');

  const { TurnkeyClient } = await import('@turnkey/http');

  const stamper = await createPasskeyStamper();
  const client = new TurnkeyClient({ baseUrl: 'https://api.turnkey.com' }, stamper);

  // Serialized + fast-fail-retried: savings signs two transactions
  // back-to-back, and overlapping/immediately-successive ceremonies are what
  // produced the intermittent "operation either timed out or was not
  // allowed" (see webauthn-guard.ts).
  const result = await runWebauthnCeremony(() =>
    client.signRawPayload({
      type: 'ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2',
      timestampMs: String(Date.now()),
      organizationId: subOrgId,
      parameters: {
        signWith: stellarAddress,
        payload,
        encoding: 'PAYLOAD_ENCODING_HEXADECIMAL',
        hashFunction: 'HASH_FUNCTION_NOT_APPLICABLE',
      },
    })
  );

  const sig = result?.activity?.result?.signRawPayloadResult;
  if (!sig?.r || !sig?.s) throw new Error('Turnkey signing failed: no signature returned');

  // ed25519 signature is r||s (64 bytes); v is unused
  const signature = Buffer.from(sig.r + sig.s, 'hex');
  const hint = Keypair.fromPublicKey(stellarAddress).signatureHint();
  tx.signatures.push(new xdr.DecoratedSignature({ hint, signature }));

  return tx.toXDR();
}

// ---------------------------------------------------------------------------
// Doc 129 Phase 1: many Stellar hashes, ONE passkey ceremony.
//
// ACTIVITY_TYPE_SIGN_RAW_PAYLOADS signs every payload with the same key in one
// activity, so one passkey prompt covers them all (Bitcoin already signs its
// inputs this way, lib/lifi/btc-sign.ts). Turnkey documents ed25519 for it:
// hashFunction must be HASH_FUNCTION_NOT_APPLICABLE.
//
// A hash is either a transaction's (what Stellar signs for an envelope) or a
// Soroban authorization entry's (doc 129 Phase 3); both are 32 bytes signed
// raw with ed25519. Every signature is checked against the account's own key
// before it is used, so a reordered or wrong answer fails here, loudly,
// instead of on chain.
// ---------------------------------------------------------------------------

export async function signStellarHashesWithTurnkey(
  hashes: Buffer[],
  subOrgId: string,
  stellarAddress: string
): Promise<Buffer[]> {
  if (hashes.length === 0) return [];
  if (hashes.some((h) => h.length !== 32)) throw new Error('Stellar hashes must be 32 bytes');

  const { TurnkeyClient } = await import('@turnkey/http');
  const stamper = await createPasskeyStamper();
  const client = new TurnkeyClient({ baseUrl: 'https://api.turnkey.com' }, stamper);

  const result = await runWebauthnCeremony(() =>
    client.signRawPayloads({
      type: 'ACTIVITY_TYPE_SIGN_RAW_PAYLOADS',
      timestampMs: String(Date.now()),
      organizationId: subOrgId,
      parameters: {
        signWith: stellarAddress,
        payloads: hashes.map((h) => h.toString('hex')),
        encoding: 'PAYLOAD_ENCODING_HEXADECIMAL',
        hashFunction: 'HASH_FUNCTION_NOT_APPLICABLE',
      },
    })
  );

  const signatures = result?.activity?.result?.signRawPayloadsResult?.signatures;
  if (!signatures || signatures.length !== hashes.length) {
    throw new Error(
      `Turnkey returned ${signatures?.length ?? 0} signatures for ${hashes.length} payloads`
    );
  }
  return toVerifiedSignatures(signatures, hashes, stellarAddress);
}

/** Sign several transactions with one passkey prompt. Same order out as in. */
export async function signStellarXdrsWithTurnkey(
  xdrStrings: string[],
  networkPassphrase: string | undefined,
  subOrgId: string,
  stellarAddress: string
): Promise<string[]> {
  const passphrase = networkPassphrase ?? constants.StellarConfig.NETWORK_PASSPHRASE;
  const txs = xdrStrings.map((x) => TransactionBuilder.fromXDR(x, passphrase));
  const signatures = await signStellarHashesWithTurnkey(
    txs.map((tx) => tx.hash()),
    subOrgId,
    stellarAddress
  );
  const hint = Keypair.fromPublicKey(stellarAddress).signatureHint();
  return txs.map((tx, i) => {
    tx.signatures.push(new xdr.DecoratedSignature({ hint, signature: signatures[i] }));
    return tx.toXDR();
  });
}

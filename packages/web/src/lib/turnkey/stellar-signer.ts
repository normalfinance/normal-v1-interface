'use client';

import { constants } from '@normalfinance/utils';
import { xdr, Keypair, TransactionBuilder } from '@stellar/stellar-sdk';

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

  const rpId =
    typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_TURNKEY_RP_ID ?? window.location.hostname
      : 'localhost';

  const { WebauthnStamper } = await import('@turnkey/webauthn-stamper');
  const { TurnkeyClient } = await import('@turnkey/http');

  const stamper = new WebauthnStamper({ rpId });
  const client = new TurnkeyClient({ baseUrl: 'https://api.turnkey.com' }, stamper);

  const result = await client.signRawPayload({
    type: 'ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2',
    timestampMs: String(Date.now()),
    organizationId: subOrgId,
    parameters: {
      signWith: stellarAddress,
      payload,
      encoding: 'PAYLOAD_ENCODING_HEXADECIMAL',
      hashFunction: 'HASH_FUNCTION_NOT_APPLICABLE',
    },
  });

  const sig = result?.activity?.result?.signRawPayloadResult;
  if (!sig?.r || !sig?.s) throw new Error('Turnkey signing failed — no signature returned');

  // ed25519 signature is r||s (64 bytes); v is unused
  const signature = Buffer.from(sig.r + sig.s, 'hex');
  const hint = Keypair.fromPublicKey(stellarAddress).signatureHint();
  tx.signatures.push(new xdr.DecoratedSignature({ hint, signature }));

  return tx.toXDR();
}

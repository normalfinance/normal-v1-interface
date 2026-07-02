'use client';

// ---------------------------------------------------------------------------
// WebAuthn passkey registration for Turnkey sub-org creation.
// Shared by the Bitcoin wallet setup and the wallet-import flow.
// ---------------------------------------------------------------------------

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export interface PasskeyRegistration {
  challenge: string;
  attestation: {
    credentialId: string;
    clientDataJson: string;
    attestationObject: string;
    transports: string[];
  };
}

/**
 * Runs the WebAuthn create() ceremony (Face ID / Touch ID / Windows Hello)
 * and returns the challenge + attestation Turnkey needs to register the
 * passkey as a sub-org root authenticator.
 */
export async function createPasskeyRegistration(
  userId: string,
  userEmail?: string | null
): Promise<PasskeyRegistration> {
  const challengeBytes = crypto.getRandomValues(new Uint8Array(32));
  const challenge = toBase64Url(challengeBytes.buffer);

  const rpId = process.env.NEXT_PUBLIC_TURNKEY_RP_ID || 'localhost';
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: challengeBytes,
      rp: { id: rpId, name: 'Normal Finance' },
      user: {
        id: Buffer.from(userId),
        name: userEmail ?? userId,
        displayName: userEmail ?? 'Normal User',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256 (P-256)
        { type: 'public-key', alg: -257 }, // RS256
      ],
      timeout: 60000,
      attestation: 'direct',
      authenticatorSelection: {
        residentKey: 'preferred',
        requireResidentKey: false,
        userVerification: 'preferred',
      },
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error('Passkey creation was cancelled');

  const response = credential.response as AuthenticatorAttestationResponse;

  return {
    challenge,
    attestation: {
      credentialId: toBase64Url(credential.rawId),
      clientDataJson: toBase64Url(response.clientDataJSON),
      attestationObject: toBase64Url(response.attestationObject),
      transports: response.getTransports?.() ?? [],
    },
  };
}

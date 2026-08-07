'use client';

// Signs a serialized EVM transaction with the user's Turnkey-held key via
// passkey (WebAuthn prompt). Turnkey signs Ethereum transactions natively —
// same flow as the ETH send adapter, extracted for reuse by contract calls
// (CCTP burns, future ERC-20 interactions).

export async function signEvmTxWithTurnkey(
  unsignedSerialized: `0x${string}`,
  subOrgId: string,
  signWith: string
): Promise<`0x${string}`> {
  const rpId =
    typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_TURNKEY_RP_ID ?? window.location.hostname)
      : 'localhost';

  const { WebauthnStamper } = await import('@turnkey/webauthn-stamper');
  const { TurnkeyClient } = await import('@turnkey/http');
  const client = new TurnkeyClient(
    { baseUrl: 'https://api.turnkey.com' },
    new WebauthnStamper({ rpId })
  );

  // Serialized against other passkey prompts (CCTP outbound signs Stellar
  // burns then this pivot in one flow) — see webauthn-guard.ts.
  const { runWebauthnCeremony } = await import('./webauthn-guard');
  const result = await runWebauthnCeremony(() =>
    client.signTransaction({
      type: 'ACTIVITY_TYPE_SIGN_TRANSACTION_V2',
      timestampMs: String(Date.now()),
      organizationId: subOrgId,
      parameters: {
        signWith,
        // Turnkey expects the serialized tx without the 0x prefix
        unsignedTransaction: unsignedSerialized.startsWith('0x')
          ? unsignedSerialized.slice(2)
          : unsignedSerialized,
        type: 'TRANSACTION_TYPE_ETHEREUM',
      },
    })
  );

  const signed = result?.activity?.result?.signTransactionResult?.signedTransaction;
  if (!signed) throw new Error('Turnkey signing failed — no signed transaction returned');
  return (signed.startsWith('0x') ? signed : `0x${signed}`) as `0x${string}`;
}

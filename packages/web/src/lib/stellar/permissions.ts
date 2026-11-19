import { xdr, hash, Address, Keypair, nativeToScVal } from '@stellar/stellar-sdk';

// ---------------------------------------------------------------------------
// Doc 129 Phase 3: pre-signed permissions (Soroban authorization entries with
// address credentials). Pure; used by the server, which builds and checks
// them, and by tests.
//
// A permission says "this account allows exactly this contract call, once
// (a random nonce), until this ledger". It does not depend on any ledger
// state, so the person can sign it in the same passkey ceremony as the rest
// of an action, before the money it moves even exists; Normal's relayer
// wraps it in a transaction, simulates and submits it when its time comes.
// Proven end to end on testnet with a real Circle burn (scripts/permission-
// spike/relay-burn.mjs, doc 129 §11).
//
// What the person signs is sha256 of the authorization preimage (network id,
// nonce, expiry ledger, the exact call), raw ed25519, exactly what Turnkey's
// SIGN_RAW_PAYLOAD(S) does with HASH_FUNCTION_NOT_APPLICABLE.
// ---------------------------------------------------------------------------

/** One contract call: contract, function, arguments. */
export function contractCall(
  contractId: string,
  functionName: string,
  args: xdr.ScVal[]
): xdr.InvokeContractArgs {
  return new xdr.InvokeContractArgs({
    contractAddress: new Address(contractId).toScAddress(),
    functionName,
    args,
  });
}

/** A random 64-bit nonce, as the network stores it (signed). Web Crypto: browser and Node alike. */
export function randomNonce(): xdr.Int64 {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return xdr.Int64.fromString(BigInt.asIntN(64, Buffer.from(bytes).readBigUInt64BE()).toString());
}

/**
 * An unsigned permission for exactly `call`, and for exactly the `inner`
 * calls it makes on the account's behalf (none by default). Circle's contract
 * and the token's `approve` need none (recorded on testnet and read from real
 * mainnet burns); a Savings deposit needs one, the USDC transfer into the
 * vault (read from a mainnet simulation, doc 129 §11). A call made with any
 * other inner call does not match the signature and fails.
 */
export function buildPermission(
  account: string,
  call: xdr.InvokeContractArgs,
  expiryLedger: number,
  nonce: xdr.Int64 = randomNonce(),
  inner: xdr.InvokeContractArgs[] = []
): xdr.SorobanAuthorizationEntry {
  return new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsAddress(
      new xdr.SorobanAddressCredentials({
        address: new Address(account).toScAddress(),
        nonce,
        signatureExpirationLedger: expiryLedger,
        signature: xdr.ScVal.scvVoid(),
      })
    ),
    rootInvocation: new xdr.SorobanAuthorizedInvocation({
      function: xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(call),
      subInvocations: inner.map(
        (c) =>
          new xdr.SorobanAuthorizedInvocation({
            function: xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(c),
            subInvocations: [],
          })
      ),
    }),
  });
}

/** The 32 bytes the person signs. */
export function permissionHash(entry: xdr.SorobanAuthorizationEntry, passphrase: string): Buffer {
  const creds = entry.credentials().address();
  const preimage = xdr.HashIdPreimage.envelopeTypeSorobanAuthorization(
    new xdr.HashIdPreimageSorobanAuthorization({
      networkId: hash(Buffer.from(passphrase)),
      nonce: creds.nonce(),
      signatureExpirationLedger: creds.signatureExpirationLedger(),
      invocation: entry.rootInvocation(),
    })
  );
  return hash(preimage.toXDR());
}

/**
 * The signed permission. Refuses a signature that does not verify against
 * the account's own key over this exact hash, so nothing unsigned or signed
 * by anyone else is ever stored or relayed.
 */
export function attachPermissionSignature(
  entry: xdr.SorobanAuthorizationEntry,
  account: string,
  passphrase: string,
  signature: Buffer
): xdr.SorobanAuthorizationEntry {
  const key = Keypair.fromPublicKey(account);
  const payload = permissionHash(entry, passphrase);
  if (signature.length !== 64 || !key.verify(payload, signature)) {
    throw new Error('The signature does not match this permission');
  }
  const signed = xdr.SorobanAuthorizationEntry.fromXDR(entry.toXDR());
  signed
    .credentials()
    .address()
    .signature(
      xdr.ScVal.scvVec([
        nativeToScVal(
          { public_key: key.rawPublicKey(), signature },
          { type: { public_key: ['symbol', null], signature: ['symbol', null] } }
        ),
      ])
    );
  return signed;
}

/** The call a permission allows: what the relayer's transaction invokes. */
export function permittedCall(entry: xdr.SorobanAuthorizationEntry): xdr.InvokeContractArgs {
  return entry.rootInvocation().function().contractFn();
}

/** The account that signs, the expiry ledger. */
export function permissionFacts(entry: xdr.SorobanAuthorizationEntry): {
  account: string;
  expiryLedger: number;
} {
  const creds = entry.credentials().address();
  return {
    account: Address.fromScAddress(creds.address()).toString(),
    expiryLedger: creds.signatureExpirationLedger(),
  };
}

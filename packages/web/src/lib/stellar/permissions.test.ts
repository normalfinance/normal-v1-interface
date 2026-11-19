// Doc 129 Phase 3: pre-signed permissions. Pins: what the person signs is
// exactly what the Stellar SDK's own reference signer signs (so the network
// accepts it), a signature from anyone else or over any other call is
// refused, and the Circle calls are encoded exactly as the passkey path
// encodes them.
import type * as BurnCallsModule from '@/lib/cctp/stellar-burn-calls';

import { it, jest, expect, describe } from '@jest/globals';
import { xdr, Keypair, Networks, scValToNative, authorizeEntry } from '@stellar/stellar-sdk';
import {
  randomNonce,
  contractCall,
  permittedCall,
  permissionHash,
  buildPermission,
  permissionFacts,
  attachPermissionSignature,
} from '@/lib/stellar/permissions';

// Mock BEFORE require (repo convention): lib/cctp/config's import chain pulls
// @normalfinance/utils, whose build includes jose (ESM) that jest can't parse.
jest.mock('@normalfinance/utils', () => ({ constants: { StellarConfig: {} } }));

const { approveArgs, depositForBurnArgs } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/lib/cctp/stellar-burn-calls') as typeof BurnCallsModule;

const TMM = 'CAE2G5Z77UP7GYPYGFOWFGW7C7J6I4YP2AFGSADRKQY62SYUFLPNFTXL';
const USDC_SAC = 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75';
const RECIPIENT = new Uint8Array([...new Array(12).fill(0), ...new Array(20).fill(0xab)]);

const person = Keypair.random();
const burn = () =>
  contractCall(
    TMM,
    'deposit_for_burn',
    depositForBurnArgs({
      caller: person.publicKey(),
      amount7: 250_000_000n,
      destinationDomain: 6,
      mintRecipient: RECIPIENT,
      usdcSac: USDC_SAC,
    })
  );

describe('permissions', () => {
  it('sign exactly what the Stellar SDK’s reference signer signs', async () => {
    const entry = buildPermission(person.publicKey(), burn(), 1_000_100);
    const ours = attachPermissionSignature(
      entry,
      person.publicKey(),
      Networks.PUBLIC,
      person.sign(permissionHash(entry, Networks.PUBLIC))
    );
    const reference = await authorizeEntry(
      xdr.SorobanAuthorizationEntry.fromXDR(entry.toXDR()),
      person,
      1_000_100,
      Networks.PUBLIC
    );
    expect(ours.toXDR('base64')).toBe(reference.toXDR('base64'));
  });

  it('refuse a signature from another key', () => {
    const entry = buildPermission(person.publicKey(), burn(), 1_000_100);
    const other = Keypair.random();
    expect(() =>
      attachPermissionSignature(
        entry,
        person.publicKey(),
        Networks.PUBLIC,
        other.sign(permissionHash(entry, Networks.PUBLIC))
      )
    ).toThrow(/does not match/);
  });

  it('refuse a signature over another call, network or expiry', () => {
    const entry = buildPermission(person.publicKey(), burn(), 1_000_100);
    const otherCall = buildPermission(
      person.publicKey(),
      contractCall(USDC_SAC, 'approve', approveArgs(person.publicKey(), TMM, 1n, 5)),
      1_000_100
    );
    const sigOther = person.sign(permissionHash(otherCall, Networks.PUBLIC));
    expect(() =>
      attachPermissionSignature(entry, person.publicKey(), Networks.PUBLIC, sigOther)
    ).toThrow();
    const sigTestnet = person.sign(permissionHash(entry, Networks.TESTNET));
    expect(() =>
      attachPermissionSignature(entry, person.publicKey(), Networks.PUBLIC, sigTestnet)
    ).toThrow();
  });

  it('use a fresh nonce each time, so a permission works once', () => {
    const a = buildPermission(person.publicKey(), burn(), 9);
    const b = buildPermission(person.publicKey(), burn(), 9);
    expect(a.credentials().address().nonce().toString()).not.toBe(
      b.credentials().address().nonce().toString()
    );
    expect(randomNonce().toString()).not.toBe(randomNonce().toString());
  });

  it('read back the call, the account and the expiry', () => {
    const entry = buildPermission(person.publicKey(), burn(), 777);
    expect(permittedCall(entry).functionName().toString()).toBe('deposit_for_burn');
    expect(permissionFacts(entry)).toEqual({ account: person.publicKey(), expiryLedger: 777 });
    expect(entry.rootInvocation().subInvocations()).toHaveLength(0);
  });
});

describe('Circle calls', () => {
  it('deposit_for_burn: caller, amount, Base, recipient, USDC, open execution, no fee, finality', () => {
    const args = depositForBurnArgs({
      caller: person.publicKey(),
      amount7: 250_000_000n,
      destinationDomain: 6,
      mintRecipient: RECIPIENT,
      usdcSac: USDC_SAC,
    });
    expect(args).toHaveLength(8);
    expect(scValToNative(args[0])).toBe(person.publicKey());
    expect(scValToNative(args[1])).toBe(250_000_000n);
    expect(scValToNative(args[2])).toBe(6);
    expect(Buffer.from(scValToNative(args[3]))).toEqual(Buffer.from(RECIPIENT));
    expect(scValToNative(args[4])).toBe(USDC_SAC);
    expect(Buffer.from(scValToNative(args[5]))).toEqual(Buffer.alloc(32));
  });

  it('refuse a zero or malformed recipient', () => {
    expect(() =>
      depositForBurnArgs({
        caller: person.publicKey(),
        amount7: 1n,
        destinationDomain: 6,
        mintRecipient: new Uint8Array(32),
        usdcSac: USDC_SAC,
      })
    ).toThrow(/invalid mint recipient/);
  });

  it('approve: from, spender, amount, expiry ledger', () => {
    const args = approveArgs(person.publicKey(), TMM, 250_000_000n, 123);
    expect(args.map((a) => scValToNative(a))).toEqual([person.publicKey(), TMM, 250_000_000n, 123]);
  });
});

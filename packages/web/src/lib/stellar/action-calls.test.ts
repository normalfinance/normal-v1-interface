// Doc 129 Phase 5c: the permission trees and the classic swap of XLM → Savings
// and Savings → XLM. Pins: a deposit permission is exactly the tree read from
// the mainnet vault (deposit + one USDC transfer into it) and signs exactly as
// the Stellar SDK's reference signer does; the swap and its fee are one
// transaction at the given sequence number, so neither can happen alone.
import { it, jest, expect, describe } from '@jest/globals';
import {
  xdr,
  Asset,
  StrKey,
  Address,
  Keypair,
  Networks,
  scValToNative,
  authorizeEntry,
} from '@stellar/stellar-sdk';

// Mock BEFORE the imports below pull it (repo convention: ESM jose in its build).
jest.mock('@normalfinance/utils', () => ({ constants: { StellarConfig: {} } }));

import { permissionHash, buildPermission, attachPermissionSignature } from './permissions';
import {
  unitsToAmount,
  amountToUnits,
  sacTransferCall,
  classicSwapWithFeeTx,
  vaultDepositPermission,
} from './action-calls';

const person = Keypair.random();
const VAULT = StrKey.encodeContract(Buffer.alloc(32, 1));
const USDC_SAC = StrKey.encodeContract(Buffer.alloc(32, 2));
const FEES = Keypair.random().publicKey();
const usdc = new Asset('USDC', Keypair.random().publicKey());

const nameOf = (inv: xdr.SorobanAuthorizedInvocation) => {
  const fn = inv.function().contractFn();
  return `${Address.fromScAddress(fn.contractAddress()).toString()}.${fn.functionName().toString()}`;
};

describe('amounts', () => {
  it('round-trip 7-decimal units and classic amount strings', () => {
    expect(unitsToAmount(123_456_789n)).toBe('12.3456789');
    expect(unitsToAmount(5n)).toBe('0.0000005');
    expect(amountToUnits('12.3456789')).toBe(123_456_789n);
    expect(amountToUnits('12.34567891')).toBe(123_456_789n);
    expect(amountToUnits('7')).toBe(70_000_000n);
  });
});

describe('a Savings deposit as a permission', () => {
  const { call, inner } = vaultDepositPermission(VAULT, USDC_SAC, person.publicKey(), 99_500_000n);

  it('is vault.deposit([amount], [amount], you, invest) with one inner call: the USDC into the vault', () => {
    const entry = buildPermission(person.publicKey(), call, 1_000_100, undefined, inner);
    const root = entry.rootInvocation();
    expect(nameOf(root)).toBe(`${VAULT}.deposit`);
    const args = root
      .function()
      .contractFn()
      .args()
      .map((a) => scValToNative(a));
    expect(args).toEqual([[99_500_000n], [99_500_000n], person.publicKey(), true]);
    expect(root.subInvocations()).toHaveLength(1);
    const transfer = root.subInvocations()[0];
    expect(nameOf(transfer)).toBe(`${USDC_SAC}.transfer`);
    expect(
      transfer
        .function()
        .contractFn()
        .args()
        .map((a) => scValToNative(a))
    ).toEqual([person.publicKey(), VAULT, 99_500_000n]);
    expect(transfer.subInvocations()).toHaveLength(0);
  });

  it('signs exactly what the Stellar SDK’s reference signer signs, inner call included', async () => {
    const entry = buildPermission(person.publicKey(), call, 1_000_100, undefined, inner);
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

  it('a signature over the deposit alone does not fit the deposit with its transfer', () => {
    const bare = buildPermission(person.publicKey(), call, 1_000_100);
    const full = xdr.SorobanAuthorizationEntry.fromXDR(bare.toXDR());
    full.rootInvocation().subInvocations(
      inner.map(
        (c) =>
          new xdr.SorobanAuthorizedInvocation({
            function: xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(c),
            subInvocations: [],
          })
      )
    );
    const signedBare = person.sign(permissionHash(bare, Networks.PUBLIC));
    expect(() =>
      attachPermissionSignature(full, person.publicKey(), Networks.PUBLIC, signedBare)
    ).toThrow();
  });

  it('a fee permission is one plain transfer to Normal, no inner calls', () => {
    const entry = buildPermission(
      person.publicKey(),
      sacTransferCall(USDC_SAC, person.publicKey(), FEES, 500_000n),
      1_000_100
    );
    expect(nameOf(entry.rootInvocation())).toBe(`${USDC_SAC}.transfer`);
    expect(entry.rootInvocation().subInvocations()).toHaveLength(0);
  });
});

describe('the swap and its fee, one classic transaction', () => {
  it('strict-receive: exactly the USDC out, at most the XLM in, then the fee in XLM', () => {
    const tx = classicSwapWithFeeTx({
      source: person.publicKey(),
      sequence: 101n,
      networkPassphrase: Networks.PUBLIC,
      path: [],
      mode: 'strict-receive',
      sendAsset: Asset.native(),
      sendUnits: 995_000_000n,
      destAsset: usdc,
      destUnits: 131_000_000n,
      fee: { asset: Asset.native(), units: 5_000_000n, to: FEES },
      timeoutSeconds: 300,
    });
    expect(tx.source).toBe(person.publicKey());
    expect(tx.sequence).toBe('101');
    expect(tx.operations.map((op) => op.type)).toEqual(['pathPaymentStrictReceive', 'payment']);
    expect(tx.operations[0]).toMatchObject({
      destination: person.publicKey(),
      sendMax: '99.5000000',
      destAmount: '13.1000000',
    });
    expect(tx.operations[1]).toMatchObject({ destination: FEES, amount: '0.5000000' });
    expect(Number(tx.timeBounds?.maxTime)).toBeGreaterThan(0);
  });

  it('strict-send: exactly the USDC in, at least the XLM out, then the fee in USDC', () => {
    const tx = classicSwapWithFeeTx({
      source: person.publicKey(),
      sequence: 7n,
      networkPassphrase: Networks.PUBLIC,
      path: [],
      mode: 'strict-send',
      sendAsset: usdc,
      sendUnits: 99_500_000n,
      destAsset: Asset.native(),
      destUnits: 740_000_000n,
      fee: { asset: usdc, units: 500_000n, to: FEES },
      timeoutSeconds: 900,
    });
    expect(tx.operations.map((op) => op.type)).toEqual(['pathPaymentStrictSend', 'payment']);
    expect(tx.operations[0]).toMatchObject({ sendAmount: '9.9500000', destMin: '74.0000000' });
    expect(tx.operations[1]).toMatchObject({ destination: FEES, amount: '0.0500000' });
  });
});

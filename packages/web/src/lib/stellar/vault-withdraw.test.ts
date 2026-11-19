// Doc 129 Phase 5b: a Savings withdrawal read from the transaction itself.
// Pins: only `vault.withdraw(shares, [min], from)` by the transaction's own
// source reads as a withdrawal, and its minimum is what the vault guarantees.
import { it, expect, describe } from '@jest/globals';
import {
  xdr,
  Asset,
  StrKey,
  Account,
  Address,
  Keypair,
  Contract,
  Networks,
  Operation,
  nativeToScVal,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

import { vaultWithdrawOf } from './vault-withdraw';

const VAULT = StrKey.encodeContract(Buffer.alloc(32, 7));
const OTHER_VAULT = StrKey.encodeContract(Buffer.alloc(32, 9));
const me = Keypair.random();
const someoneElse = Keypair.random();

const i128 = (v: bigint) => nativeToScVal(v, { type: 'i128' });

function txOf(...ops: xdr.Operation[]) {
  const builder = new TransactionBuilder(new Account(me.publicKey(), '10'), {
    fee: '100',
    networkPassphrase: Networks.PUBLIC,
  });
  ops.forEach((op) => builder.addOperation(op));
  return builder.setTimeout(300).build();
}

const withdraw = (
  args: xdr.ScVal[] = [
    i128(990n),
    xdr.ScVal.scvVec([i128(99_900_000n)]),
    new Address(me.publicKey()).toScVal(),
  ],
  vault = VAULT,
  fn = 'withdraw'
) => new Contract(vault).call(fn, ...args);

describe('vaultWithdrawOf', () => {
  it('reads the shares, the guaranteed minimum and who withdraws', () => {
    expect(vaultWithdrawOf(txOf(withdraw()), VAULT)).toEqual({
      shares: 990n,
      minOut: 99_900_000n,
      from: me.publicKey(),
    });
  });

  it('is only ever this vault’s withdraw', () => {
    expect(vaultWithdrawOf(txOf(withdraw(undefined, OTHER_VAULT)), VAULT)).toBeNull();
    expect(vaultWithdrawOf(txOf(withdraw(undefined, VAULT, 'deposit')), VAULT)).toBeNull();
    const pay = Operation.payment({
      destination: someoneElse.publicKey(),
      asset: Asset.native(),
      amount: '1',
    });
    expect(vaultWithdrawOf(txOf(pay), VAULT)).toBeNull();
  });

  it('refuses another account’s withdrawal, two calls, or a minimum for two assets', () => {
    const forOther = withdraw([
      i128(990n),
      xdr.ScVal.scvVec([i128(1n)]),
      new Address(someoneElse.publicKey()).toScVal(),
    ]);
    expect(vaultWithdrawOf(txOf(forOther), VAULT)).toBeNull();
    expect(vaultWithdrawOf(txOf(withdraw(), withdraw()), VAULT)).toBeNull();
    const twoAssets = withdraw([
      i128(990n),
      xdr.ScVal.scvVec([i128(1n), i128(1n)]),
      new Address(me.publicKey()).toScVal(),
    ]);
    expect(vaultWithdrawOf(txOf(twoAssets), VAULT)).toBeNull();
  });

  it('refuses no shares or no minimum (a withdrawal that guarantees nothing)', () => {
    const noShares = withdraw([
      i128(0n),
      xdr.ScVal.scvVec([i128(1n)]),
      new Address(me.publicKey()).toScVal(),
    ]);
    const noMinimum = withdraw([
      i128(5n),
      xdr.ScVal.scvVec([i128(0n)]),
      new Address(me.publicKey()).toScVal(),
    ]);
    expect(vaultWithdrawOf(txOf(noShares), VAULT)).toBeNull();
    expect(vaultWithdrawOf(txOf(noMinimum), VAULT)).toBeNull();
  });
});

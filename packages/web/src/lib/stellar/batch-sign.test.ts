// Doc 129 Phase 1: one passkey prompt for the two transactions of an action.
// Pins: who batches, what a refusal does, the fallback, the order of the
// signed transactions and the progress callbacks, and that every Turnkey
// signature is checked against the wallet's own key before it is used.
import type * as BatchSignModule from '@/lib/stellar/batch-sign';

import { it, jest, expect, describe, beforeEach } from '@jest/globals';

// Mock BEFORE require (repo convention): the real modules reach the network,
// the passkey stamper and @normalfinance/utils (ESM jose that jest can't parse).
const walletInfo = jest.fn<() => Promise<unknown>>();
const batchSigner = jest.fn<(...args: unknown[]) => Promise<string[]>>();
jest.mock('@/utils/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));
jest.mock('@/lib/turnkey/wallet-info', () => ({ getTurnkeyWalletInfo: () => walletInfo() }));
jest.mock('@/lib/turnkey/stellar-signer', () => ({
  signStellarXdrsWithTurnkey: (...args: unknown[]) => batchSigner(...args),
}));
jest.mock('@/lib/turnkey/webauthn-guard', () => ({
  WEBAUTHN_FRIENDLY_MESSAGE: 'The passkey confirmation did not complete. Please try again.',
}));
jest.mock('@normalfinance/utils', () => ({ constants: { StellarConfig: {} } }));
const localWallet: { keypair?: unknown; publicKey?: string } = {};
jest.mock('@normalfinance/state', () => ({
  useNormalWalletStore: { getState: () => localWallet },
}));

import { Keypair } from '@stellar/stellar-sdk';
import { toVerifiedSignatures } from '@/lib/turnkey/stellar-signatures';

const { batchesStellar, isPasskeyRefusal, signStellarTxsInOrder } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/lib/stellar/batch-sign') as typeof BatchSignModule;

const ME = Keypair.random().publicKey();
const OTHER = Keypair.random().publicKey();
const PASSPHRASE = 'Test SDF Network ; September 2015';

describe('batchesStellar', () => {
  it('batches only the Stellar address of the person’s own Turnkey wallet', () => {
    expect(batchesStellar(ME, ME, true)).toBe(true);
    expect(batchesStellar(ME, OTHER, true)).toBe(false);
    expect(batchesStellar(null, ME, true)).toBe(false);
    expect(batchesStellar(ME, null, true)).toBe(false);
  });

  it('never batches with the kill switch off', () => {
    expect(batchesStellar(ME, ME, false)).toBe(false);
  });
});

describe('isPasskeyRefusal', () => {
  it('reads a turned-down or timed-out prompt as the person’s answer', () => {
    expect(isPasskeyRefusal({ name: 'NotAllowedError' })).toBe(true);
    expect(
      isPasskeyRefusal(new Error('The passkey confirmation did not complete. Please try again.'))
    ).toBe(true);
  });

  it('does not read a Turnkey API error as a refusal', () => {
    expect(isPasskeyRefusal(new Error('Turnkey error 400: activity type not allowed'))).toBe(false);
  });
});

describe('signStellarTxsInOrder', () => {
  beforeEach(() => {
    walletInfo.mockReset();
    batchSigner.mockReset();
  });

  const signOne = (xdr: string) => Promise.resolve(`one-by-one:${xdr}`);

  it('signs both with ONE prompt on the person’s Turnkey key', async () => {
    walletInfo.mockResolvedValue({ subOrgId: 'org', stellarAddress: ME });
    batchSigner.mockResolvedValue(['signed:a', 'signed:b']);
    const prompts: number[] = [];
    const out = await signStellarTxsInOrder({
      xdrs: ['a', 'b'],
      networkPassphrase: PASSPHRASE,
      account: ME,
      signOne,
      onPrompt: (i) => prompts.push(i),
    });
    expect(out).toEqual({ signed: ['signed:a', 'signed:b'], batched: true });
    expect(prompts).toEqual([0]);
    expect(batchSigner).toHaveBeenCalledWith(['a', 'b'], PASSPHRASE, 'org', ME);
  });

  it('signs one by one, in order, for any other account (external wallet)', async () => {
    walletInfo.mockResolvedValue({ subOrgId: 'org', stellarAddress: ME });
    const prompts: number[] = [];
    const out = await signStellarTxsInOrder({
      xdrs: ['a', 'b'],
      networkPassphrase: PASSPHRASE,
      account: OTHER,
      signOne,
      onPrompt: (i) => prompts.push(i),
    });
    expect(out).toEqual({ signed: ['one-by-one:a', 'one-by-one:b'], batched: false });
    expect(prompts).toEqual([0, 1]);
    expect(batchSigner).not.toHaveBeenCalled();
  });

  it('signs one by one when the wallet lookup fails (never guesses)', async () => {
    walletInfo.mockRejectedValue(new Error('unavailable'));
    const out = await signStellarTxsInOrder({
      xdrs: ['a', 'b'],
      networkPassphrase: PASSPHRASE,
      account: ME,
      signOne,
    });
    expect(out.batched).toBe(false);
    expect(out.signed).toEqual(['one-by-one:a', 'one-by-one:b']);
  });

  it('falls back to one by one when Turnkey turns the batch down', async () => {
    walletInfo.mockResolvedValue({ subOrgId: 'org', stellarAddress: ME });
    batchSigner.mockRejectedValue(new Error('Turnkey error 400'));
    const out = await signStellarTxsInOrder({
      xdrs: ['a', 'b'],
      networkPassphrase: PASSPHRASE,
      account: ME,
      signOne,
    });
    expect(out).toEqual({ signed: ['one-by-one:a', 'one-by-one:b'], batched: false });
  });

  it('stops when the person turns the prompt down: no second way round', async () => {
    walletInfo.mockResolvedValue({ subOrgId: 'org', stellarAddress: ME });
    const refusal = Object.assign(new Error('denied'), { name: 'NotAllowedError' });
    batchSigner.mockRejectedValue(refusal);
    const signOneSpy = jest.fn(signOne);
    await expect(
      signStellarTxsInOrder({
        xdrs: ['a', 'b'],
        networkPassphrase: PASSPHRASE,
        account: ME,
        signOne: signOneSpy,
      })
    ).rejects.toBe(refusal);
    expect(signOneSpy).not.toHaveBeenCalled();
  });

  it('a local key unlocked in memory signs with no prompt, never through Turnkey', async () => {
    walletInfo.mockResolvedValue({ subOrgId: 'org', stellarAddress: ME });
    localWallet.keypair = {};
    localWallet.publicKey = ME;
    try {
      const out = await signStellarTxsInOrder({
        xdrs: ['a', 'b'],
        networkPassphrase: PASSPHRASE,
        account: ME,
        signOne,
      });
      expect(out.batched).toBe(false);
      expect(batchSigner).not.toHaveBeenCalled();
    } finally {
      delete localWallet.keypair;
      delete localWallet.publicKey;
    }
  });

  it('a single transaction never takes the batch path', async () => {
    walletInfo.mockResolvedValue({ subOrgId: 'org', stellarAddress: ME });
    const out = await signStellarTxsInOrder({
      xdrs: ['a'],
      networkPassphrase: PASSPHRASE,
      account: ME,
      signOne,
    });
    expect(out).toEqual({ signed: ['one-by-one:a'], batched: false });
    expect(walletInfo).not.toHaveBeenCalled();
  });
});

describe('toVerifiedSignatures', () => {
  const kp = Keypair.random();
  const hashes = [Buffer.alloc(32, 1), Buffer.alloc(32, 2)];
  const asTurnkey = (sig: Buffer) => ({
    r: sig.subarray(0, 32).toString('hex'),
    s: sig.subarray(32).toString('hex'),
  });

  it('returns r||s for each payload when it matches the wallet key', () => {
    const sigs = hashes.map((h) => kp.sign(h));
    const out = toVerifiedSignatures(sigs.map(asTurnkey), hashes, kp.publicKey());
    expect(out.map((b) => b.toString('hex'))).toEqual(sigs.map((b) => b.toString('hex')));
  });

  it('refuses signatures in the wrong order', () => {
    const sigs = hashes.map((h) => kp.sign(h)).reverse();
    expect(() => toVerifiedSignatures(sigs.map(asTurnkey), hashes, kp.publicKey())).toThrow(
      /does not match/
    );
  });

  it('refuses a signature from another key', () => {
    const other = Keypair.random();
    const sigs = hashes.map((h) => other.sign(h));
    expect(() => toVerifiedSignatures(sigs.map(asTurnkey), hashes, kp.publicKey())).toThrow(
      /does not match/
    );
  });

  it('refuses a missing half', () => {
    expect(() =>
      toVerifiedSignatures([{ r: 'ab' }, { r: 'ab', s: 'cd' }], hashes, kp.publicKey())
    ).toThrow(/missing r or s/);
  });
});

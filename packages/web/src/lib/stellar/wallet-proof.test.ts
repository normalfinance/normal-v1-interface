import { it, expect, describe } from '@jest/globals';
import {
  Asset,
  Account,
  Keypair,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

import {
  isSignedBy,
  verifyLinkProof,
  buildLinkChallenge,
  LINK_CHALLENGE_TTL_SECONDS,
} from './wallet-proof';

const PASSPHRASE = Networks.PUBLIC;
const NOW = 1_800_000_000;

const sign = (xdr: string, keypair: Keypair): string => {
  const transaction = TransactionBuilder.fromXDR(xdr, PASSPHRASE) as Transaction;
  transaction.sign(keypair);
  return transaction.toXDR();
};

describe('buildLinkChallenge', () => {
  it('can be signed but never submitted: sequence 0, one data entry, a 5-minute window', () => {
    const wallet = Keypair.random();
    const { xdr } = buildLinkChallenge(wallet.publicKey(), PASSPHRASE, NOW);
    const transaction = TransactionBuilder.fromXDR(xdr, PASSPHRASE) as Transaction;

    expect(transaction.source).toBe(wallet.publicKey());
    expect(transaction.sequence).toBe('0');
    expect(transaction.operations).toHaveLength(1);
    expect(transaction.operations[0].type).toBe('manageData');
    expect(Number(transaction.timeBounds?.maxTime)).toBe(NOW + LINK_CHALLENGE_TTL_SECONDS);
  });

  it('is different every time, so a signature from one link never fits another', () => {
    const address = Keypair.random().publicKey();
    expect(buildLinkChallenge(address, PASSPHRASE, NOW).hash).not.toBe(
      buildLinkChallenge(address, PASSPHRASE, NOW).hash
    );
  });
});

describe('verifyLinkProof', () => {
  const wallet = Keypair.random();
  const challenge = buildLinkChallenge(wallet.publicKey(), PASSPHRASE, NOW);
  const check = (
    signedXdr: string,
    overrides: Partial<Parameters<typeof verifyLinkProof>[0]> = {}
  ) =>
    verifyLinkProof({
      signedXdr,
      walletAddress: wallet.publicKey(),
      expectedHash: challenge.hash,
      networkPassphrase: PASSPHRASE,
      nowSeconds: NOW + 10,
      ...overrides,
    });

  it('accepts the challenge signed by the wallet itself', () => {
    expect(check(sign(challenge.xdr, wallet))).toBe(true);
  });

  it('refuses the challenge unsigned', () => {
    expect(check(challenge.xdr)).toBe(false);
  });

  it('refuses a signature from any other key', () => {
    expect(check(sign(challenge.xdr, Keypair.random()))).toBe(false);
  });

  it('refuses the proof for a different address than the one it was issued for', () => {
    const other = Keypair.random();
    expect(check(sign(challenge.xdr, wallet), { walletAddress: other.publicKey() })).toBe(false);
  });

  it('refuses a signed transaction that is not the challenge we issued', () => {
    const lookalike = buildLinkChallenge(wallet.publicKey(), PASSPHRASE, NOW);
    expect(check(sign(lookalike.xdr, wallet))).toBe(false);
  });

  it('refuses a payment signed by the wallet, however real', () => {
    const payment = new TransactionBuilder(new Account(wallet.publicKey(), '41'), {
      fee: '100',
      networkPassphrase: PASSPHRASE,
    })
      .addOperation(
        Operation.payment({
          destination: Keypair.random().publicKey(),
          asset: Asset.native(),
          amount: '1',
        })
      )
      .setTimeout(300)
      .build();
    expect(check(sign(payment.toXDR(), wallet))).toBe(false);
  });

  it('refuses the challenge once its window has passed', () => {
    const late = NOW + LINK_CHALLENGE_TTL_SECONDS + 1;
    expect(check(sign(challenge.xdr, wallet), { nowSeconds: late })).toBe(false);
  });

  it('refuses a signature made for another network', () => {
    const testnetSigned = TransactionBuilder.fromXDR(challenge.xdr, PASSPHRASE) as Transaction;
    const forTestnet = new Transaction(testnetSigned.toXDR(), Networks.TESTNET);
    forTestnet.sign(wallet);
    expect(check(forTestnet.toXDR())).toBe(false);
  });

  it('refuses garbage instead of throwing', () => {
    expect(check('not-xdr')).toBe(false);
  });
});

describe('isSignedBy', () => {
  it('tells a transaction signed by its source from one that is not', () => {
    const wallet = Keypair.random();
    const { xdr } = buildLinkChallenge(wallet.publicKey(), PASSPHRASE, NOW);
    const signed = TransactionBuilder.fromXDR(sign(xdr, wallet), PASSPHRASE) as Transaction;
    const unsigned = TransactionBuilder.fromXDR(xdr, PASSPHRASE) as Transaction;

    expect(isSignedBy(signed, wallet.publicKey())).toBe(true);
    expect(isSignedBy(unsigned, wallet.publicKey())).toBe(false);
    expect(isSignedBy(signed, 'not-an-address')).toBe(false);
  });
});

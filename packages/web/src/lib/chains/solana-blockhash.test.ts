import type { PublicKey, TransactionInstruction } from '@solana/web3.js';

import {
  Keypair,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  ComputeBudgetProgram,
} from '@solana/web3.js';

import {
  freshBlockhash,
  BLOCKHASH_READ_MS,
  isBlockhashExpired,
  BLOCKHASH_RETRY_MS,
  canRefreshBlockhash,
} from './solana-blockhash';

const OLD = 'FMLnGKfgRdHkgLg89hTQq2sii3yVBzPMNRma6bDPyY4K';
const FRESH = 'B8ETB39aYMqUKuubTCDfTtsEM2gy4reokbSbNzEvdqYD';

const person = Keypair.generate().publicKey;
const other = Keypair.generate().publicKey;
const to = Keypair.generate().publicKey;

function build(instructions: TransactionInstruction[]) {
  const message = new TransactionMessage({
    payerKey: person,
    recentBlockhash: OLD,
    instructions,
  }).compileToV0Message();
  return new VersionedTransaction(message);
}

const transfer = (from: PublicKey) =>
  SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports: 1000 });

describe('canRefreshBlockhash', () => {
  it('takes a transaction the person alone signs (the LI.FI shape)', () => {
    const vtx = build([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
      transfer(person),
    ]);
    expect(canRefreshBlockhash(vtx, person)).toBe(true);
  });

  it('refuses when someone else must sign too', () => {
    const vtx = build([transfer(person), transfer(other)]);
    expect(vtx.message.header.numRequiredSignatures).toBe(2);
    expect(canRefreshBlockhash(vtx, person)).toBe(false);
  });

  it('refuses when the one signer is not the person', () => {
    const vtx = build([transfer(person)]);
    expect(canRefreshBlockhash(vtx, other)).toBe(false);
  });

  it('refuses a durable-nonce transaction', () => {
    const nonce = Keypair.generate().publicKey;
    const vtx = build([
      SystemProgram.nonceAdvance({ noncePubkey: nonce, authorizedPubkey: person }),
      transfer(person),
    ]);
    expect(canRefreshBlockhash(vtx, person)).toBe(false);
  });

  it('knows an expired-blockhash refusal from other errors', () => {
    expect(
      isBlockhashExpired(
        new Error(
          'Simulation failed. \nMessage: Transaction simulation failed: Blockhash not found. \nLogs: \n[]. \nCatch the `SendTransactionError` and call `getLogs()` on it for full details.'
        )
      )
    ).toBe(true);
    expect(isBlockhashExpired(new Error('Signature x has expired: block height exceeded.'))).toBe(
      true
    );
    expect(isBlockhashExpired('Transaction simulation failed: insufficient lamports')).toBe(false);
    expect(isBlockhashExpired(undefined)).toBe(false);
  });

  it('a new blockhash is what gets signed and sent', () => {
    const vtx = build([transfer(person)]);
    vtx.message.recentBlockhash = FRESH;
    const again = VersionedTransaction.deserialize(vtx.serialize());
    expect(again.message.recentBlockhash).toBe(FRESH);
  });
});

describe('freshBlockhash', () => {
  const never = () => new Promise<{ blockhash: string }>(() => {});
  const sleeps: number[] = [];
  const sleep = async (ms: number) => {
    sleeps.push(ms);
  };
  beforeEach(() => {
    sleeps.length = 0;
  });

  it('waits 5 s per read and 0.8 s before the one retry by default', () => {
    expect(BLOCKHASH_READ_MS).toBe(5_000);
    expect(BLOCKHASH_RETRY_MS).toBe(800);
  });

  it('takes the first answer, with no retry', async () => {
    const read = jest.fn(async () => ({ blockhash: FRESH }));
    await expect(freshBlockhash(read, { sleep })).resolves.toBe(FRESH);
    expect(read).toHaveBeenCalledTimes(1);
    expect(sleeps).toEqual([]);
  });

  it('retries once after a failed read', async () => {
    const read = jest
      .fn<Promise<{ blockhash: string }>, []>()
      .mockRejectedValueOnce(new Error('429'))
      .mockResolvedValueOnce({ blockhash: FRESH });
    await expect(freshBlockhash(read, { sleep })).resolves.toBe(FRESH);
    expect(read).toHaveBeenCalledTimes(2);
    expect(sleeps).toEqual([BLOCKHASH_RETRY_MS]);
  });

  it('gives null after two failed reads (the quote keeps its own blockhash)', async () => {
    const read = jest.fn(async () => {
      throw new Error('down');
    });
    await expect(freshBlockhash(read, { sleep })).resolves.toBeNull();
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('stops waiting for a stalled read and tries again', async () => {
    const read = jest
      .fn<Promise<{ blockhash: string }>, []>()
      .mockImplementationOnce(never)
      .mockResolvedValueOnce({ blockhash: FRESH });
    await expect(freshBlockhash(read, { sleep, readMs: 20 })).resolves.toBe(FRESH);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('two stalled reads end in null within the bound', async () => {
    const started = Date.now();
    await expect(freshBlockhash(never, { sleep, readMs: 20 })).resolves.toBeNull();
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it('an empty answer counts as no answer', async () => {
    const read = jest.fn(async () => ({ blockhash: '' }));
    await expect(freshBlockhash(read, { sleep })).resolves.toBeNull();
    expect(read).toHaveBeenCalledTimes(2);
  });
});

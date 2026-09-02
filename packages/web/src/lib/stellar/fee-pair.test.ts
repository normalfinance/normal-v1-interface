// Pins the sequence-chaining mechanics of #26: the fee tx must sit EXACTLY
// one sequence number behind the service tx, because that is the on-chain
// guarantee that a fee can never apply unless the service applied first.
import type { NetworkConfig } from '@normalfinance/types';
import type * as FeePairModule from '@/lib/stellar/fee-pair';
import type * as BuildFeePaymentModule from '@/lib/build-fee-payment';

import { it, jest, expect, describe } from '@jest/globals';

// Mock BEFORE require (repo convention): fee-pair pulls buildAuthHeaders,
// whose Supabase import chain has no business in a unit test, and
// build-fee-payment pulls @normalfinance/utils whose build includes jose
// (ESM) that jest cannot parse. Every test passes an explicit config, so
// the constants stub is never dereferenced.
jest.mock('@/utils/http', () => ({ buildAuthHeaders: async () => ({}) }));
jest.mock('@normalfinance/utils', () => ({ constants: { StellarConfig: {} } }));

import {
  Asset,
  Account,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getTransactionSequence } = require('@/lib/stellar/fee-pair') as typeof FeePairModule;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildFeePaymentXdr } = require('@/lib/build-fee-payment') as typeof BuildFeePaymentModule;

const PASSPHRASE = Networks.TESTNET;
const CALLER = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 1)).publicKey();
const DESTINATION = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 2)).publicKey();

// Only these two fields are read on the chained (sourceSequence) path —
// Horizon is never contacted.
const TEST_CONFIG = {
  HORIZON_URL: 'https://horizon-testnet.stellar.org',
  NETWORK_PASSPHRASE: PASSPHRASE,
} as unknown as NetworkConfig;

// A stand-in for the DeFindex/Soroswap service tx: built on an account whose
// current sequence is 100, so the tx itself carries 101.
function buildServiceTx(): string {
  const account = new Account(CALLER, '100');
  return new TransactionBuilder(account, { fee: '100', networkPassphrase: PASSPHRASE })
    .addOperation(
      Operation.payment({ destination: DESTINATION, asset: Asset.native(), amount: '1' })
    )
    .setTimeout(300)
    .build()
    .toXDR();
}

describe('fee-pair sequence chaining (#26)', () => {
  it('reads the sequence a built tx will consume', () => {
    expect(getTransactionSequence(buildServiceTx(), PASSPHRASE)).toBe('101');
  });

  it('a fee built on the service sequence lands exactly one behind it', async () => {
    const serviceXdr = buildServiceTx();
    const serviceSeq = getTransactionSequence(serviceXdr, PASSPHRASE);

    // sourceSequence skips Horizon entirely — the whole call is offline.
    const feeXdr = await buildFeePaymentXdr({
      caller: CALLER,
      destination: DESTINATION,
      amount: '0.99',
      assetCode: 'XLM',
      config: TEST_CONFIG,
      sourceSequence: serviceSeq,
      timeoutSeconds: 900,
    });

    // service consumes 101 → fee must consume 102, nothing else.
    expect(getTransactionSequence(feeXdr, PASSPHRASE)).toBe('102');
  });

  it('the chained fee carries the long escrow window', async () => {
    const before = Math.floor(Date.now() / 1000);
    const feeXdr = await buildFeePaymentXdr({
      caller: CALLER,
      destination: DESTINATION,
      amount: '0.99',
      assetCode: 'XLM',
      config: TEST_CONFIG,
      sourceSequence: '101',
      timeoutSeconds: 900,
    });

    const tx = TransactionBuilder.fromXDR(feeXdr, PASSPHRASE);
    const maxTime = Number(('timeBounds' in tx && tx.timeBounds?.maxTime) || '0');
    // ~15 minutes of escrow runway (small slack for test wall-clock).
    expect(maxTime).toBeGreaterThanOrEqual(before + 895);
    expect(maxTime).toBeLessThanOrEqual(before + 905);
  });

  it('rejects a malformed sourceSequence instead of building garbage', async () => {
    await expect(
      buildFeePaymentXdr({
        caller: CALLER,
        destination: DESTINATION,
        amount: '0.99',
        assetCode: 'XLM',
        sourceSequence: 'not-a-number',
      })
    ).rejects.toThrow(/sourceSequence/);
  });
});

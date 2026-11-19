// Doc 129 Phase 5c: XLM → Savings and Savings → XLM. Pins: the fees are what
// the same steps cost one by one (a swap's 0.5% on the coin paid with, the
// Savings deposit fee), a swap keeps 1% of room on Stellar's own exchange,
// only the exact transaction an action was built for is accepted first, and
// a signature is checked before it is attached to one of the person's own
// transactions.
import type * as ActionsModule from '@/server/relayed-actions';

import { it, jest, expect, describe } from '@jest/globals';
import { Asset, Keypair, Networks } from '@stellar/stellar-sdk';

// Mock BEFORE require (repo convention): the module imports prisma and
// @normalfinance/utils (ESM jose that jest can't parse).
jest.mock('@/lib/prisma', () => ({ prisma: {} }));
jest.mock('@normalfinance/utils', () => ({ getStellarConfigForNetwork: () => ({}) }));

const {
  isBridgeKind,
  withSlippage,
  actionFirstTxWords,
  planXlmToSavings,
  savingsSwapAmounts,
  actionFirstTxRefusal,
  attachUserTxSignature,
} =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/server/relayed-actions') as typeof ActionsModule;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { classicSwapWithFeeTx } = require('@/lib/stellar/action-calls');

const person = Keypair.random();
const fees = Keypair.random().publicKey();
const usdc = new Asset('USDC', Keypair.random().publicKey());

const swapTx = (sequence = 11n) =>
  classicSwapWithFeeTx({
    source: person.publicKey(),
    sequence,
    networkPassphrase: Networks.PUBLIC,
    path: [],
    mode: 'strict-receive',
    sendAsset: Asset.native(),
    sendUnits: 995_000_000n,
    destAsset: usdc,
    destUnits: 131_000_000n,
    fee: { asset: Asset.native(), units: 5_000_000n, to: fees },
    timeoutSeconds: 300,
  });

describe('the amounts', () => {
  it('XLM → Savings: 0.5% of the XLM, the USDC quoted less 1%, then the deposit fee', () => {
    // 100 XLM; the exchange quotes 13.2337 USDC for the 99.5 XLM left.
    const plan = planXlmToSavings(1_000_000_000n, 132_337_000n);
    expect(plan.swapFee).toBe(5_000_000n); // 0.5 XLM
    expect(plan.sendMax).toBe(995_000_000n); // 99.5 XLM at most
    expect(plan.usdc).toBe(131_013_630n); // 13.1013630 USDC exactly
    expect(plan.depositFee).toBe(655_068n); // 0.5% of it
    expect(plan.deposit).toBe(plan.usdc - plan.depositFee);
  });

  it('Savings → XLM: the guaranteed minimum, less the commission, less 0.5% of the rest', () => {
    const amounts = savingsSwapAmounts(999_000_000n, 4_000_000n); // 99.9 out, 0.4 commission
    expect(amounts.available).toBe(995_000_000n);
    expect(amounts.swapFee).toBe(4_975_000n);
    expect(amounts.swapIn).toBe(990_025_000n);
    expect(withSlippage(7_520_000_000n)).toBe(7_444_800_000n);
  });
});

describe('the first transaction of an action', () => {
  const built = swapTx();
  const action = {
    kind: 'xlm_to_savings',
    account: person.publicKey(),
    planJson: JSON.stringify({ swapTxHash: built.hash().toString('hex') }),
    firstTxHash: null as string | null,
  };

  it('accepts exactly the transaction it was built for, signed by the person', () => {
    const tx = swapTx();
    tx.sign(person);
    expect(actionFirstTxRefusal([tx], action)).toBeNull();
  });

  it('refuses another transaction, a missing signature, or two transactions', () => {
    const other = swapTx(12n);
    other.sign(person);
    expect(actionFirstTxRefusal([other], action)?.status).toBe(400);
    expect(actionFirstTxRefusal([swapTx()], action)?.status).toBe(400);
    const tx = swapTx();
    tx.sign(person);
    expect(actionFirstTxRefusal([tx, tx], action)?.status).toBe(400);
    const stranger = Keypair.random();
    const theirs = swapTx();
    theirs.sign(stranger);
    expect(actionFirstTxRefusal([theirs], action)?.status).toBe(400);
  });

  it('keeps its first transaction once it has one', () => {
    const tx = swapTx();
    tx.sign(person);
    expect(actionFirstTxRefusal([tx], { ...action, firstTxHash: 'ab'.repeat(32) })?.status).toBe(
      409
    );
  });
});

describe('a step that is one of the person’s own transactions', () => {
  it('takes their signature over its hash, and refuses any other', () => {
    const unsigned = swapTx();
    const xdr = unsigned.toXDR();
    const good = person.sign(unsigned.hash());
    const signed = attachUserTxSignature(xdr, person.publicKey(), Networks.PUBLIC, good);
    expect(signed).not.toBe(xdr);
    const bad = Keypair.random().sign(unsigned.hash());
    expect(() => attachUserTxSignature(xdr, person.publicKey(), Networks.PUBLIC, bad)).toThrow();
    expect(() =>
      attachUserTxSignature(xdr, Keypair.random().publicKey(), Networks.PUBLIC, good)
    ).toThrow();
  });
});

describe('doc 129 Phase 6: steps that wait for a Circle transfer', () => {
  it('are the two bridge kinds only', () => {
    expect(isBridgeKind('bridge_to_xlm')).toBe(true);
    expect(isBridgeKind('bridge_to_savings')).toBe(true);
    expect(isBridgeKind('xlm_to_savings')).toBe(false);
    expect(isBridgeKind('savings_to_xlm')).toBe(false);
  });

  it('say that what arrives stays as digital dollars when the transfer never lands', () => {
    expect(actionFirstTxWords('bridge_to_xlm').failed).toMatch(/stays there as digital dollars/);
    expect(actionFirstTxWords('xlm_to_savings').failed).toMatch(/your XLM is still in your wallet/);
  });
});

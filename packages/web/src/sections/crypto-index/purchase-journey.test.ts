import { moneyPosition } from '@/lib/flow/run';

import { purchaseStatus, purchaseJourney } from './purchase-journey';

import type { Deliveries, PurchaseRead } from './purchase-journey';

// The explorer link helper's module also loads the on-ramp client (jose,
// ESM-only); the journey needs only the Stellar explorer address from it.
jest.mock('@/utils/transactions.utils', () => ({
  createStellarExpertUrl: (hash: string) => `https://stellar.expert/explorer/public/tx/${hash}`,
}));
jest.mock('@/locales', () => ({
  useTranslate: () => ({ t: (s: string) => s }),
  formatNumberLocale: () => ({ code: 'en-US' }),
}));

const t = (key: string, opts?: Record<string, unknown>) =>
  key.replace(/{{(\w+)}}/g, (_, name) => String(opts?.[name] ?? ''));

const leg = (symbol: string, over: Partial<PurchaseRead['legs'][number]> = {}) => ({
  symbol,
  weightBps: symbol === 'BTC' ? 8174 : symbol === 'ETH' ? 1440 : 386,
  amountWire: '100000000',
  status: 'PENDING',
  dstSwapTxHash: null,
  dstAmount: null,
  ...over,
});
const sent = (symbol: string) => leg(symbol, { status: 'SENT', dstSwapTxHash: `0x${symbol}` });

const read = (
  over: Partial<PurchaseRead['purchase']> = {},
  legs = [leg('BTC'), leg('ETH'), leg('SOL')]
): PurchaseRead => ({
  purchase: {
    id: 'p1',
    status: 'BURN_SUBMITTED',
    amountWire: '300000000',
    burnTxHash: 'b'.repeat(64),
    mintTxHash: null,
    errorDetail: null,
    createdAt: '2026-11-10T17:00:00Z',
    updatedAt: '2026-11-10T17:01:00Z',
    ...over,
  },
  legs,
});
const words = {
  amountUsdc: '300 USDC',
  legs: (['BTC', 'ETH', 'SOL'] as const).map((symbol) => ({
    symbol,
    amountUsdc: '100 USDC',
    weight: '33%',
  })),
};
const minted = { status: 'COMPLETED', mintTxHash: `0x${'m'.repeat(64)}` };
const allSent = [sent('BTC'), sent('ETH'), sent('SOL')];
const delivered = (hash: string | null = null) => ({
  phase: 'delivered' as const,
  receivingTxHash: hash,
});

describe('purchaseJourney: an index purchase after its page closed (Niko 2026-11-10)', () => {
  it('Circle carrying it: on its way, Circle at work', () => {
    const j = purchaseJourney(t, read(), words);
    expect(j.standing).toBe('on-its-way');
    expect(j.stage).toBe('circle');
    expect(j.run.steps.burn?.status).toBe('done');
    expect(j.run.steps.burn?.links?.[0]?.href).toContain('stellar.expert');
    expect(j.run.activeId).toBe('attest');
  });

  it('on Base, the coins being bought: the next coin at work', () => {
    const j = purchaseJourney(
      t,
      read(minted, [sent('BTC'), leg('ETH', { status: 'SWAPPING' }), leg('SOL')]),
      words
    );
    expect(j.standing).toBe('on-its-way');
    expect(j.stage).toBe('buying');
    expect(j.run.steps.mint?.links?.[0]?.href).toContain('basescan.org');
    expect(j.run.steps['buy-btc']?.status).toBe('done');
    expect(j.run.activeId).toBe('buy-eth');
  });

  it('a coin held: needs you, and no step pretends to be at work', () => {
    const j = purchaseJourney(
      t,
      read({ ...minted, errorDetail: 'index-held:SOL' }, [
        sent('BTC'),
        sent('ETH'),
        leg('SOL', { status: 'HELD' }),
      ]),
      words
    );
    expect(j.standing).toBe('needs-you');
    expect(j.heldCoin).toBe('SOL');
    expect(j.run.activeId).toBeNull();
    expect(Object.values(j.run.steps).some((s) => s?.waiting)).toBe(false);
    // Its share waits at Base: the held coin's step stopped there, and so does the money.
    expect(j.run.steps['buy-sol']?.status).toBe('stopped');
    expect(moneyPosition(j.plan, j.run)?.placeId).toBe('base');
  });

  it('delivering: two coins in, Bitcoin still confirming, so not "arrived"', () => {
    const deliveries: Deliveries = {
      ETH: delivered('0xeth'),
      SOL: delivered('sol'),
      BTC: { phase: 'confirming', receivingTxHash: 'a'.repeat(64) },
    };
    const j = purchaseJourney(t, read(minted, allSent), words, deliveries);
    expect(j.standing).toBe('on-its-way');
    expect(j.stage).toBe('delivering');
    expect(j.arrived).toEqual(['ETH', 'SOL']);
    expect(j.run.activeId).toBe('deliver');
    expect(j.run.steps.deliver?.note).toBe('Arrived so far: Ethereum, Solana.');
  });

  it('every coin in its wallet: done', () => {
    const deliveries: Deliveries = {
      BTC: delivered('a'.repeat(64)),
      ETH: delivered(),
      SOL: delivered(),
    };
    const j = purchaseJourney(t, read(minted, allSent), words, deliveries);
    expect(j.standing).toBe('done');
    expect(j.run.phase).toBe('done');
    expect(j.run.steps.deliver?.links?.[0]?.href).toContain('mempool.space');
  });

  it('a coin its exchange sent back: stopped, saying where its share is', () => {
    const deliveries: Deliveries = {
      BTC: { phase: 'refunded', receivingTxHash: null },
      ETH: delivered(),
      SOL: delivered(),
    };
    const j = purchaseJourney(t, read(minted, allSent), words, deliveries);
    expect(j.standing).toBe('failed');
    expect(j.lostCoin).toBe('BTC');
    expect(j.run.phase).toBe('failed');
    expect(j.run.error).toContain(
      'sent its share back as digital dollars to your own Base address'
    );
  });

  it('never sent: ended calmly, nothing moved', () => {
    const j = purchaseJourney(
      t,
      read({
        status: 'FAILED',
        burnTxHash: null,
        errorDetail: 'Expired: no transaction was ever sent; no funds moved',
      }),
      words
    );
    expect(j.standing).toBe('ended');
    expect(j.run.phase).toBe('stopped');
    expect(j.run.ending).toContain('never sent, so nothing moved');
  });

  it('could not be finished: failed, in plain words with a way out', () => {
    const j = purchaseJourney(
      t,
      read({ status: 'FAILED', errorDetail: 'Error: execution reverted 0x08c379a0' }),
      words
    );
    expect(j.standing).toBe('failed');
    expect(j.run.error).not.toMatch(/0x08c379a0/);
    expect(j.run.error).toContain('contact support');
  });
});

describe('purchaseStatus: what the In progress list reads', () => {
  it('follows the same rules without building the steps', () => {
    expect(purchaseStatus(read()).standing).toBe('on-its-way');
    expect(
      purchaseStatus(read(minted, allSent), {
        BTC: delivered(),
        ETH: delivered(),
        SOL: delivered(),
      }).standing
    ).toBe('done');
    expect(
      purchaseStatus(read({ ...minted, errorDetail: 'index-held:ETH' }, allSent)).heldCoin
    ).toBe('ETH');
  });
});

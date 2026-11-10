import { placesOf } from '@/lib/flow/run';
import { REFUND_STEP } from '@/lib/flow/plans';

import { transferKind, transferJourney } from './transfer-journey';

import type { TransferRowForJourney } from './transfer-journey';

// The explorer link helper's module also loads the on-ramp client (jose,
// ESM-only); the journey needs only the Stellar explorer address from it.
jest.mock('@/utils/transactions.utils', () => ({
  createStellarExpertUrl: (hash: string) => `https://stellar.expert/explorer/public/tx/${hash}`,
}));
// The app's words and number format, without its settings drawer (the repo's
// usual stand-in, as in swap-card.test.tsx).
jest.mock('@/locales', () => ({
  useTranslate: () => ({ t: (s: string) => s }),
  formatNumberLocale: () => ({ code: 'en-US' }),
}));

// The words go through the app's translator; here, a plain {{name}} filler.
const t = (key: string, opts?: Record<string, unknown>) =>
  key.replace(/{{(\w+)}}/g, (_, name) => String(opts?.[name] ?? ''));

const words = {
  amountIn: '1.1292 SOL',
  usdcOut: '≈ 97.12 USDC',
  amountUsdc: '25 USDC',
  amountOut: '≈ 0.00029 BTC',
  tool: 'Mayan',
  autopilot: true,
};
const row = (over: Partial<TransferRowForJourney>): TransferRowForJourney => ({
  direction: 'crosschain_to_stellar',
  status: 'CREATED',
  srcAsset: 'SOL',
  dstAsset: 'USDC',
  srcSwapTxHash: null,
  burnTxHash: null,
  eventNonce: null,
  mintTxHash: null,
  dstSwapTxHash: null,
  errorDetail: null,
  createdAt: '2026-11-09T13:04:00Z',
  updatedAt: '2026-11-09T13:05:00Z',
  ...over,
});
const status = (j: ReturnType<typeof transferJourney>, id: string) => j.run.steps[id]?.status;
const out = { direction: 'stellar_to_crosschain', srcAsset: 'USDC', dstAsset: 'BTC' };

describe('transferJourney: a closed-out swap as its journey (Niko 2026-11-09)', () => {
  it('tells in, out and brought back apart', () => {
    expect(transferKind(row({}))).toBe('in');
    expect(transferKind(row(out))).toBe('out');
    expect(transferKind(row({ srcAsset: 'USDC', dstAsset: 'USDC' }))).toBe('back');
  });

  it('a swap in that Circle is carrying: on its way, at Circle', () => {
    const j = transferJourney(
      t,
      row({ srcSwapTxHash: 's'.repeat(88), burnTxHash: `0x${'b'.repeat(64)}` }),
      words
    );
    expect(j.standing).toBe('on-its-way');
    expect(status(j, 'send')).toBe('done');
    expect(status(j, 'burn')).toBe('done');
    expect(j.run.steps.burn?.links?.[0]?.href).toContain('basescan.org');
    expect(j.run.activeId).toBe('attest');
  });

  it('a swap in waiting on the person: needs you, past the exchange, no step turning', () => {
    const seen = transferJourney(t, row({ srcSwapTxHash: 's'.repeat(88) }), {
      ...words,
      onBase: true,
      waits: 'person',
    });
    expect(seen.standing).toBe('needs-you');
    expect(status(seen, 'arrived-base')).toBe('done');
    // Paused before its next step: the panel asks for the person, no step
    // runs, and none says "Waiting for you".
    expect(seen.run.activeId).toBeNull();
    expect(Object.values(seen.run.steps).some((s) => s?.waiting)).toBe(false);
  });

  it('the Bitcoin swap in the report: still confirming, on its way, the network at work (Niko 2026-11-10)', () => {
    // It said "Your swap needs you" and "Bitcoin confirms the payment:
    // Waiting for you" while the Bitcoin network was confirming it.
    const btc = row({ srcAsset: 'BTC', srcSwapTxHash: 'b'.repeat(64) });
    for (const autopilot of [true, false]) {
      const j = transferJourney(t, btc, {
        ...words,
        tool: 'NEAR Intents',
        autopilot,
        waits: 'exchange',
      });
      expect(j.standing).toBe('on-its-way');
      expect(status(j, 'send')).toBe('done');
      expect(j.run.activeId).toBe('source-confirm');
      expect(j.run.steps['source-confirm']?.waiting).toBeFalsy();
      expect(status(j, 'arrived-base')).not.toBe('done');
    }
  });

  it('at the Base address with auto-finish ahead: on its way, Normal at work', () => {
    const j = transferJourney(t, row({ srcSwapTxHash: 's'.repeat(88) }), {
      ...words,
      onBase: true,
      waits: 'normal',
    });
    expect(j.standing).toBe('on-its-way');
    expect(status(j, 'arrived-base')).toBe('done');
    expect(j.run.activeId).toBe('gas');
    expect(j.run.steps.gas?.waiting).toBeFalsy();
  });

  it('before the keeper has read it: on its way, never "needs you" on a guess', () => {
    const j = transferJourney(t, row({ srcSwapTxHash: 's'.repeat(88) }), {
      ...words,
      onBase: true,
    });
    expect(j.standing).toBe('on-its-way');
  });

  it('a swap in the exchange sent back: the journey goes home, every step settled', () => {
    const j = transferJourney(
      t,
      row({
        status: 'FAILED',
        srcSwapTxHash: 's'.repeat(88),
        errorDetail: 'Source swap refunded: funds returned to the sender; nothing was bridged',
      }),
      words
    );
    expect(j.standing).toBe('ended');
    expect(j.run.phase).toBe('stopped');
    expect(status(j, REFUND_STEP.send)).toBe('done');
    expect(status(j, REFUND_STEP.arrived)).toBe('done');
    const places = placesOf(j.plan);
    expect(places[places.length - 1].back).toBe(true);
    expect(j.run.ending).toContain('Nothing was lost');
  });

  it('a swap in that finished is done', () => {
    const j = transferJourney(
      t,
      row({
        status: 'COMPLETED',
        srcSwapTxHash: 's'.repeat(88),
        burnTxHash: '0xb',
        eventNonce: '1',
        mintTxHash: 'm'.repeat(64),
      }),
      words
    );
    expect(j.standing).toBe('done');
    expect(j.run.phase).toBe('done');
  });

  it('a swap out with its digital dollars on Base: needs you, or Normal swaps it', () => {
    const minted = row({
      ...out,
      status: 'COMPLETED',
      burnTxHash: 'b'.repeat(64),
      eventNonce: '1',
      mintTxHash: `0x${'m'.repeat(64)}`,
    });
    const j = transferJourney(t, minted, { ...words, waits: 'person' });
    expect(j.standing).toBe('needs-you');
    expect(status(j, 'mint')).toBe('done');
    expect(j.run.steps.mint?.links?.[0]?.href).toContain('basescan.org');
    expect(j.run.activeId).toBeNull();
    // Auto-finish takes it: a step at work, not the person's move.
    const auto = transferJourney(t, minted, { ...words, waits: 'normal' });
    expect(auto.standing).toBe('on-its-way');
    expect(auto.run.activeId).not.toBeNull();
  });

  it('a swap out brought back as digital dollars ends calmly', () => {
    const j = transferJourney(
      t,
      row({
        ...out,
        status: 'REFUNDED',
        burnTxHash: 'b'.repeat(64),
        eventNonce: '1',
        mintTxHash: '0xm',
      }),
      words
    );
    expect(j.standing).toBe('ended');
    expect(j.run.phase).toBe('stopped');
  });

  it('a real failure fails, in plain words with a way out', () => {
    const j = transferJourney(
      t,
      row({
        status: 'FAILED',
        srcSwapTxHash: 's'.repeat(88),
        errorDetail:
          'Error: execution reverted: 0x08c379a0000000000000000000000000000000000000000000000000000000000000002',
      }),
      words
    );
    expect(j.standing).toBe('failed');
    expect(j.run.phase).toBe('failed');
    expect(j.run.error).not.toMatch(/0x08c379a0/);
  });

  it('digital dollars brought back, delivered: done', () => {
    const j = transferJourney(
      t,
      row({
        srcAsset: 'USDC',
        dstAsset: 'USDC',
        status: 'COMPLETED',
        burnTxHash: '0xb',
        eventNonce: '1',
        mintTxHash: 'm'.repeat(64),
      }),
      words
    );
    expect(j.kind).toBe('back');
    expect(j.standing).toBe('done');
  });
});

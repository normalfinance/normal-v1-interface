// The rules that keep the in-flight banner honest (doc 89 F2).

import {
  canTransition,
  shouldAbandon,
  toInFlightRamp,
  isBannerVisible,
  ABANDON_AFTER_MS,
  balanceShowsArrival,
  type RampTransferRow,
} from './status';

const row = (over: Partial<RampTransferRow> = {}): RampTransferRow => ({
  id: 'r1',
  direction: 'onramp',
  provider: 'coinbase',
  asset: 'USDC',
  chain: 'stellar',
  walletAddress: 'GD6V…',
  amountExpected: null,
  status: 'committed',
  createdAt: '2026-08-25T12:00:00Z',
  ...over,
});

describe('transitions only move forward', () => {
  it('follows the happy path', () => {
    expect(canTransition('committed', 'provider_processing')).toBe(true);
    expect(canTransition('provider_processing', 'provider_complete')).toBe(true);
    expect(canTransition('provider_complete', 'arrived')).toBe(true);
  });

  it('can never un-arrive', () => {
    // A PATCH must not be able to resurrect a settled transfer.
    expect(canTransition('arrived', 'committed')).toBe(false);
    expect(canTransition('arrived', 'provider_complete')).toBe(false);
    expect(canTransition('paid_out', 'provider_processing')).toBe(false);
    expect(canTransition('failed', 'arrived')).toBe(false);
    expect(canTransition('abandoned', 'committed')).toBe(false);
  });

  it('lets a fast chain skip ahead of a slow provider', () => {
    // The balance can land before the provider admits it is done.
    expect(canTransition('committed', 'arrived')).toBe(true);
    expect(canTransition('provider_processing', 'arrived')).toBe(true);
  });

  it('only the offramp path reaches paid_out', () => {
    expect(canTransition('provider_complete', 'paid_out')).toBe(true);
    expect(canTransition('committed', 'paid_out')).toBe(false);
  });
});

describe('nothing pends forever', () => {
  const t0 = Date.parse('2026-08-25T12:00:00Z');

  it('abandons a silent committed row after the window', () => {
    expect(shouldAbandon('committed', t0, t0 + ABANDON_AFTER_MS)).toBe(true);
    expect(shouldAbandon('committed', t0, t0 + ABANDON_AFTER_MS - 1)).toBe(false);
  });

  it('never abandons a row the provider has acknowledged', () => {
    // Slow is not dead: a processing payment may legitimately take hours.
    expect(shouldAbandon('provider_processing', t0, t0 + 10 * ABANDON_AFTER_MS)).toBe(false);
    expect(shouldAbandon('provider_complete', t0, t0 + 10 * ABANDON_AFTER_MS)).toBe(false);
  });
});

describe('arrival requires the chain', () => {
  it('any measurable increase over the baseline counts', () => {
    // The amount is often unknown (picked on the provider page), so we never
    // demand a specific delta we could not know.
    expect(balanceShowsArrival('12.30', 12.31)).toBe(true);
    expect(balanceShowsArrival('0', 20)).toBe(true);
  });

  it('an unchanged balance is not arrival', () => {
    expect(balanceShowsArrival('12.30', 12.3)).toBe(false);
  });

  it('unknown inputs never claim arrival', () => {
    // A failed balance read must not clear the banner.
    expect(balanceShowsArrival(null, 12.3)).toBe(false);
    expect(balanceShowsArrival('12.30', null)).toBe(false);
    expect(balanceShowsArrival('12.30', NaN)).toBe(false);
    expect(balanceShowsArrival('garbage', 12.3)).toBe(false);
  });
});

describe('the message goes away when assets appear', () => {
  it('shows while in flight, disappears on arrival', () => {
    // Niko's requirement, verbatim: "make sure when assets appear the
    // message go away". Arrived/paid_out/abandoned leave the banner; the
    // chain's own Received row becomes the permanent record.
    expect(isBannerVisible('committed')).toBe(true);
    expect(isBannerVisible('provider_processing')).toBe(true);
    expect(isBannerVisible('provider_complete')).toBe(true);
    expect(isBannerVisible('arrived')).toBe(false);
    expect(isBannerVisible('paid_out')).toBe(false);
    expect(isBannerVisible('abandoned')).toBe(false);
  });

  it('keeps a failure visible — the user must learn what happened', () => {
    expect(isBannerVisible('failed')).toBe(true);
  });
});

describe('the view-model is honest about what it knows', () => {
  it('never invents an amount', () => {
    const vm = toInFlightRamp(row({ status: 'provider_complete' }));
    expect(vm.message).toBe('USDC on the way from Coinbase');
    expect(vm.message).not.toMatch(/\d/);
  });

  it('names the amount once it is known', () => {
    const vm = toInFlightRamp(row({ status: 'provider_complete', amountExpected: '20' }));
    expect(vm.message).toBe('20 USDC on the way from Coinbase');
  });

  it('gives the offramp its payout framing', () => {
    const vm = toInFlightRamp(
      row({ direction: 'offramp', status: 'provider_complete', amountExpected: '15' })
    );
    expect(vm.message).toMatch(/payout on the way/i);
    expect(vm.detail).toMatch(/bank/i);
    // A range, never a countdown we cannot honour.
    expect(vm.detail).not.toMatch(/\d+:\d+/);
  });

  it('says plainly when nothing moved', () => {
    const vm = toInFlightRamp(row({ status: 'failed' }));
    expect(vm.failed).toBe(true);
    expect(vm.detail).toMatch(/no funds moved/i);
  });
});

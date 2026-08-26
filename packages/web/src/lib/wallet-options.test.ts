// The rules that stop a ramp from silently picking a wallet (doc 88 B1).
// The live bug: MoneyGram sold from Lobstr because the dialog hardcoded the
// slot; the on-ramp half deposited into it unnamed.

import {
  defaultSelection,
  filterSellableOptions,
  buildStellarWalletOptions,
} from './wallet-options';

const LOBSTR = 'GCY3ZSMRFNWMDLNHZLF2AX4YJ7GTI5A7EJFPTK5LQYIS6LS3NSVJDA4S';
const NORMAL = 'GD6VNX3YZK2OKDN6CZPQJBETD4BVJADXLL5MY4Y5AHB7CRFKCEMOOY3X';

const hybrid = (over = {}) => ({
  slotAddress: LOBSTR,
  slotWalletType: 'lobstr',
  slotLabel: 'Lobstr',
  companionAddress: NORMAL,
  ...over,
});

describe('buildStellarWalletOptions', () => {
  it('offers both wallets to a hybrid user, external first', () => {
    const opts = buildStellarWalletOptions(hybrid());
    expect(opts.map((o) => o.key)).toEqual(['external', 'normal']);
    expect(opts[0].label).toBe('Lobstr');
    expect(opts[1].address).toBe(NORMAL);
  });

  it('reads each wallet balance directly — the aggregate is slot-only', () => {
    // The portfolio route feeds the aggregate the SLOT address and fetches
    // the companion separately, so there is no arithmetic to do. (An earlier
    // draft subtracted the companion from a presumed combined total, showing
    // Lobstr 11.90 when it actually held 12.30.)
    const opts = buildStellarWalletOptions(hybrid({ slotBalance: 12.3, companionBalance: 0.4 }));
    expect(opts[0].balance).toBeCloseTo(12.3);
    expect(opts[1].balance).toBeCloseTo(0.4);
  });

  it('gives a single-wallet user ONE named option — named is the point', () => {
    const opts = buildStellarWalletOptions({
      slotAddress: NORMAL,
      slotWalletType: 'normal-wallet',
      slotLabel: 'Normal wallet',
      companionAddress: null,
      slotBalance: 12,
    });
    expect(opts).toHaveLength(1);
    expect(opts[0]).toMatchObject({ key: 'normal', label: 'Normal wallet', balance: 12 });
  });

  it('returns nothing when no wallet exists (dialog falls back to its gate)', () => {
    expect(
      buildStellarWalletOptions({
        slotAddress: null,
        slotWalletType: null,
        slotLabel: '',
        companionAddress: null,
      })
    ).toEqual([]);
  });
});

describe('filterSellableOptions', () => {
  const both = () => buildStellarWalletOptions(hybrid({ slotBalance: 40, companionBalance: 15 }));

  it('keeps every wallet that holds the asset', () => {
    expect(filterSellableOptions(both())).toHaveLength(2);
  });

  it('drops a wallet with zero — it cannot sell what it does not hold', () => {
    const opts = buildStellarWalletOptions(
      hybrid({ slotBalance: 0, companionBalance: 15 }) // external holds nothing
    );
    const sellable = filterSellableOptions(opts);
    expect(sellable).toHaveLength(1);
    expect(sellable[0].key).toBe('normal');
  });

  it('never filters on unknown balances — unknown is not zero', () => {
    // Hiding a wallet because a balance read failed would be the old silent
    // pick in a new coat.
    const opts = buildStellarWalletOptions(hybrid());
    expect(filterSellableOptions(opts)).toHaveLength(2);
  });

  it('keeps all options when nothing holds a balance, rather than none', () => {
    const opts = buildStellarWalletOptions(hybrid({ slotBalance: 0, companionBalance: 0 }));
    expect(filterSellableOptions(opts)).toHaveLength(2);
  });
});

describe('defaultSelection', () => {
  it('on-ramp defaults to the NORMAL wallet — savings and swaps live there', () => {
    const opts = buildStellarWalletOptions(hybrid());
    expect(defaultSelection(opts, 'onramp')?.key).toBe('normal');
  });

  it('off-ramp defaults to the only wallet that holds the asset', () => {
    const opts = buildStellarWalletOptions(hybrid({ slotBalance: 0, companionBalance: 15 }));
    expect(defaultSelection(opts, 'offramp')?.key).toBe('normal');
  });

  it('off-ramp keeps today’s behaviour when both hold it: external first', () => {
    // A hybrid user’s default must not change under their feet — the fix is
    // the visible CHOICE, not a new silent pick.
    const opts = buildStellarWalletOptions(hybrid({ slotBalance: 40, companionBalance: 15 }));
    expect(defaultSelection(opts, 'offramp')?.key).toBe('external');
  });

  it('returns null when there are no options', () => {
    expect(defaultSelection([], 'onramp')).toBeNull();
  });
});

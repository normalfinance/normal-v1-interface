import { btcBalanceSats } from './btc-balance';

// Niko 2026-11-10: a swap's 0.000874 BTC still showed in Assets after it was
// sent, as if it could be swapped again, until the network confirmed it.

describe('btcBalanceSats: the Bitcoin an address holds', () => {
  it('confirmed only: as before', () => {
    expect(
      btcBalanceSats({
        chain_stats: { funded_txo_sum: 150_000, spent_txo_sum: 50_000 },
        mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 0 },
      })
    ).toBe(100_000);
  });

  it('a payment out leaves at once, while it waits to confirm: the amount and its fee', () => {
    // 100,000 sats confirmed. The swap spends that coin: 87,400 to the
    // exchange, 1,600 fee, 11,000 change back to the same address.
    expect(
      btcBalanceSats({
        chain_stats: { funded_txo_sum: 100_000, spent_txo_sum: 0 },
        mempool_stats: { funded_txo_sum: 11_000, spent_txo_sum: 100_000 },
      })
    ).toBe(11_000);
  });

  it('the whole balance swapped: nothing left to swap again', () => {
    expect(
      btcBalanceSats({
        chain_stats: { funded_txo_sum: 87_400 + 1_600, spent_txo_sum: 0 },
        mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 89_000 },
      })
    ).toBe(0);
  });

  it('a payment in counts once it is confirmed, as before', () => {
    expect(
      btcBalanceSats({
        chain_stats: { funded_txo_sum: 10_000, spent_txo_sum: 0 },
        mempool_stats: { funded_txo_sum: 25_000, spent_txo_sum: 0 },
      })
    ).toBe(10_000);
  });

  it('in and out pending at once: never more than confirmed', () => {
    expect(
      btcBalanceSats({
        chain_stats: { funded_txo_sum: 100_000, spent_txo_sum: 0 },
        mempool_stats: { funded_txo_sum: 130_000, spent_txo_sum: 100_000 },
      })
    ).toBe(100_000);
  });

  it('a missing ledger reads as empty', () => {
    expect(btcBalanceSats({})).toBe(0);
    expect(btcBalanceSats({ chain_stats: { funded_txo_sum: 5_000, spent_txo_sum: 0 } })).toBe(
      5_000
    );
  });
});

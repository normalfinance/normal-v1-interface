// Regression pin for 2026-08-27: the first version of the pre-sign PSBT check
// assumed a single destination output and refused EVERY real BTC swap (live:
// "expected exactly one payment output, found 3"). The real transaction has
// five outputs — deposit, OP_RETURN memo, our change, the route's protocol
// fee, and our own integrator-fee wallet. These cases are taken from that
// decoded transaction, so the check can never be tightened back into a shape
// assumption without a red test.
import { psbtSpendVerdict } from './btc-spend-verdict';

// The live quote, decoded 2026-08-27 (BTC → USDC on Base, NEAR route):
//   inputs   38,897 + 861            = 39,758
//   outputs  37,682 deposit | 0 memo | 555 ours | 294 protocol | 294 our fee
//   quote    37,965 sats
const REAL = { inputsTotalSat: 39_758n, backToUsSat: 555n, quotedSat: 37_965n };

describe('psbtSpendVerdict — the real LI.FI transaction must pass', () => {
  it('accepts the live 5-output swap (this is the regression)', () => {
    const v = psbtSpendVerdict(REAL);
    expect(v.spent).toBe(39_203n); // 39,758 − 555 change
    expect(v.ok).toBe(true);
  });

  it('accepts a swap with no change output at all', () => {
    expect(psbtSpendVerdict({ ...REAL, backToUsSat: 0n }).ok).toBe(true);
  });

  it('accepts a tiny swap where the miner fee dominates (the 10k floor)', () => {
    // 5,000 sat swap costing 9,000 in fees — ugly but legitimate at high fees.
    expect(
      psbtSpendVerdict({ inputsTotalSat: 14_000n, backToUsSat: 0n, quotedSat: 5_000n }).ok
    ).toBe(true);
  });
});

describe('psbtSpendVerdict — what it still catches', () => {
  it('refuses a route that burns most of the amount', () => {
    // Quote 37,965 but the transaction spends nearly double.
    const v = psbtSpendVerdict({ inputsTotalSat: 75_000n, backToUsSat: 0n, quotedSat: 37_965n });
    expect(v.ok).toBe(false);
    expect(v.limit).toBe(47_965n); // 37,965 + max(9,491, 10,000)
  });

  it('refuses when our change is kept by someone else on a large swap', () => {
    // 1 BTC quoted, 1.5 BTC spent, nothing back to us.
    const v = psbtSpendVerdict({
      inputsTotalSat: 150_000_000n,
      backToUsSat: 0n,
      quotedSat: 100_000_000n,
    });
    expect(v.ok).toBe(false);
  });

  it('refuses impossible arithmetic (outputs exceeding inputs)', () => {
    expect(
      psbtSpendVerdict({ inputsTotalSat: 1_000n, backToUsSat: 2_000n, quotedSat: 1_000n }).ok
    ).toBe(false);
  });

  it('scales the allowance with the amount (25% on large swaps)', () => {
    const v = psbtSpendVerdict({
      inputsTotalSat: 0n,
      backToUsSat: 0n,
      quotedSat: 100_000_000n,
    });
    expect(v.limit).toBe(125_000_000n);
  });
});

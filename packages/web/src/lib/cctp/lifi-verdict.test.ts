import { lifiSourceVerdict } from './lifi-verdict';

describe('lifiSourceVerdict — one reading for every surface', () => {
  it('reads a refund', () => {
    expect(lifiSourceVerdict('DONE', 'REFUNDED')).toBe('REFUNDED');
    expect(lifiSourceVerdict('DONE', 'PARTIAL')).toBe('REFUNDED');
  });

  it('reads an on-chain failure — the live 2026-08-28 reverted ETH swap', () => {
    // LI.FI returned exactly this for the reverted tx: status FAILED, no
    // substatus. Nothing moved onward; the row must be retired.
    expect(lifiSourceVerdict('FAILED', undefined)).toBe('FAILED');
    expect(lifiSourceVerdict('INVALID', '')).toBe('FAILED');
  });

  it('keeps waiting on anything non-terminal', () => {
    expect(lifiSourceVerdict('PENDING', undefined)).toBeNull();
    expect(lifiSourceVerdict('NOT_FOUND', undefined)).toBeNull();
    expect(lifiSourceVerdict('DONE', 'COMPLETED')).toBeNull(); // delivered = not a failure
    expect(lifiSourceVerdict(undefined, undefined)).toBeNull();
    expect(lifiSourceVerdict('', '')).toBeNull();
  });

  it('is case-tolerant — transport casing must not change a verdict', () => {
    expect(lifiSourceVerdict('failed', undefined)).toBe('FAILED');
    expect(lifiSourceVerdict('done', 'refunded')).toBe('REFUNDED');
  });
});

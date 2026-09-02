import { sanitizeRecordedFee } from './record-fee';

describe('sanitizeRecordedFee — a bad fee degrades to null, never fails the record', () => {
  it('passes a plausible 0.5% fee through canonically', () => {
    expect(sanitizeRecordedFee('0.001361', '0.27233146')).toBe('0.001361');
    expect(sanitizeRecordedFee(0.5, '100')).toBe('0.5');
  });

  it('absent means no fee recorded', () => {
    expect(sanitizeRecordedFee(undefined, '100')).toBeNull();
    expect(sanitizeRecordedFee(null, '100')).toBeNull();
  });

  it('junk, zero and negatives are dropped', () => {
    expect(sanitizeRecordedFee('abc', '100')).toBeNull();
    expect(sanitizeRecordedFee('0', '100')).toBeNull();
    expect(sanitizeRecordedFee('-1', '100')).toBeNull();
  });

  it('a fee above 10% of the amount is corrupt, not revenue', () => {
    expect(sanitizeRecordedFee('11', '100')).toBeNull();
    expect(sanitizeRecordedFee('10', '100')).toBe('10');
  });

  it('an unusable amountIn cannot validate any fee', () => {
    expect(sanitizeRecordedFee('0.5', 'nope')).toBeNull();
    expect(sanitizeRecordedFee('0.5', '0')).toBeNull();
  });
});

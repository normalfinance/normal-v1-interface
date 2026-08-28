// Doc 95 Wave 5. These amounts end up in the activity feed and the Dune
// dashboard, so "return null" must always beat "return something plausible".
import { parseDeliveredAmount } from './delivered-amount';

describe('parseDeliveredAmount — real payloads', () => {
  it('reads an 18-decimal ETH delivery', () => {
    expect(parseDeliveredAmount({ amount: '4200000000000000', token: { decimals: 18 } })).toBe(
      '0.0042'
    );
  });

  it('reads a 9-decimal SOL delivery', () => {
    expect(parseDeliveredAmount({ amount: '347445359', token: { decimals: 9 } })).toBe(
      '0.347445359'
    );
  });

  it('reads an 8-decimal BTC delivery', () => {
    expect(parseDeliveredAmount({ amount: '37682', token: { decimals: 8 } })).toBe('0.00037682');
  });

  it('reports MORE than a quoted minimum when the route over-delivers', () => {
    // The whole point: the quote said 0.0042, the bridge delivered 0.00435.
    const delivered = parseDeliveredAmount({ amount: '4350000000000000', token: { decimals: 18 } });
    expect(Number(delivered)).toBeGreaterThan(0.0042);
  });
});

describe('parseDeliveredAmount — refuses to guess', () => {
  it('null for a missing payload or amount', () => {
    expect(parseDeliveredAmount(null)).toBeNull();
    expect(parseDeliveredAmount(undefined)).toBeNull();
    expect(parseDeliveredAmount({ token: { decimals: 18 } })).toBeNull();
  });

  it('null when the amount is not integer base units', () => {
    expect(parseDeliveredAmount({ amount: '0.0042', token: { decimals: 18 } })).toBeNull();
    expect(parseDeliveredAmount({ amount: '4.2e15', token: { decimals: 18 } })).toBeNull();
    expect(parseDeliveredAmount({ amount: 'abc', token: { decimals: 18 } })).toBeNull();
  });

  it('null when decimals are missing or absurd', () => {
    expect(parseDeliveredAmount({ amount: '1000', token: {} })).toBeNull();
    expect(parseDeliveredAmount({ amount: '1000', token: { decimals: 'eighteen' } })).toBeNull();
    expect(parseDeliveredAmount({ amount: '1000', token: { decimals: 99 } })).toBeNull();
  });

  it('null for a zero delivery — that is not a delivery', () => {
    expect(parseDeliveredAmount({ amount: '0', token: { decimals: 18 } })).toBeNull();
  });
});

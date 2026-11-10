import { it, expect, describe } from '@jest/globals';

import { shareLabel, ALLOCATION_ORDER, allocationSlices } from './allocation';

// The coin colours' module loads the on-ramp client (jose, ESM-only); the
// slices only need the order.
jest.mock('@/lib/portfolio/display', () => ({ assetColor: (symbol: string) => symbol }));

describe('allocationSlices: the ring of what someone holds', () => {
  it('goes round in the fixed order, whatever the amounts', () => {
    const slices = allocationSlices([
      { symbol: 'Savings', label: 'Savings', value: 2500 },
      { symbol: 'BTC', label: 'Bitcoin', value: 1240.18 },
      { symbol: 'XLM', label: 'Stellar', value: 4.5 },
      { symbol: 'ETH', label: 'Ethereum', value: 330.32 },
      { symbol: 'USDC', label: 'Digital dollars', value: 45.5 },
      { symbol: 'SOL', label: 'Solana', value: 210 },
    ]);
    expect(slices.map((s) => s.symbol)).toEqual([...ALLOCATION_ORDER]);
  });

  it('shares sum to one and the arcs close the circle, from the top', () => {
    const slices = allocationSlices([
      { symbol: 'BTC', label: 'Bitcoin', value: 75 },
      { symbol: 'USDC', label: 'Digital dollars', value: 25 },
    ]);
    expect(slices.map((s) => s.share)).toEqual([0.25, 0.75]);
    expect(slices[0].start).toBe(0);
    expect(slices[0].end).toBeCloseTo(Math.PI / 2, 10);
    expect(slices[1].end).toBeCloseTo(2 * Math.PI, 10);
  });

  it('sums an asset held in two wallets, and leaves out what is worth nothing', () => {
    const slices = allocationSlices([
      { symbol: 'USDC', label: 'Digital dollars', value: 30 },
      { symbol: 'USDC', label: 'Digital dollars', value: 20 },
      { symbol: 'XLM', label: 'Stellar', value: 0 },
      { symbol: 'SOL', label: 'Solana', value: Number.NaN },
      { symbol: 'BTC', label: 'Bitcoin', value: 50 },
    ]);
    expect(slices.map((s) => [s.symbol, s.value])).toEqual([
      ['USDC', 50],
      ['BTC', 50],
    ]);
  });

  it('puts an asset outside the order after it, biggest first', () => {
    const slices = allocationSlices([
      { symbol: 'AQUA', label: 'Aquarius', value: 1 },
      { symbol: 'YXLM', label: 'yXLM', value: 3 },
      { symbol: 'BTC', label: 'Bitcoin', value: 2 },
    ]);
    expect(slices.map((s) => s.symbol)).toEqual(['BTC', 'YXLM', 'AQUA']);
  });

  it('is empty when nothing is held', () => {
    expect(allocationSlices([])).toEqual([]);
    expect(allocationSlices([{ symbol: 'BTC', label: 'Bitcoin', value: 0 }])).toEqual([]);
  });
});

it('shareLabel', () => {
  expect(shareLabel(0.2864)).toBe('29%');
  expect(shareLabel(0.004)).toBe('<1%');
  expect(shareLabel(1)).toBe('100%');
});

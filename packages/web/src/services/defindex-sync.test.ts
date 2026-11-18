import { parseYieldAccount } from './defindex-sync';

// Shapes taken from DeFindex's live /account/{wallet}/vault/{vault} answers
// (2026-11-13), amounts in stroops (7 decimals).
const DATE = '2026-11-13T09:00:00.000Z';

describe('yield per saver', () => {
  it('keeps a saver who withdrew everything: what they earned still counts', () => {
    const row = parseYieldAccount(
      {
        performance: {
          totalDeposited: '50000000000',
          totalWithdrawn: '50013900000',
          totalInterestEarned: '13900000',
          roi: 0.28,
        },
        currentPosition: { estimatedValue: '0' },
      },
      'GCLOSED',
      DATE,
      'VAULT'
    );
    expect(row).toMatchObject({
      wallet_address: 'GCLOSED',
      total_interest_earned: 1.39,
      current_position: 0,
    });
  });

  it('reads an open position', () => {
    const row = parseYieldAccount(
      {
        performance: { totalDeposited: '724722876500', totalInterestEarned: '4366575409' },
        currentPosition: { estimatedValue: '77327548949' },
      },
      'GOPEN',
      DATE,
      'VAULT'
    );
    expect(row?.total_interest_earned).toBeCloseTo(436.6575409);
    expect(row?.current_position).toBeCloseTo(7732.7548949);
  });

  it('skips a wallet that never saved', () => {
    expect(parseYieldAccount({ performance: {} }, 'GNEVER', DATE, 'VAULT')).toBeNull();
    expect(parseYieldAccount(null, 'GNEVER', DATE, 'VAULT')).toBeNull();
  });
});

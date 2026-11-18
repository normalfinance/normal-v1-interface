import { countKinds, withAllStellarWallets, buildStellarWalletList } from './wallets';

const A = `GA${'A'.repeat(54)}`;
const B = `GB${'B'.repeat(54)}`;
const C = `GC${'C'.repeat(54)}`;

describe('every Stellar wallet, counted once', () => {
  const list = buildStellarWalletList({
    passkey: [{ address: A, createdAt: new Date('2026-06-10T00:00:00Z') }],
    earlier: [
      // A was a connected wallet before it became this user's passkey wallet.
      { address: A, createdAt: new Date('2026-02-01T00:00:00Z') },
      { address: B, createdAt: new Date('2026-01-15T00:00:00Z') },
      { address: B, createdAt: new Date('2026-03-01T00:00:00Z') },
      { address: C, createdAt: '2025-11-03T09:00:00.000Z' },
      { address: '0xNOTSTELLAR', createdAt: new Date('2026-01-01T00:00:00Z') },
      { address: null, createdAt: new Date('2026-01-01T00:00:00Z') },
    ],
  });

  it('dedupes by address and keeps only Stellar addresses', () => {
    expect(list.map((w) => w.address).sort()).toEqual([A, B, C]);
  });

  it('dates each wallet from the first time any table saw it', () => {
    const byAddress = Object.fromEntries(list.map((w) => [w.address, w]));
    expect(byAddress[A].firstSeen).toBe('2026-02-01T00:00:00.000Z');
    expect(byAddress[B].firstSeen).toBe('2026-01-15T00:00:00.000Z');
  });

  it('calls a wallet a passkey wallet when Turnkey holds it', () => {
    expect(countKinds(list)).toEqual({ passkey: 1, earlier: 2 });
  });

  it('replaces only the Stellar rows of the chain count', () => {
    const rows = withAllStellarWallets(
      [
        {
          date: '2026-06-10T00:00:00.000Z',
          chain: 'stellar',
          wallets_added: 1,
          network: 'mainnet',
        },
        { date: '2026-06-10T00:00:00.000Z', chain: 'solana', wallets_added: 1, network: 'mainnet' },
      ],
      list,
      'mainnet'
    );
    expect(rows.filter((r) => r.chain === 'solana')).toHaveLength(1);
    expect(rows.filter((r) => r.chain === 'stellar')).toHaveLength(3);
    expect(rows.find((r) => r.chain === 'stellar' && r.date.startsWith('2025-11-03'))).toBeTruthy();
  });
});

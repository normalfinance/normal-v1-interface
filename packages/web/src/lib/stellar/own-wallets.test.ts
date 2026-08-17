import { it, expect, describe } from '@jest/globals';

import { buildOwnWalletCandidates } from './own-wallets';

const LOBSTR = 'GCY3ZSMRFNWMDLNHZLF2AX4YJ7GTI5A7EJFPTK5LQYIS6LS3NSVJDA4S';
const NORMAL = 'GA5GD6PTEXAMPLEEXAMPLEEXAMPLEEXAMPLEEXAMPLEEXAMPLEEXABCD';
const OTHER = 'GBOTHEREXAMPLEEXAMPLEEXAMPLEEXAMPLEEXAMPLEEXAMPLEEXAMPQR';

describe('buildOwnWalletCandidates', () => {
  it('external connected: companion first, then other linked wallets, sender excluded', () => {
    const out = buildOwnWalletCandidates({
      senderAddress: LOBSTR,
      companionAddress: NORMAL,
      linkedWallets: [
        { walletAddress: LOBSTR, walletName: 'Lobstr' }, // the sender itself
        { walletAddress: OTHER, walletName: 'Freighter' },
      ],
    });
    expect(out).toEqual([
      { address: NORMAL, label: 'Normal wallet' },
      { address: OTHER, label: 'Freighter' },
    ]);
  });

  it('normal wallet connected: all linked wallets, companion (=sender) excluded', () => {
    const out = buildOwnWalletCandidates({
      senderAddress: NORMAL,
      companionAddress: NORMAL,
      linkedWallets: [
        { walletAddress: LOBSTR, walletName: 'Lobstr' },
        { walletAddress: OTHER, walletName: null },
      ],
    });
    expect(out.map((c) => c.address)).toEqual([LOBSTR, OTHER]);
    // Nameless linked wallet falls back to a short address, never an empty label.
    expect(out[1].label).toBe(`${OTHER.slice(0, 4)}…${OTHER.slice(-4)}`);
  });

  it('dedupes an address that is both companion and linked', () => {
    const out = buildOwnWalletCandidates({
      senderAddress: LOBSTR,
      companionAddress: NORMAL,
      linkedWallets: [{ walletAddress: NORMAL, walletName: 'my turnkey' }],
    });
    expect(out).toEqual([{ address: NORMAL, label: 'Normal wallet' }]);
  });

  it('companion send (#74c): the connected slot wallet becomes a destination', () => {
    const out = buildOwnWalletCandidates({
      senderAddress: NORMAL, // sending FROM the companion
      companionAddress: NORMAL,
      slotWallet: { address: LOBSTR, label: 'Lobstr' },
      linkedWallets: [{ walletAddress: LOBSTR, walletName: 'old name' }],
    });
    // Slot entry wins over its linked row (dedupe keeps the first), and the
    // sending companion never offers itself.
    expect(out).toEqual([{ address: LOBSTR, label: 'Lobstr' }]);
  });

  it('no other wallets → empty list (chip row hidden)', () => {
    expect(
      buildOwnWalletCandidates({
        senderAddress: NORMAL,
        companionAddress: NORMAL,
        linkedWallets: [],
      })
    ).toEqual([]);
  });
});

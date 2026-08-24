import { isPrimaryWallet, defaultSeedLabel, seedAddressUpdate } from './wallet-seeds';

const WALLET_A = '5638012b-26b4-5a75-97d3-49b09149cf8d';
const WALLET_B = 'e470940f-646d-5d83-8913-00c34c8f4120';

describe('isPrimaryWallet', () => {
  it('claims the row when the user has no wallet yet', () => {
    // import-init creates the row with walletId '' before the wallet exists,
    // so a first-ever import must still populate it.
    expect(isPrimaryWallet('', WALLET_B)).toBe(true);
    expect(isPrimaryWallet(null, WALLET_B)).toBe(true);
    expect(isPrimaryWallet(undefined, WALLET_B)).toBe(true);
  });

  it('claims the row when the same wallet re-syncs', () => {
    // Every lazy chain-add ("Set up BTC wallet") posts the SAME walletId with
    // one more address. Treating that as a second seed would stop the new
    // address ever reaching the row.
    expect(isPrimaryWallet(WALLET_A, WALLET_A)).toBe(true);
  });

  it('does NOT claim the row for a second, different wallet', () => {
    // THE regression: overwriting here left walletId pointing at the imported
    // wallet while stellarAddress still belonged to the original, so the
    // exported phrase did not open the wallet on screen.
    expect(isPrimaryWallet(WALLET_A, WALLET_B)).toBe(false);
  });
});

describe('defaultSeedLabel', () => {
  it('names the primary wallet plainly', () => {
    expect(defaultSeedLabel(true)).toBe('Normal wallet');
  });

  it('makes an imported wallet distinguishable by address', () => {
    // Two identically-named entries are what made the passkey picker
    // impossible to choose from (doc 82) — do not repeat it here.
    expect(
      defaultSeedLabel(false, 'GD6VNX3YZK2OKDN6CZPQJBETD4BVJADXLL5MY4Y5AHB7CRFKCEMOOY3X')
    ).toBe('Imported · GD6V…OY3X');
  });

  it('still names a wallet with no Stellar address', () => {
    expect(defaultSeedLabel(false, null)).toBe('Imported wallet');
  });
});

describe('seedAddressUpdate', () => {
  it('writes only the chains actually derived', () => {
    expect(seedAddressUpdate({ bitcoin: 'bc1abc' })).toEqual({ bitcoinAddress: 'bc1abc' });
  });

  it('never blanks an address that was not reported', () => {
    // A chain-add reports one chain. Writing nulls for the rest would erase
    // addresses the user actually holds funds on.
    const update = seedAddressUpdate({ ethereum: '0xabc', stellar: null, solana: undefined });
    expect(update).toEqual({ ethereumAddress: '0xabc' });
    expect('stellarAddress' in update).toBe(false);
    expect('solanaAddress' in update).toBe(false);
  });

  it('handles the full first-import set', () => {
    expect(
      seedAddressUpdate({ stellar: 'G…', bitcoin: 'bc1…', ethereum: '0x…', solana: 'So…' })
    ).toEqual({
      stellarAddress: 'G…',
      bitcoinAddress: 'bc1…',
      ethereumAddress: '0x…',
      solanaAddress: 'So…',
    });
  });
});

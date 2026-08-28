import { bannerPhase } from './cctp-phase';

const row = (over: Partial<Parameters<typeof bannerPhase>[0]>) => ({
  status: 'CREATED',
  direction: 'crosschain_to_stellar',
  srcSwapTxHash: null,
  burnTxHash: null,
  mintTxHash: null,
  dstSwapTxHash: null,
  ...over,
});

describe('bannerPhase — terminal rows are invisible', () => {
  it('hides a FAILED inbound row with a source hash — the live 2026-08-28 ghost', () => {
    // The state machine retired the reverted ETH→USDC row (Activity showed
    // "Failed"), yet the banner still said "finish once it arrives": FAILED
    // was missing from the hidden list, so the row fell through to
    // halt-receive. Two surfaces told two stories about one dead swap.
    expect(bannerPhase(row({ status: 'FAILED', srcSwapTxHash: '0x15b128ad' }))).toBe('hidden');
  });

  it('hides FAILED regardless of direction or hashes', () => {
    expect(
      bannerPhase(
        row({
          status: 'FAILED',
          direction: 'stellar_to_crosschain',
          burnTxHash: '0xburn',
          mintTxHash: '0xmint',
        })
      )
    ).toBe('hidden');
  });

  it('hides REFUNDED and COMPLETED as before', () => {
    expect(bannerPhase(row({ status: 'REFUNDED', srcSwapTxHash: '0xa' }))).toBe('hidden');
    expect(bannerPhase(row({ status: 'COMPLETED', srcSwapTxHash: '0xa' }))).toBe('hidden');
  });
});

describe('bannerPhase — live rows keep their phases', () => {
  it('inbound with a source hash and no burn needs the receive tap', () => {
    expect(bannerPhase(row({ srcSwapTxHash: '0xa' }))).toBe('halt-receive');
  });

  it('inbound mid-bridge is automatic', () => {
    expect(bannerPhase(row({ srcSwapTxHash: '0xa', burnTxHash: '0xb' }))).toBe('auto');
  });

  it('inbound before any transaction has nothing to recover', () => {
    expect(bannerPhase(row({}))).toBe('hidden');
  });

  it('outbound minted-but-unpivoted needs the finish tap', () => {
    expect(
      bannerPhase(row({ direction: 'stellar_to_crosschain', burnTxHash: '0xb', mintTxHash: '0xm' }))
    ).toBe('halt-finish');
  });

  it('outbound settled or pre-burn stays hidden', () => {
    expect(
      bannerPhase(
        row({ direction: 'stellar_to_crosschain', burnTxHash: '0xb', dstSwapTxHash: '0xd' })
      )
    ).toBe('hidden');
    expect(bannerPhase(row({ direction: 'stellar_to_crosschain' }))).toBe('hidden');
  });
});

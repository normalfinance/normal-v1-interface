import { transferEnding } from './transfer-ending';
import { STELLAR_BURN_RETIRED } from './stellar-burn-verdict';

const t = (key: string, opts?: Record<string, unknown>) =>
  key.replace(/{{(\w+)}}/g, (_, name) => String(opts?.[name] ?? ''));

const ended = (status: string, errorDetail: string | null, srcAsset = 'SOL') =>
  transferEnding(t, { status, errorDetail, srcAsset });

describe('transferEnding: how a transfer ended, in plain words (Niko 2026-11-09)', () => {
  it('a coin the exchange sent back is calm, and says nothing was lost', () => {
    const e = ended(
      'FAILED',
      'Source swap refunded: funds returned to the sender; nothing was bridged'
    );
    expect(e).toMatchObject({ kind: 'sent-back', calm: true });
    expect(e!.text).toContain('sent your Solana back to your wallet. Nothing was lost');
  });

  it('a swap turned down on-chain is calm: the coin never left', () => {
    const e = ended(
      'FAILED',
      'Source transaction reverted on-chain: funds never left the sender; nothing was bridged',
      'ETH'
    );
    expect(e).toMatchObject({ kind: 'not-sent', calm: true });
    expect(e!.text).toContain('your Ethereum never left your wallet');
  });

  it('never sent, or cancelled first: calm, nothing moved', () => {
    for (const d of [
      'Expired: no transaction was ever sent; no funds moved',
      'Cancelled before any transaction was sent. No funds moved',
    ]) {
      expect(ended('FAILED', d)).toEqual({
        kind: 'not-sent',
        calm: true,
        text: 'This swap was never sent, so nothing moved. You can start a new one.',
      });
    }
  });

  it("the server's own words for a Stellar transfer that never landed pass as they are", () => {
    for (const words of Object.values(STELLAR_BURN_RETIRED)) {
      expect(ended('FAILED', words)).toEqual({ kind: 'not-sent', calm: true, text: words });
    }
  });

  it('brought back as digital dollars: calm, and points at its own line', () => {
    expect(
      ended('REFUNDED', 'Refunded: USDC is returning to your Stellar wallet (usually ~20 min)')
    ).toMatchObject({
      kind: 'coming-back',
      calm: true,
    });
  });

  it('any other failure is red, in the classifier words with a way out', () => {
    const e = ended(
      'FAILED',
      'Error: execution reverted: 0x08c379a0000000000000000000000000000000000000000000000000000000000000002'
    );
    expect(e).toMatchObject({ kind: 'failed', calm: false });
    expect(e!.text).not.toMatch(/0x08c379a0/);
    expect(e!.text).toMatch(/try again/i);
    expect(ended('FAILED', null)!.text).toMatch(/contact support/);
  });

  it('a transfer still running, or done, has no ending to show', () => {
    expect(ended('BURN_SUBMITTED', null)).toBeNull();
    expect(ended('COMPLETED', 'mint executed externally')).toBeNull();
  });
});

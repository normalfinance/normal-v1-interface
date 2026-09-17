import { it, expect, describe } from '@jest/globals';

import {
  fmtAmount,
  isPushToken,
  flattenData,
  isLifiTerminal,
  buildSendPayload,
  buildLifiPayload,
  buildCctpPayload,
  cctpTerminalKind,
  sendTerminalKind,
} from './messages';

const cctp = (over: Partial<Parameters<typeof cctpTerminalKind>[0]> = {}) => ({
  id: 't1',
  direction: 'crosschain_to_stellar',
  status: 'COMPLETED',
  dstAsset: 'USDC',
  dstAmount: '24.1',
  dstSwapTxHash: null,
  ...over,
});

describe('cctpTerminalKind — a function of the row, not of transitions', () => {
  it('inbound COMPLETED is delivery (the Stellar mint)', () => {
    expect(cctpTerminalKind(cctp())).toBe('completed');
  });
  it('outbound COMPLETED is only the Base mint; a pivot hash is only its BROADCAST', () => {
    expect(
      cctpTerminalKind(cctp({ direction: 'stellar_to_crosschain', dstAsset: 'SOL' }))
    ).toBeNull();
    // Not 'completed': BTC lands up to ~60 min later and the LI.FI leg can
    // still refund. The sweep asks LI.FI before saying "delivered".
    expect(
      cctpTerminalKind(
        cctp({ direction: 'stellar_to_crosschain', dstAsset: 'SOL', dstSwapTxHash: '0xabc' })
      )
    ).toBe('delivering');
  });
  it('REFUNDED and FAILED are terminal in both directions, whatever else is set', () => {
    expect(cctpTerminalKind(cctp({ status: 'REFUNDED' }))).toBe('refunded');
    expect(cctpTerminalKind(cctp({ status: 'FAILED', direction: 'stellar_to_crosschain' }))).toBe(
      'failed'
    );
  });
  it('in-flight rows are null', () => {
    expect(cctpTerminalKind(cctp({ status: 'ATTESTED' }))).toBeNull();
  });
});

describe('payload copy', () => {
  it('omits amounts by default and includes them when asked', () => {
    const off = buildCctpPayload(cctp(), 'completed', { includeAmounts: false });
    expect(off.title).toBe('USDC arrived');
    expect(off.body).not.toContain('24.1');
    const on = buildCctpPayload(cctp(), 'completed', { includeAmounts: true });
    expect(on.body).toContain('24.1 USDC');
    expect(on.data).toEqual({ type: 'cctp', transferId: 't1', status: 'completed' });
  });
  it('outbound delivery names the delivered asset', () => {
    const p = buildCctpPayload(
      cctp({
        direction: 'stellar_to_crosschain',
        dstAsset: 'SOL',
        dstAmount: '0.18200000',
        dstSwapTxHash: '0x1',
      }),
      'completed',
      { includeAmounts: true }
    );
    expect(p.title).toBe('SOL delivered');
    expect(p.body).toBe('0.182 SOL is in your wallet.');
  });
  it('send payloads route to Activity with chain + hash, and need a hash', () => {
    const row = {
      txHash: '0xh',
      chain: 'ethereum',
      symbol: 'ETH',
      amount: '0.5',
      status: 'confirmed',
    };
    const p = buildSendPayload(row, 'confirmed', 'Ethereum', { includeAmounts: true });
    expect(p?.data).toEqual({
      type: 'send',
      txHash: '0xh',
      chain: 'ethereum',
      status: 'confirmed',
    });
    expect(p?.body).toBe('0.5 ETH sent on Ethereum.');
    expect(
      buildSendPayload({ ...row, txHash: null }, 'confirmed', 'Ethereum', { includeAmounts: false })
    ).toBeNull();
  });
  it('lifi payloads carry the LI.FI status verbatim', () => {
    const row = { txHash: 'sig', tokenInSymbol: 'SOL', tokenOutSymbol: 'BTC', amountOut: '0.001' };
    expect(buildLifiPayload(row, 'REFUNDED', { includeAmounts: false })?.data).toEqual({
      type: 'lifi',
      txHash: 'sig',
      status: 'REFUNDED',
    });
    expect(buildLifiPayload(row, 'DONE', { includeAmounts: false })?.title).toBe('BTC delivered');
  });
});

describe('small helpers', () => {
  it('sendTerminalKind folds abandoned into failed and ignores in-flight', () => {
    expect(sendTerminalKind('confirmed')).toBe('confirmed');
    expect(sendTerminalKind('abandoned')).toBe('failed');
    expect(sendTerminalKind('submitted')).toBeNull();
  });
  it('isLifiTerminal', () => {
    expect(isLifiTerminal('DONE')).toBe(true);
    expect(isLifiTerminal('PENDING')).toBe(false);
    expect(isLifiTerminal('NOTFOUND')).toBe(false);
  });
  it('fmtAmount trims noise', () => {
    expect(fmtAmount('0.18200000')).toBe('0.182');
    expect(fmtAmount('24.10')).toBe('24.1');
    expect(fmtAmount('1234.5678')).toBe('1234.57');
    expect(fmtAmount('0')).toBeNull();
    expect(fmtAmount(null)).toBeNull();
  });
  it('isPushToken bounds length and rejects whitespace', () => {
    expect(isPushToken('a'.repeat(64))).toBe(true);
    expect(isPushToken('short')).toBe(false);
    expect(isPushToken(`${'a'.repeat(40)} ${'b'.repeat(10)}`)).toBe(false);
  });
  it('flattenData stringifies every value (FCM requirement)', () => {
    expect(flattenData({ type: 'send', n: 3, ok: true })).toEqual({
      type: 'send',
      n: '3',
      ok: 'true',
    });
  });
});

import { withdrawVerdict } from './withdraw-settle';

const ANCHOR = 'GCOSSQ2CZTGENRRVJMSSNRYMCBOWENU5PC2YQRUMUUEKEATYJC7MKIHE';

const ready = {
  id: 'tx1',
  status: 'pending_user_transfer_start',
  withdraw_anchor_account: ANCHOR,
  withdraw_memo: '123456',
  withdraw_memo_type: 'text',
  amount_in: { amount: '88.00', asset: 'stellar:USDC:GA5Z' },
};

describe('withdrawVerdict', () => {
  it('is ready with exact amount and the anchor-declared memo type', () => {
    const v = withdrawVerdict(ready, 88);
    expect(v.kind).toBe('ready');
    if (v.kind === 'ready') {
      expect(v.instructions).toEqual({
        anchorAccount: ANCHOR,
        memo: '123456',
        memoType: 'MEMO_TEXT',
        amount: '88',
      });
    }
  });
  it('honours an id memo type and refuses hash memos', () => {
    const id = withdrawVerdict({ ...ready, withdraw_memo_type: 'id' }, 88);
    expect(id.kind === 'ready' && id.instructions.memoType).toBe('MEMO_ID');
    expect(withdrawVerdict({ ...ready, withdraw_memo_type: 'hash' }, 88).kind).toBe('stop');
    expect(
      withdrawVerdict({ ...ready, withdraw_memo_type: 'id', withdraw_memo: 'abc' }, 88).kind
    ).toBe('stop');
  });
  it('waits while the anchor has not published the fields yet', () => {
    expect(withdrawVerdict({ status: 'incomplete' }, 88).kind).toBe('wait');
    expect(withdrawVerdict({ ...ready, withdraw_anchor_account: undefined }, 88).kind).toBe('wait');
    expect(withdrawVerdict({ ...ready, withdraw_memo: '' }, 88).kind).toBe('wait');
  });
  it('never sends twice or after a terminal state', () => {
    expect(withdrawVerdict({ ...ready, status: 'pending_user_transfer_complete' }, 88).kind).toBe(
      'stop'
    );
    expect(withdrawVerdict({ ...ready, status: 'pending_anchor' }, 88).kind).toBe('stop');
    expect(withdrawVerdict({ ...ready, status: 'expired' }, 88).kind).toBe('stop');
    expect(withdrawVerdict({ ...ready, status: 'completed' }, 88).kind).toBe('stop');
  });
  it('refuses a non-USDC asset, a non-Stellar account, and an amount above what was requested', () => {
    expect(
      withdrawVerdict({ ...ready, amount_in: { amount: '88', asset: 'stellar:XLM' } }, 88).kind
    ).toBe('stop');
    expect(withdrawVerdict({ ...ready, withdraw_anchor_account: '0xabc' }, 88).kind).toBe('stop');
    expect(withdrawVerdict({ ...ready, amount_in: { amount: '95', asset: 'USDC' } }, 88).kind).toBe(
      'stop'
    );
    expect(
      withdrawVerdict({ ...ready, amount_in: { amount: '88.5', asset: 'USDC' } }, 88).kind
    ).toBe('ready');
  });
  it('trims the amount to 7 decimals and never rounds up', () => {
    const v = withdrawVerdict(
      { ...ready, amount_in: { amount: '12.123456789', asset: 'USDC' } },
      13
    );
    expect(v.kind === 'ready' && v.instructions.amount).toBe('12.1234567');
  });
});

import { it, jest, expect, describe, beforeEach } from '@jest/globals';

const authedFetch = jest.fn<() => Promise<Response>>();
const awaitOnChain = jest.fn<() => Promise<string>>();

jest.mock('@/utils/authed-fetch', () => ({ authedFetch }));
jest.mock('@/lib/stellar/fee-pair', () => ({ awaitOnChain }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { submitSendThroughServer } = require('./submit-send') as {
  submitSendThroughServer: (server: never, xdr: string, hash: string) => Promise<{ hash: string }>;
};

const send = () => submitSendThroughServer({} as never, 'SIGNED', 'hash-1');
const answer = (status: number, body: object) =>
  authedFetch.mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe('submitSendThroughServer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the hash the server reports', async () => {
    answer(200, { success: true, hash: 'hash-1' });

    await expect(send()).resolves.toEqual({ hash: 'hash-1' });
    expect(awaitOnChain).not.toHaveBeenCalled();
  });

  it('throws Horizon-shaped codes, so the send hook words them the same way', async () => {
    const resultCodes = { transaction: 'tx_failed', operations: ['op_underfunded'] };
    answer(400, { success: false, error: 'Transaction submission failed', resultCodes });

    await expect(send()).rejects.toMatchObject({
      response: { data: { extras: { result_codes: resultCodes } } },
    });
    expect(awaitOnChain).not.toHaveBeenCalled();
  });

  it('shows the server message when the code has expired', async () => {
    answer(403, { success: false, error: 'Your 6-digit confirmation expired' });

    await expect(send()).rejects.toThrow('Your 6-digit confirmation expired');
  });

  it('asks the chain when the server gives no verdict', async () => {
    answer(502, { success: false });
    awaitOnChain.mockResolvedValue('success');

    await expect(send()).resolves.toEqual({ hash: 'hash-1' });
  });

  it('asks the chain when the request itself dies', async () => {
    authedFetch.mockRejectedValue(new TypeError('Failed to fetch'));
    awaitOnChain.mockResolvedValue('success');

    await expect(send()).resolves.toEqual({ hash: 'hash-1' });
  });

  it('reports a send the chain says failed', async () => {
    answer(502, {});
    awaitOnChain.mockResolvedValue('failed');

    await expect(send()).rejects.toThrow('Transaction failed on-chain.');
  });

  it('says plainly when the outcome is still unknown, instead of inviting a blind retry', async () => {
    answer(502, {});
    awaitOnChain.mockResolvedValue('not_found');

    await expect(send()).rejects.toThrow(/Check your activity/);
  });
});

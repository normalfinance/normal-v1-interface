import { it, jest, expect, describe, beforeEach } from '@jest/globals';

// Mocks first, then require: the real chain pulls @supabase/supabase-js → jose,
// which is ESM-only and unparseable to jest (see lib/with-auth.test.ts).
const limit = jest.fn<(id: string) => Promise<{ success: boolean }>>();
const fromXDR = jest.fn<(xdr: string, passphrase: string) => object>();
const submitTransaction = jest.fn<(tx: object) => Promise<{ hash: string }>>();
const getAuthenticatedUser = jest.fn<() => Promise<object | null>>();

let currentToken = 'token';

jest.mock('next/headers', () => ({ cookies: async () => ({}) }));
jest.mock('@/server/rateLimiter', () => ({ rateLimiter: { limit } }));
jest.mock('@/server/network-cookie', () => ({ networkFromCookie: () => 'testnet' }));
jest.mock('@/utils/http', () => ({ getAccessToken: () => currentToken }));
jest.mock('@/lib/createSupabaseServerClient', () => ({ getAuthenticatedUser }));
jest.mock('@normalfinance/utils', () => ({
  getStellarConfigForNetwork: () => ({
    NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
    HORIZON_URL: 'https://horizon-testnet.stellar.org',
  }),
}));
jest.mock('@stellar/stellar-sdk', () => ({
  TransactionBuilder: { fromXDR },
  Horizon: { Server: jest.fn(() => ({ submitTransaction })) },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST } = require('./route') as { POST: (req: never) => Promise<Response> };

const tokenWithCode = (secondsAgo: number) => {
  const timestamp = Math.floor(Date.now() / 1000) - secondsAgo;
  const claims = { aal: 'aal2', amr: [{ method: 'totp', timestamp }] };
  return `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`;
};

const post = (body: unknown) =>
  POST(
    new Request('http://localhost/api/send/stellar', {
      method: 'POST',
      body: JSON.stringify(body),
    }) as never
  );

describe('POST /api/send/stellar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentToken = tokenWithCode(20);
    getAuthenticatedUser.mockResolvedValue({ id: 'user-1', factors: [{ status: 'verified' }] });
    limit.mockResolvedValue({ success: true });
    fromXDR.mockReturnValue({ signed: true });
    submitTransaction.mockResolvedValue({ hash: 'abc123' });
  });

  it('relays a signed send after a fresh code', async () => {
    const res = await post({ signedXdr: 'AAAA' });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, hash: 'abc123' });
    expect(submitTransaction).toHaveBeenCalledWith({ signed: true });
  });

  it('sends nothing on an old code', async () => {
    currentToken = tokenWithCode(3600);

    const res = await post({ signedXdr: 'AAAA' });

    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('action_code_required');
    expect(submitTransaction).not.toHaveBeenCalled();
  });

  it('refuses a body with no transaction', async () => {
    const res = await post({});

    expect(res.status).toBe(400);
    expect(submitTransaction).not.toHaveBeenCalled();
  });

  it('refuses bytes that are not a transaction', async () => {
    fromXDR.mockImplementation(() => {
      throw new Error('bad xdr');
    });

    const res = await post({ signedXdr: 'garbage' });

    expect(res.status).toBe(400);
    expect(submitTransaction).not.toHaveBeenCalled();
  });

  it('respects the rate limit', async () => {
    limit.mockResolvedValue({ success: false });

    const res = await post({ signedXdr: 'AAAA' });

    expect(res.status).toBe(429);
    expect(submitTransaction).not.toHaveBeenCalled();
  });

  it('passes on the result codes when Horizon rejects the send', async () => {
    const resultCodes = { transaction: 'tx_failed', operations: ['op_underfunded'] };
    submitTransaction.mockRejectedValue({
      response: { data: { extras: { result_codes: resultCodes } } },
    });

    const res = await post({ signedXdr: 'AAAA' });

    expect(res.status).toBe(400);
    expect((await res.json()).resultCodes).toEqual(resultCodes);
  });

  it('answers 502 when Horizon gives no verdict, so the browser checks the chain', async () => {
    submitTransaction.mockRejectedValue(new Error('gateway timeout'));

    const res = await post({ signedXdr: 'AAAA' });

    expect(res.status).toBe(502);
  });
});

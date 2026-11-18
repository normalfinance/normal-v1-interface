import { it, jest, expect, describe, beforeEach } from '@jest/globals';

// An in-memory Redis with the three calls the route makes.
const store = new Map<string, unknown>();
const redis = {
  get: jest.fn(async (key: string) => store.get(key) ?? null),
  set: jest.fn(async (key: string, value: unknown, opts?: { nx?: boolean }) => {
    if (opts?.nx && store.has(key)) return null;
    store.set(key, value);
    return 'OK';
  }),
  del: jest.fn(async (key: string) => (store.delete(key) ? 1 : 0)),
};
jest.mock('@/server/rateLimiter', () => ({ redis }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET } = require('./route') as { GET: () => Promise<Response> };

const coin = (id: string, price: number) => ({
  id,
  current_price: price,
  market_cap: price * 1e6,
  sparkline_in_7d: { price: [price * 0.99, price] },
});
const UPSTREAM = [coin('bitcoin', 87000), coin('stellar', 0.3)];

const fetchMock = jest.fn<typeof fetch>();
global.fetch = fetchMock;
const answer = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

const read = async () => {
  const res = await GET();
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
};

describe('GET /api/prices/markets', () => {
  beforeEach(() => {
    store.clear();
    jest.clearAllMocks();
  });

  it('asks CoinGecko once, then serves everyone from the cache', async () => {
    fetchMock.mockImplementation(() => answer(200, UPSTREAM));
    const first = await read();
    const second = await read();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect((first.body.markets as { symbol: string }[]).map((m) => m.symbol)).toEqual([
      'BTC',
      'XLM',
    ]);
    // The refresh lock is let go once the cache is filled.
    expect(store.has('lock:prices:markets:v1')).toBe(false);
  });

  it('serves the last good copy, marked stale, when CoinGecko fails', async () => {
    fetchMock.mockImplementation(() => answer(200, UPSTREAM));
    await read();
    store.delete('prices:markets:v1'); // the five minutes are up

    fetchMock.mockImplementation(() => answer(429, { error: 'rate limited' }));
    const { status, body } = await read();
    expect(status).toBe(200);
    expect(body.stale).toBe(true);
    expect((body.markets as unknown[]).length).toBe(2);
  });

  it('while one request refreshes, the rest serve the last copy instead of piling on', async () => {
    fetchMock.mockImplementation(() => answer(200, UPSTREAM));
    await read();
    store.delete('prices:markets:v1');
    store.set('lock:prices:markets:v1', '1'); // someone else is refreshing

    const { body } = await read();
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the first, filling call
    expect(body.stale).toBe(true);
  });

  it('says so, as an error, when there is nothing to serve at all', async () => {
    fetchMock.mockImplementation(() => answer(500, {}));
    const { status, body } = await read();
    expect(status).toBe(502);
    expect(body.success).toBe(false);
  });

  it('treats an answer with none of our coins as a failure, not as "no market"', async () => {
    fetchMock.mockImplementation(() => answer(200, [coin('dogecoin', 0.2)]));
    const { status } = await read();
    expect(status).toBe(502);
  });
});

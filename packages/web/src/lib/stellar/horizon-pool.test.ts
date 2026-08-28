import { fetchStellarBalancesFromPool } from './horizon-pool';

const PRIMARY = 'https://keyed.example.com/v1/key';
const PUBLIC = 'https://horizon.stellar.org';
const ADDR = 'GABC';
const ISSUER = 'GISSUER';

const account = (xlm: string, usdc: string) =>
  ({
    ok: true,
    status: 200,
    json: async () => ({
      balances: [
        { asset_type: 'native', balance: xlm },
        { asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: ISSUER, balance: usdc },
      ],
    }),
  }) as unknown as Response;

const status = (code: number) => ({ ok: false, status: code }) as unknown as Response;

describe('fetchStellarBalancesFromPool', () => {
  it('serves from the primary when it answers', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(account('5.1', '28.7'));
    const r = await fetchStellarBalancesFromPool([PRIMARY, PUBLIC], ADDR, ISSUER, { fetchImpl });
    expect(r).toEqual({ xlm: 5.1, usdc: 28.7, servedBy: PRIMARY });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails over when the primary is unreachable — the live 2026-08-28 outage', async () => {
    // horizon.stellar.org: DNS resolved, TCP never connected. One dead host
    // must not blank the app when a healthy one is configured beside it.
    const fetchImpl = jest
      .fn()
      .mockRejectedValueOnce(new Error('connect timeout'))
      .mockResolvedValue(account('5.1', '28.7'));
    const r = await fetchStellarBalancesFromPool([PRIMARY, PUBLIC], ADDR, ISSUER, { fetchImpl });
    expect(r.servedBy).toBe(PUBLIC);
  });

  it('fails over on a 429/5xx answer too', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(status(429))
      .mockResolvedValue(account('1', '2'));
    const r = await fetchStellarBalancesFromPool([PRIMARY, PUBLIC], ADDR, ISSUER, { fetchImpl });
    expect(r).toMatchObject({ xlm: 1, usdc: 2, servedBy: PUBLIC });
  });

  it('treats 404 as the ANSWER "unfunded" — zeros, and no failover', async () => {
    // Failing over on 404 would re-ask a question the ledger already answered,
    // and make every unfunded account cost a round trip to every endpoint.
    const fetchImpl = jest.fn().mockResolvedValue(status(404));
    const r = await fetchStellarBalancesFromPool([PRIMARY, PUBLIC], ADDR, ISSUER, { fetchImpl });
    expect(r).toEqual({ xlm: 0, usdc: 0, servedBy: PRIMARY });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('throws the last error when every endpoint is dead', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('all dead'));
    await expect(
      fetchStellarBalancesFromPool([PRIMARY, PUBLIC], ADDR, ISSUER, { fetchImpl })
    ).rejects.toThrow('all dead');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('ignores a foreign-issuer USDC balance', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        balances: [
          { asset_type: 'native', balance: '3' },
          {
            asset_type: 'credit_alphanum4',
            asset_code: 'USDC',
            asset_issuer: 'GFAKE',
            balance: '99',
          },
        ],
      }),
    } as unknown as Response);
    const r = await fetchStellarBalancesFromPool([PRIMARY], ADDR, ISSUER, { fetchImpl });
    expect(r.usdc).toBe(0);
  });

  it('dedupes and strips trailing slashes so one host is never asked twice', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('down'));
    await expect(
      fetchStellarBalancesFromPool([`${PUBLIC}/`, PUBLIC], ADDR, ISSUER, { fetchImpl })
    ).rejects.toThrow('down');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(`${PUBLIC}/accounts/${ADDR}`, expect.anything());
  });

  it('refuses an empty pool loudly', async () => {
    await expect(fetchStellarBalancesFromPool([], ADDR, ISSUER)).rejects.toThrow(
      'no horizon endpoints configured'
    );
  });
});

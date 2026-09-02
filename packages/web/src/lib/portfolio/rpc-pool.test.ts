import { rpcFromPool } from './rpc-pool';

const OK = async (url: string) => `answered by ${url}`;
const FAIL = (msg: string) => async () => {
  throw new Error(msg);
};

describe('rpcFromPool — one flaky provider must not blank a balance', () => {
  it('uses the first URL when it answers, and never calls the rest', async () => {
    const seen: string[] = [];
    const res = await rpcFromPool(['https://a', 'https://b'], async (u) => {
      seen.push(u);
      return 1;
    });
    expect(res).toEqual({ value: 1, servedBy: 'https://a' });
    expect(seen).toEqual(['https://a']);
  });

  it('falls through to the next URL when the primary throws', async () => {
    const res = await rpcFromPool(['https://dead', 'https://good'], async (u) => {
      if (u === 'https://dead') throw new Error('HTTP 500 Internal server error');
      return OK(u);
    });
    expect(res.value).toBe('answered by https://good');
    expect(res.servedBy).toBe('https://good');
  });

  it('reports which URL answered so a silent failover can be logged', async () => {
    const res = await rpcFromPool(['https://a', 'https://b', 'https://c'], async (u) => {
      if (u !== 'https://c') throw new Error('down');
      return 42;
    });
    expect(res.servedBy).toBe('https://c');
  });

  it('throws the last error when every endpoint fails — the caller keeps the known balance', async () => {
    await expect(
      rpcFromPool(['https://a', 'https://b'], FAIL('everything is down'))
    ).rejects.toThrow('everything is down');
  });

  it('ignores empty entries and refuses an empty pool rather than returning zero', async () => {
    await expect(rpcFromPool(['', undefined as any], OK)).rejects.toThrow('no URLs configured');
  });
});

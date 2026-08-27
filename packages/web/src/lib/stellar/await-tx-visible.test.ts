import { awaitTxVisible } from './await-tx-visible';

const HORIZON = 'https://horizon.stellar.org';
const HASH = 'abc123';

/** Virtual clock: sleeps advance it, so no test waits in real time. */
function clock() {
  let t = 1_000_000;
  return {
    now: () => t,
    sleep: async (ms: number) => {
      t += ms;
    },
  };
}

const ok = () => ({ ok: true }) as Response;
const notFound = () => ({ ok: false, status: 404 }) as Response;

describe('awaitTxVisible', () => {
  it('returns as soon as Horizon has the transaction', async () => {
    const c = clock();
    const fetchImpl = jest.fn().mockResolvedValue(ok());
    await expect(
      awaitTxVisible(HORIZON, HASH, { ...c, fetchImpl: fetchImpl as unknown as typeof fetch })
    ).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('polls past a 404 — "not ingested yet" is the expected answer, not a failure', async () => {
    const c = clock();
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(notFound())
      .mockResolvedValueOnce(notFound())
      .mockResolvedValue(ok());
    await expect(
      awaitTxVisible(HORIZON, HASH, { ...c, fetchImpl: fetchImpl as unknown as typeof fetch })
    ).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('keeps trying through a network throw', async () => {
    const c = clock();
    const fetchImpl = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(ok());
    await expect(
      awaitTxVisible(HORIZON, HASH, { ...c, fetchImpl: fetchImpl as unknown as typeof fetch })
    ).resolves.toBe(true);
  });

  it('gives up within the budget rather than holding up a finished swap', async () => {
    const c = clock();
    const fetchImpl = jest.fn().mockResolvedValue(notFound());
    await expect(
      awaitTxVisible(HORIZON, HASH, {
        ...c,
        fetchImpl: fetchImpl as unknown as typeof fetch,
        timeoutMs: 3_000,
        intervalMs: 1_000,
      })
    ).resolves.toBe(false);
    // 3 looks inside a 3s budget, then it stops — never unbounded.
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('always takes at least one look, even with no budget', async () => {
    const c = clock();
    const fetchImpl = jest.fn().mockResolvedValue(ok());
    await expect(
      awaitTxVisible(HORIZON, HASH, {
        ...c,
        fetchImpl: fetchImpl as unknown as typeof fetch,
        timeoutMs: 0,
      })
    ).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('refuses missing inputs instead of building a nonsense URL', async () => {
    const fetchImpl = jest.fn();
    await expect(
      awaitTxVisible('', HASH, { fetchImpl: fetchImpl as unknown as typeof fetch })
    ).resolves.toBe(false);
    await expect(
      awaitTxVisible(HORIZON, '', { fetchImpl: fetchImpl as unknown as typeof fetch })
    ).resolves.toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('tolerates a trailing slash on the Horizon URL', async () => {
    const c = clock();
    const fetchImpl = jest.fn().mockResolvedValue(ok());
    await awaitTxVisible(`${HORIZON}/`, HASH, {
      ...c,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(fetchImpl).toHaveBeenCalledWith(`${HORIZON}/transactions/${HASH}`, {
      cache: 'no-store',
    });
  });
});

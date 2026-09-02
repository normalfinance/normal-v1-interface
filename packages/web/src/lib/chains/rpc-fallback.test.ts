// Doc 126: the send paths used to read NEXT_PUBLIC_SOL_RPC_URL while the rest
// of the app read NEXT_PUBLIC_SOLANA_RPC_URL. Only the second was ever set, so
// user sends broadcast over the throttled public node. One resolver now, and
// these tests pin the precedence so the two names cannot drift apart again.

const OLD_ENV = process.env;

async function loadWith(env: Record<string, string | undefined>) {
  jest.resetModules();
  process.env = { ...OLD_ENV, ...env };
  return import('./rpc-fallback');
}

afterEach(() => {
  process.env = OLD_ENV;
  jest.resetModules();
});

describe('SOLANA_RPC_URL — one endpoint, two historical names', () => {
  it('prefers the current variable', async () => {
    const { SOLANA_RPC_URL } = await loadWith({
      NEXT_PUBLIC_SOLANA_RPC_URL: 'https://keyed.example/current',
      NEXT_PUBLIC_SOL_RPC_URL: 'https://keyed.example/legacy',
    });
    expect(SOLANA_RPC_URL).toBe('https://keyed.example/current');
  });

  it('still honours the legacy name — an env set under it keeps working', async () => {
    const { SOLANA_RPC_URL } = await loadWith({
      NEXT_PUBLIC_SOLANA_RPC_URL: undefined,
      NEXT_PUBLIC_SOL_RPC_URL: 'https://keyed.example/legacy',
    });
    expect(SOLANA_RPC_URL).toBe('https://keyed.example/legacy');
  });

  it('falls back to a public node when neither is set', async () => {
    const { SOLANA_RPC_URL } = await loadWith({
      NEXT_PUBLIC_SOLANA_RPC_URL: undefined,
      NEXT_PUBLIC_SOL_RPC_URL: undefined,
    });
    expect(SOLANA_RPC_URL).toBe('https://solana-rpc.publicnode.com');
  });

  it('leads the fallback list without duplicating the public entry', async () => {
    const { SOL_RPC_URLS } = await loadWith({
      NEXT_PUBLIC_SOLANA_RPC_URL: 'https://api.mainnet-beta.solana.com',
      NEXT_PUBLIC_SOL_RPC_URL: undefined,
    });
    expect(SOL_RPC_URLS).toEqual(['https://api.mainnet-beta.solana.com']);
  });
});

describe('keyed endpoints lead the EVM fallback lists', () => {
  it('server-only CCTP urls come first, public nodes stay as the safety net', async () => {
    const { ETH_RPC_URLS, BASE_RPC_URLS } = await loadWith({
      CCTP_RPC_URL_ETHEREUM: 'https://keyed.example/eth',
      CCTP_RPC_URL_BASE: 'https://keyed.example/base',
      NEXT_PUBLIC_ETH_RPC_URL: 'https://public-ish.example/eth',
    });
    expect(ETH_RPC_URLS[0]).toBe('https://keyed.example/eth');
    expect(ETH_RPC_URLS).toContain('https://eth.llamarpc.com');
    expect(BASE_RPC_URLS[0]).toBe('https://keyed.example/base');
  });
});

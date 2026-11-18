import { clearStoredSession, supabaseStorageKey } from './supabase-config';

// The utils package ships ES modules Jest doesn't parse; the project URL is
// all this module takes from it.
jest.mock('@normalfinance/utils', () => ({
  constants: { getNetworkConfig: () => 'https://vunxamogbkphzzdzxjut.supabase.co' },
}));

describe('the stored Supabase session', () => {
  it("is supabase-js's own key for the project", () => {
    expect(supabaseStorageKey('https://vunxamogbkphzzdzxjut.supabase.co')).toBe(
      'sb-vunxamogbkphzzdzxjut-auth-token'
    );
    expect(supabaseStorageKey('not a url')).toBeNull();
  });

  it("logging out drops this project's session and its companions, nothing else", () => {
    const key = supabaseStorageKey() ?? '';
    expect(key).toBe('sb-vunxamogbkphzzdzxjut-auth-token');
    const store = new Map<string, string>([
      [key, '{}'],
      [`${key}-code-verifier`, 'v'],
      [`${key}-user`, '{}'],
      ['sb-otherproject-auth-token', '{}'],
      ['nf-theme', 'dark'],
    ]);
    const localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      removeItem: (k: string) => store.delete(k),
    };
    // Object.keys(localStorage) lists the entries in a browser.
    const proxy = new Proxy(localStorage, {
      ownKeys: () => [...store.keys()],
      getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
    });
    const g = globalThis as unknown as { window?: unknown };
    const before = g.window;
    g.window = { localStorage: proxy };
    try {
      clearStoredSession();
    } finally {
      g.window = before;
    }
    expect([...store.keys()].sort()).toEqual(['nf-theme', 'sb-otherproject-auth-token']);
  });
});

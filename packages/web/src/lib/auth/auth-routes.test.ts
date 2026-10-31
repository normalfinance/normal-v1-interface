import { authHref, isAuthPage, safeNextPath, loginHrefFrom } from './auth-routes';

describe('safeNextPath', () => {
  it('keeps same-site paths with their query', () => {
    expect(safeNextPath('/swap')).toBe('/swap');
    expect(safeNextPath('/assets/BTC?tab=activity')).toBe('/assets/BTC?tab=activity');
  });

  it.each([
    ['empty', ''],
    ['null', null],
    ['missing', undefined],
    ['absolute URL', 'https://evil.com'],
    ['protocol-relative', '//evil.com'],
    ['backslash trick', '/\\evil.com'],
    ['tab trick', '/\t/evil.com'],
    ['newline trick', '/\n/evil.com'],
    ['scheme', 'javascript:alert(1)'],
    ['relative path', 'swap'],
  ])('refuses %s', (_label, next) => {
    expect(safeNextPath(next)).toBeNull();
  });

  it('refuses a sign-in page, which would bounce straight back out', () => {
    expect(safeNextPath('/login')).toBeNull();
    expect(safeNextPath('/signup?next=/swap')).toBeNull();
  });
});

describe('authHref', () => {
  it('carries a safe destination', () => {
    expect(authHref('login', '/assets/BTC?tab=a')).toBe('/login?next=%2Fassets%2FBTC%3Ftab%3Da');
    expect(authHref('signup', '/swap')).toBe('/signup?next=%2Fswap');
  });

  it('drops an unsafe destination', () => {
    expect(authHref('login', '//evil.com')).toBe('/login');
    expect(authHref('signup', null)).toBe('/signup');
  });
});

describe('loginHrefFrom', () => {
  it('returns to the page the visitor was on', () => {
    expect(loginHrefFrom('/swap', '?from=XLM')).toBe('/login?next=%2Fswap%3Ffrom%3DXLM');
  });

  it('has nothing to return to from the landing page', () => {
    expect(loginHrefFrom('/')).toBe('/login');
  });
});

describe('isAuthPage', () => {
  it('matches only the sign-in pages', () => {
    expect(isAuthPage('/login')).toBe(true);
    expect(isAuthPage('/signup')).toBe(true);
    expect(isAuthPage('/auth/callback')).toBe(false);
    expect(isAuthPage('/')).toBe(false);
  });
});

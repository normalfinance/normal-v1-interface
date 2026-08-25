import fs from 'fs';
import path from 'path';
import { it, expect, describe } from '@jest/globals';

// ---------------------------------------------------------------------------
// Every API route must authenticate via withAuth — or be listed here WITH A
// REASON. This is the guard that makes finding #46 permanent: three separate
// incidents (#3 log-transaction, Block C #2, #44 broadcast-btc) were routes
// born public because auth was opt-in. A new route that is neither wrapped
// nor allowlisted fails CI on the PR that adds it.
//
// Source-level on purpose: importing route modules would drag server-only
// dependencies (prisma, jose) into jest. Reading the file text is enough to
// prove the wrapper (or the documented exception) is present.
// ---------------------------------------------------------------------------

/** Routes that are allowed to skip withAuth — each with its reason. */
const PUBLIC_ROUTES: Record<string, string> = {
  'activity/bitcoin': 'address-keyed public chain data; rate-limited with refresh floor',
  'activity/ethereum': 'address-keyed public chain data; rate-limited with refresh floor',
  'activity/solana': 'address-keyed public chain data; rate-limited with refresh floor',
  'activity/stellar': 'address-keyed public chain data; rate-limited with refresh floor',
  'lifi/quote': 'prices shown before a wallet is connected (decision); IP rate-limited',
  'swap/quote': 'prices shown before a wallet is connected (decision); IP rate-limited',
  'prices/history': 'public market data; rate-limited',
  'savings/user-position': 'address-keyed on-chain read; rate-limited (Block C #2 scoping pending)',
  'savings/earnings-history':
    'address-keyed append-only vault history; same exposure class as user-position (Block C #2)',
  'savings/vault-info': 'single shared vault read; cached + rate-limited',
  // 'wallet/activity' was here as "scoping decision pending". RESOLVED
  // 2026-08-24 (doc 81 item 1, decision A): it reads OUR database rather than
  // the chain, so it is now withAuth + ownership-checked and must never
  // return to this list.
  'mgi/info': 'static SEP anchor info, cached 300s, no user data',
  'cron/cctp-advance': 'cron-secret auth, not user sessions',
  'cron/dune-sync': 'cron-secret auth, not user sessions',
  'cron/fee-escrow-sweep': 'cron-secret auth, not user sessions',
  'cron/ramp-reconcile': 'cron-secret auth, not user sessions; reads providers, flips statuses',
};

const API_DIR = path.join(__dirname);

function findRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findRouteFiles(p));
    else if (entry.name === 'route.ts') out.push(p);
  }
  return out;
}

const routeFiles = findRouteFiles(API_DIR);
const routeKey = (file: string) =>
  path.relative(API_DIR, path.dirname(file)).split(path.sep).join('/');

describe('route auth conformance', () => {
  it('found a plausible number of routes', () => {
    // A refactor that moves the API dir should fail loudly, not pass vacuously.
    expect(routeFiles.length).toBeGreaterThan(50);
  });

  it.each(routeFiles.map((f) => [routeKey(f), f]))(
    '%s authenticates via withAuth or is allowlisted with a reason',
    (key, file) => {
      const source = fs.readFileSync(file as string, 'utf-8');
      const wrapped = source.includes('withAuth(');
      const allowlisted = key in PUBLIC_ROUTES;

      if (!wrapped && !allowlisted) {
        throw new Error(
          `New route "${key}" is public. Either wrap its handlers in withAuth ` +
            `(the default), or add it to PUBLIC_ROUTES in this test WITH the ` +
            `reason it must stay public.`
        );
      }
      // Keep the allowlist honest: a route that gained auth must leave it.
      if (wrapped && allowlisted) {
        throw new Error(
          `Route "${key}" is withAuth-wrapped but still allowlisted — remove ` +
            `it from PUBLIC_ROUTES so the list only contains real exceptions.`
        );
      }
      expect(wrapped || allowlisted).toBe(true);
    }
  );

  it('every allowlist entry corresponds to an existing route', () => {
    const existing = new Set(routeFiles.map(routeKey));
    for (const key of Object.keys(PUBLIC_ROUTES)) {
      expect(existing.has(key)).toBe(true);
    }
  });
});

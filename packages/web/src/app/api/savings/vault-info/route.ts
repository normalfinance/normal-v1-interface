import type { NextRequest } from 'next/server';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { redis } from '@/server/rateLimiter';
import { withRateLimitRetry } from '@/server/defindex';
import { networkFromCookie } from '@/server/network-cookie';
import { DefindexSDK, SupportedNetworks } from '@defindex/sdk';

export const dynamic = 'force-dynamic';

const DECIMALS = 1e7;

// This response is identical for every user — no wallet, no auth, just the
// vault's name/TVL/APY/fees. So a single cache entry per network serves ALL
// traffic, unlike our per-address caches. Without it every browser called
// DeFindex directly and we were already getting 429s at a handful of users.
const CACHE_TTL_SECONDS = 120;
// Kept long enough to ride out a provider outage: a slightly old APY is a far
// better answer than a broken savings card.
const STALE_TTL_SECONDS = 3600;

interface VaultInfoPayload {
  address: string;
  name: string;
  symbol: unknown;
  totalDeposits: string;
  apy: unknown;
  asset: string;
  fees: unknown;
}

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);

// ----------------------------------------------------------------------

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const networkOverride = _request.nextUrl.searchParams.get('network');
    const network = networkFromCookie(cookieStore, networkOverride);
    const isMainnet = network === 'mainnet';

    // Network belongs in the key: a testnet vault must never be served to a
    // mainnet user.
    const cacheKey = `savings:vault:${network}`;
    const staleKey = `savings:vault:stale:${network}`;

    try {
      const cached = await redis.get<VaultInfoPayload>(cacheKey);
      if (cached) return NextResponse.json({ success: true, vault: cached });
    } catch {
      /* cache unavailable — fall through to DeFindex */
    }

    const sdk = new DefindexSDK({
      apiKey: process.env.DEFINDEX_API_KEY,
      defaultNetwork: isMainnet ? SupportedNetworks.MAINNET : SupportedNetworks.TESTNET,
    });

    const VAULT_ADDRESS = isMainnet
      ? process.env.NEXT_PUBLIC_MAINNET_DEFINDEX_VAULT || ''
      : process.env.NEXT_PUBLIC_TESTNET_DEFINDEX_VAULT || '';

    if (!VAULT_ADDRESS) {
      return NextResponse.json(
        { success: false, error: 'Vault address not configured' },
        { status: 500 }
      );
    }

    // Both calls go out together and DeFindex limits per second, so a cold load
    // trips the limit. One retry on their own `retryAfter` turns that into a
    // success instead of a stale fallback.
    const [vaultInfoResult, apyResult] = await Promise.all([
      withRateLimitRetry(
        () => withTimeout(sdk.getVaultInfo(VAULT_ADDRESS), 10_000, 'getVaultInfo'),
        'getVaultInfo'
      ),
      withRateLimitRetry(
        () => withTimeout(sdk.getVaultAPY(VAULT_ADDRESS), 10_000, 'getVaultAPY'),
        'getVaultAPY'
      ),
    ]);

    const totalDeposits = Array.isArray(vaultInfoResult.totalManagedFunds)
      ? (
          vaultInfoResult.totalManagedFunds.reduce(
            (sum: number, val: any) => sum + (Number(val) || 0),
            0
          ) / DECIMALS
        ).toString()
      : '0';

    const vault: VaultInfoPayload = {
      address: VAULT_ADDRESS,
      name: vaultInfoResult.name || 'Normal Savings',
      symbol: vaultInfoResult.symbol,
      totalDeposits,
      apy: apyResult.apy,
      asset: 'USDC',
      fees: vaultInfoResult.feesBps,
    };

    try {
      await redis.set(cacheKey, vault, { ex: CACHE_TTL_SECONDS });
      // A separate, much longer copy purely as the outage fallback below.
      await redis.set(staleKey, vault, { ex: STALE_TTL_SECONDS });
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({
      success: true,
      vault,
    });
  } catch (error) {
    console.error('[vault-info] error:', error);

    // DeFindex rate-limits us (429s observed in dev with a single user) and
    // this used to become a 500, breaking the savings card outright. Serve the
    // last known figures instead — stale APY beats no APY. The network is read
    // again here because the failure may have happened before it was resolved.
    try {
      const cookieStore = await cookies();
      const network = networkFromCookie(cookieStore, _request.nextUrl.searchParams.get('network'));
      const stale = await redis.get<VaultInfoPayload>(`savings:vault:stale:${network}`);
      if (stale) {
        console.warn('[vault-info] serving stale vault info');
        return NextResponse.json({ success: true, vault: stale, stale: true });
      }
    } catch {
      /* no cache to fall back on */
    }

    return NextResponse.json(
      { success: false, error: 'Failed to get vault info' },
      { status: 500 }
    );
  }
}

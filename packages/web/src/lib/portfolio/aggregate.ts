import type { NetworkType } from '@normalfinance/utils';
import type { PortfolioAsset, PortfolioPayload } from '@/types/portfolio';

import { redis } from '@/server/rateLimiter';
import { getStellarConfigForNetwork } from '@normalfinance/utils';

import { buildAsset } from './normalize';

// Pure normalization + stale-fallback live in ./normalize (unit-tested).
export { applyStaleFallback } from './normalize';

// ---------------------------------------------------------------------------
// Server-side portfolio aggregator — the single source of truth for balances.
//
// Resolves all chain balances + batched spot prices IN PARALLEL with per-source
// timeouts, normalizes them (via ./normalize), and degrades gracefully (a failed
// chain is marked `error`, or `stale` when the route backfills a last-good value).
// ---------------------------------------------------------------------------

export interface PortfolioAddresses {
  bitcoin: string | null;
  ethereum: string | null;
  solana: string | null;
  stellar: string | null;
}

const SOURCE_TIMEOUT_MS = 5000;
const SPOT_TTL_SECONDS = 45;

function withTimeout<T>(p: Promise<T>, ms = SOURCE_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

// ----------------------------- spot prices ---------------------------------

const COINGECKO_IDS = 'bitcoin,ethereum,solana,stellar,usd-coin';

export interface SpotData {
  /** Symbol → USD spot price. */
  prices: Record<string, number>;
  /** Symbol → 24h price change %. */
  changes: Record<string, number>;
}

/** Batched USD spot prices + 24h change for all assets, shared via Redis. */
export async function getSpotPrices(): Promise<SpotData> {
  const key = 'prices:spot:v2';
  try {
    const cached = await redis.get<SpotData>(key);
    if (cached?.prices) return cached;
  } catch {
    /* cache miss / unavailable */
  }

  const headers: Record<string, string> = {};
  if (process.env.COINGECKO_API_KEY) headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;

  const prices: Record<string, number> = { USDC: 1 };
  const changes: Record<string, number> = { USDC: 0 };
  try {
    const res = await withTimeout(
      fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_IDS}&vs_currencies=usd&include_24hr_change=true`,
        { headers, cache: 'no-store' }
      )
    );
    if (res.ok) {
      const d = await res.json();
      prices.BTC = d.bitcoin?.usd ?? 0;
      prices.ETH = d.ethereum?.usd ?? 0;
      prices.SOL = d.solana?.usd ?? 0;
      prices.XLM = d.stellar?.usd ?? 0;
      prices.USDC = d['usd-coin']?.usd ?? 1;
      changes.BTC = d.bitcoin?.usd_24h_change ?? 0;
      changes.ETH = d.ethereum?.usd_24h_change ?? 0;
      changes.SOL = d.solana?.usd_24h_change ?? 0;
      changes.XLM = d.stellar?.usd_24h_change ?? 0;
      changes.USDC = d['usd-coin']?.usd_24h_change ?? 0;
      try {
        await redis.set(key, { prices, changes }, { ex: SPOT_TTL_SECONDS });
      } catch {
        /* non-fatal */
      }
    }
  } catch {
    /* upstream failed — return what we have (USDC=1) */
  }
  return { prices, changes };
}

// --------------------------- per-chain balances ----------------------------

async function rpc(url: string, method: string, params: unknown[]): Promise<any> {
  const res = await withTimeout(
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    })
  );
  if (!res.ok) throw new Error(`rpc ${method} ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message ?? `rpc ${method}`);
  return data.result;
}

async function fetchBtcBalance(address: string): Promise<number> {
  const res = await withTimeout(fetch(`https://mempool.space/api/address/${address}`));
  if (!res.ok) throw new Error(`btc ${res.status}`);
  const d = await res.json();
  const funded: number = d.chain_stats?.funded_txo_sum ?? 0;
  const spent: number = d.chain_stats?.spent_txo_sum ?? 0;
  return (funded - spent) / 1e8;
}

async function fetchEthBalance(address: string): Promise<number> {
  const url = process.env.NEXT_PUBLIC_ETH_RPC_URL || 'https://ethereum-rpc.publicnode.com';
  const hex: string = await rpc(url, 'eth_getBalance', [address, 'latest']);
  return Number(BigInt(hex)) / 1e18;
}

async function fetchSolBalance(address: string): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://solana-rpc.publicnode.com';
  const result = await rpc(url, 'getBalance', [address]);
  return (result?.value ?? 0) / 1e9;
}

/** One Horizon call → XLM (native) + USDC (trustline) balances. 404 = unfunded. */
async function fetchStellarBalances(
  address: string,
  network: NetworkType
): Promise<{ xlm: number; usdc: number }> {
  const cfg = getStellarConfigForNetwork(network);
  const res = await withTimeout(fetch(`${cfg.HORIZON_URL}/accounts/${address}`));
  if (!res.ok) {
    if (res.status === 404) return { xlm: 0, usdc: 0 };
    throw new Error(`stellar ${res.status}`);
  }
  const d = await res.json();
  const balances: any[] = d.balances ?? [];
  const xlm = parseFloat(balances.find((b) => b.asset_type === 'native')?.balance ?? '0');
  const usdc = parseFloat(
    balances.find((b) => b.asset_code === 'USDC' && b.asset_issuer === cfg.USDC_ISSUER)?.balance ??
      '0'
  );
  return { xlm, usdc };
}

// ------------------------------ orchestration ------------------------------

/**
 * #32 chunk 2: XLM/USDC of ONE additional Stellar address — the companion
 * Normal wallet, fetched when the connected wallet is external. Same fetcher
 * and normalization as the main aggregate; spot prices come from the shared
 * Redis-cached read, so this adds exactly one Horizon call.
 */
export async function aggregateStellarOnly(
  address: string,
  network: NetworkType
): Promise<PortfolioAsset[]> {
  const [pricesR, stellarR] = await Promise.allSettled([
    getSpotPrices(),
    fetchStellarBalances(address, network),
  ]);
  const spot = pricesR.status === 'fulfilled' ? pricesR.value : { prices: {}, changes: {} };
  const priceOf = (s: string): number | null => (s in spot.prices ? spot.prices[s] : null);
  const changeOf = (s: string): number | null => (s in spot.changes ? spot.changes[s] : null);
  const stellar = stellarR.status === 'fulfilled' ? stellarR.value : null;
  const failed = stellarR.status === 'rejected';
  return [
    buildAsset(
      'XLM',
      address,
      failed ? null : (stellar?.xlm ?? 0),
      priceOf('XLM'),
      changeOf('XLM')
    ),
    buildAsset(
      'USDC',
      address,
      failed ? null : (stellar?.usdc ?? 0),
      priceOf('USDC'),
      changeOf('USDC')
    ),
  ];
}

/** Orchestrates all sources in parallel and returns the normalized payload. */
export async function aggregatePortfolio(
  addresses: PortfolioAddresses,
  network: NetworkType,
  now: number
): Promise<PortfolioPayload> {
  const [pricesR, btcR, ethR, solR, stellarR] = await Promise.allSettled([
    getSpotPrices(),
    addresses.bitcoin ? fetchBtcBalance(addresses.bitcoin) : Promise.resolve<number | null>(null),
    addresses.ethereum ? fetchEthBalance(addresses.ethereum) : Promise.resolve<number | null>(null),
    addresses.solana ? fetchSolBalance(addresses.solana) : Promise.resolve<number | null>(null),
    addresses.stellar
      ? fetchStellarBalances(addresses.stellar, network)
      : Promise.resolve<{ xlm: number; usdc: number } | null>(null),
  ]);

  const spot = pricesR.status === 'fulfilled' ? pricesR.value : { prices: {}, changes: {} };
  const priceOf = (s: string): number | null => (s in spot.prices ? spot.prices[s] : null);
  const changeOf = (s: string): number | null => (s in spot.changes ? spot.changes[s] : null);

  // number on success, null on error — `undefined` never happens (settled).
  const settledBalance = (r: PromiseSettledResult<number | null>): number | null =>
    r.status === 'fulfilled' ? r.value : null;

  const stellar = stellarR.status === 'fulfilled' ? stellarR.value : null;
  const stellarFailed = stellarR.status === 'rejected';

  const assets: PortfolioAsset[] = [
    buildAsset('BTC', addresses.bitcoin, settledBalance(btcR), priceOf('BTC'), changeOf('BTC')),
    buildAsset('ETH', addresses.ethereum, settledBalance(ethR), priceOf('ETH'), changeOf('ETH')),
    buildAsset('SOL', addresses.solana, settledBalance(solR), priceOf('SOL'), changeOf('SOL')),
    buildAsset(
      'XLM',
      addresses.stellar,
      addresses.stellar ? (stellarFailed ? null : (stellar?.xlm ?? 0)) : null,
      priceOf('XLM'),
      changeOf('XLM')
    ),
    buildAsset(
      'USDC',
      addresses.stellar,
      addresses.stellar ? (stellarFailed ? null : (stellar?.usdc ?? 0)) : null,
      priceOf('USDC'),
      changeOf('USDC')
    ),
  ];

  return { updatedAt: now, assets };
}

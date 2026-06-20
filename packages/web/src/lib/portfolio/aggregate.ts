import type { NetworkType } from '@normalfinance/utils';
import type { AssetStatus, PortfolioAsset, PortfolioPayload, PortfolioChain } from '@/types/portfolio';

import { redis } from '@/server/rateLimiter';
import { getStellarConfigForNetwork } from '@normalfinance/utils';

// ---------------------------------------------------------------------------
// Server-side portfolio aggregator — the single source of truth for balances.
//
// Resolves all chain balances + batched spot prices IN PARALLEL with per-source
// timeouts, normalizes them, and degrades gracefully (a failed chain is marked
// `error`, or `stale` if the route can backfill a last-good value). Designed so
// the orchestration core is unit-testable with mocked fetchers.
// ---------------------------------------------------------------------------

export interface PortfolioAddresses {
  bitcoin: string | null;
  ethereum: string | null;
  solana: string | null;
  stellar: string | null;
}

const SOURCE_TIMEOUT_MS = 5000;
const SPOT_TTL_SECONDS = 45;

const ASSET_META: Record<string, { chain: PortfolioChain; decimals: number }> = {
  BTC: { chain: 'bitcoin', decimals: 8 },
  ETH: { chain: 'ethereum', decimals: 18 },
  SOL: { chain: 'solana', decimals: 9 },
  XLM: { chain: 'stellar', decimals: 7 },
  USDC: { chain: 'stellar', decimals: 7 },
};

function withTimeout<T>(p: Promise<T>, ms = SOURCE_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

// ----------------------------- spot prices ---------------------------------

const COINGECKO_IDS = 'bitcoin,ethereum,solana,stellar,usd-coin';

/** Batched USD spot prices for all assets, shared across users via Redis. */
export async function getSpotPrices(): Promise<Record<string, number>> {
  const key = 'prices:spot';
  try {
    const cached = await redis.get<Record<string, number>>(key);
    if (cached) return cached;
  } catch {
    /* cache miss / unavailable */
  }

  const headers: Record<string, string> = {};
  if (process.env.COINGECKO_API_KEY) headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;

  const prices: Record<string, number> = { USDC: 1 };
  try {
    const res = await withTimeout(
      fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_IDS}&vs_currencies=usd`,
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
      try {
        await redis.set(key, prices, { ex: SPOT_TTL_SECONDS });
      } catch {
        /* non-fatal */
      }
    }
  } catch {
    /* upstream failed — return what we have (USDC=1) */
  }
  return prices;
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

// ------------------------------ normalization ------------------------------

function buildAsset(
  symbol: string,
  address: string | null,
  balance: number | null, // null = error
  price: number | null
): PortfolioAsset {
  const meta = ASSET_META[symbol];
  // No address → chain not set up → genuinely holds nothing (not an error).
  const bal = address ? balance : 0;
  const status: AssetStatus = bal === null ? 'error' : 'ok';
  const balanceStr = bal === null ? null : String(bal);
  const usdValue = bal !== null && price !== null ? String(bal * price) : null;
  return {
    symbol,
    chain: meta.chain,
    address,
    balance: balanceStr,
    price: price !== null ? String(price) : null,
    usdValue,
    decimals: meta.decimals,
    status,
  };
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

  const prices = pricesR.status === 'fulfilled' ? pricesR.value : {};
  const priceOf = (s: string): number | null => (s in prices ? prices[s] : null);

  // number on success, null on error — `undefined` never happens (settled).
  const settledBalance = (r: PromiseSettledResult<number | null>): number | null =>
    r.status === 'fulfilled' ? r.value : null;

  const stellar = stellarR.status === 'fulfilled' ? stellarR.value : null;
  const stellarFailed = stellarR.status === 'rejected';

  const assets: PortfolioAsset[] = [
    buildAsset('BTC', addresses.bitcoin, settledBalance(btcR), priceOf('BTC')),
    buildAsset('ETH', addresses.ethereum, settledBalance(ethR), priceOf('ETH')),
    buildAsset('SOL', addresses.solana, settledBalance(solR), priceOf('SOL')),
    buildAsset(
      'XLM',
      addresses.stellar,
      addresses.stellar ? (stellarFailed ? null : stellar?.xlm ?? 0) : null,
      priceOf('XLM')
    ),
    buildAsset(
      'USDC',
      addresses.stellar,
      addresses.stellar ? (stellarFailed ? null : stellar?.usdc ?? 0) : null,
      priceOf('USDC')
    ),
  ];

  return { updatedAt: now, assets };
}

/** Merge fresh assets with a last-good snapshot: error assets fall back to the
 *  prior value, marked `stale`. Returns the merged payload + the new snapshot. */
export function applyStaleFallback(
  fresh: PortfolioPayload,
  lastGood: Record<string, PortfolioAsset> | null
): { merged: PortfolioPayload; snapshot: Record<string, PortfolioAsset> } {
  const snapshot: Record<string, PortfolioAsset> = { ...(lastGood ?? {}) };
  const assets = fresh.assets.map((a) => {
    if (a.status === 'ok') {
      snapshot[a.symbol] = a; // refresh last-good
      return a;
    }
    const prior = lastGood?.[a.symbol];
    if (prior && prior.balance !== null) {
      return { ...prior, status: 'stale' as AssetStatus, price: a.price ?? prior.price };
    }
    return a; // still error — nothing to fall back to
  });
  return { merged: { ...fresh, assets }, snapshot };
}

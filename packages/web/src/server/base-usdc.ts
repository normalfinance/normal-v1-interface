import type { NetworkType } from '@normalfinance/utils';

import { EVM_USDC } from '@/lib/cctp/config';
import { rpcFromPool } from '@/lib/portfolio/rpc-pool';
import { BASE_RPC_URLS, BASE_SEPOLIA_RPC_URLS } from '@/lib/chains/rpc-fallback';

// ---------------------------------------------------------------------------
// Doc 129: the exact USDC (6-decimal units) an address holds on Base, read on
// the server through the keyed-first pool the relayer uses. "Move to Stellar"
// checks a requested amount against it before a row is ever written.
// ---------------------------------------------------------------------------

/** "Move to Stellar" rows carry this in quoteJson, so they can be counted. */
export const BRING_HOME_KIND = 'base-bring-home';

/** The smallest move: the relayer pays both networks' fees for it. */
export const BRING_HOME_MIN_WIRE = 1_000_000n; // $1

/**
 * Rows that block a second move: money moving, or a move started in the last
 * two minutes (a double tap). Short on purpose: a move abandoned before its
 * burn moved nothing and must not lock the button for long.
 */
export const BRING_HOME_STARTING_MS = 2 * 60_000;

/** ERC-20 balanceOf(address) calldata. Pure. */
export function balanceOfCalldata(address: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error('not an EVM address');
  return `0x70a08231${address.slice(2).toLowerCase().padStart(64, '0')}`;
}

/** Exact USDC units on `address` on Base. Throws when every node fails. */
export async function readBaseUsdcUnits(address: string, network: NetworkType): Promise<bigint> {
  const urls = network === 'mainnet' ? BASE_RPC_URLS : BASE_SEPOLIA_RPC_URLS;
  const data = balanceOfCalldata(address);
  const { value } = await rpcFromPool(urls, async (url) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: EVM_USDC.base[network], data }, 'latest'],
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) throw new Error(`base rpc ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message ?? 'base rpc error');
    return String(json.result);
  });
  return BigInt(value === '0x' ? '0x0' : value);
}

// ---- "Move to Stellar" checks (pure; api/cctp/transfers runs them) ----------

export interface BringHomeRefusal {
  status: 400 | 403 | 409 | 503;
  error: string;
}

export const BRING_HOME_WORDS = {
  notOwn: 'A move goes from your own Base address to your own Stellar wallet',
  tooSmall: 'The smallest move is $1',
  tooMuch: 'That is more than your Base address holds.',
  baseDown: 'Base did not answer just now. Please try again in a minute.',
  busy: 'A move to Stellar is already under way. Check Activity, or try again in a few minutes.',
} as const;

/**
 * Both ends must be the person's own, read from their wallet row: USDC from
 * their EVM address on Base to their Turnkey Stellar address, nothing else.
 */
export function bringHomeOwnershipRefusal(
  req: {
    direction: unknown;
    sourceDomain: unknown;
    destDomain: unknown;
    srcAsset: unknown;
    dstAsset: unknown;
    srcAddress: unknown;
    destAddress: unknown;
  },
  wallet: { ethereumAddress: string | null; stellarAddress: string | null } | null,
  domains: { base: number; stellar: number }
): BringHomeRefusal | null {
  const own =
    req.direction === 'crosschain_to_stellar' &&
    req.sourceDomain === domains.base &&
    req.destDomain === domains.stellar &&
    (req.srcAsset ?? 'USDC') === 'USDC' &&
    (req.dstAsset ?? 'USDC') === 'USDC' &&
    !!wallet?.ethereumAddress &&
    !!wallet.stellarAddress &&
    typeof req.srcAddress === 'string' &&
    req.srcAddress.toLowerCase() === wallet.ethereumAddress.toLowerCase() &&
    req.destAddress === wallet.stellarAddress;
  return own ? null : { status: 403, error: BRING_HOME_WORDS.notOwn };
}

/** At least $1, and never more than the Base address holds right now. */
export function bringHomeAmountRefusal(
  amountWire: bigint,
  onBase: bigint
): BringHomeRefusal | null {
  if (amountWire < BRING_HOME_MIN_WIRE) return { status: 400, error: BRING_HOME_WORDS.tooSmall };
  if (amountWire > onBase) return { status: 400, error: BRING_HOME_WORDS.tooMuch };
  return null;
}

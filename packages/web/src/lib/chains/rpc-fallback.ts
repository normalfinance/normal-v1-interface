// Doc 90 Wave 1d: fallback RPC lists for money-moving legs. A single flaky
// public node must never strand minted funds or report a delivered swap as
// failed. URL arrays are pure (importable anywhere); the viem transport is
// built via dynamic import to respect the bundle-size pattern.

// Order matters: a KEYED endpoint (paid, higher limits) is tried first, then
// public ones as the safety net. `CCTP_RPC_URL_*` are server-only vars — on
// the client they read as undefined and simply drop out of the list, which is
// correct: browsers must never see a keyed URL.
export const BASE_RPC_URLS: string[] = [
  ...(process.env.CCTP_RPC_URL_BASE ? [process.env.CCTP_RPC_URL_BASE] : []),
  ...(process.env.NEXT_PUBLIC_BASE_RPC_URL ? [process.env.NEXT_PUBLIC_BASE_RPC_URL] : []),
  'https://mainnet.base.org',
  'https://base-rpc.publicnode.com',
];

export const ETH_RPC_URLS: string[] = [
  ...(process.env.CCTP_RPC_URL_ETHEREUM ? [process.env.CCTP_RPC_URL_ETHEREUM] : []),
  process.env.NEXT_PUBLIC_ETH_RPC_URL ?? 'https://ethereum-rpc.publicnode.com',
  'https://eth.llamarpc.com',
];

// One keyed Solana endpoint, two historical variable names (doc 126): the app
// reads NEXT_PUBLIC_SOLANA_RPC_URL everywhere, but the send paths used to read
// NEXT_PUBLIC_SOL_RPC_URL — which was never set, so sends silently ran on the
// rate-limited public node. Both names resolve here now; the current one wins.
export const SOLANA_RPC_URL: string =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
  process.env.NEXT_PUBLIC_SOL_RPC_URL ??
  'https://solana-rpc.publicnode.com';

// publicnode sits between the keyed endpoint and mainnet-beta because
// api.mainnet-beta.solana.com 403s browser requests — on the client it is the
// last resort that actually works.
export const SOL_RPC_URLS: string[] = [
  SOLANA_RPC_URL,
  'https://solana-rpc.publicnode.com',
  'https://api.mainnet-beta.solana.com',
].filter((u, i, all) => all.indexOf(u) === i);

/** viem fallback transport over the Base list (mainnet only). */
export async function baseFallbackTransport() {
  const { http, fallback } = await import('viem');
  return fallback(BASE_RPC_URLS.map((u) => http(u)));
}

/** Chain+network-aware EVM transport: fallback list on mainnet, plain default
 *  RPC on testnets (the public fallback URLs are mainnet-only). */
export async function evmFallbackTransport(
  chain: 'base' | 'ethereum',
  network: 'mainnet' | 'testnet'
) {
  const { http, fallback } = await import('viem');
  if (network !== 'mainnet') return http();
  const urls = chain === 'base' ? BASE_RPC_URLS : ETH_RPC_URLS;
  return fallback(urls.map((u) => http(u)));
}

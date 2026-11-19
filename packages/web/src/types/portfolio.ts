// Shared portfolio types — imported by both the server aggregator and the
// client `usePortfolio` hook. Keep this free of server-only imports.

// 'base' marks the Base rows of `PortfolioPayload.base` only: Base is the
// network Circle swaps and Autoinvest pass through, not a chain whose coin we
// offer, so a Base asset never appears in `assets`.
export type PortfolioChain = 'bitcoin' | 'ethereum' | 'solana' | 'stellar' | 'base';

/** ok = fresh; stale = served from last-good after an upstream failure; error = no value */
export type AssetStatus = 'ok' | 'stale' | 'error';

export interface PortfolioAsset {
  symbol: string; // BTC | ETH | SOL | XLM | USDC
  chain: PortfolioChain;
  address: string | null; // null = chain not set up for this user
  balance: string | null; // coin units; null only on error
  price: string | null; // USD spot
  usdValue: string | null; // balance × price; null when either is missing
  change24h: number | null; // 24h price change %, null when unknown
  decimals: number;
  status: AssetStatus;
}

export interface PortfolioPayload {
  updatedAt: number; // ms
  assets: PortfolioAsset[];
  /**
   * #32 chunk 2: the companion Normal wallet's Stellar balances, present only
   * when the connected wallet is an EXTERNAL Stellar wallet and the user's
   * Turnkey wallet has a (different) Stellar address. The drawer renders it
   * as its own section — never summed into `assets`, so every displayed
   * number stays spendable by exactly one wallet.
   */
  companionStellar?: { address: string; assets: PortfolioAsset[] } | null;
  /**
   * Doc 129: what the person's own EVM address holds on Base, the network
   * every Circle swap and Autoinvest purchase passes through: USDC (a held
   * Autoinvest coin, a swap that stopped there, an exchange withdrawal) and
   * ETH (the few cents of gas Normal's relayer sends so Base steps can
   * finish). Its own field, never inside `assets`: about 66 places find
   * "USDC" in `assets` by symbol and mean the Stellar one. Absent or null
   * when the person has no EVM address.
   */
  base?: { address: string; assets: PortfolioAsset[] } | null;
}

// ---------------------------------------------------------------------------
// Unified holdings model — the `usePortfolio` composer normalizes every source
// (wallet balances, savings, future positions) into this shape, each carrying
// its OWN async status so the UI can skeleton / stale / error per-position.
// ---------------------------------------------------------------------------

export type PositionKind = 'wallet' | 'savings';
export type PositionStatus = 'loading' | 'ok' | 'stale' | 'error';

export interface Position {
  id: string; // e.g. 'wallet:BTC' | 'savings:usdc'
  kind: PositionKind;
  symbol: string; // BTC | ETH | SOL | XLM | USDC | 'Savings'
  name: string;
  iconUrl: string;
  chain?: PortfolioChain;
  address?: string | null;
  balance: string | null;
  price: string | null;
  usdValue: string | null;
  change24h?: number | null; // 24h price change %, null/undefined when unknown
  decimals: number;
  status: PositionStatus;
}

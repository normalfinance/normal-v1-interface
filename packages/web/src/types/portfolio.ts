// Shared portfolio types — imported by both the server aggregator and the
// client `usePortfolio` hook. Keep this free of server-only imports.

export type PortfolioChain = 'bitcoin' | 'ethereum' | 'solana' | 'stellar';

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

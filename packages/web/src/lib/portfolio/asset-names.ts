// What each asset is called in the app, for people who don't know crypto.
// Pure, so screens and plain modules (the money-movement plans) share one list.

export const ASSET_NAMES: Record<string, { name: string; ticker: string }> = {
  USDC: { name: 'Digital dollars', ticker: 'USDC' },
  XLM: { name: 'Stellar', ticker: 'XLM' },
  BTC: { name: 'Bitcoin', ticker: 'BTC' },
  ETH: { name: 'Ethereum', ticker: 'ETH' },
  SOL: { name: 'Solana', ticker: 'SOL' },
};

export const assetName = (symbol: string) => ASSET_NAMES[symbol]?.name ?? symbol;

/** The same name inside a sentence: "Received digital dollars", "Received Bitcoin". */
export const assetNoun = (symbol: string) =>
  symbol === 'USDC' ? 'digital dollars' : assetName(symbol);

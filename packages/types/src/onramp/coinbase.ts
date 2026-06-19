export type CreateCoinbaseOnrampUrlOpts = {
  amountUsd: number | string;
  assetSymbol: string;
  sessionToken: string;
  fiat?: string;
  path?: 'buy' | 'buy/select-asset'; // default 'buy'
  redirectUrl?: string;
  sandbox?: boolean;
};

export type CreateCoinbaseOfframpUrlOpts = {
  sessionToken: string;
  redirectUrl: string;
  partnerUserRef: string; // less than 50 characters
  defaultNetwork?: string;
  defaultAsset?: string;
  /** Preset the crypto amount to sell (we cap this to the wallet's spendable). */
  presetCryptoAmount?: string;
  /** Lock the order so the user can't change our preset amount on Coinbase. */
  disableEdit?: boolean;
  fiat?: string;
  // Coinbase Offramp lives at /v3/sell/input (a bare /sell falls back to buy).
  path?: 'v3/sell/input';
  sandbox?: boolean;
};

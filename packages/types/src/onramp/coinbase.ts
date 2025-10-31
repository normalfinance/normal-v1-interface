export type CreateCoinbaseUrlOpts = {
  amountUsd: number | string;
  assetSymbol: string;
  sessionToken: string;
  fiat?: string;
  path?: 'buy' | 'buy/select-asset'; // default 'buy'
  redirectUrl?: string;
  sandbox?: boolean;
};

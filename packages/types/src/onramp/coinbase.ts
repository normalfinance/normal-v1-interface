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
  fiat?: string;
  path: 'sell';
  sandbox?: boolean;
};

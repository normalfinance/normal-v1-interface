export type CreateOnramperUrlLegacy = (apiKey: string, amountUsd?: string | number) => string;

export type CreateOnramperUrlOpts = {
  amountUsd: number | string;
  tokenSymbol: string;
  walletAddress?: string;
  fiat?: string;
};

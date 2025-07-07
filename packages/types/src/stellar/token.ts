export interface StellarTokenType {
  code: string;
  issuer?: string;
  contract: string;
  name?: string;
  org?: string;
  domain?: string;
  icon?: string;
  decimals?: number;
}

export interface stellarTokensResponse {
  network: string;
  tokens: StellarTokenType[];
}

export type StellarTokenMapType = {
  [key: string]: StellarTokenType;
};

export type StellarTokenBalancesMap = {
  [tokenAddress: string]: { usdValue: number; balance: string };
};

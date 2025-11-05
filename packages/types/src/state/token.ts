import { BigNumber } from 'bignumber.js';

export type ApiToken = {
  symbol: string;
  issuer: string;
  contract: string;
  name: string;
  org: string;
  domain: string;
  icon: string;
  decimals: number;
  featured: boolean;
};

export type Token = ApiToken & {
  balance: string; // A user's balance
  price: string; // The USD price
  percentageChange: number;
};

export type TokenMapType = {
  [key: string]: Token;
};

export type TokenBalancesMap = {
  [tokenAddress: string]: { usdValue: string; balance: string };
};

export interface TokenState {
  tokens: Token[];
  tokensByAddress: Record<string, Token>;
  lastUpdated: number;
}
export interface TokenActions {
  tokenState: TokenState;
  updateTokenInfo: (token: ApiToken) => Promise<void>;
  getAllTokens: (override: boolean) => Promise<void>;
}

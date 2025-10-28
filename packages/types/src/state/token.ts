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

export type StateToken = ApiToken & {
  balance: number; // The user's balance of this token
  nativePrice: number; // The price of this token on Normal DEX
  oraclePrice: number; // The price of this token according to an oracle
  percentageChange: number;
};

export type TokenMapType = {
  [key: string]: StateToken;
};

export type TokenBalancesMap = {
  [tokenAddress: string]: { usdValue: string; balance: string };
};

export interface TokenState {
  tokens: StateToken[];
  tokensByAddress: Record<string, StateToken>;
}
export interface TokenActions {
  tokenState: TokenState;
  updateTokenInfo: (token: ApiToken) => Promise<void>;
  getAllTokens: () => Promise<void>;
}

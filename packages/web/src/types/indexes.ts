export type IndexCoin = {
  id: number;
  url: string;
  name: string;
  shortName: string;
  price: number;
  marketCap: number;
  indexPercentage?: number;
};

export type IIndexItem = {
  indexName: string;
  indexSymbol: string;
  indexDescription: string;
  weightingMethod: 'Constant' | 'Custom' | 'Market Cap';
  initialPrice: number;
  initialDeposit: number;
  isPublic: boolean;
  avatarUrl: File | string | null;
  indexCoinList: IndexCoin[];
};

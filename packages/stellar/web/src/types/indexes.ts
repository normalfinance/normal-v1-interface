export type IIndexItem = {
  indexName: string;
  indexSymbol: string;
  indexDescription: string;
  weightingMethod: 'Constant' | 'Custom' | 'Market Cap';
  initialPrice: number;
  initialDeposit: number;
  isPublic: boolean;
  avatarUrl: File | null;
};

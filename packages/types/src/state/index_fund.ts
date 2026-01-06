import { Token } from './token';

// export type IndexFundComponent = Token & {
//   // marketCap: number;
//   indexPercentage: number;
// };

export type IndexFundComponent = {
  // marketCap: number;
  contract: string;
  indexPercentage?: number;
};

export type IIndexFundItem = {
  name: string;
  symbol: string;
  description: string;
  weightingMethod: 'Constant' | 'Custom'; // | 'Market Cap';
  initialPrice: number;
  initialDeposit: number;
  isPublic: boolean;
  components: IndexFundComponent[];
};

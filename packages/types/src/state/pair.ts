import { Pair } from '../contracts';

export interface PairState {
  pairs: Pair[];
  pairByToken: Record<string, Pair>;
  pairByAddress: Record<string, Pair>;
  lastUpdated: number;
}
export interface PairActions {
  getPair: (pairAddress: string) => Promise<void>;
  getAllPairs: () => Promise<void>;
  pairState: PairState;
}

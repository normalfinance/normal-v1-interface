import { Pool } from '../contracts';
export interface PoolState {
  pools: Pool[];
  poolsByTokens: Record<string, Pool[]>;
}
export interface PoolActions {
  getAllPools: () => Promise<void>;
  poolState: PoolState;
}

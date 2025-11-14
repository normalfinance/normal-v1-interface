import { Pool } from '../contracts';
export interface PoolState {
  pools: Pool[];
  poolsByTokens: Record<string, Pool[]>;
  lastUpdated: number;
}
export interface PoolActions {
  getPool: (poolAddress: string) => Promise<void>;
  getAllPools: () => Promise<void>;
  poolState: PoolState;
}

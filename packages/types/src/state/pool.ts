import { Pool } from '../contracts';
export interface PoolState {
  loading: boolean;
  error: string | null;

  pools: Pool[];
  poolsByTokens: Record<string, Pool[]>;
  lastUpdated: number;
}
export interface PoolActions {
  getPool: (poolAddress: string) => Promise<void>;
  getAllPools: () => Promise<void>;
  poolState: PoolState;
}

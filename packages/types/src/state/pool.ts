import { PoolInfo } from '../contracts';
export interface PoolState {
  pools: PoolInfo[];
  poolsByTokens: Record<string, PoolInfo[]>;
}
export interface PoolActions {
  getAllPools: () => Promise<void>;
  poolState: PoolState;
}

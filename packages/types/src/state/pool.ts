import { PoolInfo } from '../contracts';

export interface PoolActions {
  getAllPools: () => Promise<PoolInfo[]>;
  setPools: (_pools: PoolInfo[]) => void;
  getPool: (asset: string) => Promise<PoolInfo>;
  pools: PoolInfo[];
}

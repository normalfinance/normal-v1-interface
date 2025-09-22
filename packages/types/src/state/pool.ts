import { PoolRouterContract } from '@normalfinance/contracts';

export interface PoolActions {
  getAllPools: () => Promise<PoolRouterContract.PoolInfo[]>;
  setPools: (_pools: PoolRouterContract.PoolInfo[]) => void;
  getPool: (asset: string) => Promise<PoolRouterContract.PoolInfo>;
  pools: PoolRouterContract.PoolInfo[];
}

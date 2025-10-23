import { PoolRouterContract } from '@normalfinance/contracts';

export interface PoolActions {
  getAllPools: () => Promise<any>;
  setPools: (_pools: any) => void;
  getPool: (asset: string) => Promise<any>;
  pools: any;
}

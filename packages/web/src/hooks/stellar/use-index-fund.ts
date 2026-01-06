'use client';

import type { IndexFundContract } from '@normalfinance/contracts';

import { constants } from '@normalfinance/utils';
// import { captureException } from '@sentry/nextjs';
import { TransactionType } from '@/types/transaction';
import { usePersistStore } from '@normalfinance/state';
import { useState, useEffect, useCallback } from 'react';
import {
  IndexFundContract as IndexFundContractClient,
  IndexFundFactoryContract as IndexFundFactoryContractClient,
} from '@normalfinance/contracts';

import { useContractTransaction } from './use-contract-transaction';

// ----------------------------------------------------------------------

// User - Simplified args for the UI (internal conversions handle the rest)
export interface MintIndexArgs {
  token: string;
  amount: number; // Amount in human-readable units (will be converted to bigint)
  destination?: string;
}

export interface RedeemIndexArgs {
  share_amount: number; // Amount in human-readable units (will be converted to bigint)
}

// Admin
export type RefactorIndexArgs = Omit<Parameters<IndexFundContract.Client['refactor']>[0], 'caller'>;
export type RebalanceIndexArgs = Omit<
  Parameters<IndexFundContract.Client['rebalance']>[0],
  'caller'
>;
export type SetIndexRebalanceAuthorityArgs = Omit<
  Parameters<IndexFundContract.Client['set_rebalance_authority']>[0],
  'admin'
>;
export type SetPublicStatusIndexArgs = Parameters<IndexFundContract.Client['set_public_status']>[0];
export type SetWhitelistStatusIndexArgs = Omit<
  Parameters<IndexFundContract.Client['set_whitelist_status']>[0],
  'admin'
>;
export type SetBlacklistStatusIndexArgs = Omit<
  Parameters<IndexFundContract.Client['set_blacklist_status']>[0],
  'admin'
>;

interface ReturnType {
  error: any | null;
  loading: boolean;
  index: IndexFundContract.IndexFundInfo | undefined;
  fetchIndexById: (indexId: number) => void;
  fetchIndexByAddress: (indexAddress: string) => void;
  mintIndex: (args: MintIndexArgs) => Promise<void>;
  redeemIndex: (args: RedeemIndexArgs) => Promise<void>;
  // admin
  refactorIndex: (args: RefactorIndexArgs) => Promise<void>;
  rebalanceIndex: (args: RebalanceIndexArgs) => Promise<void>;
  setRebalanceAuthority: (args: SetIndexRebalanceAuthorityArgs) => Promise<void>;
  setIndexWhitelistStatus: (args: SetWhitelistStatusIndexArgs) => Promise<void>;
  setIndexBlacklistStatus: (args: SetBlacklistStatusIndexArgs) => Promise<void>;
}

// ----------------------------------------------------------------------

export function useIndexFund(id: number): ReturnType {
  const storePersist = usePersistStore();

  const { executeContractTransaction } = useContractTransaction();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [index, setIndex] = useState<IndexFundContract.IndexFundInfo | undefined>(undefined);

  const executeIndex = async (
    signedTransactionXDR: string,
    transactionType: string = 'Liquidity'
  ) => {
    if (!storePersist.wallet.address) return null;
    const res = await fetch('/api/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: storePersist.wallet.address,
        signedTransactionXDR,
        transactionType,
      }),
    });

    if (res.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Index execution failed');
    }

    return data;
  };

  const rateLimitCheck = async () => {
    if (!storePersist.wallet.address) return;
    const res = await fetch('/api/index', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: storePersist.wallet.address }),
    });
    if (res.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    const data = await res.json();
    if (!data.allowed) {
      throw new Error(data.error || 'Liquidity management not allowed');
    }
  };

  const fetchIndexById = useCallback(
    async (indexId: number) => {
      if (!indexId) return;

      try {
        setError(null);
        setLoading(true);

        // Query the index contract directly using its address
        const indexFactoryClient = new IndexFundFactoryContractClient.Client({
          contractId: constants.StellarConfig.INDEX_FACTORY_ADDRESS,
          networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
          rpcUrl: constants.StellarConfig.RPC_URL,
        });

        // This is a placeholder way to implement index factory
        const indexInfo = await indexFactoryClient.get_deployed_indexes({
          operator: storePersist.wallet.address!,
        });

        if (indexInfo && indexInfo.result) {
          const data = indexInfo.result as IndexFundContract.IndexFundInfo;
          setIndex(data);
        }
      } catch (e: any) {
        // captureException(e);
        setError(e);
      } finally {
        setLoading(false);
      }
    },
    // This is a placeholder deps array, need to fix this later
    [storePersist.wallet.address]
  );

  const fetchIndexByAddress = useCallback(async (indexAddress: string) => {
    try {
      setError(null);
      setLoading(true);

      // Query the index contract directly using its address
      const indexClient = new IndexFundContractClient.Client({
        contractId: indexAddress,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        rpcUrl: constants.StellarConfig.RPC_URL,
      });

      const indexInfo = await indexClient.get_index_info();

      if (indexInfo && indexInfo.result) {
        const data = indexInfo.result as IndexFundContract.IndexFundInfo;
        setIndex(data);
      }
    } catch (e: any) {
      // captureException(e);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const mintIndex = async (args: MintIndexArgs) => {
    if (!index || !index.address) return;

    setLoading(true);

    await rateLimitCheck();

    const processedArgs = {
      user: storePersist.wallet.address!,
      token: args.token,
      amount: BigInt((args.amount * 10 ** constants.StellarConfig.XLM_DECIMALS).toFixed(0)),
      destination: args.destination || storePersist.wallet.address!,
    };

    await executeContractTransaction({
      contractType: 'index_fund',
      contractAddress: index.address,
      transactionDetails: {
        type: TransactionType.MINT_INDEX,
        token1: { name: 'USDC', amount: String(args.amount) },
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.mint(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          await tx.sign();
          const signedXDR = tx.signed?.toXDR();

          if (signedXDR) {
            const apiRes = await executeIndex(signedXDR, 'Mint Index');
            if (apiRes?.transactionHash) {
              (tx as any).hash = apiRes.transactionHash;
            }
          }

          return tx;
        }
      },
    });

    setLoading(false);
  };

  const redeemIndex = async (args: RedeemIndexArgs) => {
    if (!index || !index.address) return;

    setLoading(true);

    await rateLimitCheck();

    const processedArgs = {
      ...args,
      user: storePersist.wallet.address!,
      share_amount: BigInt((args.share_amount * 10 ** 7).toFixed(0)),
    };

    await executeContractTransaction({
      contractType: 'index_fund',
      contractAddress: index.address,
      transactionDetails: {
        type: TransactionType.REDEEM_INDEX,
        token1: { name: 'USDC', amount: String(args.share_amount) },
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.redeem(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          await tx.sign();
          const signedXDR = tx.signed?.toXDR();

          if (signedXDR) {
            const apiRes = await executeIndex(signedXDR, 'Redeem Index');
            if (apiRes?.transactionHash) {
              (tx as any).hash = apiRes.transactionHash;
            }
          }

          return tx;
        }
      },
    });

    setLoading(false);
  };

  // Index admin functions

  const refactorIndex = async (args: RefactorIndexArgs) => {
    if (!index || !index.address) return;

    setLoading(true);

    await rateLimitCheck();

    const processedArgs = {
      ...args,
      caller: storePersist.wallet.address!,
    };

    await executeContractTransaction({
      contractType: 'index_fund',
      contractAddress: index.address,
      transactionDetails: {
        type: TransactionType.REFACTOR_INDEX,
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.refactor(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          await tx.sign();
          const signedXDR = tx.signed?.toXDR();

          if (signedXDR) {
            const apiRes = await executeIndex(signedXDR, 'Refactor Index');
            if (apiRes?.transactionHash) {
              (tx as any).hash = apiRes.transactionHash;
            }
          }

          return tx;
        }
      },
    });

    setLoading(false);
  };

  const rebalanceIndex = async (args: RebalanceIndexArgs) => {
    if (!index || !index.address) return;

    setLoading(true);

    await rateLimitCheck();

    const processedArgs = {
      ...args,
      caller: storePersist.wallet.address!,
    };

    await executeContractTransaction({
      contractType: 'index_fund',
      contractAddress: index.address,
      transactionDetails: {
        type: TransactionType.REBALANCE_INDEX,
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.rebalance(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          await tx.sign();
          const signedXDR = tx.signed?.toXDR();

          if (signedXDR) {
            const apiRes = await executeIndex(signedXDR, 'Rebalance Index');
            if (apiRes?.transactionHash) {
              (tx as any).hash = apiRes.transactionHash;
            }
          }

          return tx;
        }
      },
    });

    setLoading(false);
  };

  const setRebalanceAuthority = async (args: SetIndexRebalanceAuthorityArgs) => {
    if (!index || !index.address) return;

    setLoading(true);

    await rateLimitCheck();

    const processedArgs = {
      ...args,
      admin: storePersist.wallet.address!,
    };

    await executeContractTransaction({
      contractType: 'index_fund',
      contractAddress: index.address,
      transactionDetails: {
        type: TransactionType.UPDATE_INDEX,
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.set_rebalance_authority(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          await tx.sign();
          const signedXDR = tx.signed?.toXDR();

          if (signedXDR) {
            const apiRes = await executeIndex(signedXDR, 'Update Index Rebalance Authority');
            if (apiRes?.transactionHash) {
              (tx as any).hash = apiRes.transactionHash;
            }
          }

          return tx;
        }
      },
    });

    setLoading(false);
  };

  const setIndexWhitelistStatus = async (args: SetWhitelistStatusIndexArgs) => {
    if (!index || !index.address) return;

    setLoading(true);

    await rateLimitCheck();

    const processedArgs = {
      ...args,
      admin: storePersist.wallet.address!,
    };

    await executeContractTransaction({
      contractType: 'index_fund',
      contractAddress: index.address,
      transactionDetails: {
        type: TransactionType.UPDATE_INDEX,
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.set_whitelist_status(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          await tx.sign();
          const signedXDR = tx.signed?.toXDR();

          if (signedXDR) {
            const apiRes = await executeIndex(signedXDR, 'Update Index Whitelist');
            if (apiRes?.transactionHash) {
              (tx as any).hash = apiRes.transactionHash;
            }
          }

          return tx;
        }
      },
    });

    setLoading(false);
  };

  const setIndexBlacklistStatus = async (args: SetBlacklistStatusIndexArgs) => {
    if (!index || !index.address) return;

    setLoading(true);

    await rateLimitCheck();

    const processedArgs = {
      ...args,
      admin: storePersist.wallet.address!,
    };

    await executeContractTransaction({
      contractType: 'index_fund',
      contractAddress: index.address,
      transactionDetails: {
        type: TransactionType.UPDATE_INDEX,
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.set_blacklist_status(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          await tx.sign();
          const signedXDR = tx.signed?.toXDR();

          if (signedXDR) {
            const apiRes = await executeIndex(signedXDR, 'Update Index Blacklist');
            if (apiRes?.transactionHash) {
              (tx as any).hash = apiRes.transactionHash;
            }
          }

          return tx;
        }
      },
    });

    setLoading(false);
  };

  // On component mount, fetch index
  useEffect(() => {
    fetchIndexById(id);
  }, [fetchIndexById, id]);

  return {
    error,
    loading,
    index,
    fetchIndexById,
    fetchIndexByAddress,
    mintIndex,
    redeemIndex,
    // admin
    refactorIndex,
    rebalanceIndex,
    setRebalanceAuthority,
    setIndexWhitelistStatus,
    setIndexBlacklistStatus,
  };
}

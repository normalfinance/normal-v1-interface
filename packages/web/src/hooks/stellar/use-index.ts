'use client';

// @ts-ignore TODO: IndexContract is not defined in contracts, remove once added
import type { IndexContract } from '@normalfinance/contracts';

import { constants } from '@normalfinance/utils';
import { captureException } from '@sentry/nextjs';
import { TransactionType } from '@/types/transaction';
import { usePersistStore } from '@normalfinance/state';
import { useState, useEffect, useCallback } from 'react';

// @ts-ignore TODO: IndexContract is not defined in contracts, remove once added
import { IndexContract as IndexContractClient } from '@normalfinance/contracts';

import { useContractTransaction } from './use-contract-transaction';

// ----------------------------------------------------------------------

// User - Simplified args for the UI (internal conversions handle the rest)
export interface MintIndexArgs {
  token: string;
  amount: number; // Amount in human-readable units (will be converted to bigint)
  destination?: string;
  _max_slippage?: bigint;
}

export interface RedeemIndexArgs {
  share_amount: number; // Amount in human-readable units (will be converted to bigint)
}

// Admin
export type RefactorIndexArgs = Omit<Parameters<IndexContract.Client['refactor']>[0], 'caller'>;
export type RebalanceIndexArgs = Omit<Parameters<IndexContract.Client['rebalance']>[0], 'caller'>;
export type SetIndexRebalanceAuthorityArgs = Omit<
  Parameters<IndexContract.Client['set_rebalance_authority']>[0],
  'admin'
>;
export type SetPublicStatusIndexArgs = Parameters<IndexContract.Client['set_public_status']>[0];
export type SetWhitelistStatusIndexArgs = Omit<
  Parameters<IndexContract.Client['set_whitelist_status']>[0],
  'admin'
>;
export type SetBlacklistStatusIndexArgs = Omit<
  Parameters<IndexContract.Client['set_blacklist_status']>[0],
  'admin'
>;
export type SetManagerFeeIndexArgs = Omit<
  Parameters<IndexContract.Client['set_manager_fee_amount']>[0],
  'admin'
>;

interface ReturnType {
  error: any | null;
  loading: boolean;
  index: IndexContract.IndexInfo | undefined;
  fetchIndex: () => void;
  mintIndex: (args: MintIndexArgs) => Promise<void>;
  redeemIndex: (args: RedeemIndexArgs) => Promise<void>;
  // admin
  refactorIndex: (args: RefactorIndexArgs) => Promise<void>;
  rebalanceIndex: (args: RebalanceIndexArgs) => Promise<void>;
  setRebalanceAuthority: (args: SetIndexRebalanceAuthorityArgs) => Promise<void>;
  setIndexPublicStatus: (args: SetPublicStatusIndexArgs) => Promise<void>;
  setIndexWhitelistStatus: (args: SetWhitelistStatusIndexArgs) => Promise<void>;
  setIndexBlacklistStatus: (args: SetBlacklistStatusIndexArgs) => Promise<void>;
  distributeIndexManagerFees: (args: SetManagerFeeIndexArgs) => Promise<void>;
}

// ----------------------------------------------------------------------

export function useIndex(indexAddress: string): ReturnType {
  const storePersist = usePersistStore();

  const { executeContractTransaction } = useContractTransaction();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [index, setIndex] = useState<IndexContract.IndexInfo | undefined>(undefined);

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

  const fetchIndex = useCallback(async () => {
    if (!indexAddress) return;

    try {
      setError(null);
      setLoading(true);

      // Query the index contract directly using its address
      const indexClient = new IndexContractClient.Client({
        contractId: indexAddress,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        rpcUrl: constants.StellarConfig.RPC_URL,
      });

      const indexInfo = await indexClient.get_index_info();

      if (indexInfo && indexInfo.result) {
        const data = indexInfo.result as IndexContract.IndexInfo;
        setIndex(data);
      }
    } catch (e: any) {
      captureException(e);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [indexAddress]);

  const mintIndex = async (args: MintIndexArgs) => {
    if (!index || !index.address) return;

    setLoading(true);

    await rateLimitCheck();

    const processedArgs = {
      user: storePersist.wallet.address!,
      token: args.token,
      amount: BigInt((args.amount * 10 ** constants.StellarConfig.XLM_DECIMALS).toFixed(0)),
      destination: args.destination || storePersist.wallet.address!,
      _max_slippage: args._max_slippage || BigInt(100), // Default 1% slippage
    };

    await executeContractTransaction({
      contractType: 'index',
      contractAddress: index.address,
      transactionDetails: {
        type: TransactionType.MINT_INDEX,
        token1: { name: 'Token', amount: String(args.amount) },
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
      contractType: 'index',
      contractAddress: index.address,
      transactionDetails: {
        type: TransactionType.REDEEM_INDEX,
        token1: { name: 'XLM', amount: String(args.share_amount) },
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
      contractType: 'index',
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
      contractType: 'index',
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
      contractType: 'index',
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

  const setIndexPublicStatus = async (args: SetPublicStatusIndexArgs) => {
    if (!index || !index.address) return;

    setLoading(true);

    await rateLimitCheck();

    await executeContractTransaction({
      contractType: 'index',
      contractAddress: index.address,
      transactionDetails: {
        type: TransactionType.UPDATE_INDEX,
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.set_public_status(args, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          await tx.sign();
          const signedXDR = tx.signed?.toXDR();

          if (signedXDR) {
            const apiRes = await executeIndex(signedXDR, 'Update Index Public Status');
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
      contractType: 'index',
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
      contractType: 'index',
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

  const distributeIndexManagerFees = async (args: SetManagerFeeIndexArgs) => {
    if (!index || !index.address) return;

    setLoading(true);

    await rateLimitCheck();

    const processedArgs = {
      ...args,
      admin: storePersist.wallet.address!,
    };

    await executeContractTransaction({
      contractType: 'index',
      contractAddress: index.address,
      transactionDetails: {
        type: TransactionType.UPDATE_INDEX,
      },
      transactionFunction: async (client, restore) => {
        const tx = await client.set_manager_fee_amount(processedArgs, { simulate: !restore });
        if (restore) {
          await tx.simulate({ restore: true });
          return tx;
        } else {
          await tx.sign();
          const signedXDR = tx.signed?.toXDR();

          if (signedXDR) {
            const apiRes = await executeIndex(signedXDR, 'Distribute Index Manager Fees');
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
    fetchIndex();
  }, [fetchIndex]);

  return {
    error,
    loading,
    index,
    fetchIndex,
    mintIndex,
    redeemIndex,
    // admin
    refactorIndex,
    rebalanceIndex,
    setRebalanceAuthority,
    setIndexPublicStatus,
    setIndexWhitelistStatus,
    setIndexBlacklistStatus,
    distributeIndexManagerFees,
  };
}

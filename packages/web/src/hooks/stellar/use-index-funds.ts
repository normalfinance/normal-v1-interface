'use client';

import type { AppError } from '@/utils/errors';
import type { IndexFundContract } from '@normalfinance/contracts';

import { constants } from '@normalfinance/utils';
import { handleHookError } from '@/utils/errors';
import { useState, useEffect, useCallback } from 'react';
import {
  IndexFundFactoryContract,
  IndexFundContract as IndexFundContractClient,
} from '@normalfinance/contracts';

// ----------------------------------------------------------------------

export interface IndexListItem {
  address: string;
  sequence: number;
  info: IndexFundContract.IndexFundInfo;
}

interface ReturnType {
  error: AppError | null;
  loading: boolean;
  indexes: IndexListItem[];
  totalCount: number;
  fetchIndexes: () => void;
  clearError: () => void;
}

// ----------------------------------------------------------------------

export function useIndexFunds(): ReturnType {
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(true);
  const [indexes, setIndexes] = useState<IndexListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const clearError = useCallback(() => setError(null), []);

  const fetchIndexes = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const IndexFactory = new IndexFundFactoryContract.Client({
        contractId: constants.StellarConfig.INDEX_FACTORY_ADDRESS,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        rpcUrl: constants.StellarConfig.RPC_URL,
      });

      // Get total index count
      const countResult = await IndexFactory.get_total_index_count();
      const count = countResult?.result ? Number(countResult.result) : 0;
      setTotalCount(count);

      if (count === 0) {
        setIndexes([]);
        setLoading(false);
        return;
      }

      // Get all deployed index addresses
      const allIndexesResult = await IndexFactory.get_all_deployed_indexes();

      if (allIndexesResult && allIndexesResult.result) {
        const indexAddresses = allIndexesResult.result as string[];

        // Fetch info for each index by querying the index contract directly
        const indexPromises = indexAddresses.map(async (address, sequence) => {
          try {
            const indexClient = new IndexFundContractClient.Client({
              contractId: address,
              networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
              rpcUrl: constants.StellarConfig.RPC_URL,
            });

            const indexInfo = await indexClient.get_index_info();
            if (indexInfo && indexInfo.result) {
              return {
                address,
                sequence,
                info: indexInfo.result as IndexFundContract.IndexFundInfo,
              };
            }
            return null;
          } catch (e) {
            // captureException(e);
            return null;
          }
        });

        const results = await Promise.all(indexPromises);
        const validIndexes = results.filter((item): item is IndexListItem => item !== null);
        setIndexes(validIndexes);
      }
    } catch (e) {
      handleHookError(e, 'useIndexFunds', setError);
    } finally {
      setLoading(false);
    }
  }, []);

  // On component mount, fetch indexes
  useEffect(() => {
    fetchIndexes();
  }, [fetchIndexes]);

  return {
    error,
    loading,
    indexes,
    totalCount,
    fetchIndexes,
    clearError,
  };
}

'use client';

// @ts-ignore
import type { IndexContract } from '@normalfinance/contracts';

import { constants } from '@normalfinance/utils';
// import { captureException } from '@sentry/nextjs';
import { useState, useEffect, useCallback } from 'react';
import {
  // @ts-ignore
  IndexFactoryContract,
  // @ts-ignore
  IndexContract as IndexContractClient,
} from '@normalfinance/contracts';

import { usePersistStore } from '@normalfinance/state';

// ----------------------------------------------------------------------

export interface IndexListItem {
  address: string;
  sequence: number;
  info: IndexContract.IndexInfo;
}

interface ReturnType {
  error: any | null;
  loading: boolean;
  indexes: IndexListItem[];
  totalCount: number;
  fetchIndexes: () => void;
}

// ----------------------------------------------------------------------

export function useIndexes(): ReturnType {
  const storePersist = usePersistStore();

  const [error, setError] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [indexes, setIndexes] = useState<IndexListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const fetchIndexes = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const IndexFactory = new IndexFactoryContract.Client({
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
            const indexClient = new IndexContractClient.Client({
              contractId: address,
              networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
              rpcUrl: constants.StellarConfig.RPC_URL,
            });

            const indexInfo = await indexClient.get_index_info();
            if (indexInfo && indexInfo.result) {
              return {
                address,
                sequence,
                info: indexInfo.result as IndexContract.IndexInfo,
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
    } catch (e: any) {
      // captureException(e);
      setError(e);
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
  };
}

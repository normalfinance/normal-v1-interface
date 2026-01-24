'use client';

// import { captureException } from '@sentry/nextjs';
import type { Client as IndexFundFactoryClient } from '@normalfinance/contracts/build/index_fund_factory';

import { useState, useCallback } from 'react';
import { constants } from '@normalfinance/utils';
import { IndexFundFactoryContract } from '@normalfinance/contracts';

// ----------------------------------------------------------------------

export type CreateIndexFundArgs = Parameters<IndexFundFactoryClient['deploy_index_contract']>[0];

interface ReturnType {
  error: any | null;
  loading: boolean;
  createIndexFund: (args: CreateIndexFundArgs) => Promise<string>;
}

// ----------------------------------------------------------------------

export function useIndexFundFactory(): ReturnType {
  const [error, setError] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const createIndexFund = useCallback(async (args: CreateIndexFundArgs) => {
    try {
      setError(null);
      setLoading(true);

      const IndexFactory = new IndexFundFactoryContract.Client({
        contractId: constants.StellarConfig.INDEX_FACTORY_ADDRESS,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        rpcUrl: constants.StellarConfig.RPC_URL,
      });

      const index_fund_address = await IndexFactory.deploy_index_contract(args);

      return index_fund_address;
    } catch (e: any) {
      // captureException(e);
      setError(e);
      return '';
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    error,
    loading,
    createIndexFund,
  };
}

'use client';

import type { OraclePriceData } from '@normalfinance/contracts/build/oracle_registry';

import { useState, useCallback } from 'react';
import { constants } from '@normalfinance/utils';
import { usePersistStore } from '@normalfinance/state';
import { OracleRegistryContract } from '@normalfinance/contracts';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  priceData: OraclePriceData | undefined;
  onFetchOraclePrice: (assetId: string, cached: boolean) => Promise<void>;
}

// ----------------------------------------------------------------------

export function useOraclePrice(): ReturnType {
  const storePersist = usePersistStore();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state for async operations

  const [priceData, setPriceData] = useState<OraclePriceData | undefined>(undefined);

  const fetchOracleRegistryPrice = useCallback(async (assetId: string, cached: boolean) => {
    try {
      setError(null);
      setLoading(true);

      const OracleRegistry = new OracleRegistryContract.Client({
        contractId: constants.ORALCE_REGISTY_ADDRESS,
        networkPassphrase: constants.NETWORK_PASSPHRASE,
        rpcUrl: constants.RPC_URL,
      });

      const oraclePriceData = await OracleRegistry.get_price({
        sender: storePersist.wallet.address!,
        asset_id: assetId,
        cached,
        sanitize_clamp_denominator: 0,
      });

      if (oraclePriceData?.result) {
        setPriceData(oraclePriceData.result);
      }
    } catch (e) {
      console.log(e);
      setError(e.toString());
    }

    setLoading(false);
    return;
  }, []);

  return {
    error,
    loading,
    priceData,
    onFetchOraclePrice: fetchOracleRegistryPrice,
  };
}

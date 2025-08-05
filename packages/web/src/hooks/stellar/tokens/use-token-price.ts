import { constants } from '@normalfinance/utils';
import { captureException } from '@sentry/nextjs';
import { useState, useEffect, useCallback } from 'react';
import { OracleRegistryContract } from '@normalfinance/contracts';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  price: number | undefined;
}

// ----------------------------------------------------------------------

const defaultAction: OracleRegistryContract.NormalAction = {
  tag: 'UpdateTwap',
  values: undefined,
};

export const useTokenPrice = (asset: string): ReturnType => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState<number | undefined>(undefined);

  const getPrice = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      // await rateLimitCheck();

      const OracleRegistry = new OracleRegistryContract.Client({
        contractId: constants.StellarConfig.ORACLE_REGISTRY_ADDRESS,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        rpcUrl: constants.StellarConfig.RPC_URL,
      });

      const oraclePriceData = await OracleRegistry.get_price({
        asset,
        cached: false,
        action: defaultAction,
      });

      if (oraclePriceData.result) {
        setPrice(oraclePriceData.result.price);
      }
    } catch (e: any) {
      captureException(e);
      console.log(e);
      setError(e.toString());
    }

    setLoading(false);
    return;
  }, []);

  // On component mount, fetch OracleRegistry and price
  useEffect(() => {
    getPrice();
  }, [getPrice]);

  return {
    error,
    loading,
    price,
  };
};

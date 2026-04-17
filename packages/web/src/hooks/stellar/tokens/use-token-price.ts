import { BigNumber } from 'bignumber.js';
import { useState, useEffect, useCallback } from 'react';
import { format, logger, getReflectorExternalPrice } from '@normalfinance/utils';

import { useStellarConfig } from '@/hooks';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  price: BigNumber;
}

// ----------------------------------------------------------------------

export const useTokenPrice = (tokenSymbol: string): ReturnType => {
  const config = useStellarConfig();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState<BigNumber>(BigNumber(0));

  const getPrice = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const data = await getReflectorExternalPrice(tokenSymbol, config);

      if (data && data.price) {
        setPrice(BigNumber(format.fTokenAmount(data.price, 14)));
      }
    } catch (e: any) {
      logger.log(e);
      setError(e.toString());
    }

    setLoading(false);
    return;
  }, [tokenSymbol, config]);

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

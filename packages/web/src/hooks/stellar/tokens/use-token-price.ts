import { BigNumber } from 'bignumber.js';
import { useState, useEffect, useCallback } from 'react';
import { format, constants, getOraclePrice } from '@normalfinance/utils';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  price: BigNumber;
}

// ----------------------------------------------------------------------

export const useTokenPrice = (asset: string): ReturnType => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState<BigNumber>(BigNumber(0));

  const getPrice = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const data = await getOraclePrice(constants.StellarConfig.REFLECTOR_ORACLE_ADDRESS, asset);

      if (data && data.price) {
        setPrice(BigNumber(format.formatTokenAmount(data.price, 14)));
      }
    } catch (e: any) {
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

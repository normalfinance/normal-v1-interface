'use client';

import { useEffect } from 'react';
import { useTranslate } from '@/locales';
import { logger } from '@normalfinance/utils';
import { useAppStore, usePersistStore } from '@normalfinance/state';

import { SpecificNotFound } from '@/components/_common/specific-not-found';

import AssetDetailsView from './asset-details-view';

export default function AssetView({ symbol }: { symbol: string }) {
  const { t } = useTranslate();

  const { setGlobalIsLoading } = useAppStore();

  const {
    wallet,
    tokenState: { tokens },
    getAllTokens,
    pairState: { pairs },
  } = usePersistStore();

  // Effect hook to fetch all tokens and pools once the component mounts
  useEffect(() => {
    const refreshData = async (): Promise<void> => {
      try {
        setGlobalIsLoading(true);
        await getAllTokens();
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshData();
  }, [symbol, wallet.address]);

  const token = tokens.find((tkn) => tkn.symbol === symbol);

  const pair =
    token &&
    pairs.find(
      (p) => p.addresses.tokenLong === token.contract || p.addresses.tokenShort === token.contract
    );

  // if (error != null) {
  //   return (
  //     <DashboardContent maxWidth="xl">
  //       <Alert severity="info">{t('There was an error loading this asset.')}</Alert>
  //     </DashboardContent>
  //   );
  // }

  if (!token || !pair) {
    return <SpecificNotFound type="pool" />;
  }

  return <AssetDetailsView symbol={symbol} pairAddress={pair.addresses.pair} />;
}

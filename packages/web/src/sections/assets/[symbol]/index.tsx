'use client';

import { useTranslate } from '@/locales';
import { useState, useEffect } from 'react';
import { DashboardContent } from '@/layouts/dashboard';
import { usePairFactory } from '@/hooks/stellar/use-pair-factory';
import { useAppStore, usePersistStore } from '@normalfinance/state';

import { Alert, CircularProgress } from '@mui/material';

import { SpecificNotFound } from '@/components/_common/specific-not-found';

import AssetDetailsView from './asset-details-view';

export default function AssetView({ symbol }: { symbol: string }) {
  const { t } = useTranslate();

  const { setGlobalIsLoading } = useAppStore();

  const { wallet, getAllTokens } = usePersistStore();

  const { loading, error, getPairByAsset } = usePairFactory();

  const [pairAddress, setPairAddress] = useState<string | undefined>(undefined);

  useEffect(() => {
    const refreshData = async (): Promise<void> => {
      const address = await getPairByAsset(symbol);
      if (address) setPairAddress(address);
    };
    refreshData();
  }, [symbol]);

  if (loading) {
    return <CircularProgress />;
  }

  if (error != null) {
    return (
      <DashboardContent maxWidth="xl">
        <Alert severity="info">{t('There was an error loading this asset.')}</Alert>
      </DashboardContent>
    );
  }

  if (!symbol || !pairAddress) {
    return <SpecificNotFound type="pair" />;
  }

  // Effect hook to fetch all tokens once the component mounts
  // useEffect(() => {
  //   const refreshData = async (): Promise<void> => {
  //     try {
  //       setGlobalIsLoading(true);
  //       await getAllTokens();
  //     } catch (e) {
  //       logger.error(e);
  //     } finally {
  //       setGlobalIsLoading(false);
  //     }
  //   };
  //   refreshData();
  // }, [wallet.address]);

  return <AssetDetailsView symbol={symbol} pairAddress={pairAddress} />;
}

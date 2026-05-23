'use client';

import { useEffect, useMemo } from 'react';
import { logger } from '@normalfinance/utils';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { useDefindexSavings } from '@/hooks/stellar/use-defindex-savings';
import { BigNumber } from 'bignumber.js';
import { DashboardContent } from '@/layouts/dashboard';

import Box from '@mui/material/Box';

import SavingsCard from '@/components/_common/savings-card';

import { HeroCard } from './portfolio-hero-card';
import { HoldingsCard } from './portfolio-holdings-card';
import { ActivityCard } from './portfolio-activity-card';
import type { HoldingData } from './_shared';

export default function PortfolioView() {
  const { setGlobalIsLoading } = useAppStore();
  const {
    wallet,
    getAllTokens,
    tokenState: { tokens },
  } = usePersistStore();

  const { userPosition, fetching, positionFetching } = useDefindexSavings();

  const savingsValue = useMemo(() => {
    const v = parseFloat(userPosition?.currentValue || '0');
    return v > 0 ? v : 0;
  }, [userPosition]);

  const earnings = useMemo(() => parseFloat(userPosition?.earnings || '0'), [userPosition]);

  const walletBalance = useMemo(
    () =>
      tokens
        .reduce(
          (acc, tkn) => acc.plus(BigNumber(tkn.balance).multipliedBy(tkn.price)),
          BigNumber(0)
        )
        .toNumber(),
    [tokens]
  );

  const totalBalance = walletBalance + savingsValue;

  const holdingsWithBalance = useMemo(
    () => tokens.filter((tkn) => BigNumber(tkn.balance).gt(0)),
    [tokens]
  );

  const holdingsData: HoldingData[] = useMemo(() => {
    const entries: HoldingData[] = holdingsWithBalance.map((tkn) => ({
      token: tkn,
      value: BigNumber(tkn.balance).multipliedBy(tkn.price).toNumber(),
      percentage:
        totalBalance > 0
          ? BigNumber(tkn.balance)
              .multipliedBy(tkn.price)
              .dividedBy(totalBalance)
              .multipliedBy(100)
              .toNumber()
          : 0,
    }));

    if (savingsValue > 0) {
      entries.push({
        token: {
          symbol: 'Savings',
          contract: '__savings__',
          name: 'Normal Savings',
          issuer: '',
          org: '',
          domain: '',
          icon: 'https://cdn.normalapi.com/logo/logo-single.png',
          decimals: 4,
          featured: false,
          balance: String(savingsValue),
          price: '1',
          percentageChange: 0,
        },
        value: savingsValue,
        percentage: totalBalance > 0 ? (savingsValue / totalBalance) * 100 : 0,
      });
    }

    return entries.sort((a, b) => b.value - a.value);
  }, [holdingsWithBalance, totalBalance, savingsValue]);

  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      try {
        setGlobalIsLoading(true);
        await getAllTokens();
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshTokens();
  }, [wallet.address, getAllTokens, setGlobalIsLoading]);

  return (
    <DashboardContent maxWidth="xl">
      <HeroCard
        totalBalance={totalBalance}
        walletBalance={walletBalance}
        savingsValue={savingsValue}
        earnings={earnings}
        loading={fetching || positionFetching}
        holdingsData={holdingsData}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' },
          gap: '20px',
          mt: '20px',
        }}
      >
        <HoldingsCard holdingsData={holdingsData} totalBalance={totalBalance} />
        <SavingsCard sx={{ minWidth: 0, overflow: 'hidden' }} />
      </Box>

      <Box sx={{ mt: '20px' }}>
        <ActivityCard walletAddress={wallet.address} />
      </Box>
    </DashboardContent>
  );
}

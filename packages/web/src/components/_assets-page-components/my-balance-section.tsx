'use client';

import type { Token } from '@normalfinance/types';
import type { CardProps } from '@mui/material/Card';

import { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { usePersistStore } from '@normalfinance/state';
import { getCryptoIconUrl } from '@normalfinance/utils';

import Card from '@mui/material/Card';
import Grid2 from '@mui/material/Grid2';

import { WalletGate } from '@/components/_common/wallet-gate';

import MyBalanceHeader from './my-balance-header';
import MyHoldingsChart from './my-holdings-chart';
import MyHoldingsTable from './my-holdings-table';

import type { HoldingData } from './my-holdings-table-row';

export const SAVINGS_CONTRACT = '__savings__';

interface MyBalanceSectionProps extends CardProps {
  savingsValue?: number;
}

export function MyBalanceSection({ sx, savingsValue = 0, ...other }: MyBalanceSectionProps) {
  const {
    tokenState: { tokens },
  } = usePersistStore();

  // Filter tokens with positive balance
  const holdingsWithBalance = useMemo(
    () => tokens.filter((tkn) => BigNumber(tkn.balance).gt(0)),
    [tokens]
  );

  // Calculate total balance (wallet tokens + savings USDC)
  const totalBalance = useMemo(
    () =>
      tokens
        .reduce((acc, tkn) => {
          const holdings = BigNumber(tkn.balance).multipliedBy(tkn.price);
          return acc.plus(holdings);
        }, BigNumber(0))
        .plus(savingsValue),
    [tokens, savingsValue]
  );

  // Calculate 24h weighted percentage change (savings USDC has 0% change)
  const weightedPercentageChange = useMemo(() => {
    if (totalBalance.isZero()) return 0;

    const weightedSum = holdingsWithBalance.reduce((acc, tkn) => {
      const holdingValue = BigNumber(tkn.balance).multipliedBy(tkn.price);
      const weight = holdingValue.dividedBy(totalBalance);
      return acc.plus(weight.multipliedBy(tkn.percentageChange || 0));
    }, BigNumber(0));

    return weightedSum.toNumber();
  }, [holdingsWithBalance, totalBalance]);

  // Synthetic token representing the savings account balance
  const savingsToken: Token | null = useMemo(() => {
    if (savingsValue <= 0) return null;
    return {
      symbol: 'Savings',
      contract: SAVINGS_CONTRACT,
      name: 'Normal Savings',
      issuer: '',
      org: '',
      domain: '',
      icon: getCryptoIconUrl('USDC'),
      decimals: 4,
      featured: false,
      balance: String(savingsValue),
      price: '1',
      percentageChange: 0,
    };
  }, [savingsValue]);

  // Calculate holdings data for chart and table (includes savings slice)
  const holdingsData: HoldingData[] = useMemo(() => {
    const walletEntries = holdingsWithBalance.map((tkn) => {
      const value = BigNumber(tkn.balance).multipliedBy(tkn.price).toNumber();
      const percentage = totalBalance.gt(0)
        ? BigNumber(tkn.balance)
            .multipliedBy(tkn.price)
            .dividedBy(totalBalance)
            .multipliedBy(100)
            .toNumber()
        : 0;
      return { token: tkn, value, percentage };
    });

    const savingsEntry: HoldingData | null = savingsToken
      ? {
          token: savingsToken,
          value: savingsValue,
          percentage: totalBalance.gt(0)
            ? BigNumber(savingsValue).dividedBy(totalBalance).multipliedBy(100).toNumber()
            : 0,
        }
      : null;

    return [...walletEntries, ...(savingsEntry ? [savingsEntry] : [])].sort(
      (a, b) => b.value - a.value
    );
  }, [holdingsWithBalance, totalBalance, savingsToken, savingsValue]);

  return (
    <Card sx={[{ p: 3 }, ...(Array.isArray(sx) ? sx : [sx])]} {...other}>
      <WalletGate buttonText="Login to view your portfolio" fullWidth>
        <Grid2 container spacing={3}>
          <Grid2 size={12}>
            <MyBalanceHeader
              totalBalance={totalBalance.toNumber()}
              percentageChange={weightedPercentageChange}
            />
          </Grid2>

          <Grid2 size={{ xs: 12, md: 4 }}>
            <MyHoldingsChart holdingsData={holdingsData} />
          </Grid2>
          <Grid2 size={{ xs: 12, md: 8 }}>
            <MyHoldingsTable holdingsData={holdingsData} />
          </Grid2>
        </Grid2>
      </WalletGate>
    </Card>
  );
}

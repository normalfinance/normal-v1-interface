'use client';

import type { CardProps } from '@mui/material/Card';

import { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { usePersistStore } from '@normalfinance/state';

import Card from '@mui/material/Card';
import Grid2 from '@mui/material/Grid2';

import { WalletGate } from '@/components/_common/wallet-gate';

import MyBalanceHeader from './my-balance-header';
import MyHoldingsChart from './my-holdings-chart';
import MyHoldingsTable from './my-holdings-table';
import type { HoldingData } from './my-holdings-table-row';

export function MyBalanceSection({ sx, ...other }: CardProps) {
  const {
    tokenState: { tokens },
  } = usePersistStore();

  // Filter tokens with positive balance
  const holdingsWithBalance = useMemo(
    () => tokens.filter((tkn) => BigNumber(tkn.balance).gt(0)),
    [tokens]
  );

  // Calculate total balance
  const totalBalance = useMemo(
    () =>
      tokens.reduce((acc, tkn) => {
        const holdings = BigNumber(tkn.balance).multipliedBy(tkn.price);
        return acc.plus(holdings);
      }, BigNumber(0)),
    [tokens]
  );

  // Calculate 24h weighted percentage change
  const weightedPercentageChange = useMemo(() => {
    if (totalBalance.isZero()) return 0;

    const weightedSum = holdingsWithBalance.reduce((acc, tkn) => {
      const holdingValue = BigNumber(tkn.balance).multipliedBy(tkn.price);
      const weight = holdingValue.dividedBy(totalBalance);
      return acc.plus(weight.multipliedBy(tkn.percentageChange || 0));
    }, BigNumber(0));

    return weightedSum.toNumber();
  }, [holdingsWithBalance, totalBalance]);

  // Calculate holdings data for chart and table
  const holdingsData: HoldingData[] = useMemo(
    () =>
      holdingsWithBalance
        .map((tkn) => {
          const value = BigNumber(tkn.balance).multipliedBy(tkn.price).toNumber();
          const percentage = totalBalance.gt(0)
            ? BigNumber(tkn.balance)
                .multipliedBy(tkn.price)
                .dividedBy(totalBalance)
                .multipliedBy(100)
                .toNumber()
            : 0;
          return {
            token: tkn,
            value,
            percentage,
          };
        })
        .sort((a, b) => b.value - a.value),
    [holdingsWithBalance, totalBalance]
  );

  return (
    <Card sx={[{ p: 3 }, ...(Array.isArray(sx) ? sx : [sx])]} {...other}>
      <WalletGate buttonText="Login to view your balance" fullWidth>
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

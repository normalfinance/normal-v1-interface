'use client';

import type { PoolRouterContract, OracleRegistryContract } from '@normalfinance/contracts';

import { useTranslate } from '@/locales';
import { useState, useEffect } from 'react';
import { usePools, useOracle } from '@/hooks/stellar';
import { DashboardContent } from '@/layouts/dashboard';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { fetchHistoricalPoolSwapsByAddress } from '@normalfinance/utils/build/stellar';

import { Alert, Stack, Grid2, Typography, CircularProgress } from '@mui/material';

import { PoolOverview } from '@/components/_pool-page-components/pool-overview';
import { PoolChart } from '@/components/_pool-page-components/pool-chart/pool-chart';
import { PoolTransactionsTable } from '@/components/_pool-page-components/pool-transactions-table';

export default function PoolView({ poolAddress }: { poolAddress: string }) {
  const { t } = useTranslate();
  const store = useAppStore();
  const storePersist = usePersistStore();

  // Contract hooks
  const { fetchPool, loading, error } = usePools(false);
  const { getPrice } = useOracle();

  // State
  const [pool, setPool] = useState<PoolRouterContract.PoolInfo | undefined>(undefined);
  const [tokenAPrice, setTokenAPrice] = useState<
    OracleRegistryContract.OraclePriceData | undefined
  >(undefined);
  const [tokenBPrice, setTokenBPrice] = useState<
    OracleRegistryContract.OraclePriceData | undefined
  >(undefined);
  const [transactions, setTransactions] = useState<any[] | undefined>(undefined);

  useEffect(() => {
    async function fetchData() {
      const poolWithData = await fetchPool(poolAddress);
      setPool(poolWithData);

      // Historical txs
      const swaps = await fetchHistoricalPoolSwapsByAddress(poolAddress);
      setTransactions(swaps);
    }

    fetchData();
  }, [fetchPool, poolAddress]);

  useEffect(() => {
    async function fetchData(p: PoolRouterContract.PoolInfo) {
      const price_a = await getPrice(p.pool_response.pool.base_asset, false);
      setTokenAPrice(price_a);

      const price_b = await getPrice(p.pool_response.pool.quote_asset, false);
      setTokenBPrice(price_b);
    }

    if (pool) {
      fetchData(pool);
    }
  }, [getPrice, pool]);

  if (loading) {
    <CircularProgress />;
  }

  if (!poolAddress || pool == undefined) {
    return <Alert severity="info">{`The pool you're looking for doesn't exist.`}</Alert>;
  }

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={1}>
        <Typography variant="h4" color="text.primary">
          {t('Pool')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {poolAddress}
        </Typography>
      </Stack>

      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 8 }}>
          <PoolChart
            id="portfolio_value"
            pairInfo={poolsExplorerData.pairInfo}
            metadata={poolsExplorerData.metadata}
            exchangeRate={poolsExplorerData.exchangeRate}
            performance={poolsExplorerData.performance}
            legendValues={[{ title: 'Price', number: 7334, formatter: fCurrencyCompact }]}
            chart={poolChartData}
            color={theme.palette.primary.main}
          />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 4 }}>
          <PoolOverview
            totalAprPercentage={0}
            poolBalances={[
              { coinShortName: 'Token A', value: pool.pool_response.token_a.amount },
              { coinShortName: 'Token B', value: pool.pool_response.token_b.amount },
            ]}
            stats={[{ statName: 'TVL', value: 0 }, { statName: '24h Volume', value: 0 }, { statName: '24h Fees', value: 0 }]}
          />
        </Grid2>
      </Grid2>
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 12 }}>
          <PoolTransactionsTable rows={transactions} />
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}

const applyPricesToPool = (
  pool: PoolRouterContract.PoolInfo,
  token_a_price: number,
  token_b_price: number
): PoolRouterContract.PoolInfo => {
  const token_a_usd_value = pool.pool_response.token_a.amount * token_a_price;
  const token_b_usd_value = pool.pool_response.token_b.amount * token_b_price;
  const tvl = token_a_usd_value + token_b_usd_value;

  // formatCurrency('USD', tvl.toString(), navigator.language)

  return {};
};

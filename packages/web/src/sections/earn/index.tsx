'use client';

import type { EarnTransactionRow } from '@/components/_earn-page-components/earn-transaction-table';

import { useTranslate } from '@/locales';
import { useManageLiquidity } from '@/hooks';
import { logger } from '@normalfinance/utils';
import { useMemo, useState, useEffect } from 'react';
import { DashboardContent } from '@/layouts/dashboard';
import { useAppStore, usePersistStore } from '@normalfinance/state';

import { Box, Grid2, Stack, Typography } from '@mui/material';

import { InlineError } from '@/components/_common/errors';
import MintRedeemCard from '@/components/_common/mint-redeem-card';
import { BalanceCard } from '@/components/_earn-page-components/balance-card';
import { PositionsTable } from '@/components/_earn-page-components/positions-table';
import { EarnOverviewCard } from '@/components/_earn-page-components/earn-overview';
import { EarnTransactionsTable } from '@/components/_earn-page-components/earn-transaction-table';
import { ProvideUsdcLiquidityCard } from '@/components/_earn-page-components/provide-usdc-liquidity';

// ----------------------------------------------------------------------

export default function EarnView() {
  const { t } = useTranslate();

  const { loading, liquidityPositions, totalValue, error, clearError } = useManageLiquidity();
  const { setGlobalIsLoading } = useAppStore();
  const { wallet, getAllTokens, getAllPairs } = usePersistStore();

  const [openEstimate, setOpenEstimate] = useState(false);

  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      try {
        setGlobalIsLoading(true);
        await getAllPairs();
        await getAllTokens();
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshTokens();
  }, [wallet.address]);

  const rows = useMemo(
    () => [
      { key: 'collateral', label: 'Collateral', balanceUsd: 6543.21, apy: 0.04, showManage: true },
      { key: 'blend', label: 'Blend', balanceUsd: 9987.65, apy: 0.152, showManage: true },
      { key: 'liquidity', label: 'Liquidity', balanceUsd: 1937.65, apy: 0.152, showManage: false },
    ],
    []
  );

  const totalCapitalDeployedUsd = useMemo(
    () => rows.reduce((sum, r) => sum + (r.balanceUsd ?? 0), 0),
    [rows]
  );

  const blendedYield = useMemo(() => {
    const total = totalCapitalDeployedUsd;
    if (!total) return 0;

    const weighted = rows.reduce((sum, r) => {
      const bal = r.balanceUsd ?? 0;
      const apy = r.apy ?? 0;
      return sum + bal * apy;
    }, 0);

    return weighted / total;
  }, [rows, totalCapitalDeployedUsd]);

  const annualYieldUsd = totalCapitalDeployedUsd * blendedYield;
  const totalEarningsUsd = 494.78;

  const liquidityDemo = useMemo(
    () => ({
      totalLpBalanceUsd: 1987.65,
      avgApy: 0.128,
      activePools: 3,
      pools: [
        {
          id: 'usdc-btc',
          pairLabel: 'USDC / BTC',
          tokenA: { symbol: 'USDC' },
          tokenB: { symbol: 'BTC' },
          apy: 0.152,
          totalBalanceUsd: 987.65,
          tokenABalanceUsd: 647.65,
          tokenBBalanceAmount: 123.83,
          tokenBBalanceSymbol: 'USDC',
          feesBalanceUsd: 127.65,
        },
        {
          id: 'usdc-eth',
          pairLabel: 'USDC / ETH',
          tokenA: { symbol: 'USDC' },
          tokenB: { symbol: 'ETH' },
          apy: 0.128,
          totalBalanceUsd: 387.24,
          tokenABalanceUsd: 245.11,
          tokenBBalanceAmount: 54.12,
          tokenBBalanceSymbol: 'USDC',
          feesBalanceUsd: 24.78,
        },
        {
          id: 'usdc-sol',
          pairLabel: 'USDC / SOL',
          tokenA: { symbol: 'USDC' },
          tokenB: { symbol: 'SOL' },
          apy: 0.104,
          totalBalanceUsd: 57.67,
          tokenABalanceUsd: 31.4,
          tokenBBalanceAmount: 12.02,
          tokenBBalanceSymbol: 'USDC',
          feesBalanceUsd: 3.12,
        },
      ],
      defaultExpandedPoolId: 'usdc-btc',
    }),
    []
  );

  const demoTxs: EarnTransactionRow[] = useMemo(
    () => [
      {
        id: 'tx-1',
        timestamp: '44s',
        type: 'Blend',
        asset: 'USDC',
        amountUsd: 250,
        status: 'Complete',
      },
      {
        id: 'tx-2',
        timestamp: '44s',
        type: 'Liquidity Deposit',
        asset: 'USDC/ETH',
        amountUsd: 250,
        status: 'Complete',
      },
      {
        id: 'tx-3',
        timestamp: '44s',
        type: 'Withdraw',
        asset: 'USDC',
        amountUsd: 250,
        status: 'Pending',
      },
    ],
    []
  );

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100dvh' }}>
      <DashboardContent maxWidth="xl">
        <Stack spacing={1}>
          <Typography variant="h4" color="text.primary">
            {t('Earn Account')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t(
              'Generate high-interest APY on your USD and compound dividends on each of your assets.'
            )}
          </Typography>
        </Stack>

        <Grid2 sx={{ mt: 6 }}>
          <EarnOverviewCard
            totalCapitalDeployedUsd={totalCapitalDeployedUsd}
            blendedYield={blendedYield}
            annualYieldUsd={annualYieldUsd}
            totalEarningsUsd={totalEarningsUsd}
            earnedTodayUsd={2.5}
            rows={rows as any}
            onCalculateClick={() => setOpenEstimate(true)}
            onBridgeClick={() => console.log('bridge')}
            onAllocateClick={() => setOpenEstimate(true)}
            onRowAction={(rowKey, action) => console.log('row action', rowKey, action)}
          />
        </Grid2>

        <Grid2 sx={{ mt: 6 }}>
          <ProvideUsdcLiquidityCard
            totalLpBalanceUsd={liquidityDemo.totalLpBalanceUsd}
            avgApy={liquidityDemo.avgApy}
            activePools={liquidityDemo.activePools}
            pools={liquidityDemo.pools}
            defaultExpandedPoolId={liquidityDemo.defaultExpandedPoolId}
            onHelpClick={() => console.log('help')}
            onClaimFees={(id) => console.log('claim fees', id)}
            onDeposit={(id) => console.log('deposit', id)}
            onWithdraw={(id) => console.log('withdraw', id)}
            onAddLiquidity={() => console.log('add liquidity')}
          />
        </Grid2>

        <Grid2 sx={{ mt: 6, pb: 6 }}>
          <EarnTransactionsTable title="Transactions" rows={demoTxs} />
        </Grid2>

        <InlineError error={error} onClose={clearError} sx={{ mt: 6 }} />

        <Grid2 container spacing={3} sx={{ mt: 6}}>
          <Grid2 size={{ xs: 12, md: 4 }}>
            <BalanceCard
              title={t('Total balance')}
              totalBalance={totalValue.toFixed(2)}
              liquidityProvided={totalValue.toString()}
            />
          </Grid2>

          <Grid2 size={{ xs: 12, md: 8 }}>
            <PositionsTable
              positions={liquidityPositions ?? []}
              loading={loading}
              queryParams={undefined}
            />
          </Grid2>

          <Grid2 size={{ xs: 12, md: 4 }}>
            <MintRedeemCard />
          </Grid2>
        </Grid2>
      </DashboardContent>
    </Box>
  );
}

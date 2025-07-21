'use client';

import type { SwapFeeInfo } from '@/types/swap-fee-info';
import type { SwapQueryParams } from '@/types/query-params';

import { useAppStore } from '@normalfinance/state';
import { DashboardContent } from '@/layouts/dashboard';
import { useQueryParams } from '@/hooks/use-query-params';

import { Box } from '@mui/material';

import TokenActionCard from '@/components/_common/token-action-card';

const swapFeeInfo: SwapFeeInfo = {
  feePercentage: 0.25,
  networkCost: 1.0,
  priceImpact: -0.3,
  maxSlippage: 0.5,
};

const cashBalance = 1000;

export default function SwapView() {
  const store = useAppStore();
  const { params } = useQueryParams<SwapQueryParams>();

  return (
    <DashboardContent maxWidth="xl">
      <Box
        sx={{
          display: 'flex',
          minHeight: '60vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box maxWidth={500} width={1}>
          <Box width={1}>
            <TokenActionCard
              tokensList={store.tokens}
              swapFeeInfo={swapFeeInfo}
              cashBalance={cashBalance}
              queryParams={params}
            />
          </Box>
        </Box>
      </Box>
    </DashboardContent>
  );
}

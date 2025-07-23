'use client';

import type { SwapFeeInfo } from '@/types/swap-fee-info';
import type { TokenActionQueryParams } from '@/types/query-params';
import type { TokenActionKey } from '@/components/_common/token-action-card';

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
  const { params } = useQueryParams<TokenActionQueryParams>();

  // Determine which tab to show based on query params, default to 'swap'
  const activeTab: TokenActionKey = params?.tab || 'swap';

  // Determine which tabs should be enabled (you can customize this logic)
  const enabledTabs: TokenActionKey[] = ['swap', 'send', 'buy'];

  // Convert TokenActionQueryParams to the format expected by different cards
  const getCardQueryParams = () => {
    if (!params) return undefined;

    switch (activeTab) {
      case 'swap':
        return {
          asset: params.asset,
          token_in: params.token_in,
          token_out: params.token_out,
          in_amount: params.in_amount,
          out_minimum: params.out_minimum,
        };
      case 'send':
        return {
          token: params.token,
          amount: params.amount,
          destination: params.destination,
        };
      case 'buy':
        return {
          token: params.token,
          amount: params.amount,
        };
      default:
        return undefined;
    }
  };

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
              queryParams={getCardQueryParams()}
              loading={store.loading}
              enabledTabs={enabledTabs}
              initialTab={activeTab}
            />
          </Box>
        </Box>
      </Box>
    </DashboardContent>
  );
}

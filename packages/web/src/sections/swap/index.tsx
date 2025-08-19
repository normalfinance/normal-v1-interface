'use client';

import type { SwapFeeInfo } from '@/types/swap-fee-info';
import type { TokenActionQueryParams } from '@/types/query-params';
import type { TokenActionKey } from '@/components/_common/token-action-card';

import { useEffect } from 'react';
import { useApiTokens } from '@/hooks';
import { captureException } from '@sentry/nextjs';
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

export default function SwapView() {
  const { params } = useQueryParams<TokenActionQueryParams>();
  const { tokens, getAllTokens, globalIsLoading, setGlobalIsLoading } = useAppStore();

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

  // Effect hook to fetch all tokens once the component mounts
  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      setGlobalIsLoading(true);

      getAllTokens()
        .catch((error) => {
          captureException(error);
          console.error(error);
        })
        .finally(() => {
          setGlobalIsLoading(false);
        });
    }
  }, []);

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
              tokensList={tokens}
              swapFeeInfo={swapFeeInfo}
              cashBalance={0}
              queryParams={getCardQueryParams()}
              loading={globalIsLoading}
              enabledTabs={enabledTabs}
              initialTab={activeTab}
            />
          </Box>
        </Box>
      </Box>
    </DashboardContent>
  );
}

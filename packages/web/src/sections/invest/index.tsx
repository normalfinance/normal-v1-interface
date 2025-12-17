'use client';

import type { SwapFeeInfo } from '@/types/swap-fee-info';
import type { TokenActionQueryParams } from '@/types/query-params';
import type { TokenActionKey } from '@/components/_common/token-action-card';

import React, { useEffect } from 'react';
import { logger } from '@normalfinance/utils';
import { DashboardContent } from '@/layouts/dashboard';
import { useQueryParams } from '@/hooks/use-query-params';
import { useAppStore, usePersistStore } from '@normalfinance/state';

import { Box } from '@mui/material';

import TokenActionCard from '@/components/_common/token-action-card';

const swapFeeInfo: SwapFeeInfo = {
  feePercentage: 0.25,
  networkCost: 1.0,
};

export default function InvestView() {
  const { params } = useQueryParams<TokenActionQueryParams>();

  const { globalIsLoading, setGlobalIsLoading } = useAppStore();
  const { wallet, getAllTokens, getAllPools } = usePersistStore();

  // Determine which tab to show based on query params, default to 'trade'
  const activeTab: TokenActionKey = params?.tab || 'trade';

  // Determine which tabs should be enabled (you can customize this logic)
  const enabledTabs: TokenActionKey[] = ['trade', 'deposit', 'withdraw'];

  // Convert TokenActionQueryParams to the format expected by different cards
  const getCardQueryParams = () => {
    if (!params) return undefined;

    switch (activeTab) {
      case 'trade':
        return {
          token_in: params.token_in,
          token_out: params.token_out,
          in_amount: params.in_amount,
          out_minimum: params.out_minimum,
        };
      case 'deposit':
        return {
          token: params.token,
          amount: params.amount,
        };
      case 'withdraw':
        return {
          token: params.token,
          amount: params.amount,
          destination: params.destination,
        };
      default:
        return undefined;
    }
  };

  // Effect hook to fetch all pools and tokens once the component mounts
  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      try {
        setGlobalIsLoading(true);
        await getAllPools();
        await getAllTokens();
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshTokens();
  }, [wallet.address]);

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

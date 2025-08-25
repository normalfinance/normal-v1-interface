'use client';

import type { SwapFeeInfo } from '@/types/swap-fee-info';
import type { TokenActionQueryParams } from '@/types/query-params';
import type { TokenActionKey } from '@/components/_common/token-action-card';

import React, { useEffect } from 'react';
import { captureException } from '@sentry/nextjs';
import { useAppStore } from '@normalfinance/state';
import { DashboardContent } from '@/layouts/dashboard';
import { useQueryParams } from '@/hooks/use-query-params';

import { Box } from '@mui/material';

import TokenActionCard from '@/components/_common/token-action-card';
import { LogoLoader } from '@/components/_async/logo-loader';

const swapFeeInfo: SwapFeeInfo = {
  feePercentage: 0.25,
  networkCost: 1.0,
  priceImpact: -0.3,
  maxSlippage: 0.5,
};

export default function SwapView() {
  const { params } = useQueryParams<TokenActionQueryParams>();
  const { tokens, getAllTokens, globalIsLoading, setGlobalIsLoading } = useAppStore();

  const activeTab: TokenActionKey = params?.tab || 'swap';
  const enabledTabs: TokenActionKey[] = ['swap', 'send', 'buy'];

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
        return { token: params.token, amount: params.amount, destination: params.destination };
      case 'buy':
        return { token: params.token, amount: params.amount };
      default:
        return undefined;
    }
  };

  useEffect(() => {
    if (tokens.length === 0) {
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

  const isTokensReady = tokens.length > 0;
  const isLoadingTokens = globalIsLoading || !isTokensReady;

  // ⬅️ Call hooks BEFORE any early return
  const allowedTokens = React.useMemo(
    () =>
      tokens.filter(
        (token) => token.symbol === 'XLM' || token.symbol?.toLowerCase().startsWith('n')
      ),
    [tokens]
  );

  if (isLoadingTokens) {
    return <LogoLoader fullScreen size={420} />;
  }

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
              tokensList={allowedTokens}
              swapFeeInfo={swapFeeInfo}
              cashBalance={0}
              queryParams={getCardQueryParams()}
              enabledTabs={enabledTabs}
              initialTab={activeTab}
            />
          </Box>
        </Box>
      </Box>
    </DashboardContent>
  );
}

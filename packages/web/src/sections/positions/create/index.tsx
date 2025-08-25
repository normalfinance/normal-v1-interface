'use client';

import type { PositionQueryParams } from '@/types/query-params';

import { useEffect } from 'react';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { ZEALY_QUEST_IDS } from '@/global-config';
import { captureException } from '@sentry/nextjs';
import { useAppStore } from '@normalfinance/state';
import { DashboardContent } from '@/layouts/dashboard';
import { useQueryParams } from '@/hooks/use-query-params';

import { Box, Grid2 } from '@mui/material';

import ZealyHighlight from '@/components/_common/zealy/zealy-highlight';
import { CustomBreadcrumbs } from '@/components/template/custom-breadcrumbs';
import { CreatePosition } from '@/components/_create-position-page-components/create-position';
import { LogoLoader } from '@/components/_async/logo-loader';

export default function CreatePositionView() {
  const { t } = useTranslate();
  const { tokens, getAllTokens, setGlobalIsLoading, globalIsLoading } = useAppStore();
  const { params } = useQueryParams<PositionQueryParams>();

  const needsBootstrap = tokens.length === 0;

  useEffect(() => {
    if (!needsBootstrap) return;
    const refreshTokens = async (): Promise<void> => {
      setGlobalIsLoading(true);
      try {
        await getAllTokens();
      } catch (e) {
        captureException(e);
        console.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshTokens();
  }, [needsBootstrap, getAllTokens, setGlobalIsLoading]);

  const isLoading = globalIsLoading || needsBootstrap;

  if (isLoading) {
    return <LogoLoader fullScreen size={420} />;
  }

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100dvh' }}>
      <DashboardContent maxWidth="xl">
        <CustomBreadcrumbs
          heading="Liquidity"
          links={[
            { name: t('Your positions'), href: paths.positions.root },
            { name: t('New position'), href: paths.positions.create },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />
        <Grid2 container spacing={3} sx={{ mt: 3 }}>
          <Grid2 size={{ xs: 12, md: 12 }}>
            <Box sx={{ position: 'relative' }}>
              <CreatePosition
                tokens={tokens.filter((tkn) => tkn.symbol.startsWith('n'))}
                queryParams={params}
              />
              <ZealyHighlight questId={ZEALY_QUEST_IDS.addLiquidity} />
            </Box>
          </Grid2>
        </Grid2>
      </DashboardContent>
    </Box>
  );
}

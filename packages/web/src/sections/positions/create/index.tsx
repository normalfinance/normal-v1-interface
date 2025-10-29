'use client';

import type { DepositLiquidityQueryParams } from '@/types/query-params';

import { useEffect } from 'react';
// mui
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { logger } from '@normalfinance/utils';
import { ZEALY_QUEST_IDS } from '@/global-config';
import { DashboardContent } from '@/layouts/dashboard';
import { useQueryParams } from '@/hooks/use-query-params';
import { useAppStore, usePersistStore } from '@normalfinance/state';

import { Box, Grid2 } from '@mui/material';

import ZealyHighlight from '@/components/_common/zealy/zealy-highlight';
import { CustomBreadcrumbs } from '@/components/template/custom-breadcrumbs';
import { CreatePosition } from '@/components/_create-position-page-components/create-position';

// ----------------------------------------------------------------------

export default function CreatePositionView() {
  const { t } = useTranslate();

  const { params } = useQueryParams<DepositLiquidityQueryParams>();

  const { setGlobalIsLoading } = useAppStore();

  const { getAllTokens, getAllPools } = usePersistStore();

  // Effect hook to fetch all tokens once the component mounts
  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      setGlobalIsLoading(true);
      try {
        await Promise.all([await getAllTokens(), await getAllPools()]);
        setGlobalIsLoading(false);
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshTokens();
  }, []);

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100dvh' }}>
      <DashboardContent maxWidth="xl">
        <CustomBreadcrumbs
          heading="Liquidity"
          links={[
            { name: t('Your positions'), href: paths.positions.root },
            { name: t('New position'), href: paths.positions.create },
          ]}
          sx={{
            mb: { xs: 3, md: 5 },
          }}
        />
        <Grid2 container spacing={3} sx={{ mt: 3 }}>
          <Grid2 size={{ xs: 12, md: 12 }}>
            <Box sx={{ position: 'relative' }}>
              <CreatePosition queryParams={params} />
              <ZealyHighlight questId={ZEALY_QUEST_IDS.addLiquidity} />
            </Box>
          </Grid2>
        </Grid2>
      </DashboardContent>
    </Box>
  );
}

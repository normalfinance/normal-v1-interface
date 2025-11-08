'use client';

import type { DepositLiquidityQueryParams } from '@/types/query-params';

import { useEffect } from 'react';
// mui
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { logger } from '@normalfinance/utils';
import { DashboardContent } from '@/layouts/dashboard';
import { useQueryParams } from '@/hooks/use-query-params';
import { useAppStore, usePersistStore } from '@normalfinance/state';

import { Box, Grid2 } from '@mui/material';

import { CustomBreadcrumbs } from '@/components/template/custom-breadcrumbs';
import { CreatePosition } from '@/components/_create-position-page-components/create-position';

// ----------------------------------------------------------------------

export default function CreatePositionView() {
  const { t } = useTranslate();

  const { params } = useQueryParams<DepositLiquidityQueryParams>();

  const { setGlobalIsLoading } = useAppStore();

  const { wallet, getAllTokens, getAllPools } = usePersistStore();

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
            </Box>
          </Grid2>
        </Grid2>
      </DashboardContent>
    </Box>
  );
}

'use client';

import type { PositionQueryParams } from '@/types/query-params';

import { useEffect } from 'react';
// mui
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { ZEALY_QUEST_IDS } from '@/global-config';
import { useAppStore } from '@normalfinance/state';
import { DashboardContent } from '@/layouts/dashboard';
import { useQueryParams } from '@/hooks/use-query-params';

import { Box, Grid2 } from '@mui/material';

import ZealyHighlight from '@/components/_common/zealy/zealy-highlight';
import { CustomBreadcrumbs } from '@/components/template/custom-breadcrumbs';
import { CreatePosition } from '@/components/_create-position-page-components/create-position';

// ----------------------------------------------------------------------

export default function CreatePositionView() {
  const { t } = useTranslate();
  const store = useAppStore();
  const { params } = useQueryParams<PositionQueryParams>();

  // Effect hook to fetch all tokens once the component mounts
  useEffect(() => {
    const getAllTokens = async (): Promise<void> => {
      store.setLoading(true);
      try {
        const allTokens = await store.getAllTokens();
        console.log(allTokens);
        store.setLoading(false);
      } catch (e) {
        console.error(e);
      } finally {
        store.setLoading(false);
      }
    };
    getAllTokens();
  }, []);

  return (
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
            <CreatePosition tokens={store.tokens} queryParams={params} />
            <ZealyHighlight questId={ZEALY_QUEST_IDS.swap} />
          </Box>
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}

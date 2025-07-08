'use client';

import { usePoolsStats } from '@/hooks';
import { useTranslate } from '@/locales';
import { usePools } from '@/hooks/stellar';
import { DashboardContent } from '@/layouts/dashboard';

import Grid2 from '@mui/material/Grid2';
import { Stack, Typography } from '@mui/material';

import ExploreStats from '@/components/_explore-page-components/explore-stats/explore-stats';
import { ExplorePoolsTable } from '@/components/_explore-page-components/explore-pools-table/explore-pools-table';

export default function ExploreView() {
  const { t } = useTranslate();

  const { stats } = usePoolsStats();
  const { pools } = usePools(true);

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={1}>
        <Typography variant="h4" color="text.primary">
          {t('Explore')}
        </Typography>
      </Stack>
      <Grid2 width={1} sx={{ mt: 3 }}>
        <ExploreStats stats={stats} />
      </Grid2>
      <Grid2 sx={{ mt: 3 }}>
        <ExplorePoolsTable pools={pools} />
      </Grid2>
    </DashboardContent>
  );
}

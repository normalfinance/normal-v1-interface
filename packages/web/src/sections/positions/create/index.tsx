'use client';

// mui
import { paths } from '@/routes/paths';
import { DashboardContent } from '@/layouts/dashboard';

import { Grid2 } from '@mui/material';

import { CustomBreadcrumbs } from '@/components/template/custom-breadcrumbs';
import { CreatePosition } from '@/components/_create-position-page-components/create-position';

// ----------------------------------------------------------------------

export default function CreatePositionView() {
  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading="Liquidity"
        links={[
          { name: 'Your positions', href: paths.positions.root },
          { name: 'New position', href: paths.positions.create },
        ]}
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 12 }}>
          <CreatePosition tokens={[]} />
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}

'use client';

import Grid2 from '@mui/material/Grid2';
import { DashboardContent } from '@/layouts/dashboard';
import { Stack, Typography, useTheme } from '@mui/material';
import { NewIndexForm } from '@/components/_common/new-index-form';

export default function CreateAnIndexView() {
  const theme = useTheme();

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={1}>
        <Typography variant="h4" color="text.primary">
          Create a Crypto Index
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Automate or diversify your crypto investing by creating a custom crypto index token.
        </Typography>
      </Stack>
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 8 }}>
          <NewIndexForm />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 4 }}></Grid2>
      </Grid2>
    </DashboardContent>
  );
}

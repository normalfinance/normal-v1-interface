'use client';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { DashboardContent } from '@/layouts/dashboard';

import Grid2 from '@mui/material/Grid2';
import { Stack, Button, Typography } from '@mui/material';

export default function ComingSoonView() {
  const { t } = useTranslate();

  return (
    <DashboardContent maxWidth="xl">
      <Grid2 container justifyContent="center" alignItems="center" sx={{ minHeight: '60vh' }}>
        <Stack
          spacing={2}
          textAlign="center"
          sx={{
            bgcolor: 'common.white',
            p: { xs: 3, md: 6 },
            borderRadius: 2,
            boxShadow: 3,
            maxWidth: 520,
            width: '100%',
          }}
        >
          <Typography variant="h3" fontWeight="bold">
            {t('Coming soon!')}
          </Typography>
          <Typography variant="body1" fontSize={16}>
            {t(
              'Normal indexes are not yet publically available. We plan to launch them in the next week or two.'
            )}
          </Typography>
          <Button variant="contained" href={paths.explore}>
            {t('Go back')}
          </Button>
          <Button
            color="info"
            variant="contained"
            href="https://forms.fillout.com/t/oKPvL5FQJzus"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('Get notified when they launch')}
          </Button>
        </Stack>
      </Grid2>
    </DashboardContent>
  );
}

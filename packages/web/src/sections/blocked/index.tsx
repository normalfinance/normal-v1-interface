'use client';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { useRouter } from 'next/navigation';
import { DashboardContent } from '@/layouts/dashboard';

import Grid2 from '@mui/material/Grid2';
import { Box, Link, Stack, Button, Typography } from '@mui/material';

export default function BlockedView() {
  const { t } = useTranslate();
  const router = useRouter();

  return (
    /* ---- FULL-WIDTH GRAY BACKDROP ---- */
    <Box
      sx={{
        bgcolor: (theme) => theme.palette.grey[100],
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      {/* ---- YOUR REGULAR DASHBOARD WRAPPER ---- */}
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
              {t('GEO-BLOCKED')}
            </Typography>
            <Typography variant="body1" fontSize={16}>
              {t(
                'Normal is not available in your region. Based on your location being a current Restricted Jurisdiction, you are prohibited from accessing or using the Normal app, platform or smart contracts due to local laws and regulations, as per our Terms of Service.'
              )}
            </Typography>
            <Link
              href={`${paths.docs}/other/legal/terms-of-service`}
              underline="always"
              target="_blank"
              rel="noopener noreferrer"
              color="text.secondary"
            >
              {t("View Normal's Terms of Service")}
            </Link>
            <Button
              variant="contained"
              onClick={() => router.push('https://forms.fillout.com/t/tidFgHnmWWus')}
            >
              {t('Join the waiting list')}
            </Button>
          </Stack>
        </Grid2>
      </DashboardContent>
    </Box>
  );
}

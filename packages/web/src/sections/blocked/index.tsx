'use client';

import { useTranslate } from '@/locales';
import { DashboardContent } from '@/layouts/dashboard';

import Grid2 from '@mui/material/Grid2';
import { Box, Stack, Typography, Link, Button } from '@mui/material';
import { useRouter } from 'next/navigation';

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
              {t('Your region is blocked. Unable to redirect to the BlendIPFS Application.')}
            </Typography>

            <Link
              href="/"
              underline="always"
              target="_blank"
              rel="noopener noreferrer"
              color="text.secondary"
            >
              {t('View the blend App TOS')}
            </Link>

            <Button
              variant="contained"
              onClick={() => router.push('https://forms.fillout.com/t/tidFgHnmWWus')}
            >
              {t('Join the waiting list.')}
            </Button>
          </Stack>
        </Grid2>
      </DashboardContent>
    </Box>
  );
}

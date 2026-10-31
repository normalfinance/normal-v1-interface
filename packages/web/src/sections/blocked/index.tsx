'use client';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { useRouter } from 'next/navigation';
import { DashboardContent } from '@/layouts/dashboard';

import Grid2 from '@mui/material/Grid2';
import { Box, Link, Stack, Button, Typography } from '@mui/material';

import { BLOCK_SX } from '@/components/_common/brand';

export default function BlockedView() {
  const { t } = useTranslate();
  const router = useRouter();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      {/* ---- YOUR REGULAR DASHBOARD WRAPPER ---- */}
      <DashboardContent>
        <Grid2 container justifyContent="center" alignItems="center" sx={{ minHeight: '60vh' }}>
          <Stack
            spacing={2}
            textAlign="center"
            sx={{
              ...BLOCK_SX,
              p: { xs: '24px', md: '40px' },
              maxWidth: 520,
              width: '100%',
            }}
          >
            <Typography variant="h4">{t('GEO-BLOCKED')}</Typography>
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

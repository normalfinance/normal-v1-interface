'use client';

import { useTranslate } from '@/locales';
import { MUTED } from '@/theme/brand-colors';
import { INDEXES } from '@/lib/index/indexes';
import { DashboardContent } from '@/layouts/dashboard';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { AppPageHeader } from '@/components/_common/brand';

import { IndexCard, IndexComingCard } from './index-card';

/** /app/indexes: every index as a card to pick, then the place for the next. */
export function IndexesView() {
  const { t } = useTranslate();
  return (
    <DashboardContent>
      <AppPageHeader
        title={t('Indexes')}
        subtitle={t('Sets of coins you buy in one purchase, with one signature.')}
        action={
          // CoinGecko's free data asks to be credited where it is shown.
          <Typography sx={{ fontSize: 12.5, color: MUTED }}>
            {t('Market data from CoinGecko')}
          </Typography>
        }
      />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' },
          gap: 3,
          alignItems: 'stretch',
        }}
      >
        {INDEXES.map((meta) => (
          <IndexCard key={meta.id} meta={meta} />
        ))}
        <IndexComingCard />
      </Box>
    </DashboardContent>
  );
}

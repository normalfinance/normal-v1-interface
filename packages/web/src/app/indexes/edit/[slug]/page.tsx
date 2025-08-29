'use client';

import type { IndexCoin } from '@/types/indexes';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslate } from '@/locales';
import { DashboardContent } from '@/layouts/dashboard';

import Grid2 from '@mui/material/Grid2';
import { Stack, Typography, Box, Button } from '@mui/material';

import { NewIndexForm } from '@/components/_create-index/new-index-form';
import { indexDetailsToForm } from '@/types/index-mappers';

import { INDEXES } from '@/sections/explore/indexes';

export default function EditIndexPage() {
  const { t } = useTranslate();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string | undefined;

  const availableCoins: IndexCoin[] = [
    {
      id: 1,
      url: 'https://upload.wikimedia.org/wikipedia/commons/4/46/Bitcoin.svg',
      name: 'Bitcoin',
      shortName: 'BTC',
      price: 83138.18,
      marketCap: 1645860388284.49,
    },
    {
      id: 2,
      url: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Ethereum-icon-purple.svg',
      name: 'Ethereum',
      shortName: 'ETH',
      price: 2125.67,
      marketCap: 255750237413.69,
    },
    {
      id: 3,
      url: 'https://s2.coinmarketcap.com/static/img/coins/64x64/74.png',
      name: 'Dogecoin',
      shortName: 'DOGE',
      price: 0.1683,
      marketCap: 24968320305.07,
    },
    {
      id: 4,
      url: 'https://s2.coinmarketcap.com/static/img/coins/64x64/52.png',
      name: 'XRP',
      shortName: 'XRP',
      price: 2.12,
      marketCap: 123450670499.25,
    },
    {
      id: 5,
      url: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1974.png',
      name: 'Propy',
      shortName: 'PRO',
      price: 0.8076,
      marketCap: 80765439.01,
    },
    {
      id: 6,
      url: 'https://s2.coinmarketcap.com/static/img/coins/64x64/21159.png',
      name: 'Ondo',
      shortName: 'ONDO',
      price: 0.822,
      marketCap: 2588249971.72,
    },
  ];

  const currentIndexForm = useMemo(() => {
    if (!slug) return null;
    const idx = INDEXES.find((i) => i.slug === slug);
    return idx ? indexDetailsToForm(idx) : null;
  }, [slug]);

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100dvh' }}>
      <DashboardContent maxWidth="xl">
        {!currentIndexForm ? (
          <Stack spacing={2} alignItems="flex-start">
            <Typography variant="h4" color="text.primary">
              {t('Edit Crypto Index')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('The requested index was not found.')}
            </Typography>
            <Button href="/indexes/new" variant="contained">
              {t('Create a new index')}
            </Button>
          </Stack>
        ) : (
          <Grid2 container spacing={3} sx={{ mt: 3 }} justifyContent="center">
            <Grid2 size={{ xs: 12, md: 8, lg: 7 }}>
              <Stack spacing={1} alignItems="flex-start" textAlign="left" sx={{ mb: 2 }}>
                <Typography variant="h4" color="text.primary">
                  {t('Edit Crypto Index')}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {t(
                    'Update your index details, weights, and constituents. Changes apply after you submit.'
                  )}
                </Typography>
              </Stack>

              <NewIndexForm
                currentIndex={currentIndexForm}
                tokenSymbol="SOL"
                availableCoins={availableCoins}
              />
            </Grid2>
          </Grid2>
        )}
      </DashboardContent>
    </Box>
  );
}

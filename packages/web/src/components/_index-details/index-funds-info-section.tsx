'use client';

import * as React from 'react';
import { useTranslate } from '@/locales';

import { Box, Stack, Button, Container, Typography } from '@mui/material';

export const IndexFundsInfoSection: React.FC = () => {
  const { t } = useTranslate();

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        px: '5%',
        py: { xs: 6, md: 12, lg: 14 },
        bgcolor: 'grey.100',
      }}
    >
      <Container sx={{ position: 'relative', zIndex: 1 }}>
        <Stack
          spacing={3}
          alignItems="center"
          textAlign="center"
          sx={{
            position: 'relative',
            zIndex: 2,
            px: { xs: '24px', md: '64px' },
            py: { xs: '32px', md: '64px' },
          }}
        >
          {/* Heading */}
          <Typography variant="h3" fontWeight={600} sx={{ fontSize: { xs: '24px', md: '36px' } }}>
            {t('How On-Chain Index Funds Work')}
          </Typography>

          {/* Description */}
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 800 }}>
            {t(
              'On-chain index funds let you invest in a diversified basket of crypto assets through a single token. Smart contracts hold and automatically rebalance the underlying tokens according to the index methodology. When you invest, you receive index tokens that represent your share of the fund, which you can redeem or use across DeFi anytime.'
            )}
          </Typography>

          {/* Benefits list (short + punchy) */}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ mt: 2, maxWidth: 900 }}
            justifyContent="center"
          >
            <Typography variant="subtitle1" sx={{ flex: 1 }}>
              ✅ {t('Diversified exposure')}
            </Typography>
            <Typography variant="subtitle1" sx={{ flex: 1 }}>
              🔍 {t('Transparent & on-chain')}
            </Typography>
            <Typography variant="subtitle1" sx={{ flex: 1 }}>
              ⚡ {t('Automated rebalancing')}
            </Typography>
          </Stack>

          {/* CTA button */}
          <Button
            href="#"
            variant="contained"
            color="primary"
            sx={{ mt: 4, px: 4, borderRadius: 2, fontWeight: 600 }}
          >
            {t('Explore indexes')}
          </Button>
        </Stack>
      </Container>
    </Box>
  );
};

IndexFundsInfoSection.displayName = 'IndexFundsInfoSection';

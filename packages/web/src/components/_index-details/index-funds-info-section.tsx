'use client';

import * as React from 'react';
import { useTranslate } from '@/locales';

import { Box, Stack, Button, Container, Typography } from '@mui/material';

export const IndexFundsInfoSection: React.FC = () => {
  const { t } = useTranslate();

  const image = '/assets/images/landing-page/cta-bg.webp';

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        py: { xs: 6, md: 10, lg: 12 },
      }}
    >
      <Container sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: 3,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <Box
            component="img"
            src={image}
            alt=""
            sx={{
              position: 'absolute',
              inset: 0,
              width: 1,
              height: 1,
              objectFit: 'cover',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(160deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.24) 40%, rgba(0,0,0,0.18) 100%)',
            }}
          />
        </Box>

        <Stack
          spacing={3}
          alignItems="center"
          textAlign="center"
          sx={{
            position: 'relative',
            zIndex: 2,
            px: { xs: '24px', md: '64px' },
            py: { xs: '32px', md: '64px' },
            color: 'common.white',
          }}
        >
          <Typography variant="h3" fontWeight={600} sx={{ fontSize: { xs: '24px', md: '36px' } }}>
            {t('How On-Chain Index Funds Work')}
          </Typography>

          <Typography variant="body1" sx={{ maxWidth: 800, opacity: 0.92 }}>
            {t(
              'On-chain index funds let you invest in a diversified basket of crypto assets through a single token. Smart contracts hold and automatically rebalance the underlying tokens according to the index methodology. When you invest, you receive index tokens that represent your share of the fund, which you can redeem or use across DeFi anytime.'
            )}
          </Typography>

          <Typography
            variant="caption"
            color="text.white"
            component="div"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              columnGap: '10px',
              rowGap: '10px',
              fontSize: 14,
              fontWeight: 600,
              mx: 'auto',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <span>✅ {t('Diversified exposure')}</span>
            <span>•</span>
            <span>🔍 {t('Transparent & on-chain')}</span>
            <span>•</span>
            <span>⚡ {t('Automated rebalancing')}</span>
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
};

IndexFundsInfoSection.displayName = 'IndexFundsInfoSection';

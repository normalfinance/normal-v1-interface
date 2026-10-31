'use client';

import * as React from 'react';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { useVaultApy } from '@/hooks/use-vault-apy';

import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';

import {
  LiveDot,
  HeroLede,
  HeroBadge,
  HeroTitle,
  BrandButton,
  PageSection,
  GradientText,
} from '@/components/_common/brand';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type CtaImageProps = Record<string, never>;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const CtaImage: React.FC<CtaImageProps> = () => {
  const { t } = useTranslate();
  const apy = useVaultApy();

  return (
    <PageSection tone="dark" aria-labelledby="cta-heading" sx={{ textAlign: 'center' }}>
      <Stack alignItems="center">
        <HeroBadge tone="dark">
          <LiveDot tone="dark" pulse />
          {apy == null ? (
            <Skeleton variant="text" width={90} sx={{ bgcolor: 'rgba(255,255,255,0.12)' }} />
          ) : (
            `${Number(apy).toFixed(2)}% APY · live now`
          )}
        </HeroBadge>

        <HeroTitle tone="dark" component="h2" id="cta-heading">
          {t('Make crypto')} <GradientText>{t('normal.')}</GradientText>
        </HeroTitle>

        <HeroLede tone="dark" sx={{ mx: 'auto', maxWidth: 520 }}>
          {t(
            'Join thousands investing in crypto, earning yield, and keeping full custody of their funds.'
          )}
        </HeroLede>

        <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={1.5} sx={{ mt: 4 }}>
          <BrandButton tone="dark" href={paths.savings}>
            {t('Start saving →')}
          </BrandButton>
          <BrandButton
            tone="dark"
            emphasis="secondary"
            href="https://normalfi.substack.com/p/making-crypto-normal-simple-safe"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('Read whitepaper')}
          </BrandButton>
        </Stack>
      </Stack>
    </PageSection>
  );
};

CtaImage.displayName = 'CtaImage';

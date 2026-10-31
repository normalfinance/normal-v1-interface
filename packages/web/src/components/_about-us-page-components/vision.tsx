'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';

import Link from '@mui/material/Link';
import { Box, Stack, Typography } from '@mui/material';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import TelegramIcon from '@mui/icons-material/Telegram';

import {
  Eyebrow,
  MetaItem,
  PageSection,
  GradientText,
  HAIRLINE_ON_DARK,
} from '@/components/_common/brand';

type SocialLink = { href: string; icon: React.ReactNode };

type Founder = {
  image: string;
  name: string;
  role: string;
  bio: string;
  extraBio: string;
  stat: { label: string; value: string };
  socialLinks: SocialLink[];
};

const FOUNDER: Founder = {
  image: cdn('about-page/justin.webp'),
  name: 'Justin Benjamin',
  role: 'Founder & CEO',
  bio: 'Justin formerly designed products at Bitcoin of America and CoinFlip — two of the largest crypto ATM and exchange networks in the US. He has invested in crypto for 7+ years and holds a BS in Learning & Organizational Change from Northwestern University.',
  extraBio:
    "He started Normal after realising that DeFi's best yields were locked behind interfaces built for traders, not everyday savers. His goal is simple: take the complexity out of on-chain finance and put real, sustainable yield in the hands of anyone with a phone.",
  stat: { label: 'Years in crypto', value: '7+' },
  socialLinks: [
    {
      href: 'https://x.com/justinbenjaminn',
      icon: <Icon icon="fa6-brands:x-twitter" width={15} height={15} color="currentColor" />,
    },
    {
      href: 'https://www.linkedin.com/in/justin-benjamin1/',
      icon: <LinkedInIcon sx={{ fontSize: 15 }} />,
    },
    {
      href: 'https://t.me/justinbenjamin',
      icon: <TelegramIcon sx={{ fontSize: 15 }} />,
    },
  ],
};

export const Vision: React.FC = () => {
  const { t } = useTranslate();

  return (
    <PageSection id="our-vision" tone="dark">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 3fr) minmax(0, 2fr)' },
          gap: { xs: 5, md: 10 },
          alignItems: 'center',
        }}
      >
        <Box>
          <Eyebrow tone="dark" sx={{ mb: 2 }}>
            {t('Our Founder')}
          </Eyebrow>

          <Typography
            component="h2"
            sx={{
              fontSize: 'clamp(30px, 2.8vw, 40px)',
              fontWeight: 500,
              lineHeight: 1.18,
              letterSpacing: '-0.03em',
              color: '#FFFFFF',
            }}
          >
            <Box component="span" sx={{ display: 'block' }}>
              &ldquo;We&apos;re not building a wallet.
            </Box>
            <Box component="span" sx={{ display: 'block', textWrap: 'balance' }}>
              We&apos;re building <GradientText>the bank account</GradientText> most people wish
              they already had.&rdquo;
            </Box>
          </Typography>

          <Box sx={{ mt: 3 }}>
            <Typography sx={{ fontSize: 18, fontWeight: 500, color: '#FFFFFF' }}>
              {FOUNDER.name}
            </Typography>
            <Typography sx={{ fontSize: 15, color: 'rgba(255,255,255,0.6)' }}>
              {FOUNDER.role}
            </Typography>
          </Box>

          <Stack spacing={2} sx={{ mt: 3, maxWidth: 560 }}>
            {[FOUNDER.bio, FOUNDER.extraBio].map((paragraph) => (
              <Typography
                key={paragraph}
                sx={{ fontSize: 16, lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' }}
              >
                {paragraph}
              </Typography>
            ))}
          </Stack>

          <Box
            sx={{
              mt: 4,
              pt: 3,
              borderTop: HAIRLINE_ON_DARK,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <MetaItem tone="dark" label={FOUNDER.stat.label} value={FOUNDER.stat.value} />

            <Box sx={{ display: 'flex', gap: 1 }}>
              {FOUNDER.socialLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'rgba(255,255,255,0.08)',
                    border: HAIRLINE_ON_DARK,
                    borderRadius: 'var(--radius-md)',
                    color: '#FFFFFF',
                    transition: 'background 150ms ease',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' },
                  }}
                >
                  {link.icon}
                </Link>
              ))}
            </Box>
          </Box>
        </Box>

        <Box
          component="img"
          src={FOUNDER.image}
          alt={FOUNDER.name}
          sx={{
            width: '100%',
            aspectRatio: '4 / 5',
            objectFit: 'cover',
            objectPosition: 'top',
            borderRadius: 'var(--radius-lg)',
            display: 'block',
          }}
        />
      </Box>
    </PageSection>
  );
};

export default Vision;

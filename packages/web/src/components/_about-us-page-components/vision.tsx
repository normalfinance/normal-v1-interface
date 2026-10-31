'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';

import Link from '@mui/material/Link';
import { Box, Typography } from '@mui/material';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import TelegramIcon from '@mui/icons-material/Telegram';

import { HAIRLINE, BLOCK_SX, PageSection, SectionHeader } from '@/components/_common/brand';

type SocialLink = { href: string; icon: React.ReactNode };

type Founder = {
  image: string;
  name: string;
  role: string;
  quote: string;
  bio: string;
  extraBio: string;
  stat: { label: string; value: string };
  socialLinks: SocialLink[];
};

const BRAND_X = 'currentColor';
const BRAND_LI = '#0077B5';
const BRAND_TG = '#0088CC';

const FOUNDER: Founder = {
  image: cdn('about-page/justin.webp'),
  name: 'Justin Benjamin',
  role: 'Founder & CEO',
  quote:
    "We're not building a wallet. We're building the bank account most people wish they already had.",
  bio: 'Justin formerly designed products at Bitcoin of America and CoinFlip — two of the largest crypto ATM and exchange networks in the US. He has invested in crypto for 7+ years and holds a BS in Learning & Organizational Change from Northwestern University.',
  extraBio:
    "He started Normal after realising that DeFi's best yields were locked behind interfaces built for traders, not everyday savers. His goal is simple: take the complexity out of on-chain finance and put real, sustainable yield in the hands of anyone with a phone.",
  stat: { label: 'Years in crypto', value: '7+' },
  socialLinks: [
    {
      href: 'https://x.com/justinbenjaminn',
      icon: <Icon icon="fa6-brands:x-twitter" width={15} height={15} color={BRAND_X} />,
    },
    {
      href: 'https://www.linkedin.com/in/justin-benjamin1/',
      icon: <LinkedInIcon sx={{ fontSize: 15, color: BRAND_LI }} />,
    },
    {
      href: 'https://t.me/justinbenjamin',
      icon: <TelegramIcon sx={{ fontSize: 15, color: BRAND_TG }} />,
    },
  ],
};

export const Vision: React.FC = () => {
  const { t } = useTranslate();

  return (
    <PageSection id="our-vision">
      <SectionHeader
        eyebrow="Our Founder"
        title={t('Our Founder')}
        subtitle={t(
          'The person behind the vision — building the savings account crypto always deserved.'
        )}
      />

      {/* Founder card */}
      <Box
        sx={{
          ...BLOCK_SX,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1.4fr' },
          gap: { xs: '24px', md: '48px' },
          alignItems: 'stretch',
        }}
      >
        {/* Photo */}
        <Box
          component="img"
          src={FOUNDER.image}
          alt={FOUNDER.name}
          sx={{
            width: '100%',
            minHeight: { xs: '260px', md: '440px' },
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top',
            borderRadius: 'var(--radius-md)',
            display: 'block',
          }}
        />

        {/* Content */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '22px', py: { md: '8px' } }}>
          {/* Name + role */}
          <Box>
            <Typography
              sx={{
                fontSize: '32px',
                fontWeight: 500,
                color: '#0A0A0F',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                mb: '6px',
              }}
            >
              {FOUNDER.name}
            </Typography>
            <Typography
              sx={{
                fontSize: '15px',
                color: '#6B6B76',
                fontWeight: 400,
              }}
            >
              {FOUNDER.role}
            </Typography>
          </Box>

          {/* Blockquote */}
          <Box
            component="blockquote"
            sx={{
              m: 0,
              pl: '18px',
              borderLeft: '2px solid #0A0A0F',
            }}
          >
            <Typography
              sx={{
                fontSize: '18px',
                fontWeight: 500,
                color: '#0A0A0F',
                lineHeight: 1.5,
                letterSpacing: '-0.01em',
              }}
            >
              &ldquo;{FOUNDER.quote}&rdquo;
            </Typography>
          </Box>

          {/* Bio */}
          <Typography
            sx={{
              fontSize: '15px',
              color: '#2A2A33',
              lineHeight: 1.65,
            }}
          >
            {FOUNDER.bio}
          </Typography>

          {/* Extra bio */}
          <Typography
            sx={{
              fontSize: '15px',
              color: '#2A2A33',
              lineHeight: 1.65,
            }}
          >
            {FOUNDER.extraBio}
          </Typography>

          {/* Stat + socials row */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              pt: '20px',
              borderTop: HAIRLINE,
              mt: 'auto',
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: '28px',
                  fontWeight: 500,
                  color: '#0A0A0F',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  mb: '4px',
                }}
              >
                {FOUNDER.stat.value}
              </Typography>
              <Typography
                sx={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#6B6B76',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                }}
              >
                {FOUNDER.stat.label}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: '8px' }}>
              {FOUNDER.socialLinks.map((link, idx) => (
                <Link
                  key={idx}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#F4F4F7',
                    borderRadius: 'var(--radius-md)',
                    color: '#0A0A0F',
                    transition: 'bgcolor 120ms ease, color 120ms ease',
                    '&:hover': {
                      bgcolor: '#0A0A0F',
                      color: '#fff',
                      '& svg': { color: '#fff !important' },
                    },
                  }}
                >
                  {link.icon}
                </Link>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </PageSection>
  );
};

export default Vision;

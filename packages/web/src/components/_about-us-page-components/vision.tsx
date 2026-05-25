'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';

import Link from '@mui/material/Link';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import TelegramIcon from '@mui/icons-material/Telegram';
import { Box, Container, Typography } from '@mui/material';

type SocialLink = { href: string; icon: React.ReactNode };

type Founder = {
  image: string;
  name: string;
  role: string;
  quote: string;
  bio: string;
  stats: { label: string; value: string }[];
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
  bio: 'Justin formerly designed products at Bitcoin of America and CoinFlip, has invested in crypto for 7+ years, and holds a BS in Learning & Organizational Change from Northwestern.',
  stats: [
    { label: 'Years in crypto', value: '7+' },
    { label: 'Companies built', value: '3' },
  ],
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
    <Box
      component="section"
      id="our-vision"
      sx={{ bgcolor: '#FAFAFB', py: { xs: '64px', md: '96px' } }}
    >
      <Container maxWidth="xl">
        {/* Header */}
        <Box mb={{ xs: '40px', md: '56px' }}>
          <Typography
            sx={{
              fontSize: '11px',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#6B6B76',
              mb: 1.5,
            }}
          >
            — Our Founders
          </Typography>
          <Typography
            component="h2"
            sx={{
              fontWeight: 500,
              fontSize: 'clamp(32px, 4vw, 52px)',
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              color: '#0A0A0F',
              mb: '16px',
            }}
          >
            {t('Our Founders')}
          </Typography>
          <Typography
            sx={{
              fontSize: '16px',
              color: '#6B6B76',
              lineHeight: 1.55,
              maxWidth: '520px',
            }}
          >
            {t('The people behind the vision — building the savings account crypto always deserved.')}
          </Typography>
        </Box>

        {/* Founder card */}
        <Box
          sx={{
            bgcolor: '#FFFFFF',
            border: '1px solid rgba(10,10,15,0.08)',
            borderRadius: '22px',
            p: { xs: '24px', md: '32px' },
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1.3fr' },
            gap: { xs: '28px', md: '40px' },
            alignItems: 'start',
            boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 8px 32px rgba(10,10,15,0.06)',
          }}
        >
          {/* Photo */}
          <Box
            component="img"
            src={FOUNDER.image}
            alt={FOUNDER.name}
            sx={{
              width: '100%',
              minHeight: { xs: '240px', md: '380px' },
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top',
              borderRadius: '16px',
              display: 'block',
            }}
          />

          {/* Content */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Name + role */}
            <Box>
              <Typography
                sx={{
                  fontSize: '28px',
                  fontWeight: 500,
                  color: '#0A0A0F',
                  letterSpacing: '-0.025em',
                  lineHeight: 1.2,
                  mb: '4px',
                }}
              >
                {FOUNDER.name}
              </Typography>
              <Typography
                sx={{
                  fontSize: '14px',
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
                pl: '16px',
                borderLeft: '3px solid #0A0A0F',
              }}
            >
              <Typography
                sx={{
                  fontSize: '17px',
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
                fontSize: '14.5px',
                color: '#2A2A33',
                lineHeight: 1.6,
              }}
            >
              {FOUNDER.bio}
            </Typography>

            {/* Stats */}
            <Box
              sx={{
                display: 'flex',
                gap: '28px',
                pt: '20px',
                borderTop: '1px solid rgba(10,10,15,0.07)',
              }}
            >
              {FOUNDER.stats.map((stat) => (
                <Box key={stat.label}>
                  <Typography
                    sx={{
                      fontSize: '24px',
                      fontWeight: 600,
                      color: '#0A0A0F',
                      letterSpacing: '-0.03em',
                      lineHeight: 1,
                      mb: '4px',
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#6B6B76',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {stat.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Social icons */}
            <Box sx={{ display: 'flex', gap: '8px' }}>
              {FOUNDER.socialLinks.map((link, idx) => (
                <Link
                  key={idx}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    width: 30,
                    height: 30,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#F4F4F7',
                    borderRadius: '8px',
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
      </Container>
    </Box>
  );
};

export default Vision;

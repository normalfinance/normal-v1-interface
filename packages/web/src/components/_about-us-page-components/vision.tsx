'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';

import Link from '@mui/material/Link';
import { Box, Typography } from '@mui/material';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import TelegramIcon from '@mui/icons-material/Telegram';

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
  extraBio: 'He started Normal after realising that DeFi\'s best yields were locked behind interfaces built for traders, not everyday savers. His goal is simple: take the complexity out of on-chain finance and put real, sustainable yield in the hands of anyone with a phone.',
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
    <Box
      component="section"
      id="our-vision"
      sx={{ bgcolor: '#FAFAFB', py: { xs: '40px', md: '56px' } }}
    >
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
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
            — Our Founder
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
            {t('Our Founder')}
          </Typography>
          <Typography
            sx={{
              fontSize: '16px',
              color: '#6B6B76',
              lineHeight: 1.55,
              maxWidth: '520px',
            }}
          >
            {t('The person behind the vision — building the savings account crypto always deserved.')}
          </Typography>
        </Box>

        {/* Founder card */}
        <Box
          sx={{
            bgcolor: '#FFFFFF',
            border: '1px solid rgba(10,10,15,0.08)',
            borderRadius: '22px',
            p: { xs: '20px', md: '28px' },
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1.4fr' },
            gap: { xs: '24px', md: '48px' },
            alignItems: 'stretch',
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
              minHeight: { xs: '260px', md: '440px' },
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top',
              borderRadius: '14px',
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
                borderLeft: '3px solid #0A0A0F',
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
                borderTop: '1px solid rgba(10,10,15,0.07)',
                mt: 'auto',
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: '28px',
                    fontWeight: 600,
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
                    letterSpacing: '0.08em',
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
        </Box>
      </Box>
    </Box>
  );
};

export default Vision;

'use client';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { RouterLink } from '@/routes/components';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { Logo } from '@/components/template/logo';
import { Iconify } from '@/components/template/iconify';

// ----------------------------------------------------------------------

export const _socials = [
  {
    value: 'twitter',
    label: 'X (Twitter)',
    path: paths.socials.twitter,
    icon: <Iconify width={18} icon="bxl:twitter" />,
  },
  {
    value: 'discord',
    label: 'Discord',
    path: paths.socials.discord,
    icon: <Iconify width={18} icon="bxl:discord-alt" />,
  },
  {
    value: 'github',
    label: 'GitHub',
    path: paths.socials.github,
    icon: <Iconify width={18} icon="bxl:github" />,
  },
  {
    value: 'telegram',
    label: 'Telegram',
    path: paths.socials.telegram,
    icon: <Iconify width={18} icon="bxl:telegram" />,
  },
];

const LINK_COLUMNS = [
  {
    title: 'App',
    links: [
      { label: 'Savings', href: paths.savings },
      { label: 'Swap', href: paths.swap },
      { label: 'Portfolio', href: paths.portfolio },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: paths.core.about },
      { label: 'Blog', href: paths.blog, target: '_blank' },
      { label: 'Roadmap', href: paths.core.roadmap },
      { label: 'Brand assets', href: 'https://brandfetch.com/normalfinance.io', target: '_blank' },
    ],
  },
  {
    title: 'Protocol',
    links: [
      { label: 'Developers', href: paths.docs, target: '_blank' },
      {
        label: 'Whitepaper',
        href: 'https://normalfi.substack.com/p/making-crypto-normal-simple-safe',
        target: '_blank',
      },
    ],
  },
  {
    title: 'Need help?',
    links: [
      { label: 'Contact us', href: paths.core.contact },
      { label: 'Report bugs', href: paths.socials.discord, target: '_blank' },
      { label: 'Terms of Service', href: paths.legal.tos },
      { label: 'Privacy Policy', href: paths.legal.pp },
      { label: 'Disclaimer', href: paths.legal.disclaimer },
    ],
  },
];

// ----------------------------------------------------------------------

export type FooterProps = { sx?: object };

export function FooterSection({ sx }: FooterProps = {}) {
  const { t } = useTranslate();

  return (
    <Box
      component="footer"
      sx={[
        {
          bgcolor: '#0c0c0e',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background:
              'linear-gradient(90deg, transparent 0%, #00aff7 25%, #6E4BFF 55%, #f8279c 80%, transparent 100%)',
          },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <Box
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          px: '24px',
          pt: '80px',
          pb: '48px',
        }}
      >
        {/* Main grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr auto auto auto auto' },
            columnGap: '80px',
            rowGap: '32px',
          }}
        >
          {/* Brand column */}
          <Box>
            <Logo isSingle={false} />

            <Typography
              sx={{
                mt: '14px',
                fontSize: 14,
                color: '#8a8a93',
                maxWidth: '30ch',
                lineHeight: 1.6,
              }}
            >
              {t('Crypto that feels like home.')}
            </Typography>

            <Stack direction="row" spacing={0.5} sx={{ mt: 3 }}>
              {_socials.map((social) => (
                <IconButton
                  key={social.value}
                  href={social.path}
                  target="_blank"
                  rel="noreferrer noopener"
                  sx={{
                    width: 32,
                    height: 32,
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '50%',
                    color: '#cfcfd6',
                    p: 0,
                    '&:hover': {
                      color: '#fff',
                      borderColor: 'rgba(255,255,255,0.3)',
                      bgcolor: 'rgba(255,255,255,0.06)',
                    },
                  }}
                >
                  {social.icon}
                </IconButton>
              ))}
            </Stack>
          </Box>

          {/* Link columns */}
          {LINK_COLUMNS.map((col) => (
            <Box key={col.title}>
              <Typography
                component="h4"
                sx={{
                  fontFamily: 'Satoshi, sans-serif',
                  fontSize: 11,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#8a8a93',
                  mb: '14px',
                  mt: 0,
                }}
              >
                {col.title}
              </Typography>

              <Stack component="ul" sx={{ listStyle: 'none', m: 0, p: 0, gap: 0 }}>
                {col.links.map((link) => (
                  <Box component="li" key={link.label}>
                    <Link
                      component={RouterLink}
                      href={link.href}
                      target={link.target}
                      rel={link.target === '_blank' ? 'noopener noreferrer' : undefined}
                      sx={{
                        display: 'block',
                        fontSize: 14,
                        color: '#cfcfd6',
                        py: '5px',
                        textDecoration: 'none',
                        '&:hover': { color: '#fff' },
                      }}
                    >
                      {link.label}
                    </Link>
                  </Box>
                ))}
              </Stack>
            </Box>
          ))}
        </Box>

        {/* Bottom bar */}
        <Box
          sx={{
            mt: '64px',
            pt: '28px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          {}
          <Typography sx={{ fontSize: 13, color: '#8a8a93' }}>
            © 2026 Normal Finance Inc.
          </Typography>

          <Typography sx={{ fontSize: 13, color: '#8a8a93' }}>
            {t('Built on Stellar · Audited by Halborn')}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

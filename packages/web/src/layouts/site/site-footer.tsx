'use client';

import { RouterLink } from '@/routes/components';
import { FIXED, FOOTER_BG, HAIRLINE_COLOR } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Logo } from '@/components/template/logo';
import { Iconify } from '@/components/template/iconify';
import { FrameLines } from '@/components/_common/frame-lines';
import { Eyebrow, COLUMN_SX, GUTTER_SX, HAIRLINE_ON_DARK } from '@/components/_common/brand';

import { LEGAL_LINKS, SOCIAL_LINKS, FOOTER_COLUMNS } from './site-nav';

import type { SiteLink } from './site-nav';

// ----------------------------------------------------------------------

const COMPANY = 'Normal Finance Inc.';
// The address published in the Terms of Service and stellar.toml.
const ADDRESS = '254 Chapman Rd, Ste 208 #7553, Newark, DE 19702, United States';

// The footer is dark in both modes, so its words are fixed light colours.
const DIM = 'rgba(255,255,255,0.62)';
const BRIGHT = 'rgba(255,255,255,0.9)';

function FooterLink({ link }: { link: SiteLink }) {
  const sx = { fontSize: 15, color: BRIGHT, '&:hover': { color: FIXED.white } };

  return link.external ? (
    <Link href={link.href} target="_blank" rel="noopener noreferrer" underline="none" sx={sx}>
      {link.label}
    </Link>
  ) : (
    <Link component={RouterLink} href={link.href} underline="none" sx={sx}>
      {link.label}
    </Link>
  );
}

/**
 * The one dark surface on the site, plain ink in both modes: link columns, the
 * plain-words disclosure and the legal line. In dark mode it is a shade darker
 * than the page, under a hairline. The disclosure matters more the more the
 * product looks like a bank app.
 */
export function SiteFooter() {
  return (
    <Box
      component="footer"
      sx={{
        position: 'relative',
        color: DIM,
        bgcolor: FOOTER_BG,
        borderTop: `1px solid ${HAIRLINE_COLOR}`,
      }}
    >
      <FrameLines tone="dark" />
      <Box sx={{ ...COLUMN_SX, ...GUTTER_SX }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: '1.4fr repeat(3, 1fr)' },
            gap: { xs: 5, md: 4 },
            py: { xs: 7, md: 10 },
          }}
        >
          <Box>
            <Logo sx={{ width: 32, height: 32 }} />
            <Typography sx={{ mt: 2.5, maxWidth: 280, fontSize: 14, lineHeight: 1.6 }}>
              Crypto for everyday people. Only the good stuff, in plain English.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 3 }}>
              {SOCIAL_LINKS.map((social) => (
                <IconButton
                  key={social.label}
                  component="a"
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  sx={{
                    width: 40,
                    height: 40,
                    color: FIXED.white,
                    bgcolor: 'rgba(255,255,255,0.08)',
                    borderRadius: 'var(--radius-site)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' },
                  }}
                >
                  <Iconify width={20} icon={social.icon} />
                </IconButton>
              ))}
            </Box>
          </Box>

          {FOOTER_COLUMNS.map((column) => (
            <Box key={column.title} component="nav" aria-label={column.title}>
              <Eyebrow tone="dark" sx={{ mb: 2 }}>
                {column.title}
              </Eyebrow>
              <Box component="ul" sx={{ display: 'grid', gap: 1.5 }}>
                {column.links.map((link) => (
                  <li key={link.label}>
                    <FooterLink link={link} />
                  </li>
                ))}
              </Box>
            </Box>
          ))}
        </Box>

        <Box sx={{ display: 'grid', gap: 1, py: 3, borderTop: HAIRLINE_ON_DARK }}>
          <Typography sx={{ maxWidth: 820, fontSize: 13, lineHeight: 1.6 }}>
            Normal is a self-custody crypto app, not a bank. Crypto is not covered by FDIC insurance
            and its value can go down. Savings yield is variable and never guaranteed. Buying,
            selling and identity checks are provided by our licensed partners.
          </Typography>
          <Typography sx={{ fontSize: 13, lineHeight: 1.6 }}>
            {COMPANY}, {ADDRESS}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: { xs: 2, md: 3 },
            py: 3,
            borderTop: HAIRLINE_ON_DARK,
          }}
        >
          <Typography sx={{ fontSize: 14 }}>
            © {new Date().getFullYear()} {COMPANY}
          </Typography>
          <Box
            component="nav"
            aria-label="Legal"
            sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}
          >
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.label}
                component={RouterLink}
                href={link.href}
                underline="hover"
                sx={{ fontSize: 14, color: BRIGHT }}
              >
                {link.label}
              </Link>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

import type { Breakpoint } from '@mui/material/styles';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { RouterLink } from '@/routes/components';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid2';
import Divider from '@mui/material/Divider';
import { styled } from '@mui/material/styles';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Logo } from '@/components/template/logo';
import { Iconify } from '@/components/template/iconify';

// ----------------------------------------------------------------------

const LINKS = [
  {
    headline: 'App',
    children: [
      { name: 'Assets', href: paths.assets },
    ],
  },
  {
    headline: 'Company',
    children: [
      { name: 'About', href: paths.core.about },
      { name: 'Blog', href: paths.blog },
      { name: 'Roadmap', href: paths.core.roadmap },
      { name: 'Brand assets', href: 'https://brandfetch.com/normalfinance.io' },
    ],
  },
  {
    headline: 'Protocol',
    children: [
      { name: 'Developers', href: paths.docs },
      { name: 'Whitepaper', href: paths.help.contractTracker },
    ],
  },
  {
    headline: 'Need help?',
    children: [
      { name: 'Contact us', href: paths.core.contact },
      { name: 'Report bugs', href: paths.help.feedbackForm },
      { name: 'Terms of Service', href: paths.legal.tos },
      { name: 'Privacy Policy', href: paths.legal.pp },
    ],
  },
];

// ----------------------------------------------------------------------

export const _socials = [
  {
    value: 'twitter',
    label: 'Twitter',
    path: paths.socials.twitter,
    icon: <Iconify width={28} icon="bxl:twitter" />,
  },
  {
    value: 'discord',
    label: 'Discord',
    path: paths.socials.discord,
    icon: <Iconify width={28} icon="bxl:discord-alt" />,
  },
  {
    value: 'telegram',
    label: 'Telegram',
    path: paths.socials.telegram,
    icon: <Iconify width={28} icon="bxl:telegram" />,
  },
  {
    value: 'github',
    label: 'Github',
    path: paths.socials.github,
    icon: <Iconify width={28} icon="bxl:github" />,
  },
  {
    value: 'tiktok',
    label: 'TikTok',
    path: paths.socials.tiktok,
    icon: <Iconify width={28} icon="bxl:tiktok" />,
  },
  {
    value: 'instagram',
    label: 'Instagram',
    path: paths.socials.instagram,
    icon: <Iconify width={28} icon="bxl:instagram" />,
  },
];

const FooterRoot = styled('footer')(({ theme }) => ({
  position: 'relative',
  backgroundColor: theme.vars.palette.background.default,
}));

export type FooterProps = React.ComponentProps<typeof FooterRoot>;

export function FooterSection({
  sx,
  layoutQuery = 'md',
  ...other
}: FooterProps & { layoutQuery?: Breakpoint }) {
  const { t } = useTranslate();

  return (
    <FooterRoot
      sx={[{ bgcolor: 'background.paper' }, ...(Array.isArray(sx) ? sx : [sx || {}])]}
      {...other}
    >
      <Divider />

      <Container
        sx={(theme) => ({
          pb: 5,
          pt: 10,
          textAlign: 'center',
          [theme.breakpoints.up(layoutQuery)]: { textAlign: 'unset' },
        })}
      >
        <Logo isSingle={false} />

        <Grid
          container
          sx={[
            (theme) => ({
              mt: 3,
              justifyContent: 'center',
              [theme.breakpoints.up(layoutQuery)]: { justifyContent: 'space-between' },
            }),
          ]}
        >
          <Grid size={{ xs: 12, [layoutQuery]: 3 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={(theme) => ({
                mx: 'auto',
                maxWidth: 280,
                [theme.breakpoints.up(layoutQuery)]: { mx: 'unset' },
              })}
            >
              {t(
                'A universal investing app - Trade and diversify any global asset in just one click.'
              )}
            </Typography>

            <Box
              sx={(theme) => ({
                mt: 3,
                mb: 5,
                display: 'flex',
                justifyContent: 'center',
                [theme.breakpoints.up(layoutQuery)]: { mb: 0, justifyContent: 'flex-start' },
              })}
            >
              {_socials.map((social) => (
                <IconButton
                  key={social.label}
                  href={social.path}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {social.icon}
                </IconButton>
              ))}
            </Box>
          </Grid>

          <Grid size={{ xs: 12, [layoutQuery]: 6 }}>
            <Box
              sx={(theme) => ({
                gap: 5,
                display: 'flex',
                flexDirection: 'column',
                [theme.breakpoints.up(layoutQuery)]: { flexDirection: 'row' },
              })}
            >
              {LINKS.map((list) => (
                <Box
                  key={list.headline}
                  sx={(theme) => ({
                    gap: 2,
                    width: 1,
                    display: 'flex',
                    alignItems: 'center',
                    flexDirection: 'column',
                    [theme.breakpoints.up(layoutQuery)]: { alignItems: 'flex-start' },
                  })}
                >
                  <Typography component="div" variant="overline" color="text.primary">
                    {t(list.headline)}
                  </Typography>

                  {list.children.map((link) => (
                    <Link
                      key={link.name}
                      component={RouterLink}
                      href={link.href as string}
                      color="text.secondary"
                      variant="body2"
                    >
                      {t(link.name)}
                    </Link>
                  ))}
                </Box>
              ))}
            </Box>
          </Grid>
        </Grid>

        {/* eslint-disable-next-line i18next/no-literal-string */}
        <Typography variant="body2" sx={{ mt: 10 }} color="text.primary">
          © 2026 - Normal Finance, Inc.
        </Typography>
      </Container>
    </FooterRoot>
  );
}

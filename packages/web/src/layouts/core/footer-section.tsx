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
      { name: 'Trade', href: paths.swap },
      { name: 'Explore', href: paths.explore },
      { name: 'Pool', href: paths.positions.root },
    ],
  },
  {
    headline: 'Company',
    children: [
      { name: 'About', href: paths.core.about },
      { name: 'Blog', href: paths.blog },
      { name: 'Brand assets', href: 'https://brandfetch.com/normalfinance.io' },
    ],
  },
  {
    headline: 'Protocol',
    children: [
      { name: 'Governance', href: paths.socials.discord },
      { name: 'Developers', href: paths.docs },
    ],
  },
  {
    headline: 'Need help?',
    children: [{ name: 'Contact us', href: paths.core.contact }],
  },
];

// ----------------------------------------------------------------------

export const _socials = [
  {
    value: 'twitter',
    label: 'Twitter',
    path: paths.socials.twitter,
    icon: <Iconify width={32} icon="carbon:logo-x" />,
  },
  {
    value: 'discord',
    label: 'Discord',
    path: paths.socials.discord,
    icon: <Iconify width={32} icon="bxl:discord-alt" />,
  },
  {
    value: 'github',
    label: 'Github',
    path: paths.socials.github,
    icon: <Iconify width={32} icon="bxl:github" />,
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
    <FooterRoot sx={sx} {...other}>
      <Divider />

      <Container
        sx={(theme) => ({
          pb: 5,
          pt: 10,
          textAlign: 'center',
          [theme.breakpoints.up(layoutQuery)]: { textAlign: 'unset' },
        })}
      >
        <Logo />

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
              sx={(theme) => ({
                mx: 'auto',
                maxWidth: 280,
                [theme.breakpoints.up(layoutQuery)]: { mx: 'unset' },
              })}
            >
              {t(
                'Crypto indexes & synthetic assets - Invest in top 100 cryptocurrencies in just one click.'
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
                <IconButton key={social.label}>{social.icon}</IconButton>
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
                  <Typography component="div" variant="overline">
                    {t(list.headline)}
                  </Typography>

                  {list.children.map((link) => (
                    <Link
                      key={link.name}
                      component={RouterLink}
                      href={link.href}
                      color="inherit"
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
        <Typography variant="body2" sx={{ mt: 10 }}>
          © 2025 - Normal Finance, Inc.
        </Typography>
      </Container>
    </FooterRoot>
  );
}

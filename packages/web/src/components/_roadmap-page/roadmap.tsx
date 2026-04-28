'use client';

import type { ButtonProps } from '@mui/material/Button';
import type { Theme, SxProps } from '@mui/material/styles';

import * as React from 'react';
import { useTranslate } from '@/locales';

import Box from '@mui/material/Box';
import Grid2 from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

export type FeatureItem = {
  title: string;
  description: string;
  date: string;
  completed: boolean;
  link?: string;
};

type Props = {
  heading: string;
  description: string;
  buttons: (ButtonProps & { title: string })[];
  items: FeatureItem[];
  sx?: SxProps<Theme>;
};

export type RoadmapProps = React.ComponentPropsWithoutRef<'section'> & Partial<Props>;

export const Roadmap: React.FC<RoadmapProps> = (props) => {
  const { t } = useTranslate();
  const { heading, description, buttons, items, sx, ...sectionProps } = {
    ...RoadmapDefaults,
    ...props,
  };

  return (
    <Box
      component="section"
      sx={{
        px: '5%',
        py: { xs: 6, md: 12, lg: 14 },
        bgcolor: 'grey.100',
        ...sx,
      }}
      {...sectionProps}
    >
      <Container disableGutters>
        <Grid2 container spacing={{ xs: 6, md: 8 }}>
          <Grid2
            size={{ xs: 12, md: 6 }}
            sx={{
              alignSelf: { md: 'stretch' },
            }}
          >
            <Box
              sx={{
                position: { xs: 'static', md: 'sticky' },
                top: { md: '20%' },
              }}
            >
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 600,
                  lineHeight: 1.05,
                  mb: { xs: 2, md: 3 },
                }}
              >
                {t(heading)}
              </Typography>

              <Typography variant="body1">{t(description)}</Typography>

              <Stack direction="row" spacing={2} sx={{ mt: { xs: 3, md: 4 }, flexWrap: 'wrap' }}>
                {buttons.map((button, i) => (
                  <Button key={i} {...button}>
                    {t(button.title)}
                  </Button>
                ))}
              </Stack>
            </Box>
          </Grid2>

          <Grid2 size={{ xs: 12, md: 6 }}>
            {items.map((item, index) => {
              const statusLabel = t(item.completed ? 'Complete' : 'Incomplete');
              const status = item.completed
                ? { bg: '#ECFDF3', fg: '#065F46', label: statusLabel }
                : { bg: '#FEE2E2', fg: '#991B1B', label: statusLabel };

              return (
                <Box
                  key={index}
                  sx={{
                    position: { xs: 'static', md: 'sticky' },
                    top: { md: `${20 + index * 1}%` },
                    mb: 4,
                    border: 1,
                    borderRadius: 3,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    p: 4,
                  }}
                >
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      px: 1.25,
                      py: 0.5,
                      borderRadius: 1.5,
                      fontSize: 12,
                      fontWeight: 500,
                      letterSpacing: 0.2,
                      mb: 1.5,
                      backgroundColor: status.bg,
                      color: status.fg,
                      width: 'fit-content',
                    }}
                  >
                    {status.label}
                  </Box>

                  <Typography variant="h5" sx={{ fontWeight: 500, mb: 1 }}>
                    {t(item.title)}
                  </Typography>

                  <Typography variant="body2" sx={{ mb: 2, opacity: 0.85 }}>
                    {item.date}
                  </Typography>

                  <Typography variant="body1" sx={{ mb: item.link ? 2 : 0 }}>
                    {t(item.description)}
                  </Typography>

                  {item.link ? (
                    <Button
                      variant="text"
                      size="small"
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      endIcon={<ChevronRightIcon />}
                      sx={{ mt: 1 }}
                    >
                      {t('Learn more')}
                    </Button>
                  ) : null}
                </Box>
              );
            })}
          </Grid2>
        </Grid2>
      </Container>
    </Box>
  );
};

export const RoadmapDefaults: Props = {
  heading: 'Where we’re headed next',
  description:
    'A quick look at what we’re building. Scroll to explore upcoming milestones and how they improve your experience.',
  buttons: [
    { title: 'Contact us', variant: 'text', endIcon: <ChevronRightIcon />, href: '/contact' },
  ],
  items: [
    {
      title: 'Launched our first Normal crypto indexes',
      description: 'We introduced our initial set of Normal index products to the public.',
      date: 'November 2023',
      completed: true,
    },
    {
      title: 'Hit $100k index AUM',
      description: 'Milestone AUM reached across Normal index products.',
      date: 'June 2024',
      completed: true,
      link: 'https://x.com/normalfi/status/1798371781062881565',
    },
    {
      title: 'Started building Stellar on-chain index funds at DraperU x Stellar hacker house',
      description: 'Kicked off our Stellar initiative at the hacker house.',
      date: 'August 2024',
      completed: true,
    },
    {
      title: 'Hit $300k index AUM',
      description: 'New AUM milestone for Normal indexes.',
      date: 'December 2024',
      completed: true,
      link: 'https://x.com/normalfi/status/1866575453403689385',
    },
    {
      title: 'Officially partnered with Stellar via the Stellar Community Fund',
      description: 'Partnering to build synthetic assets and index funds on Stellar.',
      date: 'January 2025',
      completed: true,
    },
    {
      title: 'Launch USDC Savings MVP',
      description: "Deposit USDC and earn real yield automatically. Normal's first live product on Stellar mainnet.",
      date: 'April 2026',
      completed: true,
    },
    {
      title: 'Bitcoin and Top Cryptocurrency Support',
      description: 'Buy, hold, and manage Bitcoin and the top cryptocurrencies - fully noncustodial, fully yours.',
      date: 'TBD',
      completed: false,
    },
    {
      title: 'Real World Assets',
      description: 'Invest in Gold, Silver, the S&P 500, ETFs, commodities, and other securities - all in one place.',
      date: 'TBD',
      completed: false,
    },
    {
      title: 'Normal Mobile App',
      description: 'Normal in your pocket. A native iOS and Android app bringing the full Normal experience to mobile.',
      date: 'TBD',
      completed: false,
    },
    {
      title: 'Normal Crypto Indexes',
      description: 'Build and invest in custom crypto indexes tailored to your strategy.',
      date: 'TBD',
      completed: false,
    },
    {
      title: 'Normal Credit Card',
      description: 'Spend your earnings in the real world with a Normal credit card.',
      date: 'TBD',
      completed: false,
    },
    {
      title: 'Normal Hardware Wallet',
      description: "Bank-grade security for your assets. Normal's own hardware wallet, built for everyday people.",
      date: 'TBD',
      completed: false,
    },
    {
      title: 'Expand Our DeFi Yield',
      description: 'More protocols, more strategies, more ways to put your money to work.',
      date: 'TBD',
      completed: false,
    },
  ],
};

Roadmap.displayName = 'Roadmap';

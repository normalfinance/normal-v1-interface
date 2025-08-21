'use client';

import * as React from 'react';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ButtonProps } from '@mui/material/Button';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid2 from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

export type FeatureItem = {
  title: string;
  description: string;
  date: string;
  completed: boolean;
  link?: string;
};

type Props = {
  tagline: string;
  heading: string;
  description: string;
  buttons: (ButtonProps & { title: string })[];
  items: FeatureItem[];
  sx?: SxProps<Theme>;
};

export type RoadmapProps = React.ComponentPropsWithoutRef<'section'> & Partial<Props>;

export const Roadmap: React.FC<RoadmapProps> = (props) => {
  const { tagline, heading, description, buttons, items, sx, ...sectionProps } = {
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
          {/* Left */}
          <Grid2
            size={{ xs: 12, md: 6 }}
            sx={{
              alignSelf: { md: 'stretch' },
            }}
          >
            <Box
              sx={{
                position: { xs: 'static', md: 'sticky' },
                top: { md: '10%' },
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: { xs: 1, md: 1.5 }, fontWeight: 600 }}>
                {tagline}
              </Typography>

              <Typography
                variant="h2"
                sx={{
                  fontWeight: 800,
                  lineHeight: 1.05,
                  mb: { xs: 2, md: 3 },
                }}
              >
                {heading}
              </Typography>

              <Typography variant="body1">{description}</Typography>

              <Stack direction="row" spacing={2} sx={{ mt: { xs: 3, md: 4 }, flexWrap: 'wrap' }}>
                {buttons.map((button, i) => (
                  <Button key={i} {...button}>
                    {button.title}
                  </Button>
                ))}
              </Stack>
            </Box>
          </Grid2>

          {/* Right */}
          <Grid2 size={{ xs: 12, md: 6 }}>
            {items.map((item, index) => {
              const status = item.completed
                ? { bg: '#ECFDF3', fg: '#065F46', label: 'Complete' }
                : { bg: '#FEE2E2', fg: '#991B1B', label: 'Incomplete' };

              return (
                <Box
                  key={index}
                  sx={{
                    position: { xs: 'static', md: 'sticky' },
                    top: { md: `${10 + index * 1}%` },
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
                      fontWeight: 700,
                      letterSpacing: 0.2,
                      mb: 1.5,
                      backgroundColor: status.bg,
                      color: status.fg,
                      width: 'fit-content',
                    }}
                  >
                    {status.label}
                  </Box>

                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                    {item.title}
                  </Typography>

                  <Typography variant="body2" sx={{ mb: 2, opacity: 0.85 }}>
                    {item.date}
                  </Typography>

                  <Typography variant="body1" sx={{ mb: item.link ? 2 : 0 }}>
                    {item.description}
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
                      Learn more
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
  tagline: 'Roadmap',
  heading: 'Where we’re headed next',
  description:
    'A quick look at what we’re building. Scroll to explore upcoming milestones and how they improve your experience.',
  buttons: [
    { title: 'Learn more', variant: 'contained', color: 'primary' },
    { title: 'Contact us', variant: 'text', endIcon: <ChevronRightIcon /> },
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
      title: 'Released synthetic assets on Stellar testnet',
      description: 'Public testnet release for synthetic assets on Stellar.',
      date: 'August 2025',
      completed: true,
    },
    {
      title: 'Release synthetic assets on Stellar mainnet',
      description: 'Mainnet launch of synthetic assets on Stellar.',
      date: 'September 2025',
      completed: false,
    },
    {
      title: 'Release index funds on Stellar testnet',
      description: 'Testnet release of Normal index funds on Stellar.',
      date: 'September 2025',
      completed: false,
    },
    {
      title: 'Release index funds on Stellar mainnet',
      description: 'Mainnet release of Normal index funds on Stellar.',
      date: 'October 2025',
      completed: false,
    },
    {
      title: 'Launch Normal Liquidity Provider incentive program',
      description: 'Incentives to deepen liquidity and improve market quality.',
      date: 'TBD',
      completed: false,
    },
  ],
};

Roadmap.displayName = 'Roadmap';

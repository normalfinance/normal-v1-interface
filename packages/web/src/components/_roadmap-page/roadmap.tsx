'use client';

import * as React from 'react';
import { useRef } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ButtonProps } from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import { Box, Button, Container, Stack, Typography, Card, CardContent } from '@mui/material';
import { m, useScroll, useTransform } from 'framer-motion';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

type ImageProps = { src: string; alt?: string };
type FeatureItem = {
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
  const { tagline, heading, description, buttons, items, sx } = { ...RoadmapDefaults, ...props };
  const theme = useTheme();

  // Refs for sticky container (stage) and scroll track
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Use scroll progress relative to the trackRef (from its start to end)
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  });

  // Each feature card gets an equal slice of the scroll progress (except the last card remains static at the end)
  const totalItems = Math.max(items.length, 1);
  const slice = 1 / totalItems; // Note: last item will not use the full slice for transform

  return (
    <Box component="section" sx={{ px: '5%', py: { xs: 6, md: 12 }, bgcolor: 'grey.100', ...sx }}>
      <Container disableGutters maxWidth="lg">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: { xs: 4, md: 6 },
            alignItems: { md: 'start' },
          }}
        >
          {/* Left Column: Text Content (sticky on desktop) */}
          <Box
            sx={{
              position: { md: 'sticky' },
              top: { md: 0 },
              alignSelf: 'start',
              height: { md: '100vh' },
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Stack spacing={2}>
              <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1 }}>
                {tagline}
              </Typography>
              <Typography variant="h2" sx={{ fontWeight: 800, lineHeight: 1.05 }}>
                {heading}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {description}
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: 'wrap' }}>
                {buttons.map((button, i) => (
                  <Button key={i} {...button}>
                    {button.title}
                  </Button>
                ))}
              </Stack>
            </Stack>
          </Box>

          {/* Right Column: Feature Cards (sticky stage + scroll track) */}
          <Box sx={{ position: 'relative' }}>
            {/* Sticky Stage: holds the feature cards (overlapping) */}
            <Box
              ref={stageRef}
              sx={{
                position: 'sticky',
                top: { xs: '25%', md: 0 },
                height: { xs: '25vh', md: '100vh' },
                minHeight: { xs: '24.5rem', md: 'auto' },
                overflow: 'visible',
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {items.map((item, index) => (
                  <FeatureCard
                    key={index}
                    item={item}
                    index={index}
                    total={items.length}
                    progress={scrollYProgress}
                    slice={slice}
                  />
                ))}
              </Box>
            </Box>

            {/* Scroll Track: invisible extra space to drive scroll animations */}
            <Box
              ref={trackRef}
              sx={{
                // Height = (total items - 1) * 100vh (using safe viewport unit on mobile for consistency)
                height: {
                  xs: `calc(${items.length - 1} * 100svh)`,
                  md: `calc(${items.length - 1} * 100vh)`,
                },
              }}
            />
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

function FeatureCard({
  item,
  index,
  total,
  progress,
  slice,
}: {
  item: FeatureItem;
  index: number;
  total: number;
  progress: ReturnType<typeof useScroll>['scrollYProgress'];
  slice: number;
}) {
  // Define the animation range for this card
  const start = index * slice;
  const end = (index + 1) * slice;

  // Framer Motion transforms for the card based on scroll progress
  const rotate = useTransform(progress, [start, end], [index * 3, -30]);
  const translateY = useTransform(progress, [start, end], ['0vh', '-100vh']);
  const translateX = useTransform(progress, [start, end], ['0vw', '-10vw']);

  // Status pill colors
  const status = item.completed
    ? { bg: '#ECFDF3', fg: '#065F46', label: 'Complete' }
    : { bg: '#FEE2E2', fg: '#991B1B', label: 'Incomplete' };

  return (
    <Box
      component={m.div}
      sx={{
        position: 'absolute',
        left: { xs: 0, md: 24 },
        right: { xs: 0, md: 'auto' },
        mx: { xs: 2, md: 0 },
      }}
      style={{
        rotate: index === total ? '9deg' : (rotate as unknown as string),
        translateY: index === total ? undefined : (translateY as unknown as string),
        translateX: index === total ? undefined : (translateX as unknown as string),
        zIndex: total - index,
      }}
    >
      <Card
        variant="outlined"
        sx={{
          borderRadius: 2,
          minWidth: { xs: 'auto', md: 420 },
          maxWidth: { xs: 'auto', md: 520 },
          boxShadow: 'none',
          backgroundColor: 'background.paper',
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
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

          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            {item.title}
          </Typography>

          <Typography variant="body2" sx={{ mb: 2, opacity: 0.85 }}>
            {item.date}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

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

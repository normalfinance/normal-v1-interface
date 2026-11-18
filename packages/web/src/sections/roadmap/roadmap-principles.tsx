'use client';

import type { ReactNode } from 'react';
import type { BrandHue } from '@/theme/brand-colors';

import { TYPE } from '@/theme/type-scale';
import { BRAND_COLORS } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import TouchAppOutlined from '@mui/icons-material/TouchAppOutlined';
import ExtensionOutlined from '@mui/icons-material/ExtensionOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';

import { IconTile } from '@/components/_common/icon-tile';
import {
  HAIRLINE,
  GUTTER_SX,
  MONO_FONT,
  PageSection,
  GRID_FRAME_SX,
  SectionHeader,
} from '@/components/_common/brand';

// ----------------------------------------------------------------------

type Principle = {
  n: string;
  hue: BrandHue;
  icon: ReactNode;
  title: string;
  description: string;
};

// Each on its own wash, in the logo's order: light blue, purple, magenta, coral.
const PRINCIPLES: Principle[] = [
  {
    n: '01',
    hue: 'sky',
    icon: <TouchAppOutlined />,
    title: 'Simplicity first',
    description: 'Deposit in minutes. Earn automatically. No strategy required.',
  },
  {
    n: '02',
    hue: 'violet',
    icon: <VisibilityOutlined />,
    title: 'Transparency & sovereignty',
    description:
      'Your funds are yours at all times. Every rate, balance and transaction is verifiable on-chain.',
  },
  {
    n: '03',
    hue: 'magenta',
    icon: <ExtensionOutlined />,
    title: 'Composability & reach',
    description:
      'Built on Stellar and designed to plug into the broader DeFi stack, with real assets coming soon.',
  },
  {
    n: '04',
    hue: 'coral',
    icon: <GroupsOutlined />,
    title: 'Community-led evolution',
    description:
      'We build in public. Our roadmap is open, our decisions are explained, your feedback shapes what gets built.',
  },
];

/**
 * Four principles as one row of cells across the column: two on tablets, one
 * on phones. The cells share their hairlines and use the frame lines as sides.
 * Each takes its own wash, every word and its icon in the wash's deep shade: at
 * the owner's request, like Contact's channels and About's values.
 */
export function RoadmapPrinciples() {
  return (
    <PageSection divider hatchFoot aria-labelledby="principles-title">
      <SectionHeader
        id="principles-title"
        eyebrow="How we build"
        title="Four principles, no shortcuts."
        subtitle="They guide every milestone on this page, and every line of code we ship."
      />

      <Box
        component="ol"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          m: 0,
          p: 0,
          listStyle: 'none',
          ...GRID_FRAME_SX,
        }}
      >
        {PRINCIPLES.map((item, index) => (
          <Box
            component="li"
            key={item.n}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              ...GUTTER_SX,
              pt: { xs: 3, md: 4 },
              pb: { xs: 4, md: 5 },
              color: BRAND_COLORS[item.hue].deep,
              bgcolor: BRAND_COLORS[item.hue].tint,
              borderTop: {
                xs: index > 0 ? HAIRLINE : 'none',
                sm: index > 1 ? HAIRLINE : 'none',
                md: 'none',
              },
              borderLeft: {
                xs: 'none',
                sm: index % 2 === 1 ? HAIRLINE : 'none',
                md: index > 0 ? HAIRLINE : 'none',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <IconTile tone="wash">{item.icon}</IconTile>
              <Typography sx={{ ...TYPE.small, fontFamily: MONO_FONT, color: 'inherit' }}>
                {item.n}
              </Typography>
            </Box>
            <Typography
              component="h3"
              sx={{ ...TYPE.h4, mt: { xs: 2, sm: 4, md: 8 }, color: 'inherit' }}
            >
              {item.title}
            </Typography>
            <Typography sx={{ ...TYPE.small, mt: 1, color: 'inherit' }}>
              {item.description}
            </Typography>
          </Box>
        ))}
      </Box>
    </PageSection>
  );
}

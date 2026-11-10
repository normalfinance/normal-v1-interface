'use client';

import { TYPE } from '@/theme/type-scale';
import { BRAND_COLORS } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { HAIRLINE } from '@/components/_common/brand';
import { PageHero } from '@/components/_common/page-hero';

import { MILESTONES, STATUS_LABEL, STATUS_ORDER, countByStatus } from './milestones';

import type { MilestoneStatus } from './milestones';

// ----------------------------------------------------------------------

// Every milestone as one square, in the list's order: filled once shipped,
// faint while in progress, outlined while planned. Drawn from the list itself,
// like the counts beside them, so the board always matches it.
const TILE: Record<MilestoneStatus, object> = {
  shipped: { bgcolor: 'currentColor' },
  'in-progress': { bgcolor: 'currentColor', opacity: 0.35 },
  planned: { border: '1.5px solid currentColor', opacity: 0.45 },
};

const BUILDING_NOW = MILESTONES.filter((milestone) => milestone.status === 'in-progress');

/** The hero's right-hand cell: where the roadmap stands, on the sky wash. */
function ProgressBoard() {
  const sky = BRAND_COLORS.sky;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 4,
        flex: 1,
        p: { xs: 3, md: 5 },
        color: sky.deep,
        bgcolor: sky.tint,
      }}
    >
      <Box>
        <Typography sx={{ ...TYPE.eyebrow, color: 'inherit' }}>Where we are</Typography>
        <Box
          aria-hidden="true"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(5, 28px)', md: 'repeat(5, 40px)' },
            gap: { xs: '8px', md: '10px' },
            mt: 2.5,
          }}
        >
          {MILESTONES.map((milestone) => (
            <Box
              key={milestone.title}
              sx={{
                width: { xs: 28, md: 40 },
                height: { xs: 28, md: 40 },
                ...TILE[milestone.status],
              }}
            />
          ))}
        </Box>
        <Box
          component="ul"
          sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 3, rowGap: 1, mt: 2.5 }}
        >
          {STATUS_ORDER.map((status) => (
            <Box component="li" key={status} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box aria-hidden="true" sx={{ width: 12, height: 12, ...TILE[status] }} />
              <Typography sx={{ ...TYPE.small, color: 'inherit' }}>
                {countByStatus(status)} {STATUS_LABEL[status].toLowerCase()}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ pt: 3, borderTop: HAIRLINE }}>
        <Typography sx={{ ...TYPE.eyebrow, color: 'inherit' }}>Building now</Typography>
        <Box component="ul" sx={{ display: 'grid', gap: 1, mt: 1.5 }}>
          {BUILDING_NOW.map((milestone) => (
            <Typography
              component="li"
              key={milestone.title}
              sx={{ ...TYPE.body, color: 'inherit' }}
            >
              {milestone.title}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

/** The top of the page: the promise on the left, where the roadmap stands on the right. */
export function RoadmapHero() {
  return (
    <PageHero
      id="roadmap-title"
      eyebrow="Roadmap · updated weekly"
      title="Where we're headed next."
      lede="Most people earn next to nothing on their savings. Normal is built to change that, starting with a USDC savings account that pays real yield, with no bank in the middle."
      aside={<ProgressBoard />}
    />
  );
}

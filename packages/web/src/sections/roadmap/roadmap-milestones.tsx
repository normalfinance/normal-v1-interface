'use client';

import { useState } from 'react';
import { TYPE } from '@/theme/type-scale';
import { INK, MUTED, CANVAS, BRAND_COLORS, HAIRLINE_STRONG } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';

import {
  HAIRLINE,
  FRAME_MQ,
  GUTTER_SX,
  MONO_FONT,
  PageSection,
  GRID_FRAME_SX,
  SectionHeader,
  SegmentedControl,
  VISUALLY_HIDDEN_SX,
} from '@/components/_common/brand';

import { MILESTONES, STATUS_LABEL, STATUS_ORDER } from './milestones';

import type { MilestoneStatus } from './milestones';

// ----------------------------------------------------------------------

type Filter = 'all' | MilestoneStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  ...STATUS_ORDER.map((status) => ({ value: status, label: STATUS_LABEL[status] })),
];

// The one colour in the list is the status: shipped in the savings green (done),
// in progress in the wallet blue, planned left neutral.
const TAG_TONE: Record<MilestoneStatus, { bgcolor: string; color: string }> = {
  shipped: { bgcolor: BRAND_COLORS.mint.tint, color: BRAND_COLORS.mint.deep },
  'in-progress': { bgcolor: BRAND_COLORS.sky.tint, color: BRAND_COLORS.sky.deep },
  planned: { bgcolor: CANVAS, color: MUTED },
};

/** The height of a title's first line, so the date and the tag sit level with it. */
const FIRST_LINE = { xs: 24, md: 30 };

function StatusTag({ status }: { status: MilestoneStatus }) {
  return (
    <Box
      component="span"
      sx={{
        ...TYPE.caption,
        display: 'inline-flex',
        alignItems: 'center',
        height: 24,
        px: 1,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        borderRadius: 'var(--radius-xs)',
        ...TAG_TONE[status],
      }}
    >
      {STATUS_LABEL[status]}
    </Box>
  );
}

/**
 * Every milestone as a full-width row of the grid: the date, the status, then
 * what it is. The three columns run straight down the list, whatever the
 * filter shows. On phones the date and the status share a line above the words.
 */
export function RoadmapMilestones() {
  const [filter, setFilter] = useState<Filter>('all');
  const shown =
    filter === 'all' ? MILESTONES : MILESTONES.filter((milestone) => milestone.status === filter);

  return (
    <PageSection divider hatchFoot aria-labelledby="milestones-title">
      <SectionHeader
        id="milestones-title"
        eyebrow="Milestones"
        title="The road behind, and ahead."
        subtitle="Every milestone, organized by status."
        action={<SegmentedControl value={filter} onChange={setFilter} options={FILTERS} />}
      />

      <Box role="status" sx={VISUALLY_HIDDEN_SX}>
        {`${shown.length} milestones shown`}
      </Box>

      <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none', ...GRID_FRAME_SX }}>
        {shown.map((item, index) => (
          <Box
            component="li"
            key={item.title}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'auto 1fr', md: '1fr 1fr 4fr' },
              borderTop: index > 0 ? HAIRLINE : 'none',
            }}
          >
            <Box
              sx={{
                pt: 3,
                pb: { md: 3 },
                pl: { xs: 2, sm: 3 },
                pr: { xs: 1.5, md: 3 },
                [FRAME_MQ]: { px: 4 },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', minHeight: FIRST_LINE }}>
                <Typography
                  component="time"
                  sx={{ ...TYPE.small, fontFamily: MONO_FONT, whiteSpace: 'nowrap', color: MUTED }}
                >
                  {item.date}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                pt: 3,
                pb: { md: 3 },
                pl: { xs: 0, md: 3 },
                pr: { xs: 2, sm: 3 },
                [FRAME_MQ]: { px: 4 },
                borderLeft: { md: HAIRLINE },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', minHeight: FIRST_LINE }}>
                <StatusTag status={item.status} />
              </Box>
            </Box>

            <Box
              sx={{
                gridColumn: { xs: '1 / -1', md: 'auto' },
                ...GUTTER_SX,
                pt: { xs: 1.5, md: 3 },
                pb: 3,
                borderLeft: { md: HAIRLINE },
              }}
            >
              <Typography
                component="h3"
                sx={{ ...TYPE.h4, lineHeight: { xs: 1.25, md: '30px' }, color: INK }}
              >
                {item.title}
              </Typography>
              <Typography sx={{ ...TYPE.small, mt: 0.75, maxWidth: 640, color: MUTED }}>
                {item.description}
              </Typography>
              {item.link && (
                <Box
                  component="a"
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    ...TYPE.small,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    mt: 1.5,
                    fontWeight: 500,
                    color: INK,
                    textDecoration: 'underline',
                    textUnderlineOffset: '4px',
                    textDecorationColor: HAIRLINE_STRONG,
                    transition: 'text-decoration-color 150ms ease',
                    '&:hover': { textDecorationColor: INK },
                    '& svg': { fontSize: 16 },
                  }}
                >
                  View announcement
                  <ArrowOutwardRounded aria-hidden="true" />
                </Box>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </PageSection>
  );
}

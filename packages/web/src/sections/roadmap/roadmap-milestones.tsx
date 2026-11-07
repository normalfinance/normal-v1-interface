'use client';

import { useState } from 'react';
import { TYPE } from '@/theme/type-scale';
import {
  INK,
  MUTED,
  PAPER,
  BLOCK_COLORS,
  BRAND_COLORS,
  HAIRLINE_COLOR,
} from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';

import { HATCH_SX } from '@/components/_common/hatch';
import {
  GUTTER_SX,
  MONO_FONT,
  PageSection,
  GRID_FRAME_SX,
  SectionHeader,
  SegmentedControl,
  VISUALLY_HIDDEN_SX,
} from '@/components/_common/brand';

import { MILESTONES, STATUS_LABEL, STATUS_ORDER } from './milestones';

import type { Milestone, MilestoneStatus } from './milestones';

// ----------------------------------------------------------------------

type Filter = 'all' | MilestoneStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  ...STATUS_ORDER.map((status) => ({ value: status, label: STATUS_LABEL[status] })),
];

/** The cards per row at each width. */
const COLUMNS = { xs: 1, sm: 2, md: 3 } as const;

// The road in three chapters, oldest first. Each has its own fill: what
// shipped on the savings green's wash (done), what is being built now as solid
// blocks of the wallet's blue (the section's one focal point, as bright as the
// closing carousel's), what is planned left white.
const CHAPTERS: Record<
  MilestoneStatus,
  { title: string; count: (n: number) => string; colors: { bg: string; color: string } }
> = {
  shipped: {
    title: 'The road behind',
    count: (n) => `${n} shipped`,
    colors: { bg: BRAND_COLORS.mint.tint, color: BRAND_COLORS.mint.deep },
  },
  'in-progress': {
    title: 'Building now',
    count: (n) => `${n} in progress`,
    colors: { bg: BLOCK_COLORS.sky.surface, color: BLOCK_COLORS.sky.words },
  },
  planned: {
    title: 'The road ahead',
    count: (n) => `${n} planned`,
    colors: { bg: PAPER, color: INK },
  },
};

const range = (items: Milestone[]) => {
  const first = items[0]?.date;
  const last = items[items.length - 1]?.date;
  return first === last ? first : `${first} to ${last}`;
};

/** A chapter's header: a row across the board. */
function ChapterHeader({ status, items }: { status: MilestoneStatus; items: Milestone[] }) {
  const chapter = CHAPTERS[status];

  return (
    <Box
      sx={{
        gridColumn: '1 / -1',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        columnGap: 2,
        rowGap: 0.5,
        ...GUTTER_SX,
        py: { xs: 2.5, md: 3 },
        bgcolor: PAPER,
      }}
    >
      <Typography component="h3" sx={{ ...TYPE.h3, color: INK }}>
        {chapter.title}
      </Typography>
      <Typography sx={{ ...TYPE.small, color: MUTED }}>{chapter.count(items.length)}</Typography>
      <Typography sx={{ ...TYPE.small, ml: { sm: 'auto' }, fontFamily: MONO_FONT, color: MUTED }}>
        {range(items)}
      </Typography>
    </Box>
  );
}

/** One milestone: its date, what it is, and the announcement if there is one. */
function MilestoneCard({ item }: { item: Milestone }) {
  const { colors } = CHAPTERS[item.status];
  const now = item.status === 'in-progress';
  const shipped = item.status === 'shipped';

  return (
    <Box
      component="article"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        ...GUTTER_SX,
        pt: 3,
        pb: { xs: 3.5, md: 4 },
        color: colors.color,
        bgcolor: colors.bg,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography
          component="time"
          sx={{
            ...TYPE.small,
            fontFamily: MONO_FONT,
            whiteSpace: 'nowrap',
            color: item.status === 'planned' ? MUTED : 'inherit',
          }}
        >
          {item.date}
        </Typography>
        {shipped && <CheckRounded aria-label="Shipped" sx={{ fontSize: 20 }} />}
      </Box>
      <Typography
        component="h4"
        sx={{ ...(now ? TYPE.h3 : TYPE.h4), mt: { xs: 3, md: now ? 6 : 4 }, color: 'inherit' }}
      >
        {item.title}
      </Typography>
      <Typography
        sx={{
          ...TYPE.small,
          mt: 1,
          maxWidth: 520,
          color: item.status === 'planned' ? MUTED : 'inherit',
        }}
      >
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
            alignSelf: 'flex-start',
            gap: 0.5,
            mt: 2,
            fontWeight: 500,
            color: 'inherit',
            textDecoration: 'underline',
            textUnderlineOffset: '4px',
            '& svg': { fontSize: 16 },
          }}
        >
          View announcement
          <ArrowOutwardRounded aria-hidden="true" />
        </Box>
      )}
    </Box>
  );
}

/**
 * Hatched cells that finish a chapter's last row, at each width, so the board
 * has no holes: hatching is the grid's empty space (DESIGN.md).
 */
function Fillers({ count }: { count: number }) {
  const per = (columns: number) => (columns - (count % columns)) % columns;
  const sm = per(COLUMNS.sm);
  const md = per(COLUMNS.md);

  return (
    <>
      {Array.from({ length: Math.max(sm, md) }, (_, i) => (
        <Box
          key={i}
          aria-hidden="true"
          sx={{
            display: { xs: 'none', sm: i < sm ? 'block' : 'none', md: i < md ? 'block' : 'none' },
            bgcolor: PAPER,
            ...HATCH_SX,
          }}
        />
      ))}
    </>
  );
}

/**
 * The milestones as a board in three chapters, behind, now and ahead, on the
 * hairline grid: three cards to a row, two on tablets, one on phones. The grid
 * draws its lines as 1px gaps over the hairline colour, so every line runs
 * straight across the chapters and their headers.
 */
export function RoadmapMilestones() {
  const [filter, setFilter] = useState<Filter>('all');
  const chapters = STATUS_ORDER.filter((status) => filter === 'all' || filter === status).map(
    (status) => ({ status, items: MILESTONES.filter((item) => item.status === status) })
  );
  const shown = chapters.reduce((sum, chapter) => sum + chapter.items.length, 0);

  const board = chapters.flatMap(({ status, items }) => [
    <ChapterHeader key={`${status}-header`} status={status} items={items} />,
    ...items.map((item) => <MilestoneCard key={item.title} item={item} />),
    <Fillers key={`${status}-fill`} count={items.length} />,
  ]);

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
        {`${shown} milestones shown`}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: `repeat(${COLUMNS.xs}, minmax(0, 1fr))`,
            sm: `repeat(${COLUMNS.sm}, minmax(0, 1fr))`,
            md: `repeat(${COLUMNS.md}, minmax(0, 1fr))`,
          },
          gap: '1px',
          bgcolor: HAIRLINE_COLOR,
          ...GRID_FRAME_SX,
        }}
      >
        {board}
      </Box>
    </PageSection>
  );
}

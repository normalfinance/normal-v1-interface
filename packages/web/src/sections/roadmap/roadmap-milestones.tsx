'use client';

import type { BrandHue } from '@/theme/brand-colors';

import { useState } from 'react';
import { TYPE } from '@/theme/type-scale';
import { BLOCK_COLORS, BRAND_COLORS, HAIRLINE_COLOR } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';

import { hatchIn } from '@/components/_common/hatch';
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

// The road in three chapters, oldest first, each a zone of one colour (Niko
// 2026-11-10: the header "darker and the blocks lighter", and every chapter
// coloured): its header row a block of the colour, as strong as the asks at
// the foot of the home page, its cards the same colour's pale wash, its empty
// cells hatched tone on tone. Words in the colour's deep shade throughout.
// Three colours next to each other in the logo, in its order (Niko 2026-11-10):
// calm violet for what is done, the biggest chapter; magenta, the most vivid,
// for what is being built now; warm coral for what is ahead. Tried and
// dropped: sky, violet, magenta (ended on a heavy pink); magenta, coral,
// yellow (the past all pink, the yellow repeating the promise below).
const CHAPTERS: Record<
  MilestoneStatus,
  { title: string; count: (n: number) => string; hue: BrandHue }
> = {
  shipped: { title: 'The road behind', count: (n) => `${n} shipped`, hue: 'violet' },
  'in-progress': { title: 'Building now', count: (n) => `${n} in progress`, hue: 'magenta' },
  planned: { title: 'The road ahead', count: (n) => `${n} planned`, hue: 'coral' },
};

/** A chapter's colours: the block for its header, the wash for its cards. */
const tones = (status: MilestoneStatus) => {
  const { hue } = CHAPTERS[status];
  return {
    head: BLOCK_COLORS[hue].surface,
    headWords: BLOCK_COLORS[hue].words,
    card: BRAND_COLORS[hue].tint,
    words: BRAND_COLORS[hue].deep,
  };
};

const range = (items: Milestone[]) => {
  const first = items[0]?.date;
  const last = items[items.length - 1]?.date;
  return first === last ? first : `${first} to ${last}`;
};

/** A chapter's header: a row across the board, a block of its colour. */
function ChapterHeader({ status, items }: { status: MilestoneStatus; items: Milestone[] }) {
  const chapter = CHAPTERS[status];
  const { head, headWords } = tones(status);

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
        color: headWords,
        bgcolor: head,
      }}
    >
      <Typography component="h3" sx={{ ...TYPE.h3, color: 'inherit' }}>
        {chapter.title}
      </Typography>
      <Typography sx={{ ...TYPE.small, color: 'inherit' }}>
        {chapter.count(items.length)}
      </Typography>
      <Typography
        sx={{ ...TYPE.small, ml: { sm: 'auto' }, fontFamily: MONO_FONT, color: 'inherit' }}
      >
        {range(items)}
      </Typography>
    </Box>
  );
}

/** One milestone: its date, what it is, and the announcement if there is one. */
function MilestoneCard({ item }: { item: Milestone }) {
  const { card, words } = tones(item.status);
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
        color: words,
        bgcolor: card,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography
          component="time"
          sx={{ ...TYPE.small, fontFamily: MONO_FONT, whiteSpace: 'nowrap', color: 'inherit' }}
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
      <Typography sx={{ ...TYPE.small, mt: 1, maxWidth: 520, color: 'inherit', opacity: 0.85 }}>
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
 * has no holes: hatching is the grid's empty space (DESIGN.md), here in the
 * chapter's own colour, tone on tone, so the zone stays whole.
 */
function Fillers({ status, count }: { status: MilestoneStatus; count: number }) {
  const { head, card } = tones(status);
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
            bgcolor: card,
            // Lines halfway between the wash and the block: the block's own
            // colour made the empty cells louder than the cards.
            ...hatchIn(`color-mix(in srgb, ${head} 50%, ${card})`),
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
    <Fillers key={`${status}-fill`} status={status} count={items.length} />,
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

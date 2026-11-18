'use client';

import { TYPE } from '@/theme/type-scale';
import { INK, FIXED, MUTED } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { MarketingPhoto } from '@/components/_common/marketing-photo';
import { FrameLines, FRAME_LINES_Z } from '@/components/_common/frame-lines';
import { COLUMN_SX, GUTTER_SX, StatementWord as Word } from '@/components/_common/brand';

// ----------------------------------------------------------------------

/**
 * The page opens on the team at Meridian, edge to edge, the way the home hero
 * runs its photo: a layer above the page's frame lines, drawing its own over
 * the photo, so the lines run on through it. As tall as the home hero on wide
 * screens, where it loses the stone wall above the group; the whole photo on
 * phones and tablets. Nothing is written on it: the faces fill it.
 */
function GroupPhoto() {
  return (
    <Box
      sx={{
        position: 'relative',
        zIndex: FRAME_LINES_Z + 1,
        overflow: 'hidden',
        aspectRatio: { xs: '4 / 3', md: 'auto' },
        height: { md: 'clamp(620px, 50vw, 960px)' },
        bgcolor: FIXED.ink,
      }}
    >
      <MarketingPhoto slot="about" sx={{ position: 'absolute', inset: 0 }} />
      <FrameLines tone="bright" />
    </Box>
  );
}

/**
 * The top of the page: the photo, then the mission as one statement, set like
 * the home page's, its phrases in the logo's colours. The page's h1 is the
 * label above it. The photo's edge is the line between them.
 */
export function AboutHero() {
  return (
    <>
      <GroupPhoto />
      <Box component="section" aria-labelledby="about-title">
        <Box sx={{ ...COLUMN_SX, ...GUTTER_SX, py: 'var(--section-y)', textAlign: 'center' }}>
          <Typography id="about-title" component="h1" sx={{ ...TYPE.eyebrow, mb: 3, color: MUTED }}>
            About Normal
          </Typography>
          <Typography sx={{ ...TYPE.statement, mx: 'auto', maxWidth: 1040, color: INK }}>
            At Normal, our mission is to make <Word n={0}>crypto normal</Word>, starting with a{' '}
            <Word n={1}>savings account</Word> that pays <Word n={2}>real yield</Word>, works for{' '}
            <Word n={3}>everyone</Word>, and puts you in <Word n={4}>full control</Word> of your
            money.
          </Typography>
        </Box>
      </Box>
    </>
  );
}

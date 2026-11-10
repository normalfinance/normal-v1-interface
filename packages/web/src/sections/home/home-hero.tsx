'use client';

import { paths } from '@/routes/paths';
import { TYPE } from '@/theme/type-scale';
import { INK, FIXED, INK_SOFT } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { FrameLines, FRAME_LINES_Z } from '@/components/_common/frame-lines';
import { COLUMN_SX, GUTTER_SX, BrandButton } from '@/components/_common/brand';

import { HeroPhone } from './hero-phone';

// ----------------------------------------------------------------------

// Over the photo the words are white in both modes; under it (phones) they
// take the page's colours.
function HeroCopy({ tone }: { tone: 'light' | 'dark' }) {
  const dark = tone === 'dark';

  return (
    <>
      <Typography component="h1" sx={{ ...TYPE.display, color: dark ? FIXED.white : INK }}>
        Crypto,
        <br />
        made
        <br />
        normal.
      </Typography>
      <Typography
        sx={{
          ...TYPE.lead,
          mt: 3,
          maxWidth: { xs: 420, md: 380 },
          color: dark ? 'rgba(255,255,255,0.88)' : INK_SOFT,
        }}
      >
        Save in digital dollars and own Bitcoin. One simple app, without the memecoins or the
        jargon.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mt: 4 }}>
        <BrandButton tone={tone} href={paths.auth.signup}>
          Open a free account
        </BrandButton>
        <BrandButton tone={tone} emphasis="secondary" href={paths.site.how}>
          How it works
        </BrandButton>
      </Stack>
    </>
  );
}

/**
 * A photo of the real app in someone's hand, edge to edge, not boxed in the
 * column. It sits a layer above the page's frame lines and draws its own over
 * the photo, in white, so the lines still run through it. The promise is written
 * over its left side, lined up with the column; a scrim fades the photo under
 * the words so they read on any crop of it, and is gone before the phone. The
 * app on the phone is live (HeroPhone). On phones the words go under the
 * photo: over the hand they would not read.
 */
export function HomeHero() {
  return (
    <Box component="section" sx={{ position: 'relative', zIndex: FRAME_LINES_Z + 1 }}>
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          height: { xs: 520, sm: 620, md: 'clamp(620px, 50vw, 960px)' },
          bgcolor: FIXED.ink,
        }}
      >
        <HeroPhone />
        <Box
          aria-hidden="true"
          sx={{
            display: { xs: 'none', md: 'block' },
            position: 'absolute',
            inset: 0,
            // Strong under the words (the column's left half), clear by the phone.
            background:
              'linear-gradient(90deg, rgba(10,10,15,0.62) 0%, rgba(10,10,15,0.42) calc(50% - 120px), rgba(10,10,15,0) calc(50% + 140px))',
          }}
        />
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            position: 'absolute',
            inset: 0,
          }}
        >
          <Box sx={{ ...COLUMN_SX, ...GUTTER_SX }}>
            <HeroCopy tone="dark" />
          </Box>
        </Box>
        <FrameLines tone="dark" />
      </Box>

      <Box sx={{ display: { md: 'none' }, ...COLUMN_SX, ...GUTTER_SX, pt: 4, pb: 6 }}>
        <HeroCopy tone="light" />
      </Box>
    </Box>
  );
}

import type { Theme, SxProps } from '@mui/material/styles';

import { FIXED, BRAND_COLORS } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

// ----------------------------------------------------------------------

export const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=io.normalfinance.app';

/** One height for both badges, so they read as a pair (both makers ask for equal sizes). */
const BADGE_HEIGHT = 40;

/**
 * Where to get the app (Niko 2026-11-16): each store's own badge, unmodified,
 * on the hero and in the phone menu. Google Play links to the listing. The
 * App Store badge waits for Apple's approval: a "Coming soon" sticker hangs
 * off its lower edge, at a slight angle (Niko: "bellow and in a bit of an angle
 * touching the block"), and it links nowhere yet. Apple's marketing guidelines
 * reserve the badge for apps on the App Store or open for pre-order: the day
 * the app is live, the sticker goes and the badge links to it.
 */
export function StoreBadges({ sx }: { sx?: SxProps<Theme> }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      flexWrap="wrap"
      gap={2.5}
      sx={[{ pb: '14px' }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      <Box
        component="a"
        href={GOOGLE_PLAY_URL}
        target="_blank"
        rel="noopener noreferrer"
        // Google's file carries its clear space as a transparent margin (a
        // quarter of its height each side): 60px of file is a 40px badge,
        // lined up with whatever stands above it.
        sx={{ display: 'block', m: '-10px', lineHeight: 0 }}
      >
        <Box
          component="img"
          src="/marketing/google-play-badge.png"
          alt="Get it on Google Play"
          sx={{ display: 'block', height: BADGE_HEIGHT * 1.5, width: 'auto' }}
        />
      </Box>
      <Box sx={{ position: 'relative', lineHeight: 0 }}>
        <Box
          component="img"
          src="/marketing/app-store-badge.svg"
          alt="Download on the App Store, coming soon"
          sx={{ display: 'block', height: BADGE_HEIGHT, width: 'auto' }}
        />
        {/* A sticker on the badge's lower edge, tilted; still, it never moves. */}
        <Box
          component="span"
          aria-hidden="true"
          sx={{
            position: 'absolute',
            top: '100%',
            right: -6,
            mt: '-7px',
            px: '7px',
            py: '2px',
            fontSize: 11,
            fontWeight: 500,
            lineHeight: '14px',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            color: FIXED.ink,
            bgcolor: BRAND_COLORS.yellow.fill,
            transform: 'rotate(-5deg)',
          }}
        >
          Coming soon
        </Box>
      </Box>
    </Stack>
  );
}

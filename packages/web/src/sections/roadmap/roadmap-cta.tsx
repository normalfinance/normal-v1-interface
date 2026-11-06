'use client';

import { Fragment } from 'react';
import { paths } from '@/routes/paths';
import { TYPE } from '@/theme/type-scale';
import { GUTTER_SX, COLUMN_SX } from '@/theme/site-grid';
import { BRAND_COLORS, HAIRLINE_COLOR } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Eyebrow, BrandButton } from '@/components/_common/brand';

// ----------------------------------------------------------------------

const PROMISE = ['Transparency.', 'Safety.', 'Long term.'];

/**
 * The close: the promise, and the ways to help shape what comes next, on the
 * logo's yellow like the home page's closing band. The wash fills the column
 * between the frame lines and stops there; every word on it is the deep shade.
 */
export function RoadmapCta() {
  const yellow = BRAND_COLORS.yellow;

  return (
    <Box
      component="section"
      aria-labelledby="promise-title"
      sx={{ borderTop: `1px solid ${HAIRLINE_COLOR}` }}
    >
      <Box
        sx={{
          ...COLUMN_SX,
          ...GUTTER_SX,
          py: { xs: 10, md: 16 },
          textAlign: 'center',
          color: yellow.deep,
          bgcolor: yellow.tint,
        }}
      >
        <Eyebrow sx={{ color: 'inherit' }}>Our promise</Eyebrow>
        <Typography
          id="promise-title"
          component="h2"
          sx={{ ...TYPE.h2, mx: 'auto', mt: 2, maxWidth: 760, color: 'inherit' }}
        >
          {/* A line breaks between the three words of the promise, never inside one. */}
          {PROMISE.map((word, index) => (
            <Fragment key={word}>
              {index > 0 && ' '}
              <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
                {word}
              </Box>
            </Fragment>
          ))}
        </Typography>
        <Typography sx={{ ...TYPE.lead, mx: 'auto', mt: 2.5, maxWidth: 560, color: 'inherit' }}>
          We default to transparency, prioritize your safety, and build for the long term, not the
          hype cycle. Help shape what Normal becomes next.
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="center"
          gap={1.5}
          sx={{ mt: 4 }}
        >
          <BrandButton href={paths.core.contact}>Share your feedback</BrandButton>
          <BrandButton
            emphasis="secondary"
            href={paths.socials.discord}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ bgcolor: 'transparent' }}
          >
            Join our Discord
          </BrandButton>
          <BrandButton
            emphasis="secondary"
            href={paths.socials.twitter}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ bgcolor: 'transparent' }}
          >
            Follow us on X
          </BrandButton>
        </Stack>
      </Box>
    </Box>
  );
}

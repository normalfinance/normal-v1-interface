'use client';

import type { PhotoSlot } from '@/components/_common/marketing-photo';

import { paths } from '@/routes/paths';
import { TYPE } from '@/theme/type-scale';
import { INK, MUTED, PAPER, HAIRLINE_COLOR } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { MarketingPhoto } from '@/components/_common/marketing-photo';
import { BrandButton, PageSection, GRID_FRAME_SX, SectionHeader } from '@/components/_common/brand';

// ----------------------------------------------------------------------

const STEPS: { title: string; body: string; photo: PhotoSlot }[] = [
  {
    title: 'Sign up',
    body: 'All you need is an email address. It takes a few minutes.',
    photo: 'signup',
  },
  {
    title: 'Add money',
    body: 'Use your card or a bank transfer, through our licensed partners.',
    photo: 'addMoney',
  },
  {
    title: 'Save, buy or send',
    body: 'Grow your dollars, own some Bitcoin, or pay someone back. Your call.',
    photo: 'enjoy',
  },
];

/** Three steps: a real person in each cell, the step written under the photo. */
export function HomeSteps() {
  return (
    <PageSection
      divider
      hatchFoot
      id="how"
      aria-labelledby="how-title"
      sx={{ scrollMarginTop: 72 }}
    >
      <SectionHeader
        id="how-title"
        eyebrow="How it works"
        title="Up and running in minutes"
        action={<BrandButton href={paths.auth.signup}>Open a free account</BrandButton>}
      />

      <Box
        component="ol"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          m: 0,
          p: 0,
          listStyle: 'none',
          ...GRID_FRAME_SX,
          bgcolor: PAPER,
        }}
      >
        {STEPS.map((step, index) => (
          <Box
            component="li"
            key={step.title}
            sx={{
              borderTop: { xs: index > 0 ? `1px solid ${HAIRLINE_COLOR}` : 'none', md: 'none' },
              borderLeft: { md: index > 0 ? `1px solid ${HAIRLINE_COLOR}` : 'none' },
            }}
          >
            <Box sx={{ aspectRatio: { xs: '4 / 3', md: '4 / 4.6' } }}>
              <MarketingPhoto slot={step.photo} />
            </Box>
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                p: { xs: 3, md: 3.5 },
                borderTop: `1px solid ${HAIRLINE_COLOR}`,
              }}
            >
              <Typography
                sx={{
                  ...TYPE.caption,
                  flexShrink: 0,
                  fontWeight: 500,
                  lineHeight: '30px',
                  color: MUTED,
                }}
              >
                0{index + 1}
              </Typography>
              <Box sx={{ minWidth: 0 }}>
                <Typography component="h3" sx={{ ...TYPE.h4, lineHeight: '30px', color: INK }}>
                  {step.title}
                </Typography>
                <Typography sx={{ ...TYPE.small, mt: 0.75, color: MUTED }}>{step.body}</Typography>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </PageSection>
  );
}

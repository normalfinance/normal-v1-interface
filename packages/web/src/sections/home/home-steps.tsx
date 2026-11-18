'use client';

import type { ReactNode } from 'react';
import type { HueShades } from '@/theme/brand-colors';

import { paths } from '@/routes/paths';
import { TYPE } from '@/theme/type-scale';
import { INK, MUTED, PAPER, BRAND_COLORS, HAIRLINE_COLOR } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { MarketingPhoto } from '@/components/_common/marketing-photo';
import { BrandButton, PageSection, GRID_FRAME_SX, SectionHeader } from '@/components/_common/brand';

import { RAMPS } from './ramps';

// ----------------------------------------------------------------------

// How it works, in three cells: the sign-up form as the app draws it, the
// partners that take your money in, and one real person (Niko 2026-11-16:
// "lets just have 1 person with mobile phone and credit card, other 2 blocks
// should be something else"). Each cell's picture sits above its step.

/** A drawn cell: a white card from the app on the step's pale wash. Decorative. */
function Drawn({ hue, children }: { hue: HueShades; children: ReactNode }) {
  return (
    <Box
      aria-hidden="true"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        p: { xs: 3, md: 4 },
        bgcolor: hue.tint,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 300,
          p: '20px',
          border: `1px solid ${HAIRLINE_COLOR}`,
          color: INK,
          bgcolor: PAPER,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/** Sign up: an email and one button, as the app asks for it. */
const SIGN_UP = (
  <Drawn hue={BRAND_COLORS.yellow}>
    <Typography sx={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em' }}>
      Create your account
    </Typography>
    <Typography sx={{ mt: '16px', fontSize: 13, color: MUTED }}>Email</Typography>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        height: 44,
        mt: '6px',
        px: '12px',
        fontSize: 15,
        color: MUTED,
        border: `1px solid ${HAIRLINE_COLOR}`,
      }}
    >
      you@example.com
    </Box>
    <Box
      sx={{
        mt: '12px',
        py: '11px',
        fontSize: 14,
        fontWeight: 500,
        textAlign: 'center',
        color: PAPER,
        bgcolor: INK,
      }}
    >
      Continue
    </Box>
  </Drawn>
);

/** Add money: the three partners' own marks, as the app's Add money shows them. */
const RAMP_MARKS = (
  <Drawn hue={BRAND_COLORS.sky}>
    <Typography sx={{ fontSize: 13, color: MUTED }}>Add money with</Typography>
    <Box sx={{ display: 'grid', gap: '16px', mt: '14px' }}>
      {RAMPS.map((ramp) => (
        <Box key={ramp.name} sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Box
            component="img"
            src={ramp.icon}
            alt=""
            sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: '50%', objectFit: 'cover' }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 500 }}>{ramp.name}</Typography>
            <Typography sx={{ fontSize: 13, color: MUTED }}>{ramp.detail}</Typography>
          </Box>
        </Box>
      ))}
    </Box>
  </Drawn>
);

const STEPS: { title: string; body: string; visual: ReactNode }[] = [
  {
    title: 'Sign up',
    body: 'All you need is an email address. It takes a few minutes.',
    visual: SIGN_UP,
  },
  {
    title: 'Add money',
    body: 'Pay in cash at a MoneyGram location, or use your card or bank through Stripe or Coinbase.',
    visual: RAMP_MARKS,
  },
  {
    title: 'Save, buy or send',
    body: 'Grow your dollars, own the top crypto, or pay someone back. Your call.',
    visual: <MarketingPhoto slot="phoneAndCard" />,
  },
];

/** Three steps: the picture on top, the step written under it. */
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
            <Box sx={{ aspectRatio: { xs: '4 / 3', md: '4 / 4.6' } }}>{step.visual}</Box>
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

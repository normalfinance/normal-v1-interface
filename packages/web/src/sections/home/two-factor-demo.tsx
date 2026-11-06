'use client';

import { INK, PAPER, BRAND_COLORS, HAIRLINE_STRONG } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CheckRounded from '@mui/icons-material/CheckRounded';
import PhonelinkLockOutlined from '@mui/icons-material/PhonelinkLockOutlined';

import { MONO_FONT } from '@/components/_common/brand';

import { fade, DemoCard, DemoHeader, useDemoStep } from './security-demos';

// ----------------------------------------------------------------------

const CODE = '482913';

// One digit every 280ms from 0.9s, the check half a second after the last.
const STEPS = [
  ...CODE.split('').map((_, index) => 900 + index * 280),
  900 + CODE.length * 280 + 500,
];

/**
 * The real sign-in code dialog, demonstrated: the six digits appear one by
 * one, the check appears, and it starts over. Opacity only, nothing slides.
 */
export function TwoFactorDemo() {
  const step = useDemoStep(STEPS, 6400);
  const typed = Math.min(step, CODE.length);
  const verified = step > CODE.length;

  return (
    <DemoCard>
      <DemoHeader
        icon={<PhonelinkLockOutlined />}
        title="Enter your code"
        text="Open your authenticator app and enter the 6-digit code for Normal."
      />

      <Box sx={{ display: 'flex', gap: '8px', mt: 3 }}>
        {CODE.split('').map((digit, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              height: 52,
              border: `1px solid ${index < typed ? INK : HAIRLINE_STRONG}`,
              borderRadius: 'var(--radius-site)',
              fontFamily: MONO_FONT,
              fontSize: 22,
              fontWeight: 500,
              transition: 'border-color 200ms',
            }}
          >
            <Box component="span" sx={fade(index < typed)}>
              {digit}
            </Box>
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mt: 2,
          minHeight: 22,
          color: BRAND_COLORS.mint.deep,
          ...fade(verified),
        }}
      >
        <CheckRounded sx={{ fontSize: 18 }} />
        <Typography sx={{ fontSize: 14, fontWeight: 500 }}>Verified. Welcome back.</Typography>
      </Box>

      <Box
        sx={{
          mt: 2,
          py: '13px',
          fontSize: 15,
          fontWeight: 500,
          textAlign: 'center',
          borderRadius: 'var(--radius-site)',
          color: PAPER,
          bgcolor: INK,
          opacity: typed === CODE.length ? 1 : 0.4,
          transition: 'opacity 300ms',
        }}
      >
        Continue
      </Box>
    </DemoCard>
  );
}

'use client';

import type { BoxProps } from '@mui/material';

import * as React from 'react';

import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';

type GlowBorderProps = BoxProps & {
  colors?: string[];
  radius?: number | string;
  borderWidth?: number;
  glowSpread?: number;
  glowBlur?: number;
  glowOpacity?: number;
  gradientType?: 'conic' | 'linear';
  mode?: 'always' | 'hover' | 'focusWithin';
};

/** default brand colors */
const BRAND = ['#2DE9C8', '#00AFF7', '#947BFF', '#F8279C', '#FF6F4C', '#FFE13D'];

const Root = styled(Box, {
  shouldForwardProp: (prop) =>
    ![
      'colors',
      'radius',
      'borderWidth',
      'glowSpread',
      'glowBlur',
      'glowOpacity',
      'gradientType',
      'mode',
    ].includes(String(prop)),
})<GlowBorderProps>(({
  colors = BRAND,
  radius = 'inherit',
  borderWidth = 2,
  glowSpread = 14,
  glowBlur = 18,
  glowOpacity = 0.5,
  gradientType = 'conic',
  mode = 'always',
  theme,
}) => {
  const gradient =
    gradientType === 'conic'
      ? `conic-gradient(from 0deg at 50% 50%, ${colors.join(', ')})`
      : `linear-gradient(135deg, ${colors.join(', ')})`;

  const baseOpacity = mode === 'always' ? 1 : 0;
  const hoverSelector =
    mode === 'hover' ? '&:hover' : mode === 'focusWithin' ? '&:focus-within' : null;

  return {
    position: 'relative',
    display: 'inline-block',
    isolation: 'isolate',
    borderRadius: radius,

    '& > .glow-content': {
      position: 'relative',
      zIndex: 1,
      borderRadius: 'inherit',
    },

    // bright gradient border ring
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      padding: borderWidth,
      borderRadius: 'inherit',
      background: gradient,
      opacity: baseOpacity,
      pointerEvents: 'none',
      zIndex: 0,

      WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
      WebkitMaskComposite: 'xor',
      maskComposite: 'exclude',
    },

    // soft outer glow
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: -glowSpread,
      borderRadius: 'inherit',
      background: gradient,
      filter: `blur(${glowBlur}px)`,
      opacity: baseOpacity * glowOpacity,
      pointerEvents: 'none',
      zIndex: 0,
    },

    ...(hoverSelector && {
      [`${hoverSelector}::before, ${hoverSelector}::after`]: { opacity: 1 },
    }),

    '&::before, &::after': {
      transition: theme.transitions.create(['opacity'], {
        duration: 220,
        easing: theme.transitions.easing.easeOut,
      }),
    },
  };
});

/** Wrap any element and it will render with a gradient border + glow. */
export function GlowBorder({ children, ...props }: React.PropsWithChildren<GlowBorderProps>) {
  return (
    <Root {...props}>
      <Box className="glow-content">{children}</Box>
    </Root>
  );
}

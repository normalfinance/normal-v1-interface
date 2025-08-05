import type { BoxProps } from '@mui/material/Box';
import type { Theme, SxProps } from '@mui/material/styles';
import type { MotionValue, MotionProps } from 'framer-motion';

import { Fragment } from 'react';
import { mergeClasses } from 'minimal-shared/utils';
import { createClasses } from '@/theme/create-classes';
import { m, useSpring, useTransform } from 'framer-motion';

import Box from '@mui/material/Box';
import Portal from '@mui/material/Portal';
import { styled, useTheme } from '@mui/material/styles';

// ----------------------------------------------------------------------

export const scrollProgressClasses = {
  circular: createClasses('scroll__progress__circular'),
  linear: createClasses('scroll__progress__linear'),
};

type BaseProps = MotionProps & React.ComponentProps<'svg'> & React.ComponentProps<'div'>;

export interface ScrollProgressProps extends BaseProps {
  size?: number;
  portal?: boolean;
  thickness?: number;
  sx?: SxProps<Theme>;
  whenScroll?: 'x' | 'y';
  progress: MotionValue<number>;
  variant: 'linear' | 'circular';
  color?: 'inherit' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
  slotProps?: {
    wrapper?: BoxProps;
  };
}

export function ScrollProgress({
  sx,
  size,
  portal,
  variant,
  slotProps,
  className,
  thickness = 3.6,
  whenScroll = 'y',
  color = 'primary',
  progress: progressProps,
  ...other
}: ScrollProgressProps) {
  const theme = useTheme();

  const isRtl = theme.direction === 'rtl';

  const transformProgress = useTransform(progressProps, [0, -1], [0, 1]);

  const progress = isRtl && whenScroll === 'x' ? transformProgress : progressProps;

  const scaleX = useSpring(progress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const progressSize = variant === 'circular' ? (size ?? 64) : (size ?? 3);

  const renderCircular = () => (
    <CircularRoot
      viewBox={`0 0 ${progressSize} ${progressSize}`}
      xmlns="http://www.w3.org/2000/svg"
      className={mergeClasses([scrollProgressClasses.circular, className])}
      sx={[
        {
          width: progressSize,
          height: progressSize,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <defs>
        <linearGradient id="brand-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={theme.vars.palette.primary.main} />
          <stop offset="25%" stopColor={theme.vars.palette.secondary.main} />
          <stop offset="50%" stopColor={theme.vars.palette.error.main} />
          <stop offset="75%" stopColor={theme.vars.palette.warning.main} />
          <stop offset="100%" stopColor={theme.vars.palette.primary.main} />
        </linearGradient>
      </defs>

      <circle
        cx={progressSize / 2}
        cy={progressSize / 2}
        r={progressSize / 2 - thickness - 4}
        strokeWidth={thickness}
        strokeOpacity={0.2}
        stroke={theme.vars.palette.grey[500]}
      />

      <m.circle
        cx={progressSize / 2}
        cy={progressSize / 2}
        r={progressSize / 2 - thickness - 4}
        strokeWidth={thickness}
        style={{ pathLength: progress }}
        stroke="url(#brand-gradient)"
      />
    </CircularRoot>
  );

  const renderLinear = () => (
    <LinearRoot
      className={mergeClasses([scrollProgressClasses.linear, className])}
      sx={[
        {
          height: progressSize,
          ...(color !== 'inherit' && {
            background: `linear-gradient(135deg, ${theme.vars.palette.primary.main} 0%, ${theme.vars.palette.secondary.main} 25%, ${theme.vars.palette.error.main} 50%, ${theme.vars.palette.warning.main} 75%, ${theme.vars.palette.primary.main} 100%)`,
          }),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      style={{ scaleX }}
      {...other}
    />
  );

  const PortalWrapper = portal ? Portal : Fragment;

  return (
    <PortalWrapper>
      <Box {...slotProps?.wrapper}>
        {variant === 'circular' ? renderCircular() : renderLinear()}
      </Box>
    </PortalWrapper>
  );
}

// ----------------------------------------------------------------------

const CircularRoot = styled(m.svg)(({ theme }) => ({
  transform: 'rotate(-90deg)',
  circle: { fill: 'none', strokeDashoffset: 0, stroke: 'currentColor' },
}));

const LinearRoot = styled(m.div)(({ theme }) => ({
  top: 0,
  left: 0,
  right: 0,
  transformOrigin: '0%',
  backgroundColor: theme.vars.palette.text.primary,
}));

'use client';

import Box, { BoxProps } from '@mui/material/Box';
import { keyframes } from '@mui/system';
import { useTheme } from '@mui/material/styles';

const spin = keyframes`
  to { transform: rotate(1turn); }
`;

export type SpinnerProps = BoxProps & {
  color?: string;
  size?: number;
};

export function Spinner({ color, size = 50, sx, ...props }: SpinnerProps) {
  const theme = useTheme();
  const bg = color ?? theme.palette.primary.main;

  return (
    <Box
      role="status"
      aria-label="Loading"
      sx={{
        width: size,
        padding: '4px',
        aspectRatio: '1 / 1',
        borderRadius: '50%',
        background: bg,
        '--_m': 'conic-gradient(#0000 10%, #000), linear-gradient(#000 0 0) content-box',
        WebkitMask: 'var(--_m)',
        mask: 'var(--_m)',
        WebkitMaskComposite: 'source-out',
        maskComposite: 'subtract',
        animation: `${spin} 1s infinite linear`,
        ...sx,
      }}
      {...props}
    />
  );
}

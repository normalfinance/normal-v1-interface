'use client';

import type { ContainerProps } from '@mui/material/Container';

import { mergeClasses } from 'minimal-shared/utils';

import { styled } from '@mui/material/styles';
import Container from '@mui/material/Container';

import { layoutClasses } from '../core/classes';

// ----------------------------------------------------------------------

export type DashboardContentProps = ContainerProps & {
  disablePadding?: boolean;
};

export function DashboardContent({
  sx,
  children,
  className,
  disablePadding,
  ...other
}: DashboardContentProps) {
  return (
    <Container
      className={mergeClasses([layoutClasses.content, className])}
      maxWidth={false}
      sx={[
        {
          display: 'flex',
          flex: '1 1 auto',
          flexDirection: 'column',
          maxWidth: 'var(--page-max)',
          px: { xs: 2, sm: 3 },
          pt: { xs: 3, md: 5 },
          pb: 'var(--section-y)',
          ...(disablePadding && { p: 0 }),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      {children}
    </Container>
  );
}

// ----------------------------------------------------------------------

export const VerticalDivider = styled('span')(({ theme }) => ({
  width: 1,
  height: 10,
  flexShrink: 0,
  display: 'none',
  position: 'relative',
  alignItems: 'center',
  flexDirection: 'column',
  marginLeft: theme.spacing(2.5),
  marginRight: theme.spacing(2.5),
  backgroundColor: 'currentColor',
  color: theme.vars.palette.divider,
  '&::before, &::after': {
    top: -5,
    width: 3,
    height: 3,
    content: '""',
    flexShrink: 0,
    borderRadius: '50%',
    position: 'absolute',
    backgroundColor: 'currentColor',
  },
  '&::after': { bottom: -5, top: 'auto' },
}));

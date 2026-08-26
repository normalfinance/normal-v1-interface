'use client';

// THE close button for modal headers — one component so every dialog gets the
// same 28px square, the same hover, and the same vertical rhythm. Grew out of
// a sweep (Niko, 2026-08-26: the X "looks like it has no margin bottom"):
// some modals used bare MUI IconButtons (40px hit area, different padding),
// some used unstyled buttons pinned to a flex-start header, and each looked
// slightly differently wrong. A shared component cannot drift apart.

import type { Theme, SxProps } from '@mui/material/styles';

import Box from '@mui/material/Box';

import { Iconify } from '@/components/template/iconify';

interface Props {
  onClick: () => void;
  'aria-label'?: string;
  sx?: SxProps<Theme>;
}

export default function ModalCloseButton({ onClick, sx, ...rest }: Props) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-label={rest['aria-label'] ?? 'Close'}
      sx={{
        width: 28,
        height: 28,
        borderRadius: '8px',
        border: 'none',
        bgcolor: 'rgba(10,10,15,0.06)',
        color: '#0A0A0F',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontFamily: 'inherit',
        flexShrink: 0,
        p: 0,
        transition: 'background 150ms ease',
        '&:hover': { bgcolor: 'rgba(10,10,15,0.1)' },
        '&:focus-visible': { outline: '2px solid #0A0A0F', outlineOffset: '2px' },
        ...sx,
      }}
    >
      <Iconify icon="mingcute:close-line" width={16} />
    </Box>
  );
}

import React, { useEffect, useState } from 'react';
import { Box, Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import { keyframes, styled } from '@mui/system';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

export type ZealyHighlightProps = {
  questId: string;
  dialogTitle?: React.ReactNode;
  sizePx?: number;
  offset?: number;
  community?: string;
  color?: string;
  theme?: 'light' | 'dark';
};

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------
const pulseKeyframes = keyframes`
  0%   { transform: scale(1);   opacity: 0.9; }
  75%  { transform: scale(2.5); opacity: 0;   }
  100% { transform: scale(2.5); opacity: 0;   }
`;

// ---------------------------------------------------------------------------
// Styled components
// ---------------------------------------------------------------------------
const Wrapper = styled(Box)({ position: 'absolute', zIndex: 10 });

const PulseButton = styled(IconButton)<{ $diameter: number }>(({ theme, $diameter }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: $diameter,
  height: $diameter,
  padding: 0,
  borderRadius: '50%',
  position: 'relative',
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
  zIndex: 1,
  '& svg': { fontSize: $diameter * 0.6 },
  '&::after': {
    content: "''",
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    backgroundColor: theme.palette.primary.main,
    animation: `${pulseKeyframes} 2s ease-out infinite`,
    zIndex: -1,
    pointerEvents: 'none',
  },
  '&:hover, &:focus': {
    backgroundColor: theme.palette.primary.dark,
    '&::after': { backgroundColor: theme.palette.primary.dark },
  },
}));

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const ZealyHighlight: React.FC<ZealyHighlightProps> = ({
  questId,
  dialogTitle,
  sizePx = 24,
  offset = 8,
  community = 'normalfinance',
  color = '#0954A5',
  theme = 'dark',
}) => {
  const [open, setOpen] = useState(false);

  // Ensure Zealy script exists – **after** the placeholder is in DOM.
  useEffect(() => {
    if (!open) return;

    // Already loaded? nothing to do.
    if ((window as any).__zealyEmbedLoaded) return;

    const script = document.createElement('script');
    script.src = 'https://zealy.io/embed.js';
    script.async = true;
    script.onload = () => {
      (window as any).__zealyEmbedLoaded = true;
    };
    document.body.appendChild(script);
  }, [open]);

  return (
    <>
      {/* Badge */}
      <Wrapper sx={{ top: offset, right: offset }}>
        <PulseButton title="Earn Zealy XP" $diameter={sizePx} onClick={() => setOpen(true)}>
          <HelpOutlineIcon />
        </PulseButton>
      </Wrapper>

      {/* Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth keepMounted>
        {dialogTitle && <DialogTitle>{dialogTitle}</DialogTitle>}
        <DialogContent dividers sx={{ p: 0 }}>
          <Box
            component="div"
            data-zealy-community={community}
            data-variant="inline"
            data-theme={theme}
            data-color={color}
            data-quest-id={questId}
            sx={{ width: '100%' }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ZealyHighlight;

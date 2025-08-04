import { trackEvent } from '@normalfinance/utils';
import React, { useState, useEffect } from 'react';

import { styled, keyframes } from '@mui/system';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Box, Dialog, IconButton, DialogTitle, DialogContent } from '@mui/material';

import { Iconify } from '@/components/template/iconify';

/**
 * ZealyHighlight – resilient render version
 * ---------------------------------------------------------------------------
 * Fixes: dialog shown once → closed → reopened = blank. We now re‑invoke
 * `ZealyEmbed.parse()` each time the dialog opens (and whenever `questId`
 * changes) so the widget re‑initialises if needed.
 * ---------------------------------------------------------------------------
 */
export type ZealyHighlightProps = {
  questId: string;
  dialogTitle?: React.ReactNode;
  sizePx?: number;
  /** Positive or negative offsets (px) from the anchor Box sides */
  position?: Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;
  community?: string;
  color?: string;
  theme?: 'light' | 'dark';
};

// Animation ----------------------------------------------------------------
const pulseKeyframes = keyframes`
  0%   { transform: scale(1);   opacity: 0.9; }
  75%  { transform: scale(2.5); opacity: 0;   }
  100% { transform: scale(2.5); opacity: 0;   }
`;

// Styled --------------------------------------------------------------------
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

// Component -----------------------------------------------------------------
const ZealyHighlight: React.FC<ZealyHighlightProps> = ({
  questId,
  dialogTitle,
  sizePx = 24,
  position = { top: 8, right: 8 },
  community = 'normalfinance',
  color = '#0954A5',
  theme = 'dark',
}) => {
  const [open, setOpen] = useState(false);

  // Load Zealy script once per session -------------------------------------
  useEffect(() => {
    if ((window as any).__zealyEmbedLoaded) return;
    const script = document.createElement('script');
    script.src = 'https://zealy.io/embed.js';
    script.async = true;
    script.onload = () => {
      (window as any).__zealyEmbedLoaded = true;
    };
    document.body.appendChild(script);
  }, []);

  // Re‑parse on every open / quest change -----------------------------------
  useEffect(() => {
    if (!open) return;
    const tryParse = () => {
      if ((window as any).ZealyEmbed?.parse) {
        (window as any).ZealyEmbed.parse();
      } else {
        // script not yet ready – wait a tick
        setTimeout(tryParse, 150);
      }
    };
    tryParse();
  }, [open, questId]);

  return (
    <>
      {/* Badge */}
      <Wrapper sx={position}>
        <PulseButton
          title="Earn Zealy XP"
          $diameter={sizePx}
          onClick={() => {
            trackEvent('button_clicked', {
              label: 'Manage Stake',
              location: 'Insurance',
            });
            setOpen(true);
          }}
        >
          <HelpOutlineIcon />
        </PulseButton>
      </Wrapper>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth keepMounted>
        <DialogTitle
          sx={{
            m: 0,
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box component="span">{dialogTitle}</Box>
          <IconButton onClick={() => setOpen(false)} size="small">
            <Iconify icon="mingcute:close-line" width={20} />
          </IconButton>
        </DialogTitle>{' '}
        <DialogContent dividers sx={{ p: 0 }}>
          <Box
            key={questId}
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

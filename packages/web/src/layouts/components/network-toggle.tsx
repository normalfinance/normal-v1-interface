'use client';

import { Box, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import { useNetwork } from '@/hooks';

// ---------------------------------------------------------------------------
// Guard: hide toggle when the deployment is hard-locked to mainnet.
// Override by setting NEXT_PUBLIC_ALLOW_NETWORK_SWITCH=true.
// ---------------------------------------------------------------------------
const networkEnv = process.env.NEXT_PUBLIC_NETWORK?.toUpperCase();
const switchAllowed = process.env.NEXT_PUBLIC_ALLOW_NETWORK_SWITCH === 'true';
export const NETWORK_SWITCH_ENABLED = networkEnv !== 'MAINNET' || switchAllowed;

// ---------------------------------------------------------------------------

export function NetworkToggle() {
  const { network, toggleNetwork } = useNetwork();
  const theme = useTheme();

  const isMainnet = network === 'mainnet';

  const dotColor = isMainnet ? theme.palette.success.main : theme.palette.warning.main;
  const pillBg = isMainnet
    ? alpha(theme.palette.success.main, 0.1)
    : alpha(theme.palette.warning.main, 0.1);
  const pillBorder = isMainnet
    ? alpha(theme.palette.success.main, 0.3)
    : alpha(theme.palette.warning.main, 0.3);

  return (
    <Box
      component="button"
      onClick={toggleNetwork}
      aria-label={`Switch to ${isMainnet ? 'testnet' : 'mainnet'}`}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.25,
        py: 0.5,
        borderRadius: 99,
        border: `1px solid ${pillBorder}`,
        bgcolor: pillBg,
        cursor: 'pointer',
        outline: 'none',
        transition: 'background-color 0.2s, border-color 0.2s',
        '&:hover': {
          bgcolor: isMainnet
            ? alpha(theme.palette.success.main, 0.18)
            : alpha(theme.palette.warning.main, 0.18),
        },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2,
        },
      }}
    >
      {/* Status dot */}
      <Box
        sx={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          bgcolor: dotColor,
          flexShrink: 0,
        }}
      />
      <Typography
        variant="caption"
        fontWeight={600}
        sx={{ lineHeight: 1, color: dotColor, userSelect: 'none', letterSpacing: 0.2 }}
      >
        {isMainnet ? 'Mainnet' : 'Testnet'}
      </Typography>
    </Box>
  );
}
